\set ON_ERROR_STOP on
-- Run on a disposable CI database after the clean Neon migrations.
begin;
do $checks$
begin
  if (select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE') <> 26 then
    raise exception 'Expected 25 domain tables plus the Neon Auth identity bridge';
  end if;
  if (select count(*) from pg_policies where schemaname='public') <> 45 then
    raise exception 'Legacy RLS policy count changed unexpectedly';
  end if;
  if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and not t.tgisinternal) <> 34 then
    raise exception 'Signup and domain triggers are missing';
  end if;
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
      and not c.relrowsecurity
  ) then
    raise exception 'Every public application table must enable RLS';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_question_favorites'
      and cmd='SELECT' and qual like '%auth.uid()%'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_question_favorites'
      and cmd='INSERT' and with_check like '%auth.uid()%'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='student_question_favorites'
      and cmd='DELETE' and qual like '%auth.uid()%'
  ) then
    raise exception 'Favorites policies must enforce the verified user identity';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.auth_users'::regclass) then
    raise exception 'Auth bridge must have RLS enabled';
  end if;
  if has_table_privilege('authenticated', 'public.auth_users', 'SELECT')
    or has_table_privilege('authenticated', 'public.auth_users', 'INSERT') then
    raise exception 'Auth bridge has excessive grants';
  end if;
  if has_function_privilege('anonymous', 'public.create_editorial_question(jsonb)', 'EXECUTE')
    or has_function_privilege('anonymous', 'public.update_editorial_question(uuid,jsonb,text)', 'EXECUTE') then
    raise exception 'Anonymous role has editorial mutation privileges';
  end if;
  if has_function_privilege('anonymous', 'public.ensure_neon_student_account(text)', 'EXECUTE') then
    raise exception 'Anonymous role can provision student identities';
  end if;
  if (select count(*) from public.study_questions) <> 0 then
    raise exception 'Neon clean schema must have no legacy questions';
  end if;
end
$checks$;

insert into neon_auth."user"(id,name) values
('11111111-1111-4111-8111-111111111111','Estudante A'),
('22222222-2222-4222-8222-222222222222','Estudante B');

-- Published contest used to verify per-user goals via a SECURITY DEFINER RPC.
insert into public.study_contests (id,slug,title,status)
values ('44444444-4444-4444-8444-444444444444','neon-rls-fixture','Teste de isolamento Neon','published');

set local role anonymous;
do $anonymous$
begin
  begin
    perform public.ensure_neon_student_account('Anonymous user');
    raise exception 'Anonymous user accessed account provisioner';
  exception when insufficient_privilege then null;
  end;
end
$anonymous$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.ensure_neon_student_account('Estudante A');
select public.ensure_neon_student_account('Estudante A');
select public.set_student_study_goal('44444444-4444-4444-8444-444444444444');

do $first$
begin
  if (select count(*) from public.student_profiles) <> 1 then
    raise exception 'User profile missing or identity isolation broken';
  end if;
  if (select count(*) from public.study_goals where status='active') <> 1 then
    raise exception 'Student A goal was not visible';
  end if;
  if public.has_platform_role('editor') then
    raise exception 'New student acquired editorial privileges';
  end if;
  begin
    perform public.create_editorial_question('{}'::jsonb);
    raise exception 'New student created editorial question';
  exception when insufficient_privilege then null;
  end;
  if (select display_name from public.student_profiles) <> 'Estudante A' then
    raise exception 'Wrong display name';
  end if;
end
$first$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.ensure_neon_student_account('Estudante B');

do $second$
begin
  if (select count(*) from public.student_profiles) <> 1 then
    raise exception 'Authenticated user can see other students';
  end if;
  if (select count(*) from public.study_goals) <> 0 then
    raise exception 'Student B can read student A goal';
  end if;
  if (select display_name from public.student_profiles) <> 'Estudante B' then
    raise exception 'Wrong isolated profile';
  end if;
  begin
    perform public.ensure_neon_student_account('X');
    raise exception 'Invalid display name accepted';
  exception when invalid_parameter_value then null;
  end;
end
$second$;

-- Student B may create their own goal, without changing student A's goal.
select public.set_student_study_goal('44444444-4444-4444-8444-444444444444');
do $goal_isolation$
begin
  if (select count(*) from public.study_goals where status='active') <> 1 then
    raise exception 'Student B goal isolation failed';
  end if;
  if (select count(*) from public.study_goals where user_id='11111111-1111-4111-8111-111111111111') <> 0 then
    raise exception 'Student A goal leaked into B session';
  end if;
end
$goal_isolation$;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $missing$
begin
  begin
    perform public.ensure_neon_student_account('Unknown user');
    raise exception 'Unregistered identity obtained a profile';
  exception when insufficient_privilege then null;
  end;
end
$missing$;
reset role;
rollback;
