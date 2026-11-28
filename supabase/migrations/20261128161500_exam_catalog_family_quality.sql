-- DRAFT ONLY. Consultative provenance and overlap; no schema rollout/publication.
-- A manifest family is a declared origin classification, never proof of pedagogy/rights.
-- Ambiguous manifests or any audited content edit make current family coverage unknown.
create or replace function public.get_exam_catalog_quality(p_model_id uuid,p_version integer,p_page integer default 1,p_page_size integer default 10)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.has_platform_role('editor') then raise exception using errcode='42501',message='Editor required';end if;
 if p_page is null or p_page not between 1 and 1000000 or p_page_size is null or p_page_size not between 1 and 20 then raise exception using errcode='22023',message='Invalid quality page';end if;
 if not exists(select 1 from public.exam_catalog_versions where model_id=p_model_id and version=p_version) then raise exception using errcode='P0002',message='Version not found';end if;
 with catalog_questions as (select distinct question_id from public.exam_catalog_items),
 changed_questions as (
  select distinct coalesce(new_data->>'question_id',old_data->>'question_id',record_id) question_id
  from public.editorial_audit_log where action in ('UPDATE','DELETE') and table_name in ('study_questions','study_question_options','study_question_answer_keys','study_question_editorial_details')
 ), family_candidates as (
  select ri.question_id,r.release_name,r.content_sha256,q.subject_id,btrim(f->>'family') family_name,
   r.id::text||':'||q.subject_id::text||':'||btrim(f->>'family') family_key
  from catalog_questions cq join public.question_content_release_items ri on ri.question_id=cq.question_id
  join public.question_content_releases r on r.id=ri.release_id join public.study_questions q on q.id=ri.question_id
  cross join lateral jsonb_array_elements(case when jsonb_typeof(r.manifest->'checks')='array' then r.manifest->'checks' else '[]'::jsonb end) f
  where f->>'externalId'=ri.external_id and jsonb_typeof(f->'family')='string' and char_length(btrim(f->>'family')) between 1 and 120
   and r.manifest->>'release'=r.release_name and r.manifest->>'contentSha256'=r.content_sha256
   and not exists(select 1 from changed_questions c where c.question_id=ri.question_id::text)
 ), question_families as (
  select question_id,min(release_name) release_name,min(content_sha256) content_sha256,min(family_name) family_name,min(family_key) family_key
  from family_candidates group by question_id having count(*)=1
 ), current_items as (
  select i.question_id,q.subject_id,q.topic_id,q.statement,s.name subject_name,t.name topic_name,f.release_name,f.content_sha256,f.family_name,f.family_key
  from public.exam_catalog_items i join public.study_questions q on q.id=i.question_id
  join public.study_subjects s on s.id=q.subject_id left join public.study_topics t on t.id=q.topic_id left join question_families f on f.question_id=q.id
  where i.model_id=p_model_id and i.version=p_version
 ), latest as (
  select distinct on(model_id) model_id,version,title,question_count from public.exam_catalog_versions where model_id<>p_model_id order by model_id,version desc
 ), matching as (
  select v.model_id,v.version,v.title,v.question_count,count(*) shared_count,jsonb_agg(i.question_id order by i.question_id) question_ids
  from latest v join public.exam_catalog_items i on i.model_id=v.model_id and i.version=v.version
  join current_items c on c.question_id=i.question_id group by v.model_id,v.version,v.title,v.question_count
 ), family_matching as (
  select v.model_id,v.version,v.title,count(distinct c.family_key) shared_families,count(distinct c.question_id) covered_questions,
   jsonb_agg(distinct jsonb_build_object('releaseName',c.release_name,'family',c.family_name,'contentSha256',c.content_sha256,'subjectId',c.subject_id)) families
  from latest v join public.exam_catalog_items i on i.model_id=v.model_id and i.version=v.version
  join question_families pf on pf.question_id=i.question_id join current_items c on c.family_key=pf.family_key
  group by v.model_id,v.version,v.title
 ), family_paged as (select * from family_matching order by covered_questions desc,shared_families desc,model_id limit p_page_size offset (p_page-1)*p_page_size), paged as (select * from matching order by shared_count desc,model_id limit p_page_size offset (p_page-1)*p_page_size)
 select jsonb_build_object('modelId',p_model_id,'version',p_version,'editRevision',v.edit_revision,
  'questions',coalesce((select jsonb_agg(jsonb_build_object('id',question_id,'statement',statement,'subjectId',subject_id,'subjectName',subject_name,'topicId',topic_id,'topicName',topic_name,'declaredFamily',case when family_key is null then null else jsonb_build_object('key',family_key,'releaseName',release_name,'contentSha256',content_sha256,'family',family_name,'pedagogicalValidation','not-inferred') end) order by question_id) from current_items),'[]'::jsonb),
  'subjectDistribution',coalesce((select jsonb_agg(jsonb_build_object('subjectId',subject_id,'questionCount',question_count) order by subject_id) from public.exam_catalog_subject_targets where model_id=p_model_id and version=p_version),'[]'::jsonb),
  'overlaps',coalesce((select jsonb_agg(jsonb_build_object('modelId',model_id,'version',version,'title',title,'sharedCount',shared_count,'questionIds',question_ids,
    'nearDuplicate',shared_count>=0.8*(select count(*) from current_items) and shared_count>=0.8*(select count(*) from public.exam_catalog_items i where i.model_id=paged.model_id and i.version=paged.version),'currentCoveragePercent',round(100.0*shared_count/nullif((select count(*) from current_items),0),2)) order by shared_count desc,model_id) from paged),'[]'::jsonb),
  'familyOverlaps',coalesce((select jsonb_agg(jsonb_build_object('modelId',model_id,'version',version,'title',title,'sharedFamilyCount',shared_families,'coveredCurrentQuestions',covered_questions,'coveragePercent',round(100.0*covered_questions/nullif((select count(*) from current_items),0),2),'families',families) order by covered_questions desc,shared_families desc,model_id) from family_paged),'[]'::jsonb),
  'totalFamilyMatches',(select count(*) from family_matching),'learningObjectivesAvailable',false,
  'comparedModels',(select count(*) from latest),'totalMatches',(select count(*) from matching),'page',p_page,'pageSize',p_page_size,
  'hasMore',p_page::bigint*p_page_size<greatest((select count(*) from matching),(select count(*) from family_matching)),'comparisonScope','latest-version-per-other-model','publicationEnabled',false)
 into result from public.exam_catalog_versions v where v.model_id=p_model_id and v.version=p_version;
 return result;
end $$;
