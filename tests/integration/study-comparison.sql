\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('88888888-8888-4888-8888-888888888888');
insert into auth.users(id) select (lpad(i::text,8,'0')||'-1111-4111-8111-111111111111')::uuid from generate_series(3,16) i;
insert into public.study_contests(id,slug,title,status) values('33333333-3333-4333-8333-333333333333','comparison-test','Comparison objective','published'),('77777777-7777-4777-8777-777777777777','comparison-other','Other objective','published');
insert into public.study_notices(id,contest_id,title) values('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Comparison notice');
insert into public.study_subjects(id,name) values('55555555-5555-4555-8555-555555555555','Comparison subject');
insert into public.study_notice_subjects(notice_id,subject_id) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
update public.study_notices set status='published' where id='44444444-4444-4444-8444-444444444444';
insert into public.study_goals(user_id,contest_id) select id,case when id in ('00000012-1111-4111-8111-111111111111','00000016-1111-4111-8111-111111111111') then '77777777-7777-4777-8777-777777777777'::uuid else '33333333-3333-4333-8333-333333333333'::uuid end from auth.users where id<>'88888888-8888-4888-8888-888888888888';
insert into public.study_comparison_preferences(user_id,enabled,consent_version) select id,true,'2026-11-v1' from auth.users where id not in ('11111111-1111-4111-8111-111111111111','00000013-1111-4111-8111-111111111111','88888888-8888-4888-8888-888888888888');
create temporary table comparison_fixture_questions(position integer,question_id uuid,correct_option uuid,wrong_option uuid);
do $$ declare v_q uuid;v_correct uuid;v_wrong uuid;v_user uuid;v_first timestamptz;v_time timestamptz;v_truth boolean;begin
 v_first:=date_trunc('month',clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 for pos in 1..20 loop
  insert into public.study_questions(notice_id,subject_id,statement,created_at) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','Comparison reference question '||pos,clock_timestamp()+make_interval(secs=>pos)) returning id into v_q;
  insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'A','Correct',1) returning id into v_correct;
  insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'B','Wrong',2) returning id into v_wrong;
  insert into public.study_question_answer_keys(question_id,correct_option_id) values(v_q,v_correct);
  insert into public.study_question_editorial_details(question_id,explanation) values(v_q,'Comparison fixture.');
  update public.study_questions set status='published' where id=v_q;
  insert into comparison_fixture_questions values(pos,v_q,v_correct,v_wrong);
  for person in 1..15 loop
   v_user:=case when person=1 then '11111111-1111-4111-8111-111111111111'::uuid when person=2 then '22222222-2222-4222-8222-222222222222'::uuid else (lpad(person::text,8,'0')||'-1111-4111-8111-111111111111')::uuid end;
   if person=2 and pos=20 then continue;end if;
   v_truth:=case when person=1 then pos<=10 when person=2 then false when person>=12 then false else true end;
   v_time:=case when person=14 then v_first-interval '1 second' when person=15 then clock_timestamp()+interval '1 day' else v_first end;
   insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at) values(v_user,v_q,case when v_truth then v_correct else v_wrong end,v_truth,gen_random_uuid(),v_time);
   if person=1 then
    insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at) values(v_user,v_q,v_correct,true,gen_random_uuid(),clock_timestamp());
   end if;
  end loop;
 end loop;
end $$;
-- Repetition must not turn 19 distinct questions into a complete caderno.
insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key) select '22222222-2222-4222-8222-222222222222',question_id,correct_option,true,gen_random_uuid() from comparison_fixture_questions cross join generate_series(1,10) where position=1;
-- FIXTURE END
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_data jsonb;begin
 v_data:=public.get_study_comparison();
 if v_data->>'status'<>'disabled' or (v_data->>'enabled')::boolean then raise exception 'Default participation enabled';end if;
 if exists(select 1 from public.study_comparison_preferences) then raise exception 'Read created consent';end if;
 begin perform public.set_study_comparison_participation(true,null);raise exception 'Missing consent accepted';exception when invalid_parameter_value then null;end;
 begin perform public.set_study_comparison_participation(true,'old');raise exception 'Old consent accepted';exception when invalid_parameter_value then null;end;
 perform public.set_study_comparison_participation(true,'2026-11-v1');
 v_data:=public.get_study_comparison();
 if v_data->>'status'<>'insufficient_group' or (v_data->>'yourAnswered')::integer<>20 or (v_data->>'yourAccuracy')::numeric<>50 or v_data->'peerAverage'<>'null'::jsonb then raise exception 'Sample gate or first response rule failed';end if;
 if jsonb_array_length(v_data->'questions')<>20 then raise exception 'Reference size wrong';end if;
 if (select count(*) from public.study_comparison_preferences)<>1 then raise exception 'Preferences leaked';end if;
 begin select count(*) into strict v_data from comparison_private.reference_sets;raise exception 'Private set readable';exception when insufficient_privilege then null;end;
 begin update public.study_comparison_preferences set enabled=false;raise exception 'Direct consent write allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into public.question_attempts(user_id,question_id,selected_option_id,is_correct,idempotency_key,submitted_at) select '22222222-2222-4222-8222-222222222222',question_id,wrong_option,false,gen_random_uuid(),clock_timestamp() from comparison_fixture_questions where position=20;
