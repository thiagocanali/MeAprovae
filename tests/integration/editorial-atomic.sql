-- All fixtures are confined to a rolled-back transaction on disposable PostgreSQL.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('a1111111-1111-4111-8111-111111111111'), ('a2222222-2222-4222-8222-222222222222');
insert into public.platform_admins(user_id, role) values ('a1111111-1111-4111-8111-111111111111','editor');
insert into public.study_contests(id, slug, title) values ('a3333333-3333-4333-8333-333333333333','atomic-test','Atomic test');
insert into public.study_notices(id, contest_id, title) values ('a4444444-4444-4444-8444-444444444444','a3333333-3333-4333-8333-333333333333','Atomic notice');
insert into public.study_subjects(id, name) values ('a5555555-5555-4555-8555-555555555555','Atomic subject');
insert into public.study_notice_subjects(notice_id,subject_id) values ('a4444444-4444-4444-8444-444444444444','a5555555-5555-4555-8555-555555555555');
create function pg_temp.reject_detail_update() returns trigger language plpgsql as $$
begin
  if new.explanation = 'Rejected explanation.' then
    raise exception using errcode = '23514', message = 'Injected detail failure';
  end if;
  return new;
end $$;
create trigger atomic_test_detail_failure before update on public.study_question_editorial_details
for each row execute function pg_temp.reject_detail_update();
set local role authenticated;
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
do $$ begin
  begin
    perform public.create_editorial_question('{"notice_id":"a4444444-4444-4444-8444-444444444444","subject_id":"a5555555-5555-4555-8555-555555555555","statement":"Unauthorized atomic question."}'::jsonb);
    raise exception 'Non-editor creation succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.update_editorial_question('a6666666-6666-4666-8666-666666666666','{}'::jsonb,'Unauthorized');
    raise exception 'Non-editor update succeeded';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$
declare v_question jsonb; v_id uuid; v_count int;
begin
  v_question := public.create_editorial_question(jsonb_build_object(
    'notice_id','a4444444-4444-4444-8444-444444444444',
    'subject_id','a5555555-5555-4555-8555-555555555555',
    'statement','Atomic original statement.', 'explanation','Original explanation.'));
  v_id := (v_question->>'id')::uuid;
  if not exists (select 1 from public.study_question_editorial_details where question_id=v_id and explanation='Original explanation.') then
    raise exception 'Create did not commit details'; end if;
  begin
    perform public.create_editorial_question(jsonb_build_object(
      'notice_id','a4444444-4444-4444-8444-444444444444',
      'subject_id','a5555555-5555-4555-8555-555555555555',
      'statement','This creation must roll back.', 'explanation',repeat('x',12001)));
    raise exception 'Oversized explanation accepted';
  exception when invalid_parameter_value then null; end;
  if exists (select 1 from public.study_questions where statement='This creation must roll back.') then
    raise exception 'Create rollback failed'; end if;
  begin
    perform public.update_editorial_question(v_id, '{"statement":"Update must roll back."}'::jsonb,repeat('x',12001));
    raise exception 'Oversized update accepted';
  exception when invalid_parameter_value then null; end;
  if (select statement from public.study_questions where id=v_id) <> 'Atomic original statement.' then
    raise exception 'Update rollback failed'; end if;
  perform public.update_editorial_question(v_id, '{"statement":"Atomic updated statement."}'::jsonb,'Updated explanation.');
  if (select statement from public.study_questions where id=v_id) <> 'Atomic updated statement.'
    or (select explanation from public.study_question_editorial_details where question_id=v_id) <> 'Updated explanation.' then
    raise exception 'Atomic update failed'; end if;
  -- Force a failure during the second write, after the first UPDATE succeeded.
  execute 'create function pg_temp.reject_detail_update() returns trigger language plpgsql as $f$ begin raise exception using errcode = ''23514'', message = ''Injected detail failure''; end $f
  if (select statement from public.study_questions where id=v_id) <> 'Atomic updated statement.' then
    raise exception 'Partial update persisted'; end if;
end $$;
reset role;
rollback;
;
  execute 'create trigger atomic_test_detail_failure before update on public.study_question_editorial_details for each row execute function pg_temp.reject_detail_update()';
  begin
    perform public.update_editorial_question(v_id, '{"statement":"Must not persist."}'::jsonb, 'Rejected explanation.');
    raise exception 'Injected detail failure was ignored';
  exception when check_violation then null; end;
  if (select statement from public.study_questions where id=v_id) <> 'Atomic updated statement.' then
    raise exception 'Partial update persisted'; end if;
end $$;
reset role;
rollback;
