-- Private question bookmarks.
create table if not exists public.student_question_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.study_questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists student_question_favorites_user_created_idx
  on public.student_question_favorites (user_id, created_at desc);

alter table public.student_question_favorites enable row level security;

create policy "Students can read their own question favorites"
  on public.student_question_favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can favorite published questions"
  on public.student_question_favorites for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_questions q
      join public.study_notices n on n.id = q.notice_id
      join public.study_contests c on c.id = n.contest_id
      where q.id = question_id
        and q.status = 'published'
        and n.status = 'published'
        and c.status = 'published'
    )
  );

create policy "Students can remove their own favorites"
  on public.student_question_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.student_question_favorites from anon, authenticated;
grant select, insert, delete on public.student_question_favorites to authenticated;
