\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('88888888-8888-4888-8888-888888888888');
insert into public.study_contests(id,slug,title,status) values('33333333-3333-4333-8333-333333333333','performance-test','Performance test','published');
insert into public.study_notices(id,contest_id,title) values('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Performance notice');
insert into public.study_subjects(id,name) values('55555555-5555-4555-8555-555555555555','Performance subject');
insert into public.study_notice_subjects(notice_id,subject_id) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
update public.study_notices set status='published' where id='44444444-4444-4444-8444-444444444444';
do $$ declare v_q uuid; v_correct uuid; v_wrong uuid; v_boundary timestamptz; begin
 v_boundary:=((clock_timestamp() at time zone 'UTC')::date - 1)::timestamp at time zone 'UTC';
 v_boundary:=v_boundary+interval '30 minutes';
 insert into public.study_questions(notice_id,subject_id,statement) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','Archived performance question.') returning id into v_q;
 insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'A','Correct',1) returning id into v_correct;
 insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'B','Wrong',2) returning id into v_wrong;
 insert into public.study_question_answer_keys(question_id,correct_option_id) values(v_q,v_correct);
 insert into public.study_question_editorial_details(question_id,explanation) values(v_q,'Correct fixture.');
 update public.study_questions set status='published' where id=v_q;
 insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at)
 select '11111111-1111-4111-8111-111111111111',v_q,case when i%4=0 then v_wrong else v_correct end,i%4<>0,gen_random_uuid(),clock_timestamp()-interval '2 seconds' from generate_series(1,1100) i;
 insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at)
 values('11111111-1111-4111-8111-111111111111',v_q,v_correct,true,gen_random_uuid(),v_boundary);
 update public.study_questions set status='archived' where id=v_q;
 insert into public.study_questions(notice_id,subject_id,statement) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','Visible performance question.') returning id into v_q;
 insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'A','Correct',1) returning id into v_correct;
 insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'B','Wrong',2) returning id into v_wrong;
 insert into public.study_question_answer_keys(question_id,correct_option_id) values(v_q,v_correct);
 insert into public.study_question_editorial_details(question_id,explanation) values(v_q,'Correct fixture.');
 update public.study_questions set status='published' where id=v_q;
 insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at)
 select '11111111-1111-4111-8111-111111111111',v_q,case when i%2=0 then v_correct else v_wrong end,i%2=0,gen_random_uuid(),clock_timestamp()-interval '1 second' from generate_series(1,10) i;
 insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at) values
 ('11111111-1111-4111-8111-111111111111',v_q,v_correct,true,gen_random_uuid(),clock_timestamp()+interval '1 day'),
 ('11111111-1111-4111-8111-111111111111',v_q,v_correct,true,gen_random_uuid(),clock_timestamp()-interval '100 days'),
 ('22222222-2222-4222-8222-222222222222',v_q,v_correct,true,gen_random_uuid(),clock_timestamp()-interval '1 second');
