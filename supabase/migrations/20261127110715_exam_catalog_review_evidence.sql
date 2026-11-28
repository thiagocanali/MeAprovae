-- DRAFT/HOMOLOGATION ONLY. Captures declarations; does not prove legal rights
-- or grant publication. No production data, permissions or sessions are changed.
create table public.exam_catalog_reviews (
 id uuid primary key,
 model_id uuid not null,
 version integer not null,
 edit_revision integer not null check(edit_revision>0),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 reviewer_role text not null check(reviewer_role in ('editor','owner')),
 decision text not null check(decision in ('approved','changes_requested')),
 notes text not null check(char_length(btrim(notes)) between 20 and 4000),
 rights jsonb not null check(jsonb_typeof(rights)='array'),
 attestations jsonb not null check(jsonb_typeof(attestations)='object'),
 attestation_version text not null check(attestation_version='catalog-human-review-v1'),
 content_snapshot jsonb not null,
 constraint review_snapshot_fingerprint_matches check(
  jsonb_typeof(content_snapshot)='object'
  and fingerprint=encode(sha256(convert_to(content_snapshot::text,'UTF8')),'hex')
  and (content_snapshot->>'modelId') is not distinct from model_id::text
  and (content_snapshot->>'version') is not distinct from version::text
  and (content_snapshot->>'editRevision') is not distinct from edit_revision::text),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(model_id,version) references public.exam_catalog_versions(model_id,version) on delete restrict
);
create index exam_catalog_reviews_version_idx on public.exam_catalog_reviews(model_id,version,created_at desc,id desc);
create index exam_catalog_reviews_reviewer_idx on public.exam_catalog_reviews(reviewer_id);
alter table public.exam_catalog_reviews enable row level security;
revoke all on public.exam_catalog_reviews from public,anon,authenticated;
grant select on public.exam_catalog_reviews to authenticated;
create policy "Editors read review evidence" on public.exam_catalog_reviews for select to authenticated
 using((select public.has_platform_role('editor')));

create function exam_catalog_private.immutable_review() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='23514',message='Review evidence is append-only'; end;
$$;
revoke all on function exam_catalog_private.immutable_review() from public,anon,authenticated;
create trigger exam_catalog_review_immutable before update or delete on public.exam_catalog_reviews
 for each row execute function exam_catalog_private.immutable_review();
create trigger exam_catalog_review_no_truncate before truncate on public.exam_catalog_reviews
 for each statement execute function exam_catalog_private.immutable_review();

-- Includes the actual keys/explanations in an editor-only immutable snapshot,
-- not just mutable question IDs. A later source change produces a new hash.
create function exam_catalog_private.review_snapshot(p_model uuid,p_version integer) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('modelId',v.model_id,'version',v.version,'editRevision',v.edit_revision,'status',v.status,
  'title',v.title,'description',v.description,'kind',v.kind,'questionCount',v.question_count,'durationMinutes',v.duration_minutes,
  'questions',coalesce((select jsonb_agg(jsonb_build_object(
   'position',i.position,'questionId',i.question_id,'subjectId',i.subject_id,'sourceSubjectId',q.subject_id,'subjectName',s.name,
   'topicId',q.topic_id,'noticeId',n.id,'noticeTitle',n.title,'noticeVersion',n.version,'noticeSourceUrl',n.source_url,
   'contestId',c.id,'contestTitle',c.title,'organization',c.organization,'examBoard',c.exam_board,'statement',q.statement,'status',q.status,'sourceLabel',q.source_label,'sourceUrl',q.source_url,'sourceYear',q.source_year,
   'difficulty',q.difficulty,'difficultyReviewed',q.difficulty_reviewed,'noticeStatus',n.status,'contestStatus',c.status,
   'correctOptionId',ak.correct_option_id,'explanation',coalesce(d.explanation,''),
   'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'label',o.option_label,'content',o.content,'position',o.position) order by o.position,o.id)
     from public.study_question_options o where o.question_id=q.id),'[]'::jsonb)) order by i.position)
   from public.exam_catalog_items i join public.study_questions q on q.id=i.question_id
   join public.study_subjects s on s.id=q.subject_id join public.study_notices n on n.id=q.notice_id
   join public.study_contests c on c.id=n.contest_id
   left join public.study_question_answer_keys ak on ak.question_id=q.id
   left join public.study_question_editorial_details d on d.question_id=q.id
   where i.model_id=v.model_id and i.version=v.version),'[]'::jsonb))
 from public.exam_catalog_versions v where v.model_id=p_model and v.version=p_version
