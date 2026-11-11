\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.platform_admins(user_id,role) values('11111111-1111-4111-8111-111111111111','editor');
insert into public.study_contests(id,slug,title) values('33333333-3333-4333-8333-333333333333','content-test','Content test');
insert into public.study_notices(id,contest_id,title) values('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','Original content');
insert into public.study_subjects(id,name) values('55555555-5555-4555-8555-555555555555','Content subject');
insert into public.study_notice_subjects(notice_id,subject_id) values('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
create function pg_temp.content_line(p_id text, p_statement text) returns text language sql as $$
 select jsonb_build_object('externalId',p_id,'statement',p_statement,'subject','Content subject','topic','Topic created by release',
   'sourceLabel','Original AI-assisted content','rights','original','rightsEvidence','Original with AI assistance; human review pending.',
   'difficulty','easy','explanation','Two plus three equals five.','options',jsonb_build_array('4','5'),'correctOption',1)::text
$$;
create function pg_temp.manifest(p_jsonl text, p_count integer default 1) returns jsonb language sql as $$
 select jsonb_build_object('release','content-test-001','contentSha256',encode(sha256(convert_to(p_jsonl,'UTF8')),'hex'),
   'questionCount',p_count,'subject','Content subject','reviewStatus','pending_human_review','reviewer',null)
$$;
do $$ declare v_body text; v_first jsonb; v_retry jsonb; begin
 v_body:=pg_temp.content_line('q-1','What is two plus three?')||E'\n';
 v_first:=public.install_original_question_release('content-test-001','44444444-4444-4444-8444-444444444444',repeat('a',40),v_body,pg_temp.manifest(v_body));
 v_retry:=public.install_original_question_release('content-test-001','44444444-4444-4444-8444-444444444444',repeat('a',40),v_body,pg_temp.manifest(v_body));
 if v_first->>'id'<>v_retry->>'id' or (v_retry->>'replayed')::boolean is not true then raise exception 'Install not idempotent';end if;
 if (select count(*) from public.study_questions where status='draft' and difficulty_reviewed=false)<>1 then raise exception 'Release published or reviewed automatically';end if;
 if (select count(*) from public.study_question_options)<>2 or (select count(*) from public.study_question_editorial_details)<>1 then raise exception 'Incomplete question';end if;
 if not exists(select 1 from public.study_question_answer_keys k join public.study_question_options o on o.id=k.correct_option_id where o.content='5') then raise exception 'Wrong answer';end if;
 if (select count(*) from public.question_content_release_items)<>1 then raise exception 'Missing provenance';end if;
 begin
   perform public.install_original_question_release('content-test-001','44444444-4444-4444-8444-444444444444',repeat('a',40),v_body,pg_temp.manifest(v_body)||'{"contentSha256":"bad"}');
   raise exception 'Hash mismatch accepted';
 exception when invalid_parameter_value then null;end;
 begin
   v_body:=pg_temp.content_line('q-2','Different original question.');
   perform public.install_original_question_release('content-test-001','44444444-4444-4444-8444-444444444444',repeat('a',40),v_body,pg_temp.manifest(v_body));
   raise exception 'Release overwritten';
 exception when invalid_parameter_value then null;end;
 begin
   v_body:=pg_temp.content_line('q-2','Second original question.')||E'\n'||pg_temp.content_line('q-3','What is two plus three?');
   perform public.install_original_question_release('content-test-002','44444444-4444-4444-8444-444444444444',repeat('a',40),v_body,pg_temp.manifest(v_body,2)||'{"release":"content-test-002"}');
   raise exception 'Duplicate accepted';
 exception when unique_violation then null;end;
 if (select count(*) from public.study_questions)<>1 or (select count(*) from public.question_content_releases)<>1 then raise exception 'Partial content survived failure';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.question_content_releases) or exists(select 1 from public.question_content_release_items) then raise exception 'Student can see editorial data';end if;
 if exists(select 1 from public.study_questions) then raise exception 'Student can see draft';end if;
 begin perform public.install_original_question_release(null,null,null,null,null);raise exception 'Student can install releases';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.question_content_releases)<>1 then raise exception 'Editor cannot review release';end if;
 begin perform public.install_original_question_release(null,null,null,null,null);raise exception 'Browser editor can install repository releases';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.install_original_question_release(null,null,null,null,null);raise exception 'Anonymous install';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo 'PASS: release provenance, atomic drafts, idempotency, content hash and editorial isolation'