end $$;
insert into public.exam_sessions(user_id,request_id,question_count,answered_count,correct_count,started_at,expires_at,finished_at,status) values
('11111111-1111-4111-8111-111111111111',gen_random_uuid(),10,10,5,clock_timestamp()-interval '2 hours',clock_timestamp()+interval '1 hour',clock_timestamp()-interval '50 minutes','completed'),
('11111111-1111-4111-8111-111111111111',gen_random_uuid(),20,20,15,clock_timestamp()-interval '2 hours',clock_timestamp()+interval '1 hour',clock_timestamp()-interval '25 minutes','completed'),
('11111111-1111-4111-8111-111111111111',gen_random_uuid(),10,1,1,clock_timestamp()-interval '3 hours',clock_timestamp()-interval '10 minutes',null,'active'),
('22222222-2222-4222-8222-222222222222',gen_random_uuid(),10,10,10,clock_timestamp()-interval '2 hours',clock_timestamp()+interval '1 hour',clock_timestamp()-interval '25 minutes','completed');
-- FIXTURE END: all following checks roll back with the fixtures above.
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_data jsonb; v_utc jsonb; v_local jsonb; v_boundary timestamptz; v_local_day text; v_utc_day text; begin
 v_data:=public.get_student_performance(7,'America/Sao_Paulo');
 if jsonb_array_length(v_data->'days')<>7 then raise exception 'Calendar missing days';end if;
 if (v_data->'totals'->>'attempts')::integer<>1111 or (v_data->'totals'->>'correct')::integer<>831 then raise exception 'Sampling, ownership or period filter incorrect';end if;
 if (select sum((d->>'attempts')::integer) from jsonb_array_elements(v_data->'days') d)<>1111 then raise exception 'Daily totals mismatch';end if;
 if (select sum((s->>'attempts')::integer) from jsonb_array_elements(v_data->'performanceBySubject') s)<>1111 then raise exception 'Archived attempts disappeared';end if;
 if not exists(select 1 from jsonb_array_elements(v_data->'performanceBySubject') s where s->'subjectId'='null'::jsonb and (s->>'attempts')::integer=1101) then raise exception 'Hidden-content bucket missing';end if;
 if (v_data->'examSummary'->>'count')::integer<>3 or (v_data->'examSummary'->>'averageScore')::numeric<>45 or (v_data->'examSummary'->>'bestScore')::numeric<>75 then raise exception 'Incorrect exam summary';end if;
 if jsonb_array_length(v_data->'recentExams')<>3 or v_data->'recentExams'->2->>'status'<>'expired' then raise exception 'Expired session missing';end if;
 v_utc:=public.get_student_performance(7,'UTC');
 v_boundary:=((clock_timestamp() at time zone 'UTC')::date-1)::timestamp at time zone 'UTC'+interval '30 minutes';
 v_local_day:=((v_boundary at time zone 'America/Sao_Paulo')::date)::text;
 v_utc_day:=((v_boundary at time zone 'UTC')::date)::text;
 if v_local_day=v_utc_day then raise exception 'Invalid timezone fixture';end if;
 if not exists(select 1 from jsonb_array_elements(v_data->'days') d where d->>'date'=v_local_day and (d->>'attempts')::integer>=1) then raise exception 'São Paulo boundary wrong';end if;
 if not exists(select 1 from jsonb_array_elements(v_utc->'days') d where d->>'date'=v_utc_day and (d->>'attempts')::integer>=1) then raise exception 'UTC boundary wrong';end if;
 if jsonb_array_length(public.get_student_performance(90,'UTC')->'days')<>90 then raise exception '90-day period wrong';end if;
 begin perform public.get_student_performance(365,'UTC');raise exception 'Invalid period accepted';exception when invalid_parameter_value then null;end;
 begin perform public.get_student_performance(7,'Etc/Unknown');raise exception 'Invalid timezone accepted';exception when invalid_parameter_value then null;end;
end $$;
reset role;
update public.exam_sessions set started_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 hour' where user_id='11111111-1111-4111-8111-111111111111' and status='active';
set local role authenticated;
do $$ declare v_data jsonb; begin
 v_data:=public.get_student_performance(30,'UTC');
 if (v_data->'examSummary'->>'count')::integer<>2 or (v_data->'examSummary'->>'averageScore')::numeric<>62.5 then raise exception 'Active session entered average';end if;
end $$;
reset role;
insert into public.exam_sessions(user_id,request_id,question_count,answered_count,correct_count,started_at,expires_at,finished_at,status)
select '11111111-1111-4111-8111-111111111111',gen_random_uuid(),10,10,10,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour',clock_timestamp()-make_interval(secs=>i),'completed' from generate_series(1,25) i;
set local role authenticated;
do $$ declare v_data jsonb; begin
 v_data:=public.get_student_performance(30,'UTC');
 if (v_data->'examSummary'->>'count')::integer<>27 or jsonb_array_length(v_data->'recentExams')<>20 then raise exception 'Chart limit truncated summary';end if;
 if (v_data->'examSummary'->>'averageScore')::numeric<>97.2 then raise exception 'Average did not include every exam';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare v_data jsonb; begin
 v_data:=public.get_student_performance(7,'UTC');
 if (v_data->'totals'->>'attempts')::integer<>1 or (v_data->'examSummary'->>'count')::integer<>1 then raise exception 'Cross-account aggregates leaked';end if;
end $$;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$ declare v_data jsonb; begin
 v_data:=public.get_student_performance(7,'UTC');
 if (v_data->'totals'->>'attempts')::integer<>0 or (v_data->'examSummary'->>'count')::integer<>0 or v_data->'examSummary'->'averageScore'<>'null'::jsonb or v_data->'examSummary'->'bestScore'<>'null'::jsonb then raise exception 'Empty history invented results';end if;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin begin perform public.get_student_performance();raise exception 'Missing identity accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
set local role anon;
do $$ begin begin perform public.get_student_performance();raise exception 'Anonymous execute';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
\echo 'PASS: exact performance aggregates, timezone boundaries, archived attempts, exams and account isolation'
