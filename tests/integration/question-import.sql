-- Run against a disposable database after all migrations. Fixtures roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.platform_admins(user_id, role) values ('11111111-1111-4111-8111-111111111111', 'editor');
insert into public.study_contests(id, slug, title) values ('33333333-3333-4333-8333-333333333333', 'import-test', 'Import test');
insert into public.study_notices(id, contest_id, title) values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Import test notice');
insert into public.study_subjects(id, name) values ('55555555-5555-4555-8555-555555555555', 'Import test subject');
insert into public.study_notice_subjects(notice_id, subject_id) values ('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555');
create function pg_temp.question(p_id text, p_statement text) returns jsonb language sql as $$
  select jsonb_build_object('externalId', p_id, 'statement', p_statement, 'explanation', 'Explanation for the correct answer.',
    'subjectId', '55555555-5555-4555-8555-555555555555', 'sourceLabel', 'Original test', 'rights', 'original',
    'rightsEvidence', 'Original fixture authored for integration testing.', 'difficulty', 'easy', 'options', jsonb_build_array('First', 'Second'), 'correctOption', 1)
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('1', 'A valid original statement.')));
    raise exception 'Non-editor import must fail';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.question_import_batches) then raise exception 'Student can see import batches'; end if;
  begin
    insert into public.study_questions(notice_id, subject_id, statement, difficulty, difficulty_reviewed)
    values('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', 'Student write must be forbidden.', 'easy', true);
    raise exception 'Student can write difficulty fields';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.question_import_batches(request_id, source_name, notice_id, created_by, payload_hash, question_count)
    values(gen_random_uuid(), 'test-source', '44444444-4444-4444-8444-444444444444', auth.uid(), 'fake', 1);
    raise exception 'Direct student insert must fail';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ declare
  v_payload jsonb := jsonb_build_array(pg_temp.question('1', 'A valid original statement.'));
  v_first jsonb;
  v_retry jsonb;
begin
  v_first := public.import_question_batch('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'test-source', v_payload);
  v_retry := public.import_question_batch('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'test-source', v_payload);
  if v_first->>'id' <> v_retry->>'id' or (v_retry->>'replayed')::boolean is not true then raise exception 'Idempotency failed'; end if;
  if (select count(*) from public.question_import_batches) <> 1 then raise exception 'Duplicate batch'; end if;
  if (select count(*) from public.study_questions where status = 'draft' and difficulty_reviewed = false) <> 1 then raise exception 'Question not draft/unreviewed'; end if;
  if (select count(*) from public.study_question_options) <> 2 then raise exception 'Missing options'; end if;
  if not exists(select 1 from public.study_question_answer_keys k join public.study_question_options o on o.id = k.correct_option_id where o.position = 2) then raise exception 'Wrong answer key'; end if;
  if (select count(*) from public.study_question_editorial_details) <> 1 then raise exception 'Missing explanation'; end if;
  if (select count(*) from public.question_import_items where rights_evidence <> '') <> 1 then raise exception 'Missing provenance'; end if;
  begin
    perform public.import_question_batch('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('2', 'Changed request payload.')));
    raise exception 'Changed request payload must fail';
  exception when invalid_parameter_value then null; end;
  -- First item is valid; second duplicates the previously imported question.
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('2', 'Another original statement.'), pg_temp.question('3', ' A valid   original statement. ')));
    raise exception 'Duplicate must fail';
  exception when unique_violation then null; end;
  if (select count(*) from public.study_questions) <> 1 or (select count(*) from public.question_import_batches) <> 1 then raise exception 'Batch did not roll back'; end if;
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('1', 'Different statement with reused external ID.')));
    raise exception 'Duplicate external ID must fail';
  exception when unique_violation then null; end;
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('2', 'Invalid correct option.') || '{"correctOption":5}'::jsonb));
    raise exception 'Invalid answer must fail';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('2', 'Unassigned subject statement.') || '{"subjectId":"77777777-7777-4777-8777-777777777777"}'::jsonb));
    raise exception 'Unassigned subject must fail';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', jsonb_build_array(pg_temp.question('2', 'Missing rights statement.') || '{"rightsEvidence":""}'::jsonb));
    raise exception 'Missing rights must fail';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.study_questions) <> 1 or (select count(*) from public.question_import_batches) <> 1 then raise exception 'Failed request left partial data'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  if exists(select 1 from public.question_import_batches) or exists(select 1 from public.question_import_items) then raise exception 'Student can see editorial provenance'; end if;
  if exists(select 1 from public.study_questions) then raise exception 'Student can see draft'; end if;
  if exists(select 1 from public.study_question_answer_keys) then raise exception 'Student can see answer'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform public.import_question_batch(gen_random_uuid(), '44444444-4444-4444-8444-444444444444', 'test-source', '[]'::jsonb);
    raise exception 'Anonymous execute must fail';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo 'PASS: import role checks, RLS, complete draft, idempotency, duplicate detection and atomic rollback'
