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
begin
  if tg_op <> 'INSERT' then
    v_old_question_id := (to_jsonb(old) ->> 'question_id')::uuid;
  end if;

  if tg_op <> 'DELETE' then
    v_new_question_id := (to_jsonb(new) ->> 'question_id')::uuid;
  end if;

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
