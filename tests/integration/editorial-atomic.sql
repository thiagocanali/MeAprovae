-- Disposable loopback PostgreSQL only. Every fixture is rolled back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('99999999-9999-4999-8999-999999999999');
insert into public.platform_admins(user_id,role) values
 ('11111111-1111-4111-8111-111111111111','editor'),
 ('99999999-9999-4999-8999-999999999999','owner');
insert into public.study_contests(id,slug,title,status) values
 ('33333333-3333-4333-8333-333333333333','atomic-test','Atomic editorial test','published');
insert into public.study_notices(id,contest_id,title) values
 ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Atomic notice');
insert into public.study_subjects(id,name) values ('55555555-5555-4555-8555-555555555555','Atomic subject');
insert into public.study_notice_subjects(notice_id,subject_id) values
 ('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
insert into public.study_topics(id,subject_id,name) values
 ('77777777-7777-4777-8777-777777777777','55555555-5555-4555-8555-555555555555','Atomic topic');
update public.study_notices set status='published' where id='44444444-4444-4444-8444-444444444444';
create function pg_temp.atomic_fields(p_statement text) returns jsonb language sql as $$
 select jsonb_build_object('notice_id','44444444-4444-4444-8444-444444444444',
 'subject_id','55555555-5555-4555-8555-555555555555','statement',p_statement)
$$;
do $$ begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname in ('create_editorial_question','update_editorial_question') and p.prosecdef)
 then raise exception 'Editorial RPC must be invoker'; end if;
 if has_function_privilege('anon','public.create_editorial_question(jsonb,text)','execute')
 or has_function_privilege('anon','public.update_editorial_question(uuid,jsonb,text,boolean)','execute')
 then raise exception 'Anonymous RPC exposure'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.create_editorial_question('{}'); raise exception 'Anon create allowed';
 exception when insufficient_privilege then null; end;
 begin perform public.update_editorial_question(gen_random_uuid(),'{}'); raise exception 'Anon update allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform public.create_editorial_question('{}'); raise exception 'Missing auth allowed';
 exception when invalid_authorization_specification then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 begin perform public.create_editorial_question(pg_temp.atomic_fields('Student must not create.')); raise exception 'Student create allowed';
 exception when insufficient_privilege then null; end;
 begin perform public.update_editorial_question(gen_random_uuid(),'{"statement":"Student update forbidden."}'); raise exception 'Student update allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_q jsonb; v_id uuid; v_count bigint; v_audit bigint; v_result jsonb;