set local role authenticated;
do $$ declare v_data jsonb;begin
 v_data:=public.get_study_comparison();
 if v_data->>'status'<>'ready' or (v_data->>'peerAverage')::numeric<>90 or (v_data->>'yourAccuracy')::numeric<>50 then raise exception 'Complete cohort wrong or self included';end if;
 if v_data ?| array['peerCount','participants','users','peerScores','rank','percentile'] or v_data::text like '%22222222-2222-4222-8222-222222222222%' then raise exception 'Peer identity/count/individual result leaked';end if;
 perform public.set_study_comparison_participation(false,null);
 v_data:=public.get_study_comparison();
 if v_data->>'status'<>'disabled' or v_data->'peerAverage'<>'null'::jsonb or jsonb_array_length(v_data->'questions')<>0 then raise exception 'Withdrawal did not hide comparison';end if;
 perform public.set_study_comparison_participation(true,'2026-11-v1');
end $$;
reset role;
update public.question_attempts a set is_correct=true,selected_option_id=f.correct_option
from comparison_fixture_questions f where a.user_id='22222222-2222-4222-8222-222222222222' and a.question_id=f.question_id
 and f.position<=6 and a.submitted_at=(date_trunc('month',clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
set local role authenticated;
do $$ begin if (public.get_study_comparison()->>'peerAverage')::numeric<>95 then raise exception 'Peer average not rounded to five points';end if;end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.set_study_comparison_participation(false,null);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_data jsonb;begin
 v_data:=public.get_study_comparison();if v_data->>'status'<>'insufficient_group' or v_data->'peerAverage'<>'null'::jsonb then raise exception 'Peer withdrawal not reflected';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.set_study_comparison_participation(true,'2026-11-v1');
reset role;
-- New published content must not change an existing monthly reference.
do $$ declare v_q uuid;v_o uuid;begin
 insert into public.study_questions(notice_id,subject_id,statement,created_at) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','New older-sorted question should not change this month.',clock_timestamp()-interval '1 year') returning id into v_q;
 insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'A','Yes',1) returning id into v_o;
 insert into public.study_question_options(question_id,option_label,content,position) values(v_q,'B','No',2);
 insert into public.study_question_answer_keys(question_id,correct_option_id) values(v_q,v_o);
 update public.study_questions set status='published' where id=v_q;
 perform set_config('test.extra_question',v_q::text,true);
end $$;
set local role authenticated;
do $$ declare v_data jsonb;begin
 v_data:=public.get_study_comparison();
 if v_data->>'status'<>'ready' or exists(select 1 from jsonb_array_elements(v_data->'questions') q where q->>'id'=current_setting('test.extra_question')) then raise exception 'Monthly reference changed';end if;
end $$;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
select public.set_study_comparison_participation(true,'2026-11-v1');
do $$ begin if public.get_study_comparison()->>'status'<>'missing_goal' then raise exception 'Missing goal gate failed';end if;end $$;
select set_config('request.jwt.claim.sub','00000016-1111-4111-8111-111111111111',true);
do $$ begin if public.get_study_comparison()->>'status'<>'insufficient_questions' then raise exception 'Missing questions gate failed';end if;end $$;
select set_config('request.jwt.claim.sub','00000015-1111-4111-8111-111111111111',true);
do $$ declare v_data jsonb;begin v_data:=public.get_study_comparison();if v_data->>'status'<>'incomplete_reference' or (v_data->>'yourAnswered')::integer<>0 then raise exception 'Future attempts included';end if;end $$;
select set_config('request.jwt.claim.sub','00000014-1111-4111-8111-111111111111',true);
do $$ declare v_data jsonb;begin v_data:=public.get_study_comparison();if v_data->>'status'<>'incomplete_reference' or (v_data->>'yourAnswered')::integer<>0 then raise exception 'Past-month attempts included';end if;end $$;
reset role;
update public.study_questions set status='archived' where id=(select question_id from comparison_fixture_questions where position=1);
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_data jsonb;begin v_data:=public.get_study_comparison();if v_data->>'status'<>'reference_unavailable' or v_data->'peerAverage'<>'null'::jsonb or jsonb_array_length(v_data->'questions')<>0 then raise exception 'Unavailable reference leaked';end if;end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin begin perform public.get_study_comparison();raise exception 'Missing identity accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
set local role anon;
do $$ begin begin perform public.get_study_comparison();raise exception 'Anonymous comparison';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
\echo 'PASS: opt-in, matched monthly reference, sample threshold, first answers, withdrawal and private aggregate surface'
