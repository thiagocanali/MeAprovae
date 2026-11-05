-- Preserve the meaning of historical attempts.
-- Once a question has answers, its statement/source/structure, alternatives and
-- answer key are immutable. Create a new question/version for substantive edits.
-- Status transitions remain allowed so editorial lifecycle is unaffected.

create or replace function public.guard_attempted_question_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.question_attempts a
    where a.question_id = old.id
  ) and (
    new.notice_id is distinct from old.notice_id
    or new.subject_id is distinct from old.subject_id
    or new.topic_id is distinct from old.topic_id
    or new.statement is distinct from old.statement
    or new.explanation is distinct from old.explanation
    or new.source_label is distinct from old.source_label
    or new.source_url is distinct from old.source_url
    or new.source_year is distinct from old.source_year
  ) then
    raise exception using
      errcode = '23514',
      message = 'This question has answer history; create a new question version instead of editing its content';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_attempted_question_content() from public, anon, authenticated;

drop trigger if exists study_questions_attempt_history_guard on public.study_questions;
create trigger study_questions_attempt_history_guard
  before update on public.study_questions
  for each row execute function public.guard_attempted_question_content();

create or replace function public.guard_attempted_question_components()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_question_id uuid;
  v_new_question_id uuid;
  v_lock_question_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_question_id := (to_jsonb(old) ->> 'question_id')::uuid;
  end if;

  if tg_op <> 'DELETE' then
    v_new_question_id := (to_jsonb(new) ->> 'question_id')::uuid;
  end if;

  -- Serialize component edits with question submissions. The attempt RPC takes
  -- a SHARE lock on the same question row before reading its answer key.
  for v_lock_question_id in
    select distinct requested.id
    from unnest(array[v_old_question_id, v_new_question_id]) as requested(id)
    where requested.id is not null
    order by requested.id
  loop
    perform 1
    from public.study_questions q
    where q.id = v_lock_question_id
    for update;
  end loop;

  if (v_old_question_id is not null and exists (
    select 1 from public.question_attempts a
    where a.question_id = v_old_question_id
  )) or (v_new_question_id is not null and exists (
    select 1 from public.question_attempts a
    where a.question_id = v_new_question_id
  )) then
    raise exception using
      errcode = '23514',
      message = 'This question has answer history; alternatives and answer key are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_attempted_question_components() from public, anon, authenticated;

drop trigger if exists study_question_options_attempt_history_guard on public.study_question_options;
create trigger study_question_options_attempt_history_guard
  before insert or update or delete on public.study_question_options
  for each row execute function public.guard_attempted_question_components();

drop trigger if exists study_question_answer_keys_attempt_history_guard on public.study_question_answer_keys;
create trigger study_question_answer_keys_attempt_history_guard
  before insert or update or delete on public.study_question_answer_keys
  for each row execute function public.guard_attempted_question_components();


-- Serialize answer submissions with editorial mutations. Without a row lock,
-- an editor could check for zero attempts while a submission is being inserted.
create or replace function public.submit_question_attempt(
  p_question_id uuid,
  p_option_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_locked_question_id uuid;
  v_correct_option_id uuid;
  v_explanation text;
  v_is_correct boolean;
  v_attempt public.question_attempts%rowtype;
  v_inserted boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_question_id is null or p_option_id is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Missing submission fields';
  end if;

  select q.id into v_locked_question_id
  from public.study_questions q
  where q.id = p_question_id and q.status = 'published'
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'Question not found or unavailable';
  end if;

  select ak.correct_option_id, q.explanation
    into v_correct_option_id, v_explanation
  from public.study_questions q
  join public.study_notices n on n.id = q.notice_id
  join public.study_contests c on c.id = n.contest_id
  join public.study_question_answer_keys ak on ak.question_id = q.id
  where q.id = p_question_id
    and q.status = 'published'
    and n.status = 'published'
    and c.status = 'published';

  if not found then
    raise exception using errcode = 'P0002', message = 'Question not found or unavailable';
  end if;

  if not exists (
    select 1 from public.study_question_options o
    where o.id = p_option_id and o.question_id = p_question_id
  ) then
    raise exception using errcode = '22023', message = 'Selected option does not belong to question';
  end if;

  v_is_correct := (p_option_id = v_correct_option_id);

  insert into public.question_attempts (
    user_id, question_id, selected_option_id, is_correct, idempotency_key
  ) values (
    v_user_id, p_question_id, p_option_id, v_is_correct, p_idempotency_key
  )
  on conflict (user_id, idempotency_key) do nothing
  returning * into v_attempt;

  v_inserted := found;

  if not v_inserted then
    select * into v_attempt
    from public.question_attempts
    where user_id = v_user_id and idempotency_key = p_idempotency_key;

    if v_attempt.question_id <> p_question_id or v_attempt.selected_option_id <> p_option_id then
      raise exception using errcode = '22023', message = 'Idempotency key already used for another answer';
    end if;
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'questionId', v_attempt.question_id,
    'selectedOptionId', v_attempt.selected_option_id,
    'isCorrect', v_attempt.is_correct,
    'correctOptionId', v_correct_option_id,
    'explanation', v_explanation,
    'wasDuplicate', not v_inserted,
    'submittedAt', v_attempt.submitted_at
  );
end;
$$;

revoke all on function public.submit_question_attempt(uuid, uuid, uuid) from public, anon;
grant execute on function public.submit_question_attempt(uuid, uuid, uuid) to authenticated;
