-- Study catalog and question attempt engine.
-- Content is visible only when published. Answer keys and explanations are never directly selectable.
create table if not exists public.study_contests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 180),
  organization text,
  exam_board text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_notices (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.study_contests(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  version text not null default '1',
  publication_date date,
  source_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  unique (contest_id, version)
);

create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.study_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.study_subjects(id) on delete cascade,
  parent_topic_id uuid references public.study_topics(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (subject_id, parent_topic_id, name),
  unique (id, subject_id)
);

create table if not exists public.study_notice_subjects (
  notice_id uuid not null references public.study_notices(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete restrict,
  position integer not null default 0 check (position >= 0),
  primary key (notice_id, subject_id)
);

create table if not exists public.study_questions (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.study_notices(id) on delete cascade,
  subject_id uuid not null references public.study_subjects(id) on delete restrict,
  topic_id uuid,
  statement text not null check (char_length(statement) between 10 and 20000),
  explanation text not null default '' check (char_length(explanation) <= 12000),
  source_label text,
  source_url text,
  source_year integer check (source_year is null or source_year between 1900 and 2200),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  constraint study_questions_topic_subject_fk
    foreign key (topic_id, subject_id)
    references public.study_topics(id, subject_id)
);

create table if not exists public.study_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.study_questions(id) on delete cascade,
  option_label text not null check (char_length(option_label) between 1 and 4),
  content text not null check (char_length(content) between 1 and 5000),
  position integer not null check (position between 1 and 10),
  unique (question_id, option_label),
  unique (question_id, position),
  unique (question_id, id)
);

create table if not exists public.study_question_answer_keys (
  question_id uuid primary key references public.study_questions(id) on delete cascade,
  correct_option_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint study_question_answer_option_fk
    foreign key (question_id, correct_option_id)
    references public.study_question_options(question_id, id)
);

create table if not exists public.student_contests (
  user_id uuid not null references auth.users(id) on delete cascade,
  contest_id uuid not null references public.study_contests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, contest_id)
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.study_questions(id) on delete restrict,
  selected_option_id uuid not null,
  is_correct boolean not null,
  idempotency_key uuid not null,
  submitted_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  constraint question_attempts_option_fk
    foreign key (question_id, selected_option_id)
    references public.study_question_options(question_id, id)
);

create index if not exists study_notices_contest_status_idx
  on public.study_notices (contest_id, status);
create index if not exists study_questions_notice_status_idx
  on public.study_questions (notice_id, status);
create index if not exists study_questions_subject_topic_idx
  on public.study_questions (subject_id, topic_id);
create index if not exists question_attempts_user_submitted_idx
  on public.question_attempts (user_id, submitted_at desc);
create index if not exists question_attempts_user_question_idx
  on public.question_attempts (user_id, question_id, submitted_at desc);

alter table public.study_contests enable row level security;
alter table public.study_notices enable row level security;
alter table public.study_subjects enable row level security;
alter table public.study_topics enable row level security;
alter table public.study_notice_subjects enable row level security;
alter table public.study_questions enable row level security;
alter table public.study_question_options enable row level security;
alter table public.study_question_answer_keys enable row level security;
alter table public.student_contests enable row level security;
alter table public.question_attempts enable row level security;

create policy "Anyone can read published contests"
  on public.study_contests for select to anon, authenticated
  using (status = 'published');
create policy "Anyone can read published notices"
  on public.study_notices for select to anon, authenticated
  using (status = 'published' and exists (
    select 1 from public.study_contests c
    where c.id = contest_id and c.status = 'published'
  ));
create policy "Anyone can read subjects"
  on public.study_subjects for select to anon, authenticated using (true);
create policy "Anyone can read topics"
  on public.study_topics for select to anon, authenticated using (true);
create policy "Anyone can read published notice subjects"
  on public.study_notice_subjects for select to anon, authenticated
  using (exists (
    select 1 from public.study_notices n
    join public.study_contests c on c.id = n.contest_id
    where n.id = notice_id and n.status = 'published' and c.status = 'published'
  ));
create policy "Anyone can read published questions"
  on public.study_questions for select to anon, authenticated
  using (status = 'published' and exists (
    select 1 from public.study_notices n
    join public.study_contests c on c.id = n.contest_id
    where n.id = notice_id and n.status = 'published' and c.status = 'published'
  ));
create policy "Anyone can read options of published questions"
  on public.study_question_options for select to anon, authenticated
  using (exists (
    select 1 from public.study_questions q
    join public.study_notices n on n.id = q.notice_id
    join public.study_contests c on c.id = n.contest_id
    where q.id = question_id and q.status = 'published'
      and n.status = 'published' and c.status = 'published'
  ));
create policy "Students can read their own contest tracking"
  on public.student_contests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students can follow published contests"
  on public.student_contests for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.study_contests c
    where c.id = contest_id and c.status = 'published'
  ));
create policy "Students can unfollow contests"
  on public.student_contests for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students can read their own question attempts"
  on public.question_attempts for select to authenticated
  using ((select auth.uid()) = user_id);

-- Revoke default broad table grants before exposing only safe operations.
revoke all on public.study_contests, public.study_notices, public.study_subjects,
  public.study_topics, public.study_notice_subjects, public.study_questions,
  public.study_question_options, public.study_question_answer_keys,
  public.student_contests, public.question_attempts from anon, authenticated;
revoke all on public.study_questions from anon, authenticated;
revoke all on public.study_question_options from anon, authenticated;
grant select on public.study_contests, public.study_notices, public.study_subjects,
  public.study_topics, public.study_notice_subjects, public.student_contests
  to authenticated;
grant select on public.study_contests, public.study_notices, public.study_subjects,
  public.study_topics, public.study_notice_subjects
  to anon;
grant select (id, notice_id, subject_id, topic_id, statement, source_label, source_url, source_year, status, created_at)
  on public.study_questions to authenticated, anon;
grant select (id, question_id, option_label, content, position)
  on public.study_question_options to authenticated, anon;
grant select on public.question_attempts to authenticated;
grant insert, delete on public.student_contests to authenticated;

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
