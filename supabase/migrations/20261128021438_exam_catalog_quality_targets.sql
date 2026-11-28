-- DRAFT ONLY: explicit optional subject targets, no production rollout/publication.
create table public.exam_catalog_subject_targets (
 model_id uuid not null, version integer not null,
 subject_id uuid not null references public.study_subjects(id) on delete restrict,
 question_count integer not null check(question_count between 1 and 20),
 primary key(model_id,version,subject_id),
 foreign key(model_id,version) references public.exam_catalog_versions(model_id,version) on delete cascade
);
create index exam_catalog_targets_subject_idx on public.exam_catalog_subject_targets(subject_id);
alter table public.exam_catalog_subject_targets enable row level security;
revoke all on public.exam_catalog_subject_targets from public,anon,authenticated;
grant select on public.exam_catalog_subject_targets to authenticated;
create policy "Editors read subject targets" on public.exam_catalog_subject_targets for select to authenticated using((select public.has_platform_role('editor')));
create function exam_catalog_private.guard_target() returns trigger language plpgsql security invoker set search_path='' as $$
declare m uuid;v integer;s text;
begin
 if tg_op='UPDATE' and (new.model_id,new.version,new.subject_id) is distinct from (old.model_id,old.version,old.subject_id) then raise exception using errcode='23514',message='Target identity immutable';end if;
 if tg_op='DELETE' then m:=old.model_id;v:=old.version;else m:=new.model_id;v:=new.version;end if;
 select status into s from public.exam_catalog_versions where model_id=m and version=v for update;
 if s='in_review' then raise exception using errcode='23514',message='Review targets frozen';end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke all on function exam_catalog_private.guard_target() from public,anon,authenticated;
create trigger exam_catalog_targets_guard before insert or update or delete on public.exam_catalog_subject_targets for each row execute function exam_catalog_private.guard_target();
create trigger exam_catalog_targets_audit after insert or update or delete on public.exam_catalog_subject_targets for each row execute function public.capture_editorial_change();
create function exam_catalog_private.guard_target_review() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='in_review' and exists(select 1 from public.exam_catalog_subject_targets where model_id=new.model_id and version=new.version) and exists(
  select 1 from (select subject_id,question_count from public.exam_catalog_subject_targets where model_id=new.model_id and version=new.version) t
  full join (select subject_id,count(*) n from public.exam_catalog_items where model_id=new.model_id and version=new.version group by subject_id) i using(subject_id)
  where t.question_count is distinct from i.n
 ) then raise exception using errcode='23514',message='Composition differs from explicit subject targets';end if;
 return new;
end $$;
revoke all on function exam_catalog_private.guard_target_review() from public,anon,authenticated;
create trigger exam_catalog_target_review_guard before insert or update on public.exam_catalog_versions for each row execute function exam_catalog_private.guard_target_review();

create or replace function exam_catalog_private.version_snapshot(p_model uuid,p_version integer) returns jsonb
language sql security invoker set search_path='' as $$
 select to_jsonb(v)||jsonb_build_object('subjectDistribution',coalesce((select jsonb_agg(jsonb_build_object('subjectId',subject_id,'questionCount',question_count) order by subject_id) from public.exam_catalog_subject_targets where model_id=v.model_id and version=v.version),'[]'::jsonb),'items',coalesce((
   select jsonb_agg(jsonb_build_object('position',i.position,'question_id',i.question_id,'subject_id',i.subject_id) order by i.position)
   from public.exam_catalog_items i where i.model_id=v.model_id and i.version=v.version),'[]'::jsonb))
 from public.exam_catalog_versions v where v.model_id=p_model and v.version=p_version
$$;

create or replace function exam_catalog_private.write_draft(p_action text,p_model uuid,p_version integer,p_expected_revision integer,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); m public.exam_catalog_models; v public.exam_catalog_versions; src public.exam_catalog_versions;
 title_value text; description_value text; kind_value text; count_value integer; ids jsonb; replay boolean:=false;
