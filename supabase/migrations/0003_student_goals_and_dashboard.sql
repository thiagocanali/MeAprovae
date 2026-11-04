-- Student preparation goals and real dashboard aggregates.
create unique index if not exists study_notices_contest_id_id_idx
  on public.study_notices (contest_id, id);

create table if not exists public.study_positions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.study_contests(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  education_level text,
  area text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  unique (contest_id, id)
);

create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contest_id uuid not null references public.study_contests(id) on delete restrict,
  position_id uuid,
  notice_id uuid,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_goals_position_contest_fk
    foreign key (contest_id, position_id)
    references public.study_positions(contest_id, id),
  constraint study_goals_notice_contest_fk
    foreign key (contest_id, notice_id)
    references public.study_notices(contest_id, id)
);

create unique index if not exists study_goals_one_active_per_user_idx
  on public.study_goals (user_id) where status = 'active';
create index if not exists study_positions_contest_status_idx
  on public.study_positions (contest_id, status);
create index if not exists study_goals_user_status_idx
  on public.study_goals (user_id, status);

alter table public.study_positions enable row level security;
alter table public.study_goals enable row level security;

create policy "Anyone can read published positions"
  on public.study_positions for select to anon, authenticated
  using (status = 'published' and exists (
    select 1 from public.study_contests c
    where c.id = contest_id and c.status = 'published'
  ));

create policy "Students can read their own goals"
  on public.study_goals for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.study_positions, public.study_goals from anon, authenticated;
grant select on public.study_positions to anon, authenticated;
grant select on public.study_goals to authenticated;

create or replace function public.set_student_study_goal(
  p_contest_id uuid,
  p_notice_id uuid default null,
  p_position_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.study_goals%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_contest_id is null or not exists (
    select 1 from public.study_contests c
    where c.id = p_contest_id and c.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Contest is not available';
  end if;

  if p_notice_id is not null and not exists (
    select 1 from public.study_notices n
    where n.id = p_notice_id and n.contest_id = p_contest_id and n.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Notice does not belong to the selected contest';
  end if;

  if p_position_id is not null and not exists (
    select 1 from public.study_positions p
    where p.id = p_position_id and p.contest_id = p_contest_id and p.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Position does not belong to the selected contest';
  end if;

  update public.study_goals
  set status = 'archived', updated_at = now()
  where user_id = v_user_id and status = 'active';

  insert into public.study_goals (user_id, contest_id, notice_id, position_id)
  values (v_user_id, p_contest_id, p_notice_id, p_position_id)
  returning * into v_goal;

  return jsonb_build_object(
    'id', v_goal.id,
    'contestId', v_goal.contest_id,
    'noticeId', v_goal.notice_id,
    'positionId', v_goal.position_id,
    'status', v_goal.status,
    'createdAt', v_goal.created_at
  );
end;
$$;

revoke all on function public.set_student_study_goal(uuid, uuid, uuid) from public, anon;
grant execute on function public.set_student_study_goal(uuid, uuid, uuid) to authenticated;

create or replace function public.get_student_dashboard()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select jsonb_build_object(
    'questionsAnswered', count(*),
    'correctAnswers', count(*) filter (where qa.is_correct),
    'accuracy', coalesce(
      round(100.0 * count(*) filter (where qa.is_correct) / nullif(count(*), 0), 1),
      0
    ),
    'activeGoal', (
      select jsonb_build_object(
        'id', g.id,
        'contestId', g.contest_id,
        'contestTitle', c.title,
        'noticeId', g.notice_id,
        'noticeTitle', n.title,
        'positionId', g.position_id,
        'positionTitle', p.title
      )
      from public.study_goals g
      join public.study_contests c on c.id = g.contest_id
      left join public.study_notices n on n.id = g.notice_id
      left join public.study_positions p on p.id = g.position_id
      where g.user_id = v_user_id and g.status = 'active'
      limit 1
    ),
    'recentAttempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'questionId', recent.question_id,
        'isCorrect', recent.is_correct,
        'submittedAt', recent.submitted_at
      ) order by recent.submitted_at desc)
      from (
        select a.id, a.question_id, a.is_correct, a.submitted_at
        from public.question_attempts a
        where a.user_id = v_user_id
        order by a.submitted_at desc
        limit 5
      ) recent
    ), '[]'::jsonb)
  )
  into v_result
  from public.question_attempts qa
  where qa.user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.get_student_dashboard() from public, anon;
grant execute on function public.get_student_dashboard() to authenticated;
