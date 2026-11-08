-- A default value is not an editorial classification.
-- Only show/filter difficulty after an editor has explicitly reviewed it.
alter table public.study_questions
  add column if not exists difficulty_reviewed boolean not null default false;

grant select (difficulty_reviewed)
  on public.study_questions to anon, authenticated;

-- Keep the difficulty and its review status immutable once answer history exists.
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
    or new.difficulty is distinct from old.difficulty
    or new.difficulty_reviewed is distinct from old.difficulty_reviewed
  ) then
    raise exception using
      errcode = '23514',
      message = 'This question has answer history; create a new question version instead of editing its content';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_attempted_question_content()
  from public, anon, authenticated;
