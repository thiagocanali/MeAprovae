-- Me Aprovaê Phase 2: read-only Supabase diagnostics
-- Run in the Supabase SQL Editor using a project administrator connection.
-- This script performs SELECTs and a read-only DO block only. It does not
-- create, alter, delete, or update database objects or data.

-- 1) Migration ledger: reports whether the Supabase CLI history table exists.
do $$
declare
  v_ledger regclass := to_regclass('supabase_migrations.schema_migrations');
  v_rows jsonb;
begin
  if v_ledger is null then
    raise notice 'MIGRATION_LEDGER=NOT_FOUND';
  else
    execute 'select coalesce(jsonb_agg(to_jsonb(m) order by to_jsonb(m)::text), ''[]''::jsonb) from supabase_migrations.schema_migrations m'
      into v_rows;
    raise notice 'MIGRATION_LEDGER=%', v_rows;
  end if;
end;
$$;

-- 2) Expected application tables and their RLS state.
with expected(table_name) as (
  values
    ('student_profiles'),
    ('study_contests'),
    ('study_notices'),
    ('study_subjects'),
    ('study_topics'),
    ('study_notice_subjects'),
    ('study_questions'),
    ('study_question_options'),
    ('study_question_answer_keys'),
    ('student_contests'),
    ('question_attempts'),
    ('study_positions'),
    ('study_goals'),
    ('student_question_favorites'),
    ('platform_admins'),
    ('editorial_audit_log'),
    ('study_notice_positions')
)
select
  e.table_name,
  (c.oid is not null) as exists,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  coalesce(c.relforcerowsecurity, false) as rls_forced
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid
  and c.relname = e.table_name
  and c.relkind in ('r', 'p')
order by e.table_name;

-- 3) Policies currently installed on application tables.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4) Application functions, SECURITY DEFINER status, search_path and grants.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'has_platform_role',
    'set_student_study_goal',
    'get_student_dashboard',
    'get_student_subject_performance',
    'get_student_wrong_questions',
    'submit_question_attempt',
    'set_notice_subjects',
    'set_notice_positions',
    'set_question_options'
  )
order by p.proname, arguments;

-- 5) Security-sensitive table privileges for anon/authenticated.
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'student_profiles',
    'question_attempts',
    'student_contests',
    'study_goals',
    'student_question_favorites',
    'platform_admins',
    'editorial_audit_log',
    'study_question_answer_keys'
  )
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 6) Application triggers (including integrity and audit guards).
select
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;
