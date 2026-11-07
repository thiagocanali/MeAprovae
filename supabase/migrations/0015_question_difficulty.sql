-- Add an explicit, controlled difficulty level to every question.
-- Existing questions receive the neutral default "medium".
alter table public.study_questions
  add column if not exists difficulty text not null default 'medium';

alter table public.study_questions
  drop constraint if exists study_questions_difficulty_check;

alter table public.study_questions
  add constraint study_questions_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));

create index if not exists study_questions_status_difficulty_idx
  on public.study_questions (status, difficulty);

-- Public clients may read the difficulty, but answer keys and editorial details
-- remain protected by their existing grants and RLS policies.
grant select (difficulty) on public.study_questions to anon, authenticated;