$$;
revoke all on function exam_catalog_private.review_snapshot(uuid,integer) from public,anon,authenticated;

create function exam_catalog_private.independent_reviewer(p_actor uuid,p_model uuid,p_version integer) returns boolean
language sql security invoker set search_path='' as $$
 select exists(select 1 from public.exam_catalog_versions v where v.model_id=p_model and v.version=p_version
   and v.created_by is not null and v.created_by<>p_actor)
 and not exists(select 1 from public.editorial_audit_log a
   where a.actor_id=p_actor and a.table_name in ('exam_catalog_versions','exam_catalog_items')
   and coalesce(a.new_data->>'model_id',a.old_data->>'model_id')=p_model::text
   and coalesce(a.new_data->>'version',a.old_data->>'version')=p_version::text
   and (a.table_name='exam_catalog_items' or a.action<>'UPDATE'
     or (a.new_data-'status'-'edit_revision') is distinct from (a.old_data-'status'-'edit_revision')))
 and not exists(select 1 from public.editorial_audit_log a
   where a.actor_id=p_actor and a.table_name in ('study_questions','study_question_options','study_question_answer_keys','study_question_editorial_details')
   and coalesce(a.new_data->>'question_id',a.old_data->>'question_id',a.record_id)=any(
     select question_id::text from public.exam_catalog_items where model_id=p_model and version=p_version))
$$;
revoke all on function exam_catalog_private.independent_reviewer(uuid,uuid,integer) from public,anon,authenticated;

create function exam_catalog_private.review_issues(snapshot jsonb) returns jsonb
language sql security invoker set search_path='' as $$
 select to_jsonb(array_remove(array[
  case when jsonb_array_length(snapshot->'questions')<>(snapshot->>'questionCount')::integer then 'incomplete' end,
  case when exists(select 1 from jsonb_array_elements(snapshot->'questions') q where
    q->>'status'='archived' or q->>'noticeStatus'='archived' or q->>'contestStatus'='archived'
    or q->>'subjectId' is distinct from q->>'sourceSubjectId') then 'source' end,
  case when exists(select 1 from jsonb_array_elements(snapshot->'questions') q where
    jsonb_array_length(q->'options') not between 2 and 5 or not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=q->>'correctOptionId')) then 'answers' end,
  case when exists(select 1 from jsonb_array_elements(snapshot->'questions') q where char_length(btrim(q->>'explanation'))<10) then 'explanations' end
 ]::text[],null))
$$;
revoke all on function exam_catalog_private.review_issues(jsonb) from public,anon,authenticated;

