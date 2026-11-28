-- Disposable PostgreSQL only: no hosted users, no human approval, rollback all fixtures.
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('99999999-9999-4999-8999-999999999999'),('77777777-7777-4777-8777-777777777777');
insert into public.platform_admins(user_id,role) values('11111111-1111-4111-8111-111111111111','editor'),('22222222-2222-4222-8222-222222222222','editor'),('99999999-9999-4999-8999-999999999999','owner');
insert into public.study_contests(id,slug,title) values('c0220000-0000-4000-8000-000000000001','catalog-api-test','Catalog API fixture');
insert into public.study_notices(id,contest_id,title) values('c0220000-0000-4000-8000-000000000002','c0220000-0000-4000-8000-000000000001','Fixture notice');
insert into public.study_subjects(id,name) values('c0220000-0000-4000-8000-000000000003','Catalog API subject');
insert into public.study_questions(id,notice_id,subject_id,statement) values
 ('c0220000-0000-4000-8000-000000000004','c0220000-0000-4000-8000-000000000002','c0220000-0000-4000-8000-000000000003','First draft composition question'),
 ('c0220000-0000-4000-8000-000000000005','c0220000-0000-4000-8000-000000000002','c0220000-0000-4000-8000-000000000003','Second draft composition question');
do $$ declare q uuid; o uuid; begin
 for q in select id from public.study_questions where notice_id='c0220000-0000-4000-8000-000000000002' loop
  insert into public.study_question_options(question_id,option_label,content,position) values(q,'A','Alternativa correta de teste',1) returning id into o;
  insert into public.study_question_options(question_id,option_label,content,position) values(q,'B','Alternativa incorreta de teste',2);
  insert into public.study_question_answer_keys(question_id,correct_option_id) values(q,o);
  insert into public.study_question_editorial_details(question_id,explanation) values(q,'Explicação exclusivamente sintética para a fixture local.');
 end loop;
 if has_table_privilege('anon','public.exam_catalog_reviews','select') or has_table_privilege('authenticated','public.exam_catalog_reviews','insert')
 or has_table_privilege('authenticated','public.exam_catalog_reviews','update') or has_table_privilege('authenticated','public.exam_catalog_reviews','delete') or has_table_privilege('authenticated','public.exam_catalog_reviews','truncate') then raise exception 'Unexpected review grants';end if;
 if has_function_privilege('anon','public.record_exam_catalog_review(uuid,integer,jsonb)','execute')
 or has_function_privilege('authenticated','exam_catalog_private.review_snapshot(uuid,integer)','execute') then raise exception 'Unexpected review helper exposure';end if;
