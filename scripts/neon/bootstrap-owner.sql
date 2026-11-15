-- STAGING ONLY, reviewed manually after the owner registers with Neon Auth.
-- Usage (direct TLS connection, do NOT print passwords or place them in a command):
-- psql -X -v ON_ERROR_STOP=1 -v confirm_staging=on -v owner_email='you@example.com' -f scripts/neon/bootstrap-owner.sql
-- Never run on Supabase or on Neon main without an explicit release plan.
\set ON_ERROR_STOP on
\if :{?confirm_staging}
\else
  \echo 'Refused: pass -v confirm_staging=on for the isolated Neon staging database.'
  \quit 1
\endif
\if :confirm_staging
\else
  \echo 'Refused: confirm_staging must be on.'
  \quit 1
\endif
\if :{?owner_email}
\else
  \echo 'Refused: pass -v owner_email with the verified Neon Auth account email.'
  \quit 1
\endif
begin;
lock table public.platform_admins in share row exclusive mode;

-- Only the first verified account can become the initial owner through this
-- one-time manual bootstrap. All later grants must use existing owner controls.
insert into public.platform_admins (user_id, role)
select u.id, 'owner'
from neon_auth."user" u
where lower(u.email) = lower(:'owner_email')
  and u."emailVerified" is true
  and exists (select 1 from public.auth_users au where au.id = u.id)
  and not exists (select 1 from public.platform_admins)
on conflict (user_id) do nothing
returning user_id, role;
commit;
