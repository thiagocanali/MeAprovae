-- Tighten editorial privileges and keep answer explanations private.
-- The earlier editorial migration granted table-level SELECT on study_questions
-- to every authenticated user, which superseded the safe column-level grant
-- from 0002 and exposed explanations before an attempt was submitted.

-- Administrative role mutations are available to authenticated users only
-- through the owner-only RLS policies defined in 0006.
grant insert, update, delete on public.platform_admins to authenticated;

-- Store explanations separately so ordinary authenticated students cannot
-- retrieve them through PostgREST. Preserve existing content during migration.
create table if not exists public.study_question_editorial_details (
  question_id uuid primary key
    references public.study_questions(id) on delete cascade,
  explanation text not null default '' check (char_length(explanation) <= 12000),
  updated_at timestamptz not null default now()
);

insert into public.study_question_editorial_details (question_id, explanation)
select q.id, q.explanation
from public.study_questions q
on conflict (question_id) do nothing;

alter table public.study_question_editorial_details enable row level security;
revoke all on public.study_question_editorial_details from anon, authenticated;
grant select, insert, update, delete
  on public.study_question_editorial_details to authenticated;

create policy "Editors can manage question editorial details"
  on public.study_question_editorial_details for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

-- Remove broad table-level SELECT/INSERT/UPDATE grants introduced by 0006.
-- Keep the public-safe question columns available under the existing RLS
-- publication policy. Editors write the explanation to the protected table.
revoke select, insert, update on public.study_questions from authenticated;
grant select (
  id, notice_id, subject_id, topic_id, statement,
  source_label, source_url, source_year, status, created_at
) on public.study_questions to anon, authenticated;
grant insert (
  notice_id, subject_id, topic_id, statement,
  source_label, source_url, source_year, status
) on public.study_questions to authenticated;
grant update (
  notice_id, subject_id, topic_id, statement,
  source_label, source_url, source_year, status
) on public.study_questions to authenticated;

-- Serialize explanation edits with answer submissions and preserve historical
-- meaning just like the question statement, options and answer key.
create or replace function public.guard_attempted_question_editorial_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_id uuid;
begin
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  perform 1
  from public.study_questions q
  where q.id = v_question_id
  for update;

  if exists (
    select 1 from public.question_attempts a
    where a.question_id = v_question_id
  ) then
    if tg_op = 'INSERT'
      or tg_op = 'DELETE'
      or new.explanation is distinct from old.explanation then
      raise exception using
        errcode = '23514',
        message = 'This question has answer history; its explanation is immutable';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_attempted_question_editorial_details()
  from public, anon, authenticated;

drop trigger if exists study_question_editorial_details_history_guard
  on public.study_question_editorial_details;
create trigger study_question_editorial_details_history_guard
  before insert or update or delete
  on public.study_question_editorial_details
  for each row execute function public.guard_attempted_question_editorial_details();

-- Answer feedback remains available only through this authenticated RPC after
-- the user submits an option. No direct SELECT privilege is granted on details.
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

  select ak.correct_option_id, coalesce(d.explanation, '')
    into v_correct_option_id, v_explanation
  from public.study_questions q
  join public.study_notices n on n.id = q.notice_id
  join public.study_contests c on c.id = n.contest_id
  join public.study_question_answer_keys ak on ak.question_id = q.id
  left join public.study_question_editorial_details d on d.question_id = q.id
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

    if v_attempt.question_id <> p_question_id
      or v_attempt.selected_option_id <> p_option_id then
      raise exception using errcode = '22023',
        message = 'Idempotency key already used for another answer';
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

revoke all on function public.submit_question_attempt(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.submit_question_attempt(uuid, uuid, uuid)
  to authenticated;