begin
 if actor is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if not public.has_platform_role('editor') then raise exception using errcode='42501',message='Editor required'; end if;
 if p_action is null or p_action not in ('create','save','clone','request_review','return_to_draft')
 or p_model is null or p_version is null or p_version<1 or p_fields is null or jsonb_typeof(p_fields)<>'object'
 then raise exception using errcode='22023',message='Invalid draft command'; end if;
 if p_action in ('create','save') then
   if exists(select 1 from jsonb_object_keys(p_fields) k where k not in ('title','description','kind','questionCount','questionIds','subjectDistribution'))
   or jsonb_typeof(p_fields->'title') is distinct from 'string' or jsonb_typeof(p_fields->'description') is distinct from 'string'
   or jsonb_typeof(p_fields->'kind') is distinct from 'string' or jsonb_typeof(p_fields->'questionCount') is distinct from 'number'
   or (p_fields->>'questionCount')!~'^[1-9][0-9]?$' then
     raise exception using errcode='22023',message='Invalid draft fields';
   end if;
   title_value:=btrim(p_fields->>'title'); description_value:=btrim(p_fields->>'description'); kind_value:=p_fields->>'kind'; count_value:=(p_fields->>'questionCount')::integer;
   if char_length(title_value) not between 3 and 120 or char_length(description_value) not between 3 and 800
   or kind_value not in ('subject-foundations','subject-application','multidisciplinary') or count_value not between 1 and 20 then
     raise exception using errcode='22023',message='Invalid draft fields';
   end if;
   if p_action='save' then
     ids:=p_fields->'questionIds';
     if ids is null or jsonb_typeof(ids)<>'array' then raise exception using errcode='22023',message='Question IDs required'; end if;
     if jsonb_array_length(ids)>count_value or exists(select 1 from jsonb_array_elements(ids) x where jsonb_typeof(x)<>'string' or (x#>>'{}')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
       raise exception using errcode='22023',message='Invalid composition'; end if;
     if (select count(distinct lower(x)) from jsonb_array_elements_text(ids) x)<>jsonb_array_length(ids) then
       raise exception using errcode='22023',message='Duplicate composition question'; end if;
   elsif p_fields ? 'questionIds' then raise exception using errcode='22023',message='Create starts an empty draft'; end if;
 elsif p_action='clone' then
   if exists(select 1 from jsonb_object_keys(p_fields) k where k<>'sourceVersion') or jsonb_typeof(p_fields->'sourceVersion') is distinct from 'number'
   or (p_fields->>'sourceVersion')!~'^[1-9][0-9]{0,9}$' then raise exception using errcode='22023',message='Invalid source version'; end if;
 elsif p_fields<>'{}'::jsonb then raise exception using errcode='22023',message='Transitions accept no editorial flags'; end if;

 if p_action='create' then
   if p_version<>1 or p_expected_revision is not null then raise exception using errcode='22023',message='Create requires first version'; end if;
   insert into public.exam_catalog_models(id,title,description,kind,created_by)
     values(p_model,title_value,description_value,kind_value,actor) on conflict(id) do nothing;
 end if;
 -- One root lock orders create, save, clone and transition operations consistently.
 select * into m from public.exam_catalog_models where id=p_model for update;
 if not found then raise exception using errcode='P0002',message='Model not found'; end if;
 select * into v from public.exam_catalog_versions where model_id=p_model and version=p_version for update;
 if p_action='create' then
   if found then
     if m.created_by=actor and v.edit_revision=1 and v.title=title_value and v.description=description_value and v.kind=kind_value and v.question_count=count_value and (not(p_fields ? 'subjectDistribution') or coalesce((select jsonb_agg(jsonb_build_object('subjectId',subject_id,'questionCount',question_count) order by subject_id) from public.exam_catalog_subject_targets where model_id=p_model and version=1),'[]'::jsonb)=(select coalesce(jsonb_agg(jsonb_build_object('subjectId',(t->>'subjectId')::uuid,'questionCount',(t->>'questionCount')::integer) order by (t->>'subjectId')::uuid),'[]'::jsonb) from jsonb_array_elements(p_fields->'subjectDistribution') t)) then replay:=true;
     else raise exception using errcode='PT409',message='Model identity already in use'; end if;
   else
     insert into public.exam_catalog_versions(model_id,version,title,description,kind,question_count,duration_minutes,created_by)
       values(p_model,1,title_value,description_value,kind_value,count_value,count_value*6,actor);
   end if;
 elsif p_action='clone' then
   if p_expected_revision is null or p_expected_revision<1 then raise exception using errcode='22023',message='Source revision required'; end if;
   if v.model_id is not null then
     if v.based_on_version=(p_fields->>'sourceVersion')::integer and v.based_on_revision=p_expected_revision and v.created_by=actor then replay:=true;
     else raise exception using errcode='PT409',message='Version already exists'; end if;
   else
     select * into src from public.exam_catalog_versions where model_id=p_model and version=(p_fields->>'sourceVersion')::integer for update;
     if not found then raise exception using errcode='P0002',message='Source version not found'; end if;
     if src.edit_revision<>p_expected_revision or p_version<>(select max(version)+1 from public.exam_catalog_versions where model_id=p_model) then
       raise exception using errcode='PT409',message='Stale source or version number'; end if;
     insert into public.exam_catalog_versions(model_id,version,title,description,kind,question_count,duration_minutes,created_by,based_on_version,based_on_revision)
       values(p_model,p_version,src.title,src.description,src.kind,src.question_count,src.duration_minutes,actor,src.version,src.edit_revision);
     insert into public.exam_catalog_items(model_id,version,position,question_id,subject_id)
       select model_id,p_version,position,question_id,subject_id from public.exam_catalog_items where model_id=p_model and version=src.version order by position;
   end if;
 else
   if v.model_id is null then raise exception using errcode='P0002',message='Version not found'; end if;
   if p_expected_revision is null or p_expected_revision<1 then raise exception using errcode='22023',message='Expected revision required'; end if;
   if v.edit_revision<>p_expected_revision then raise exception using errcode='PT409',message='Stale editorial revision'; end if;
   if p_action='save' then
     if v.status<>'draft' then raise exception using errcode='23514',message='Review composition is frozen'; end if;
     delete from public.exam_catalog_items where model_id=p_model and version=p_version;
     update public.exam_catalog_versions set title=title_value,description=description_value,kind=kind_value,question_count=count_value,duration_minutes=count_value*6
       where model_id=p_model and version=p_version;
     insert into public.exam_catalog_items(model_id,version,position,question_id)
       select p_model,p_version,ordinality::integer,value::uuid from jsonb_array_elements_text(ids) with ordinality;
   elsif p_action='request_review' then
     if v.status<>'draft' then raise exception using errcode='23514',message='Only draft can request review'; end if;
     update public.exam_catalog_versions set status='in_review' where model_id=p_model and version=p_version;
   else
     if v.status<>'in_review' then raise exception using errcode='23514',message='Only review can return to draft'; end if;
     update public.exam_catalog_versions set status='draft' where model_id=p_model and version=p_version;
   end if;
 end if;
 if p_action in ('create','save') and not replay and p_fields ? 'subjectDistribution' then
   if jsonb_typeof(p_fields->'subjectDistribution') is distinct from 'array' or jsonb_array_length(p_fields->'subjectDistribution')>20 then
     raise exception using errcode='22023',message='Invalid subject distribution';end if;
   if exists(select 1 from jsonb_array_elements(p_fields->'subjectDistribution') t where jsonb_typeof(t)<>'object'
     or (select count(*) from jsonb_object_keys(t))<>2 or not(t ? 'subjectId' and t ? 'questionCount')
     or jsonb_typeof(t->'subjectId') is distinct from 'string' or jsonb_typeof(t->'questionCount') is distinct from 'number'
     or (t->>'questionCount')!~'^[1-9][0-9]?$' or (t->>'questionCount')::integer>20)
   then raise exception using errcode='22023',message='Invalid subject target';end if;
   delete from public.exam_catalog_subject_targets where model_id=p_model and version=p_version;
   insert into public.exam_catalog_subject_targets(model_id,version,subject_id,question_count)
   select p_model,p_version,(t->>'subjectId')::uuid,(t->>'questionCount')::integer from jsonb_array_elements(p_fields->'subjectDistribution') t;
 elsif p_action='clone' and not replay then
   insert into public.exam_catalog_subject_targets(model_id,version,subject_id,question_count)
   select p_model,p_version,subject_id,question_count from public.exam_catalog_subject_targets where model_id=p_model and version=(p_fields->>'sourceVersion')::integer;
 end if;
 return jsonb_build_object('version',exam_catalog_private.version_snapshot(p_model,p_version),'replayed',replay);
end;
$$;

create or replace function exam_catalog_private.review_snapshot(p_model uuid,p_version integer) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('modelId',v.model_id,'version',v.version,'editRevision',v.edit_revision,'status',v.status,
  'subjectDistribution',coalesce((select jsonb_agg(jsonb_build_object('subjectId',subject_id,'questionCount',question_count) order by subject_id) from public.exam_catalog_subject_targets where model_id=v.model_id and version=v.version),'[]'::jsonb),'title',v.title,'description',v.description,'kind',v.kind,'questionCount',v.question_count,'durationMinutes',v.duration_minutes,
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

create or replace function exam_catalog_private.independent_reviewer(p_actor uuid,p_model uuid,p_version integer) returns boolean
language sql security invoker set search_path='' as $$
 select exists(select 1 from public.exam_catalog_versions v where v.model_id=p_model and v.version=p_version
   and v.created_by is not null and v.created_by<>p_actor)
 and not exists(select 1 from public.editorial_audit_log a
   where a.actor_id=p_actor and a.table_name in ('exam_catalog_versions','exam_catalog_items','exam_catalog_subject_targets')
   and coalesce(a.new_data->>'model_id',a.old_data->>'model_id')=p_model::text
   and coalesce(a.new_data->>'version',a.old_data->>'version')=p_version::text
   and (a.table_name in ('exam_catalog_items','exam_catalog_subject_targets') or a.action<>'UPDATE'
     or (a.new_data-'status'-'edit_revision') is distinct from (a.old_data-'status'-'edit_revision')))
 and not exists(select 1 from public.editorial_audit_log a
   where a.actor_id=p_actor and a.table_name in ('study_questions','study_question_options','study_question_answer_keys','study_question_editorial_details')
   and coalesce(a.new_data->>'question_id',a.old_data->>'question_id',a.record_id)=any(
     select question_id::text from public.exam_catalog_items where model_id=p_model and version=p_version))
$$;

-- Editor-only, invoker/RLS-protected, coherent read snapshot. No mutations/approval.
create function public.get_exam_catalog_quality(p_model_id uuid,p_version integer,p_page integer default 1,p_page_size integer default 10)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.has_platform_role('editor') then raise exception using errcode='42501',message='Editor required';end if;
 if p_page is null or p_page not between 1 and 1000000 or p_page_size is null or p_page_size not between 1 and 20 then raise exception using errcode='22023',message='Invalid quality page';end if;
 if not exists(select 1 from public.exam_catalog_versions where model_id=p_model_id and version=p_version) then raise exception using errcode='P0002',message='Version not found';end if;
 with current_items as (
  select i.question_id,q.subject_id,q.topic_id,q.statement,s.name subject_name,t.name topic_name
  from public.exam_catalog_items i join public.study_questions q on q.id=i.question_id
  join public.study_subjects s on s.id=q.subject_id left join public.study_topics t on t.id=q.topic_id
  where i.model_id=p_model_id and i.version=p_version
 ), latest as (
  select distinct on(model_id) model_id,version,title,question_count from public.exam_catalog_versions where model_id<>p_model_id order by model_id,version desc
 ), matching as (
  select v.model_id,v.version,v.title,v.question_count,count(*) shared_count,jsonb_agg(i.question_id order by i.question_id) question_ids
  from latest v join public.exam_catalog_items i on i.model_id=v.model_id and i.version=v.version
  join current_items c on c.question_id=i.question_id group by v.model_id,v.version,v.title,v.question_count
 ), paged as (select * from matching order by shared_count desc,model_id limit p_page_size offset (p_page-1)*p_page_size)
 select jsonb_build_object('modelId',p_model_id,'version',p_version,'editRevision',v.edit_revision,
  'questions',coalesce((select jsonb_agg(jsonb_build_object('id',question_id,'statement',statement,'subjectId',subject_id,'subjectName',subject_name,'topicId',topic_id,'topicName',topic_name) order by question_id) from current_items),'[]'::jsonb),
  'subjectDistribution',coalesce((select jsonb_agg(jsonb_build_object('subjectId',subject_id,'questionCount',question_count) order by subject_id) from public.exam_catalog_subject_targets where model_id=p_model_id and version=p_version),'[]'::jsonb),
  'overlaps',coalesce((select jsonb_agg(jsonb_build_object('modelId',model_id,'version',version,'title',title,'sharedCount',shared_count,'questionIds',question_ids,
    'currentCoveragePercent',round(100.0*shared_count/nullif((select count(*) from current_items),0),2)) order by shared_count desc,model_id) from paged),'[]'::jsonb),
  'comparedModels',(select count(*) from latest),'totalMatches',(select count(*) from matching),'page',p_page,'pageSize',p_page_size,
  'hasMore',p_page::bigint*p_page_size<(select count(*) from matching),'comparisonScope','latest-version-per-other-model','publicationEnabled',false)
 into result from public.exam_catalog_versions v where v.model_id=p_model_id and v.version=p_version;
 return result;
end $$;
revoke all on function public.get_exam_catalog_quality(uuid,integer,integer,integer) from public,anon;
grant execute on function public.get_exam_catalog_quality(uuid,integer,integer,integer) to authenticated;

-- Business/CAS conflicts must not trigger PostgREST transaction retry for SQLSTATE 40001.
create or replace function exam_catalog_private.record_review(p_model uuid,p_version integer,p_fields jsonb) returns jsonb
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
  raise exception using errcode='PT409',message='Review request identity conflict';
 end if;
 if v.status<>'in_review' or v.edit_revision<>revision then raise exception using errcode='PT409',message='Review state changed';end if;
 if not exam_catalog_private.independent_reviewer(actor,p_model,p_version) then raise exception using errcode='42501',message='Independent reviewer required';end if;
 -- Component edit triggers also lock their question, serializing snapshots with edits.
 perform 1 from public.study_questions where id in(select question_id from public.exam_catalog_items where model_id=p_model and version=p_version) order by id for share;
 perform 1 from public.study_subjects where id in(select subject_id from public.exam_catalog_items where model_id=p_model and version=p_version) order by id for share;
 perform 1 from public.study_notices where id in(select q.notice_id from public.study_questions q join public.exam_catalog_items i on i.question_id=q.id where i.model_id=p_model and i.version=p_version) order by id for share;
 perform 1 from public.study_contests where id in(select n.contest_id from public.study_notices n join public.study_questions q on q.notice_id=n.id join public.exam_catalog_items i on i.question_id=q.id where i.model_id=p_model and i.version=p_version) order by id for share;
 snapshot:=exam_catalog_private.review_snapshot(p_model,p_version); fp:=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
 if fp<>p_fields->>'expectedFingerprint' then raise exception using errcode='PT409',message='Reviewed content changed';end if;
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
