-- Clean Neon schema prerequisite. Apply only AFTER Managed Neon Auth and Data API
-- are provisioned on an isolated branch (they own auth.uid() and the API roles).
-- Never replace the managed auth.uid() function with a user-controlled GUC.
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    grant anon to anonymous;
  end if;
end
$roles$;

-- This application-owned identity bridge preserves existing UUID foreign keys.
-- It is NOT a replacement for Managed Auth's login, password, or session tables.
create table if not exists public.auth_users (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

alter table public.auth_users enable row level security;
revoke all on public.auth_users from public, anon, authenticated;
-- No direct SELECT/INSERT/UPDATE/DELETE access to this identity bridge.
