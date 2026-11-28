\set ON_ERROR_STOP on
begin;
\ir catalog/fixtures.sql
insert into public.exam_catalog_models(id,title,description,kind) values
 ('ee710000-0000-4000-8000-000000000951','Composição principal','Fixture de origem e IDs.','multidisciplinary'),
 ('ee710000-0000-4000-8000-000000000952','Mesma família com outros IDs','Fixture de origem e IDs.','subject-foundations'),
 ('ee710000-0000-4000-8000-000000000953','Título diferente com mesmos IDs','Fixture de origem e IDs.','multidisciplinary');
insert into public.exam_catalog_versions(model_id,version,question_count,duration_minutes)
select id,1,2,12 from public.exam_catalog_models where id::text in ('ee710000-0000-4000-8000-000000000951','ee710000-0000-4000-8000-000000000952','ee710000-0000-4000-8000-000000000953');
insert into public.exam_catalog_items(model_id,version,position,question_id) values
 ('ee710000-0000-4000-8000-000000000951',1,1,'ee710000-0000-4000-8000-000000000101'),('ee710000-0000-4000-8000-000000000951',1,2,'ee710000-0000-4000-8000-000000000103'),
 ('ee710000-0000-4000-8000-000000000952',1,1,'ee710000-0000-4000-8000-000000000105'),('ee710000-0000-4000-8000-000000000952',1,2,'ee710000-0000-4000-8000-000000000102'),
 ('ee710000-0000-4000-8000-000000000953',1,1,'ee710000-0000-4000-8000-000000000101'),('ee710000-0000-4000-8000-000000000953',1,2,'ee710000-0000-4000-8000-000000000103');
set local role authenticated;
select set_config('request.jwt.claim.sub','ee710000-0000-4000-8000-000000000001',true);
do $$ declare q jsonb;q2 jsonb;begin
 q:=public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000951',1,1,1);
 if (q->>'totalMatches')::integer<>1 or (q->>'totalFamilyMatches')::integer<>2 then raise exception 'ID and family overlap conflated';end if;
 if q#>>'{overlaps,0,modelId}'<>'ee710000-0000-4000-8000-000000000953' or not(q#>>'{overlaps,0,nearDuplicate}')::boolean then raise exception 'symmetric identical composition not detected';end if;
 if q#>>'{familyOverlaps,0,modelId}'<>'ee710000-0000-4000-8000-000000000952' or (q#>>'{familyOverlaps,0,coveragePercent}')::numeric<>50 then raise exception 'different IDs with shared origin family missing';end if;
 if (q->>'learningObjectivesAvailable')::boolean or not(q->>'hasMore')::boolean then raise exception 'invented objectives or pagination lost';end if;
 q2:=public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000951',1,2,1);
 if jsonb_array_length(q2->'overlaps')<>0 or q2#>>'{familyOverlaps,0,modelId}'<>'ee710000-0000-4000-8000-000000000953' or (q2->>'hasMore')::boolean then raise exception 'shared pagination incorrect';end if;
end $$;
select public.update_editorial_question('ee710000-0000-4000-8000-000000000105','{"statement":"Conteúdo editado após a classificação original: reavaliar família."}');
do $$ begin
 if (public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000951',1)->>'totalFamilyMatches')::integer<>1 then raise exception 'edited content retained trusted origin classification';end if;
end $$;
reset role;
update public.question_content_releases set manifest=jsonb_set(manifest,'{checks}',manifest->'checks'||'[{"externalId":"fixture-101","family":"another-classification"}]'::jsonb) where id='ee710000-0000-4000-8000-000000000040';
set local role authenticated;
do $$ begin
 if (public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000951',1)->>'totalFamilyMatches')::integer<>0 then raise exception 'ambiguous manifest classification accepted';end if;
end $$;
select set_config('request.jwt.claim.sub','ee710000-0000-4000-8000-000000000003',true);
do $$ begin
 begin perform public.get_exam_catalog_quality('ee710000-0000-4000-8000-000000000951',1);raise exception 'student got family metadata';exception when insufficient_privilege then null;end;
end $$;
rollback;
