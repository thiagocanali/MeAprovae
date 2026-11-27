-- Disposable PostgreSQL after all migrations; no fixtures survive this test.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.study_contests(id, slug, title, status) values ('33333333-3333-4333-8333-333333333333', 'account-isolation-test', 'Exam test', 'published');
insert into public.study_notices(id, contest_id, title, status) values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Exam notice', 'draft');
insert into public.study_subjects(id, name) values ('55555555-5555-4555-8555-555555555555', 'Exam subject');
insert into public.study_notice_subjects(notice_id, subject_id) values ('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555');
update public.study_notices set status = 'published' where id = '44444444-4444-4444-8444-444444444444';
do $$ declare v_q uuid; v_o uuid; begin
  for i in 1..20 loop
    insert into public.study_questions(notice_id, subject_id, statement) values('44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555', 'Account isolation fixture question ' || i) returning id into v_q;
    insert into public.study_question_options(question_id, option_label, content, position) values(v_q, 'A', 'Certo', 1) returning id into v_o;
    insert into public.study_question_options(question_id, option_label, content, position) values(v_q, 'B', 'Errado', 2);
    insert into public.study_question_answer_keys(question_id, correct_option_id) values(v_q, v_o);
    insert into public.study_question_editorial_details(question_id, explanation) values(v_q, 'Fixture explanation.');
    update public.study_questions set status = 'published' where id = v_q;
  end loop;
end $$;

-- All identities are synthetic and exist only inside this rollback transaction.
update auth.users set raw_user_meta_data='{"role":"owner","roles":["editor"]}'
 where id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare q uuid; o uuid; session jsonb; begin
 select id into q from public.study_questions limit 1;
 select id into o from public.study_question_options where question_id=q limit 1;
 perform public.submit_question_attempt(q,o,gen_random_uuid());
 insert into public.student_question_favorites(user_id,question_id) values(auth.uid(),q);
 insert into public.student_contests(user_id,contest_id) values(auth.uid(),'33333333-3333-4333-8333-333333333333');
 perform public.set_student_study_goal('33333333-3333-4333-8333-333333333333',null,null);
 perform public.set_study_comparison_participation(true,'2026-11-v1');
 session:=public.start_filtered_exam_session(gen_random_uuid(),null,null,null,2);
 perform set_config('test.isolation_session',session->>'id',true);
 perform set_config('test.isolation_question',q::text,true);
 if (select count(*) from public.question_attempts)<>1 or (select count(*) from public.student_question_favorites)<>1
 or (select count(*) from public.study_goals)<>1 or (select count(*) from public.exam_sessions)<>1
 or (select count(*) from public.exam_session_items)<>2 or (select count(*) from public.study_comparison_preferences)<>1
 then raise exception 'Missing positive ownership controls'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","user_metadata":{"role":"owner"}}',true);
do $$ declare t text; n bigint; a uuid:='11111111-1111-4111-8111-111111111111'; sid uuid:=current_setting('test.isolation_session')::uuid; begin
 if public.has_platform_role('editor') or public.has_platform_role('owner') then raise exception 'Editable metadata granted editorial role'; end if;
 foreach t in array array['question_attempts','student_question_favorites','student_contests','study_goals','exam_sessions','study_comparison_preferences'] loop
   execute format('select count(*) from public.%I where user_id=$1',t) into n using a;
   if n<>0 then raise exception 'Cross-user SELECT on %',t; end if;
 end loop;
 if exists(select 1 from public.exam_session_items where session_id=sid)
 or exists(select 1 from public.student_profiles where id=a) then raise exception 'Cross-user profile/items'; end if;
 if (select count(*) from public.student_profiles where id=auth.uid())<>1 then raise exception 'Own profile hidden'; end if;
 update public.student_profiles set bio='forged' where id=a;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user profile UPDATE'; end if;
 begin update public.student_profiles set id=a where id=auth.uid(); raise exception 'Owner reassignment accepted';
 exception when insufficient_privilege then null; end;
 delete from public.student_question_favorites where user_id=a;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user favorite DELETE'; end if;
 begin insert into public.student_question_favorites(user_id,question_id) values(a,current_setting('test.isolation_question')::uuid); raise exception 'Cross-user favorite INSERT';
 exception when insufficient_privilege then null; end;
 begin perform public.get_exam_session(sid); raise exception 'Cross-user session RPC'; exception when no_data_found then null; end;
 begin perform public.answer_exam_session(sid,1,gen_random_uuid()); raise exception 'Cross-user answer RPC'; exception when no_data_found then null; end;
 begin perform public.finish_exam_session(sid); raise exception 'Cross-user finish RPC'; exception when no_data_found then null; end;
 begin if exists(select 1 from public.study_question_answer_keys) then raise exception 'Direct answer key access'; end if; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.study_question_editorial_details) then raise exception 'Student read editorial explanation'; end if;
 if exists(select 1 from public.editorial_audit_log) then raise exception 'Student read editorial audit'; end if;
 -- Independent preference write belongs to B and cannot change A's consent.
 perform public.set_study_comparison_participation(false,null);
 if (select count(*) from public.study_comparison_preferences)<>1 then raise exception 'Preference ownership failure'; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.study_comparison_preferences where user_id='11111111-1111-4111-8111-111111111111' and enabled)
 or not exists(select 1 from public.student_question_favorites where user_id='11111111-1111-4111-8111-111111111111')
 then raise exception 'B changed A data'; end if;
end $$;
rollback;