create function exam_catalog_private.review_context(p_model uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; fingerprint_value text; latest public.exam_catalog_reviews;
begin
 if auth.uid() is null or not public.has_platform_role('editor') then raise exception using errcode='42501',message='Editor required';end if;
 snapshot:=exam_catalog_private.review_snapshot(p_model,p_version);
 if snapshot is null then raise exception using errcode='P0002',message='Version not found';end if;
 fingerprint_value:=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 select * into latest from public.exam_catalog_reviews where model_id=p_model and version=p_version order by created_at desc,id desc limit 1;
 return jsonb_build_object('snapshot',snapshot,'fingerprint',fingerprint_value,
  'independentReviewer',exam_catalog_private.independent_reviewer(auth.uid(),p_model,p_version),
  'issues',exam_catalog_private.review_issues(snapshot),
  'latestReview',case when latest.id is null then null else (to_jsonb(latest)-'content_snapshot')||jsonb_build_object('isCurrent',
   latest.fingerprint=fingerprint_value and latest.edit_revision=(snapshot->>'editRevision')::integer and snapshot->>'status'='in_review'
   and exists(select 1 from public.platform_admins where user_id=latest.reviewer_id and role in ('owner','editor'))
   and exam_catalog_private.independent_reviewer(latest.reviewer_id,p_model,p_version)) end,
  'publicationEnabled',false,'attestationVersion','catalog-human-review-v1');
end;
$$;
revoke all on function exam_catalog_private.review_context(uuid,integer) from public,anon,authenticated;
grant execute on function exam_catalog_private.review_context(uuid,integer) to authenticated;
create function public.get_exam_catalog_review_context(p_model_id uuid,p_version integer) returns jsonb
language sql security invoker set search_path='' as $$ select exam_catalog_private.review_context(p_model_id,p_version) $$;
revoke all on function public.get_exam_catalog_review_context(uuid,integer) from public,anon;
grant execute on function public.get_exam_catalog_review_context(uuid,integer) to authenticated;

create function exam_catalog_private.record_review(p_model uuid,p_version integer,p_fields jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; v public.exam_catalog_versions; snapshot jsonb; fp text;
 request_id uuid; revision integer; decision_value text; notes_value text; rights_value jsonb; checks jsonb;
 previous public.exam_catalog_reviews; existing_question_ids uuid[]; provided_question_ids uuid[];
begin
 if actor is null then raise exception using errcode='42501',message='Editor required';end if;
 select role into actor_role from public.platform_admins where user_id=actor and role in ('editor','owner') for share;
 if not found then raise exception using errcode='42501',message='Editor required';end if;
 if p_fields is null or jsonb_typeof(p_fields)<>'object' then raise exception using errcode='22023',message='Invalid review';end if;
 if exists(select 1 from jsonb_object_keys(p_fields) k where k not in ('requestId','expectedRevision','expectedFingerprint','decision','notes','rights','attestations','attestationVersion'))
 or jsonb_typeof(p_fields->'requestId') is distinct from 'string' or jsonb_typeof(p_fields->'expectedRevision') is distinct from 'number'
 or (p_fields->>'expectedRevision')!~'^[1-9][0-9]{0,9}$' or coalesce(p_fields->>'expectedFingerprint','')!~'^[a-f0-9]{64}$'
 or p_fields->>'decision' not in ('approved','changes_requested') or jsonb_typeof(p_fields->'decision') is distinct from 'string'
 or jsonb_typeof(p_fields->'notes') is distinct from 'string' or char_length(btrim(p_fields->>'notes')) not between 20 and 4000
 or p_fields->>'attestationVersion' is distinct from 'catalog-human-review-v1' then raise exception using errcode='22023',message='Invalid review fields';end if;
 request_id:=(p_fields->>'requestId')::uuid; revision:=(p_fields->>'expectedRevision')::integer;
 decision_value:=p_fields->>'decision';notes_value:=btrim(p_fields->>'notes'); checks:=p_fields->'attestations';rights_value:=p_fields->'rights';
 if checks is null or jsonb_typeof(checks)<>'object' then raise exception using errcode='22023',message='Attestations required';end if;
 if (select count(*) from jsonb_object_keys(checks))<>5 or exists(select 1 from jsonb_each(checks) x where x.key not in ('content','answers','explanations','rights','independent') or jsonb_typeof(x.value)<>'boolean')
 or checks->'independent' is distinct from 'true'::jsonb then raise exception using errcode='22023',message='Invalid attestations';end if;
 if rights_value is null or jsonb_typeof(rights_value)<>'array' then raise exception using errcode='22023',message='Rights evidence required';end if;
 if jsonb_array_length(rights_value) not between 1 and 20 or exists(select 1 from jsonb_array_elements(rights_value) r where
  jsonb_typeof(r)<>'object' or exists(select 1 from jsonb_object_keys(r) k where k not in ('questionId','basis','evidence','sourceUrl'))
  or jsonb_typeof(r->'questionId') is distinct from 'string' or coalesce(r->>'basis','') not in ('original','licensed','public-domain','unverified')
  or jsonb_typeof(r->'evidence') is distinct from 'string' or char_length(btrim(r->>'evidence')) not between 20 and 1200
  or (r->>'basis' in ('licensed','public-domain') and coalesce(r->>'sourceUrl','')='')
  or (r->>'sourceUrl' is not null and (char_length(r->>'sourceUrl')>1200 or (r->>'sourceUrl')!~*'^https?://[^/@[:space:]\\]+([/?#][^[:space:]\\]*)?$')))
 then raise exception using errcode='22023',message='Invalid rights evidence';end if;
 select jsonb_agg(jsonb_build_object('questionId',(r->>'questionId')::uuid,'basis',r->>'basis','evidence',btrim(r->>'evidence'),'sourceUrl',r->>'sourceUrl') order by (r->>'questionId')::uuid)
 into rights_value from jsonb_array_elements(rights_value) r;
 -- Same root/version lock order as the existing writer. Never alter version flags.
 perform 1 from public.exam_catalog_models where id=p_model for update;
 select * into v from public.exam_catalog_versions where model_id=p_model and version=p_version for update;
 if not found then raise exception using errcode='P0002',message='Version not found';end if;
 select * into previous from public.exam_catalog_reviews where id=request_id;
 if found then
  if previous.model_id=p_model and previous.version=p_version and previous.reviewer_id=actor and previous.edit_revision=revision
  and previous.fingerprint=p_fields->>'expectedFingerprint' and previous.decision=decision_value and previous.notes=notes_value
  and previous.rights=rights_value and previous.attestations=checks then return jsonb_build_object('review',to_jsonb(previous)-'content_snapshot','replayed',true,'publicationEnabled',false);end if;
  raise exception using errcode='40001',message='Review request identity conflict';
 end if;
 if v.status<>'in_review' or v.edit_revision<>revision then raise exception using errcode='40001',message='Review state changed';end if;
 if not exam_catalog_private.independent_reviewer(actor,p_model,p_version) then raise exception using errcode='42501',message='Independent reviewer required';end if;
 -- Component edit triggers also lock their question, serializing snapshots with edits.
 perform 1 from public.study_questions where id in(select question_id from public.exam_catalog_items where model_id=p_model and version=p_version) order by id for share;
 perform 1 from public.study_subjects where id in(select subject_id from public.exam_catalog_items where model_id=p_model and version=p_version) order by id for share;
 perform 1 from public.study_notices where id in(select q.notice_id from public.study_questions q join public.exam_catalog_items i on i.question_id=q.id where i.model_id=p_model and i.version=p_version) order by id for share;
 perform 1 from public.study_contests where id in(select n.contest_id from public.study_notices n join public.study_questions q on q.notice_id=n.id join public.exam_catalog_items i on i.question_id=q.id where i.model_id=p_model and i.version=p_version) order by id for share;
 snapshot:=exam_catalog_private.review_snapshot(p_model,p_version); fp:=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 if fp<>p_fields->>'expectedFingerprint' then raise exception using errcode='40001',message='Reviewed content changed';end if;
 select array_agg(question_id order by question_id) into existing_question_ids from public.exam_catalog_items where model_id=p_model and version=p_version;
 select array_agg((r->>'questionId')::uuid order by (r->>'questionId')::uuid) into provided_question_ids from jsonb_array_elements(rights_value) r;
 if existing_question_ids is distinct from provided_question_ids then raise exception using errcode='22023',message='Rights must cover every question exactly once';end if;
 if decision_value='approved' and (exam_catalog_private.review_issues(snapshot)<>'[]'::jsonb or exists(select 1 from jsonb_each(checks) x where x.value<>'true'::jsonb)
 or exists(select 1 from jsonb_array_elements(rights_value) r where r->>'basis'='unverified')) then raise exception using errcode='23514',message='Review incomplete for approval';end if;
 insert into public.exam_catalog_reviews(id,model_id,version,edit_revision,fingerprint,reviewer_id,reviewer_role,decision,notes,rights,attestations,attestation_version,content_snapshot)
 values(request_id,p_model,p_version,revision,fp,actor,actor_role,decision_value,notes_value,rights_value,checks,'catalog-human-review-v1',snapshot) returning * into previous;
 return jsonb_build_object('review',to_jsonb(previous)-'content_snapshot','replayed',false,'publicationEnabled',false);
end;
$$;
revoke all on function exam_catalog_private.record_review(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function exam_catalog_private.record_review(uuid,integer,jsonb) to authenticated;
create function public.record_exam_catalog_review(p_model_id uuid,p_version integer,p_fields jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select exam_catalog_private.record_review(p_model_id,p_version,p_fields) $$;
revoke all on function public.record_exam_catalog_review(uuid,integer,jsonb) from public,anon;
grant execute on function public.record_exam_catalog_review(uuid,integer,jsonb) to authenticated;