begin
 v_q:=public.create_editorial_question(pg_temp.atomic_fields('A complete atomic draft question.'),'Original explanation.');
 v_id:=(v_q->>'id')::uuid;
 perform set_config('test.atomic_id',v_id::text,true);
 if v_q->>'status'<>'draft' or v_q->>'difficulty'<>'medium'
 or (v_q->>'difficulty_reviewed')::boolean is not false
 or v_q->>'explanation'<>'Original explanation.' then raise exception 'Create contract changed'; end if;
 if not exists(select 1 from public.study_question_editorial_details where question_id=v_id and explanation='Original explanation.')
 then raise exception 'Missing protected details'; end if;
 select count(*) into v_count from public.study_questions;
 select count(*) into v_audit from public.editorial_audit_log;
 -- The question and its audit row are inserted before the details CHECK fails.
 begin
  perform public.create_editorial_question(pg_temp.atomic_fields('This creation must fully roll back.'),repeat('x',12001));
  raise exception 'Long explanation accepted';
 exception when check_violation then null; end;
 if (select count(*) from public.study_questions)<>v_count
 or (select count(*) from public.editorial_audit_log)<>v_audit
 or (select count(*) from public.study_question_editorial_details)<>1
 then raise exception 'Create left partial content or audit'; end if;
 begin
  perform public.update_editorial_question(v_id,'{"statement":"This changed statement must roll back."}',repeat('x',12001),true);
  raise exception 'Long patch explanation accepted';
 exception when check_violation then null; end;
 if (select statement from public.study_questions where id=v_id)<>'A complete atomic draft question.'
 or (select explanation from public.study_question_editorial_details where question_id=v_id)<>'Original explanation.'
 or (select count(*) from public.editorial_audit_log)<>v_audit
 then raise exception 'PATCH left partial content or audit'; end if;
 v_result:=public.update_editorial_question(v_id,'{}','Explanation-only update.',true);
 if v_result->>'explanation'<>'Explanation-only update.' then raise exception 'Explanation-only PATCH failed'; end if;
 v_result:=public.update_editorial_question(v_id,'{"statement":"Metadata-only update keeps explanation."}');
 if v_result ? 'explanation' or (select explanation from public.study_question_editorial_details where question_id=v_id)<>'Explanation-only update.'
 then raise exception 'Omitted explanation was overwritten'; end if;
 v_result:=public.update_editorial_question(v_id,'{"statement":"Both pieces updated in one transaction."}','Combined explanation.',true);
 if v_result->>'statement'<>'Both pieces updated in one transaction.' or v_result->>'explanation'<>'Combined explanation.'
 then raise exception 'Combined PATCH failed'; end if;
 perform public.update_editorial_question(v_id,'{"topic_id":"77777777-7777-4777-8777-777777777777","source_url":"https://example.org/source","source_year":2026,"difficulty":"easy","difficulty_reviewed":true}');
 v_result:=public.update_editorial_question(v_id,'{"topic_id":null,"source_url":null,"source_year":null,"difficulty":"hard"}');
 if v_result->'topic_id'<>'null'::jsonb or v_result->'source_url'<>'null'::jsonb or v_result->'source_year'<>'null'::jsonb
 or (v_result->>'difficulty_reviewed')::boolean is not false then raise exception 'Nullable PATCH/difficulty reset failed'; end if;
 v_result:=public.update_editorial_question(v_id,'{}','',true);
 if v_result->>'explanation'<>'' then raise exception 'Explicit empty explanation failed'; end if;
 begin perform public.update_editorial_question(v_id,'{}'); raise exception 'Empty PATCH allowed';
 exception when invalid_parameter_value then null; end;
 begin perform public.update_editorial_question(v_id,'{"user_id":"22222222-2222-4222-8222-222222222222"}'); raise exception 'Unknown fields allowed';
 exception when invalid_parameter_value then null; end;
 begin perform public.create_editorial_question(pg_temp.atomic_fields('Published creation not allowed.')||'{"status":"published"}'); raise exception 'Create bypasses draft';
 exception when invalid_parameter_value then null; end;
 begin perform public.update_editorial_question(gen_random_uuid(),'{"statement":"Missing question must not be created."}'); raise exception 'Missing ID accepted';
 exception when no_data_found then null; end;
 begin perform public.update_editorial_question(v_id,'{"status":"published"}'); raise exception 'Incomplete publication allowed';
 exception when check_violation then null; end;
end $$;
-- Add options and publish a valid question, then record a real student attempt.
insert into public.study_question_options(question_id,option_label,content,position) values
 (current_setting('test.atomic_id')::uuid,'A','Correct option',1),
 (current_setting('test.atomic_id')::uuid,'B','Other option',2);
insert into public.study_question_answer_keys(question_id,correct_option_id)
 select question_id,id from public.study_question_options where question_id=current_setting('test.atomic_id')::uuid and option_label='A';
select public.update_editorial_question(current_setting('test.atomic_id')::uuid,'{"status":"published"}');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select public.submit_question_attempt(current_setting('test.atomic_id')::uuid,
 (select id from public.study_question_options where question_id=current_setting('test.atomic_id')::uuid and option_label='A'),gen_random_uuid());
do $$ begin
 if exists(select 1 from public.study_question_editorial_details) or exists(select 1 from public.study_question_answer_keys)
 then raise exception 'Student can read protected content'; end if;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_id uuid:=current_setting('test.atomic_id')::uuid; v_before bigint;
begin
 select count(*) into v_before from public.editorial_audit_log;
 begin perform public.update_editorial_question(v_id,'{"statement":"History must prevent this change."}','Changed explanation.',true); raise exception 'History edited';
 exception when check_violation then null; end;
 begin perform public.update_editorial_question(v_id,'{}','Changed explanation.',true); raise exception 'Explanation history edited';
 exception when check_violation then null; end;
 if (select count(*) from public.editorial_audit_log)<>v_before then raise exception 'Rejected history edit left audit'; end if;
 perform public.update_editorial_question(v_id,'{"status":"archived"}');
end $$;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
do $$ declare v_q jsonb; begin
 v_q:=public.create_editorial_question(pg_temp.atomic_fields('Owner can create an atomic draft.'),'Owner explanation.');
 perform public.update_editorial_question((v_q->>'id')::uuid,'{}','Owner updated explanation.',true);
end $$;
reset role;
rollback;
\echo 'PASS: atomic editorial create/PATCH, rollback of audit, roles, nullable fields, difficulty, publication and history'
