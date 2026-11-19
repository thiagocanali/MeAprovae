-- Read-only compatibility preflight for Supabase -> Neon.
-- All statements work on source, empty Neon, and disposable CI PostgreSQL.
-- No credentials, user records, or table contents are selected.
select current_database() as database_name,
       current_setting('server_version_num')::int as postgres_version_num,
       to_regclass('auth.users') is not null as has_supabase_auth_users,
       to_regclass('storage.objects') is not null as has_supabase_storage_objects;

select wanted.extname,
       a.default_version is not null as supported,
       a.installed_version is not null as installed,
       a.default_version
from (values ('pgcrypto'), ('uuid-ossp'), ('pg_stat_statements'), ('supabase_vault')) as wanted(extname)
left join pg_available_extensions as a on a.name = wanted.extname
order by wanted.extname;

select n.nspname as schema_name,
       count(*)::int as tables,
       count(*) filter (where c.relrowsecurity)::int as rls_tables
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
group by n.nspname;

select count(*)::int as foreign_keys_to_supabase_auth_users
from pg_constraint c
where c.contype='f'
  and c.connamespace = 'public'::regnamespace
  and c.confrelid = to_regclass('auth.users');

select count(*)::int as public_policies_using_supabase_auth_uid
from pg_policies
where schemaname='public'
  and (coalesce(qual,'') ilike '%auth.uid%'
       or coalesce(with_check,'') ilike '%auth.uid%');

select count(*)::int as public_functions_using_supabase_auth_uid
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosrc ilike '%auth.uid%';
