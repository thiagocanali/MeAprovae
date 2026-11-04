-- Administrative roles, editorial authorization and immutable audit history.
-- The first owner is assigned manually after the first trusted Auth account exists.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;

create or replace function public.has_platform_role(p_required_role text default 'editor')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.platform_admins pa
      where pa.user_id = (select auth.uid())
        and (
          pa.role = 'owner'
          or (p_required_role = 'editor' and pa.role = 'editor')
        )
    ),
    false
  );
$$;

revoke all on function public.has_platform_role(text) from public, anon;
grant execute on function public.has_platform_role(text) to authenticated;

create policy "Platform admins can read admin assignments"
  on public.platform_admins for select to authenticated
  using ((select public.has_platform_role('editor')));

create policy "Owners can grant admin roles"
  on public.platform_admins for insert to authenticated
  with check ((select public.has_platform_role('owner')));

create policy "Owners can change admin roles"
  on public.platform_admins for update to authenticated
  using ((select public.has_platform_role('owner')))
  with check ((select public.has_platform_role('owner')));

create policy "Owners can revoke admin roles"
  on public.platform_admins for delete to authenticated
  using ((select public.has_platform_role('owner')));

create table if not exists public.editorial_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists editorial_audit_log_occurred_at_idx
  on public.editorial_audit_log (occurred_at desc);
create index if not exists editorial_audit_log_table_record_idx
  on public.editorial_audit_log (table_name, record_id, occurred_at desc);

alter table public.editorial_audit_log enable row level security;
revoke all on public.editorial_audit_log from anon, authenticated;
grant select on public.editorial_audit_log to authenticated;

create policy "Platform admins can read editorial audit log"
  on public.editorial_audit_log for select to authenticated
  using ((select public.has_platform_role('editor')));

create or replace function public.capture_editorial_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_record_id := v_new ->> 'id';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_record_id := coalesce(v_new ->> 'id', v_old ->> 'id');
  else
    v_old := to_jsonb(old);
    v_record_id := v_old ->> 'id';
  end if;

  insert into public.editorial_audit_log (
    actor_id, action, table_name, record_id, old_data, new_data
  ) values (
    (select auth.uid()), tg_op, tg_table_name, v_record_id, v_old, v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_editorial_change() from public, anon, authenticated;

-- Editors can manage editorial content. RLS remains the authorization boundary,
-- even if a request bypasses the Nuxt interface.
grant select, insert, update, delete on public.study_contests,
  public.study_notices, public.study_positions, public.study_subjects,
  public.study_topics, public.study_notice_subjects, public.study_questions,
  public.study_question_options, public.study_question_answer_keys
  to authenticated;

create policy "Editors can manage contests"
  on public.study_contests for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage notices"
  on public.study_notices for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage positions"
  on public.study_positions for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage subjects"
  on public.study_subjects for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage topics"
  on public.study_topics for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage notice subjects"
  on public.study_notice_subjects for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage questions"
  on public.study_questions for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage question options"
  on public.study_question_options for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

create policy "Editors can manage answer keys"
  on public.study_question_answer_keys for all to authenticated
  using ((select public.has_platform_role('editor')))
  with check ((select public.has_platform_role('editor')));

-- Capture all mutations that affect the public study catalogue or answer keys.
create trigger editorial_audit_contests
  after insert or update or delete on public.study_contests
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_notices
  after insert or update or delete on public.study_notices
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_positions
  after insert or update or delete on public.study_positions
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_subjects
  after insert or update or delete on public.study_subjects
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_topics
  after insert or update or delete on public.study_topics
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_notice_subjects
  after insert or update or delete on public.study_notice_subjects
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_questions
  after insert or update or delete on public.study_questions
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_question_options
  after insert or update or delete on public.study_question_options
  for each row execute function public.capture_editorial_change();
create trigger editorial_audit_answer_keys
  after insert or update or delete on public.study_question_answer_keys
  for each row execute function public.capture_editorial_change();
