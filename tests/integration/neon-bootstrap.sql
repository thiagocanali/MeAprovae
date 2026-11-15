-- Disposable PostgreSQL test harness for Neon Managed Auth + Data API schema.
-- These simulated JWT claims exist only in CI; production uses Neon's native auth.uid().
create role anonymous nologin;
create role authenticated nologin;
create schema neon_auth;
create table neon_auth."user" (
  id uuid primary key,
  name text not null,
  banned boolean not null default false
);
create schema auth;
create function auth.uid() returns uuid language sql stable set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated, anonymous;
grant execute on function auth.uid() to authenticated, anonymous;
