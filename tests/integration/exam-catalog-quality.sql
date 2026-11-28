\set ON_ERROR_STOP on
begin;
\ir catalog/fixtures.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','ee710000-0000-4000-8000-000000000001',true);
do $$ declare fields jsonb:='{"title":"Replay de metas","description":"Fixture de replay.","kind":"subject-foundations","questionCount":2,"subjectDistribution":[{"subjectId":"EE710000-0000-4000-8000-000000000020","questionCount":2}]}'::jsonb;result jsonb;begin
 perform public.write_exam_catalog_draft('create','ee710000-0000-4000-8000-000000000904',1,null,fields);
 result:=public.write_exam_catalog_draft('create','ee710000-0000-4000-8000-000000000904',1,null,fields);
 if not(result->>'replayed')::boolean then raise exception 'canonical target replay failed';end if;
 begin perform public.write_exam_catalog_draft('create','ee710000-0000-4000-8000-000000000905',1,null,jsonb_set(fields,'{subjectDistribution,0,subjectId}','"ee710000-0000-4000-8000-000000000999"'));raise exception 'target FK missing';exception when foreign_key_violation then null;end;
 if exists(select 1 from public.exam_catalog_models where id='ee710000-0000-4000-8000-000000000905') then raise exception 'failed target insert leaked a model';end if;
end $$;
select public.write_exam_catalog_draft('create','ee710000-0000-4000-8000-000000000901',1,null,'{"title":"Qualidade multidisciplinar","description":"Fixture de qualidade.","kind":"multidisciplinary","questionCount":2}');
select public.write_exam_catalog_draft('save','ee710000-0000-4000-8000-000000000901',1,1,'{"title":"Qualidade multidisciplinar","description":"Fixture de qualidade.","kind":"multidisciplinary","questionCount":2,"questionIds":["ee710000-0000-4000-8000-000000000101","ee710000-0000-4000-8000-000000000103"],"subjectDistribution":[{"subjectId":"ee710000-0000-4000-8000-000000000020","questionCount":2}]}');
do $$ begin
 begin perform public.write_exam_catalog_draft('request_review','ee710000-0000-4000-8000-000000000901',1,2,'{}');raise exception 'mismatched target accepted';exception when check_violation then null;end;
 if (select status from public.exam_catalog_versions where model_id='ee710000-0000-4000-8000-000000000901')<>'draft' then raise exception 'failed transition mutated status';end if;
end $$;
select public.write_exam_catalog_draft('save','ee710000-0000-4000-8000-000000000901',1,2,'{"title":"Qualidade multidisciplinar","description":"Fixture de qualidade.","kind":"multidisciplinary","questionCount":2,"questionIds":["ee710000-0000-4000-8000-000000000101","ee710000-0000-4000-8000-000000000103"],"subjectDistribution":[{"subjectId":"ee710000-0000-4000-8000-000000000020","questionCount":1},{"subjectId":"ee710000-0000-4000-8000-000000000021","questionCount":1}]}');
select public.write_exam_catalog_draft('request_review','ee710000-0000-4000-8000-000000000901',1,3,'{}');
select public.write_exam_catalog_draft('clone','ee710000-0000-4000-8000-000000000901',2,4,'{"sourceVersion":1}');
select public.write_exam_catalog_draft('create','ee710000-0000-4000-8000-000000000902',1,null,'{"title":"Outro modelo temático","description":"Fixture de sobreposição.","kind":"subject-foundations","questionCount":2}');
select public.write_exam_catalog_draft('save','ee710000-0000-4000-8000-000000000902',1,1,'{"title":"Outro modelo temático","description":"Fixture de sobreposição.","kind":"subject-foundations","questionCount":2,"questionIds":["ee710000-0000-4000-8000-000000000101","ee710000-0000-4000-8000-000000000102"]}');
do $$ declare quality jsonb;begin
 quality:=public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000901',1,1,1);
 if quality#>>'{overlaps,0,modelId}'<>'ee710000-0000-4000-8000-000000000902' or (quality#>>'{overlaps,0,currentCoveragePercent}')::numeric<>50 or (quality->>'totalMatches')::integer<>1 then raise exception 'incorrect overlap or included own lineage';end if;
 if (select count(*) from public.exam_catalog_subject_targets where model_id='ee710000-0000-4000-8000-000000000901' and version=2)<>2 then raise exception 'clone lost targets';end if;
 if jsonb_array_length(public.get_exam_catalog_review_context('ee710000-0000-4000-8000-000000000901',1)#>'{snapshot,subjectDistribution}')<>2 then raise exception 'review snapshot lost targets';end if;
end $$;
-- Only newest version of the other model counts; an empty draft removes the old overlap.
select public.write_exam_catalog_draft('clone','ee710000-0000-4000-8000-000000000902',2,2,'{"sourceVersion":1}');
select public.write_exam_catalog_draft('save','ee710000-0000-4000-8000-000000000902',2,1,'{"title":"Outro modelo temático","description":"Fixture de sobreposição.","kind":"subject-foundations","questionCount":2,"questionIds":[]}');
do $$ begin if (public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000901',1)->>'totalMatches')::integer<>0 then raise exception 'older version counted';end if;end $$;
reset role;
do $$ begin begin delete from public.exam_catalog_subject_targets where model_id='ee710000-0000-4000-8000-000000000901' and version=1;raise exception 'target freeze missing';exception when check_violation then null;end;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','ee710000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.exam_catalog_subject_targets) then raise exception 'student targets leak';end if;
 begin perform public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000901',1);raise exception 'student quality leak';exception when insufficient_privilege then null;end;
end $$;
rollback;