end $$;
create function pg_temp.review_fields(request_id uuid,context jsonb) returns jsonb language sql as $$
 select jsonb_build_object('requestId',request_id,'expectedRevision',(context#>>'{snapshot,editRevision}')::integer,'expectedFingerprint',context->>'fingerprint',
 'decision','approved','notes','Parecer de fixture automatizada; não representa uma revisão humana real.',
 'rights',(select jsonb_agg(jsonb_build_object('questionId',q->>'questionId','basis','original','evidence','Evidência sintética de teste isolado, sem validade editorial real.','sourceUrl',null)) from jsonb_array_elements(context#>'{snapshot,questions}') q),
 'attestations','{"content":true,"answers":true,"explanations":true,"rights":true,"independent":true}'::jsonb,'attestationVersion','catalog-human-review-v1')
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.write_exam_catalog_draft('create','c0220000-0000-4000-8000-000000000010',1,null,'{"title":"Modelo para revisão","description":"Somente teste descartável","kind":"subject-foundations","questionCount":2}');
select public.write_exam_catalog_draft('save','c0220000-0000-4000-8000-000000000010',1,1,'{"title":"Modelo para revisão","description":"Somente teste descartável","kind":"subject-foundations","questionCount":2,"questionIds":["c0220000-0000-4000-8000-000000000004","c0220000-0000-4000-8000-000000000005"]}');
select public.write_exam_catalog_draft('request_review','c0220000-0000-4000-8000-000000000010',1,2,'{}');
do $$ declare context jsonb;begin
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);
 if (context->>'independentReviewer')::boolean then raise exception 'Author considered independent';end if;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,pg_temp.review_fields(gen_random_uuid(),context));raise exception 'Self review accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
select set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","user_metadata":{"role":"owner"}}',true);
do $$ begin
 begin perform public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);raise exception 'Student saw keys';exception when insufficient_privilege then null;end;
 begin perform exam_catalog_private.record_review('c0220000-0000-4000-8000-000000000010',1,'{}');raise exception 'Student bypassed wrapper';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.exam_catalog_reviews) then raise exception 'Student saw reviews';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare context jsonb;payload jsonb;r jsonb;before_count bigint;begin
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);
 if not (context->>'independentReviewer')::boolean or context->'issues'<>'[]'::jsonb or length(context->>'fingerprint')<>64 then raise exception 'Invalid review context';end if;
 payload:=pg_temp.review_fields('c0220000-0000-4000-8000-000000000101',context);
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,payload||'{"reviewerId":"11111111-1111-4111-8111-111111111111"}');raise exception 'Forged actor accepted';exception when invalid_parameter_value then null;end;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,jsonb_set(payload,'{rights}','[]'));raise exception 'Missing rights accepted';exception when invalid_parameter_value then null;end;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,jsonb_set(payload,'{rights,0,basis}','"licensed"'));raise exception 'Missing license URL accepted';exception when invalid_parameter_value then null;end;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,jsonb_set(payload,'{attestations,answers}','false'));raise exception 'Incomplete approval accepted';exception when check_violation then null;end;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,jsonb_set(payload,'{expectedFingerprint}',to_jsonb(repeat('0',64))));raise exception 'Wrong fingerprint accepted';exception when sqlstate 'PT409' then null;end;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,jsonb_set(payload,'{rights}',jsonb_build_array(payload#>'{rights,0}')));raise exception 'Incomplete per-question coverage accepted';exception when invalid_parameter_value then null;end;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,jsonb_set(payload,'{rights,0,basis}','"unverified"'));raise exception 'Unverified rights approved';exception when check_violation then null;end;
 r:=public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,payload);
 if r#>>'{review,reviewer_id}'<>auth.uid()::text or r#>>'{review,reviewer_role}'<>'editor' or (r->>'publicationEnabled')::boolean then raise exception 'Actor or publication mismatch';end if;
 select count(*) into before_count from public.exam_catalog_reviews;
 r:=public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,payload);
 if not (r->>'replayed')::boolean or (select count(*) from public.exam_catalog_reviews)<>before_count then raise exception 'Replay duplicated evidence';end if;
 begin perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,payload||'{"notes":"Attempt to overwrite immutable evidence with a reused request ID."}');raise exception 'Replay overwritten';exception when sqlstate 'PT409' then null;end;
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);
 if not (context#>>'{latestReview,isCurrent}')::boolean then raise exception 'New review not current';end if;
 if exists(select 1 from public.exam_catalog_versions where rights_checked or reviewed_by is not null or published_at is not null) then raise exception 'Legacy approval flags changed';end if;
end $$;
reset role;
do $$ begin
 begin update public.exam_catalog_reviews set notes='Alteração indevida de registro de parecer.';raise exception 'Review updated';exception when check_violation then null;end;
 begin delete from public.exam_catalog_reviews;raise exception 'Review deleted';exception when check_violation then null;end;
 begin truncate public.exam_catalog_reviews;raise exception 'Review truncated';exception when check_violation then null;end;
end $$;
-- A source edit makes the former declaration stale; the stored snapshot remains intact.
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.update_editorial_question('c0220000-0000-4000-8000-000000000004','{"statement":"Fonte alterada depois do parecer registrado."}');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare context jsonb;begin
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);
 if (context#>>'{latestReview,isCurrent}')::boolean then raise exception 'Changed source kept current approval';end if;
 if (select content_snapshot#>>'{questions,0,statement}' from public.exam_catalog_reviews limit 1)<>'First draft composition question' then raise exception 'Historical snapshot changed';end if;
 perform public.record_exam_catalog_review('c0220000-0000-4000-8000-000000000010',1,pg_temp.review_fields(gen_random_uuid(),context)||'{"decision":"changes_requested","notes":"Revisão sintética solicita ajustes e não publica conteúdo."}');
end $$;
reset role;
delete from public.platform_admins where user_id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
do $$ declare context jsonb;begin
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);
 if (context#>>'{latestReview,isCurrent}')::boolean then raise exception 'Revoked reviewer kept current authorization';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin begin perform public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);raise exception 'Revoked reviewer read content';exception when insufficient_privilege then null;end;end $$;
reset role;
insert into public.platform_admins(user_id,role) values('22222222-2222-4222-8222-222222222222','editor');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.write_exam_catalog_draft('clone','c0220000-0000-4000-8000-000000000010',2,3,'{"sourceVersion":1}');
select public.write_exam_catalog_draft('return_to_draft','c0220000-0000-4000-8000-000000000010',1,3,'{}');
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
do $$ declare context jsonb;begin
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',1);
 if (context#>>'{latestReview,isCurrent}')::boolean then raise exception 'Draft kept current approval';end if;
 context:=public.get_exam_catalog_review_context('c0220000-0000-4000-8000-000000000010',2);
 if context->'latestReview'<>'null'::jsonb then raise exception 'Clone inherited review';end if;
end $$;
reset role;
rollback;
