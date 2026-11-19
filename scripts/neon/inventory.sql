-- Read-only database inventory for comparing Supabase source and Neon target.
-- Run: psql -X -v ON_ERROR_STOP=1 -f scripts/neon/inventory.sql
-- Do not publish the output if table names or metadata are sensitive.
select current_setting('server_version') as postgres_version;
select extname, extversion from pg_extension order by extname;
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') order by c.relname;
select count(*) as public_indexes from pg_indexes where schemaname='public';
select count(*) as public_policies from pg_policies where schemaname='public';
select count(*) as public_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
select count(*) as public_triggers from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal;
select count(*) as public_foreign_keys from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and c.contype='f';
select conrelid::regclass as source_table, confrelid::regclass as referenced_table, conname
from pg_constraint where contype='f' and connamespace='public'::regnamespace
order by 1, 3;
-- Exact per-table counts; avoids printing any row contents.
do $inventory$
declare t record; n bigint;
begin
  for t in select tablename from pg_tables where schemaname='public' order by tablename loop
    execute format('select count(*) from public.%I', t.tablename) into n;
    raise notice 'ROW_COUNT public.% = %', t.tablename, n;
  end loop;
end
$inventory$;
