-- Disposable PostgreSQL after all migrations; no fixtures survive this test.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.study_contests(id, slug, title, status) values ('33333333-3333-4333-8333-333333333333', 'exam-test', 'Exam test', 'published');
insert into public.study_notices(id, contest_id, title, status) values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Exam notice', 'draft');
insert into public.study_subjects(id, name) values ('55555555-5555-4555-8555-555555555555', 'Exam subject');
insert into public.study_notice_subjects(notice_id, subject_id) values ('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555');
update public.study_notices set status = 'published' where id = '44444444-4444-4444-8444-444444444444';
do $$ declare v_q uuid; v_o uuid; begin
  for i in 1..20 loop
    insert into public.study_questions(notice_id, subject_id, statement) values('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', 'Original fixture exam question ' || i) returning id into v_q;
    insert into public.study_question_options(question_id, option_label, content, position) values(v_q, 'A', 'Certo', 1) returning id into v_o;
    insert into public.study_question_options(question_id, option_label, content, position) values(v_q, 'B', 'Errado', 2);
    insert into public.study_question_answer_keys(question_id, correct_option_id) values(v_q, v_o);
    insert into public.study_question_editorial_details(question_id, explanation) values(v_q, 'Fixture explanation.');
    update public.study_questions set status = 'published' where id = v_q;
  end loop;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ declare v_session jsonb; v_retry jsonb; v_sid uuid; v_option uuid; begin
  v_session := public.start_exam_session('66666666-6666-4666-8666-666666666666', null, 10);
  v_sid := (v_session->>'id')::uuid;
  perform set_config('test.exam_id', v_sid::text, true);
  if jsonb_array_length(v_session->'questions') <> 10 or v_session->>'status' <> 'active' then raise exception 'Invalid start'; end if;
  if exists(select 1 from jsonb_array_elements(v_session->'questions') x where x->'result' <> 'null'::jsonb or x->'question' ? 'correctOptionId' or x->'question' ? 'explanation') then raise exception 'Answer leak before submission'; end if;
  v_retry := public.start_exam_session('66666666-6666-4666-8666-666666666666', null, 10);
  if v_retry->>'id' <> v_session->>'id' or v_retry->>'expiresAt' <> v_session->>'expiresAt' or v_retry->'questions' <> v_session->'questions' then raise exception 'Retry reset timer/order'; end if;
  begin
    perform public.start_exam_session(gen_random_uuid(), null, 10);
    raise exception 'Multiple active sessions allowed';
  exception when check_violation then null; end;
  begin
    perform public.start_exam_session('66666666-6666-4666-8666-666666666666', null, 20);
    raise exception 'Request reused with different config';
  exception when invalid_parameter_value then null; end;
  begin
    update public.exam_sessions set expires_at = clock_timestamp() + interval '1 day' where id = v_sid;
    raise exception 'Student can extend deadline';
  exception when insufficient_privilege then null; end;
  begin
    update public.exam_session_items set result = '{"isCorrect":true}' where session_id = v_sid;
    raise exception 'Student can forge score';
  exception when insufficient_privilege then null; end;
  select (o->>'id')::uuid into v_option from jsonb_array_elements(v_session->'questions'->0->'question'->'options') o where o->>'content' = 'Certo';
  v_session := public.answer_exam_session(v_sid, 1, v_option);
  v_retry := public.answer_exam_session(v_sid, 1, v_option);
  if (v_session->>'answeredCount')::integer <> 1 or (v_retry->>'score')::numeric <> 10 then raise exception 'Wrong score denominator'; end if;
  if (select count(*) from public.question_attempts) <> 1 then raise exception 'Retry duplicated attempt'; end if;
  if (select answered_count from public.exam_sessions where id = v_sid) <> 1 then raise exception 'Summary counters not saved'; end if;
  select (o->>'id')::uuid into v_option from jsonb_array_elements(v_session->'questions'->0->'question'->'options') o where o->>'content' = 'Errado';
  begin
    perform public.answer_exam_session(v_sid, 1, v_option);
    raise exception 'Confirmed answer changed';
  exception when check_violation then null; end;
  begin
    perform public.answer_exam_session(v_sid, 2, v_option);
    raise exception 'Cross-question option accepted';
  exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ declare v_sid uuid := current_setting('test.exam_id')::uuid; begin
  if exists(select 1 from public.exam_sessions) or exists(select 1 from public.exam_session_items) then raise exception 'RLS leaked other account'; end if;
  begin perform public.get_exam_session(v_sid); raise exception 'Cross-user read'; exception when no_data_found then null; end;
  begin perform public.answer_exam_session(v_sid, 1, gen_random_uuid()); raise exception 'Cross-user answer'; exception when no_data_found then null; end;
  begin perform public.finish_exam_session(v_sid); raise exception 'Cross-user finish'; exception when no_data_found then null; end;
