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
  for i in 1..8 loop
    insert into public.study_questions(notice_id, subject_id, statement) values('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', 'Original fixture exam question ' || i) returning id into v_q;
    insert into public.study_question_options(question_id, option_label, content, position) values(v_q, 'A', 'Certo', 1) returning id into v_o;
    insert into public.study_question_options(question_id, option_label, content, position) values(v_q, 'B', 'Errado', 2);
    insert into public.study_question_answer_keys(question_id, correct_option_id) values(v_q, v_o);
    insert into public.study_question_editorial_details(question_id, explanation) values(v_q, 'Fixture explanation.');
    update public.study_questions set status = 'published' where id = v_q;
  end loop;
end $$;

insert into public.study_subjects(id, name) values ('77777777-7777-4777-8777-777777777777', 'Other subject');
insert into public.study_topics(id, subject_id, name) values
  ('88888888-8888-4888-8888-888888888888', '55555555-5555-4555-8555-555555555555', 'Selected topic'),
  ('99999999-9999-4999-8999-999999999999', '77777777-7777-4777-8777-777777777777', 'Other topic');
-- Half the eight published questions belong to the requested topic.
update public.study_questions set topic_id = '88888888-8888-4888-8888-888888888888'
  where id in (select id from public.study_questions where notice_id = '44444444-4444-4444-8444-444444444444' order by id limit 4);
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
declare s jsonb; retry jsonb; sid uuid; option_id uuid; before_count integer;
  subject uuid := '55555555-5555-4555-8555-555555555555';
  topic uuid := '88888888-8888-4888-8888-888888888888';
  contest uuid := '33333333-3333-4333-8333-333333333333';
  request uuid := gen_random_uuid();
begin
  if (public.get_exam_availability(contest, subject, null)->>'available')::int <> 8 then raise exception 'Wrong subject count'; end if;
  if public.get_exam_availability(contest, subject, topic) <> '{"available":4,"maxQuestions":4}'::jsonb then raise exception 'Wrong topic count'; end if;
  if (public.get_exam_availability(contest, '77777777-7777-4777-8777-777777777777', null)->>'available')::int <> 0 then raise exception 'Empty subject mixed questions'; end if;
  begin perform public.get_exam_availability(null, subject, '99999999-9999-4999-8999-999999999999'); raise exception 'Unrelated topic accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.get_exam_availability(null, null, topic); raise exception 'Topic without subject'; exception when invalid_parameter_value then null; end;
  begin perform public.get_exam_availability(gen_random_uuid(), null, null); raise exception 'Unknown contest'; exception when invalid_parameter_value then null; end;
  before_count := (select count(*) from public.exam_sessions);
  begin perform public.start_filtered_exam_session(request, contest, subject, topic, 5); raise exception 'Insufficient topic count accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.start_filtered_exam_session(request, contest, subject, null, 21); raise exception 'Oversized count'; exception when invalid_parameter_value then null; end;
  begin perform public.start_filtered_exam_session(request, contest, subject, null, 0); raise exception 'Empty exam'; exception when invalid_parameter_value then null; end;
  if (select count(*) from public.exam_sessions) <> before_count then raise exception 'Rejected configuration created session'; end if;
  s := public.start_filtered_exam_session(request, contest, subject, topic, 4);
  sid := (s->>'id')::uuid;
  if s->>'subjectId' <> subject::text or s->>'topicId' <> topic::text or s->>'contestId' <> contest::text then raise exception 'Filters not persisted'; end if;
  if jsonb_array_length(s->'questions') <> 4 or (s->>'expiresAt')::timestamptz - (s->>'startedAt')::timestamptz <> interval '24 minutes' then raise exception 'Wrong exam size or duration'; end if;
  if exists(select 1 from public.exam_session_items i join public.study_questions q on q.id = i.question_id where i.session_id = sid and (q.subject_id <> subject or q.topic_id is distinct from topic)) then raise exception 'Cross-filter question'; end if;
  retry := public.start_filtered_exam_session(request, contest, subject, topic, 4);
  if retry->'questions' <> s->'questions' or retry->>'expiresAt' <> s->>'expiresAt' then raise exception 'Retry reset exam'; end if;
  begin perform public.start_filtered_exam_session(request, contest, subject, null, 4); raise exception 'Retry changed topic'; exception when invalid_parameter_value then null; end;
  begin perform public.start_filtered_exam_session(request, null, subject, topic, 4); raise exception 'Retry changed contest'; exception when invalid_parameter_value then null; end;
  begin perform public.start_filtered_exam_session(request, contest, '77777777-7777-4777-8777-777777777777', null, 4); raise exception 'Retry changed subject'; exception when invalid_parameter_value then null; end;
  select (o->>'id')::uuid into option_id from jsonb_array_elements(s->'questions'->0->'question'->'options') o where o->>'content' = 'Certo';
  s := public.answer_exam_session(sid, 1, option_id);
  if (s->>'score')::numeric <> 25 then raise exception 'Wrong filtered exam denominator'; end if;
  perform public.finish_exam_session(sid);
  s := public.start_filtered_exam_session(gen_random_uuid(), contest, subject, null, 8);
  if jsonb_array_length(s->'questions') <> 8 then raise exception 'Full subject failed'; end if;
  perform public.finish_exam_session((s->>'id')::uuid);
  s := public.start_filtered_exam_session(gen_random_uuid(), contest, subject, topic, 1);
  if (s->>'expiresAt')::timestamptz - (s->>'startedAt')::timestamptz <> interval '6 minutes' then raise exception 'Small exam duration'; end if;
  perform set_config('test.filtered_exam_id', s->>'id', true);
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
  if exists(select 1 from public.exam_sessions) then raise exception 'Cross-account session leak'; end if;
  begin perform public.get_exam_session(current_setting('test.filtered_exam_id')::uuid); raise exception 'Cross-account RPC read'; exception when no_data_found then null; end;
end $$;
-- A browser role with no subject must still fail inside each definer entry point.
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin perform public.get_exam_availability(null, null, null); raise exception 'Missing identity accepted'; exception when insufficient_privilege then null; end;
  begin perform public.start_filtered_exam_session(gen_random_uuid(), null, null, null, 1); raise exception 'Missing identity start'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.get_exam_availability(uuid,uuid,uuid)', 'execute')
    or has_function_privilege('anon', 'public.start_filtered_exam_session(uuid,uuid,uuid,uuid,integer)', 'execute')
    or has_function_privilege('authenticated', 'exam_private.validate_filters(uuid,uuid,uuid)', 'execute') then raise exception 'Unexpected function grant'; end if;
end $$;
rollback;
