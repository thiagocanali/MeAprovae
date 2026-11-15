-- STAGING ONLY: compatibility scaffold for replaying the existing SQL migrations.
-- Not an authentication implementation. Application handlers MUST verify a Neon Auth
-- session/JWT before selecting a user context for SQL; NEVER trust request headers.
-- The authenticated and anon roles cannot log in directly.
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid
language sql stable set search_path = ''
as $$
  select nullif(current_setting('app.verified_user_id', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
