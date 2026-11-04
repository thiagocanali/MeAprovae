-- Requires Supabase Auth (auth.users and auth.uid()).
-- Apply this migration to the Me Aprovaê Supabase project before using student profiles.
create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  username text unique,
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

create policy "Students can read their own profile"
  on public.student_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Students can insert their own profile"
  on public.student_profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Students can update their own profile"
  on public.student_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update on public.student_profiles to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_student()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Estudante')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_student();