end $$;
reset role;
-- Archive an unanswered question: session snapshots and grading remain available.
update public.study_questions set status = 'archived' where id = (select question_id from public.exam_session_items where session_id = current_setting('test.exam_id')::uuid and position = 2);
do $$ declare v_q uuid; begin
  select question_id into v_q from public.exam_session_items where session_id = current_setting('test.exam_id')::uuid and position = 2;
  begin update public.study_questions set statement = 'Changed after exam start.' where id = v_q; raise exception 'Session version changed'; exception when check_violation then null; end;
  begin update public.study_question_options set content = 'Changed' where question_id = v_q; raise exception 'Session options changed'; exception when check_violation then null; end;
  begin update public.study_question_editorial_details set explanation = 'Changed' where question_id = v_q; raise exception 'Session explanation changed'; exception when check_violation then null; end;
  begin delete from public.study_question_answer_keys where question_id = v_q; raise exception 'Session key removed'; exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ declare v_session jsonb; v_option uuid; begin
  v_session := public.get_exam_session(current_setting('test.exam_id')::uuid);
  select (o->>'id')::uuid into v_option from jsonb_array_elements(v_session->'questions'->1->'question'->'options') o where o->>'content' = 'Certo';
  v_session := public.answer_exam_session((v_session->>'id')::uuid, 2, v_option);
  if (v_session->>'answeredCount')::integer <> 2 then raise exception 'Archived question lost'; end if;
end $$;
reset role;
update public.exam_sessions set started_at = clock_timestamp() - interval '2 hours', expires_at = clock_timestamp() - interval '1 minute' where id = current_setting('test.exam_id')::uuid;
set local role authenticated;
do $$ declare v_session jsonb; v_option uuid; v_finished text; begin
  v_session := public.get_exam_session(current_setting('test.exam_id')::uuid);
  if v_session->>'status' <> 'expired' then raise exception 'Expiry not enforced'; end if;
  v_finished := v_session->>'finishedAt';
  select (o->>'id')::uuid into v_option from jsonb_array_elements(v_session->'questions'->2->'question'->'options') o where o->>'content' = 'Certo';
  v_session := public.answer_exam_session((v_session->>'id')::uuid, 3, v_option);
  if (v_session->>'answeredCount')::integer <> 2 or (v_session->>'score')::numeric <> 20 then raise exception 'Late answer accepted'; end if;
  v_session := public.finish_exam_session((v_session->>'id')::uuid);
  if v_session->>'finishedAt' <> v_finished then raise exception 'Finish retry changed result'; end if;
  begin
    perform public.start_exam_session(gen_random_uuid(), '77777777-7777-4777-8777-777777777777', 10);
    raise exception 'Insufficient bank allowed';
  exception when invalid_parameter_value then null; end;
  v_session := public.start_exam_session(gen_random_uuid(), null, 10);
  v_session := public.finish_exam_session((v_session->>'id')::uuid);
  if v_session->>'status' <> 'completed' or (v_session->>'score')::numeric <> 0 then raise exception 'Empty completion incorrect'; end if;
  select (o->>'id')::uuid into v_option from jsonb_array_elements(v_session->'questions'->0->'question'->'options') o limit 1;
  v_session := public.answer_exam_session((v_session->>'id')::uuid, 1, v_option);
  if (v_session->>'answeredCount')::integer <> 0 then raise exception 'Completed exam accepted answer'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.get_exam_session(gen_random_uuid()); raise exception 'Anonymous execute'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo 'PASS: exam isolation, deadline, immutable versions, idempotency, grading and persisted results'
