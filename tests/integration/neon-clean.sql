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

-- A published question with two options and an answer key exercises the
-- actual favorite insert policy; a draft question would be rejected.
insert into public.study_subjects (id,name)
values ('55555555-5555-4555-8555-555555555555','Disciplina de teste Neon');
insert into public.study_notices (id,contest_id,title,status)
values ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','Edital de teste Neon','draft');
insert into public.study_notice_subjects (notice_id,subject_id)
values ('66666666-6666-4666-8666-666666666666','55555555-5555-4555-8555-555555555555');
-- Assign subjects while the notice is still a draft, then publish it.
update public.study_notices set status='published' where id='66666666-6666-4666-8666-666666666666';
insert into public.study_questions (id,notice_id,subject_id,statement,status)
values ('77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666',
        '55555555-5555-4555-8555-555555555555','Questão publicada de teste Neon', 'draft');
insert into public.study_question_options (id,question_id,option_label,content,position)
values
 ('88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777','A','Primeira alternativa',1),
 ('99999999-9999-4999-8999-999999999999','77777777-7777-4777-8777-777777777777','B','Segunda alternativa',2);
insert into public.study_question_answer_keys (question_id,correct_option_id)
values ('77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888');
update public.study_questions set status='published'
where id='77777777-7777-4777-8777-777777777777';


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
insert into public.student_question_favorites (user_id,question_id)
values ('11111111-1111-4111-8111-111111111111','77777777-7777-4777-8777-777777777777');



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
  if (select count(*) from public.student_question_favorites) <> 0 then
    raise exception 'Student B can read student A favorites';
  end if;
  delete from public.student_question_favorites
  where user_id='11111111-1111-4111-8111-111111111111'
    and question_id='77777777-7777-4777-8777-777777777777';
  if found then
    raise exception 'Student B deleted student A favorite';
  end if;
  begin
    insert into public.student_question_favorites (user_id,question_id)
    values ('11111111-1111-4111-8111-111111111111','77777777-7777-4777-8777-777777777777')
    on conflict do nothing;
    raise exception 'Student B can write student A favorites';
  exception when insufficient_privilege then null;
  end;

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

-- Student B can favorite the same question without seeing or modifying A's record.
insert into public.student_question_favorites (user_id,question_id)
values ('22222222-2222-4222-8222-222222222222','77777777-7777-4777-8777-777777777777');
do $favorite_isolation$
begin
  if (select count(*) from public.student_question_favorites) <> 1 then
    raise exception 'Student B favorites are not isolated';
  end if;
  if (select count(*) from public.student_question_favorites
      where user_id='11111111-1111-4111-8111-111111111111') <> 0 then
    raise exception 'Student B can list student A favorites';
  end if;
end
$favorite_isolation$;

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

-- Verify A's record survived the unauthorized delete and B's separate save.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $favorite_owner$
begin
  if (select count(*) from public.student_question_favorites
      where user_id='11111111-1111-4111-8111-111111111111') <> 1 then
    raise exception 'Student A favorite missing after cross-user mutation attempt';
  end if;
end
$favorite_owner$;

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
