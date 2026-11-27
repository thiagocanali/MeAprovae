-- DRAFT: local/CI only. Requires separate schema/security review before rollout.
-- No publication function, student catalog or session behavior changes.
alter table public.exam_catalog_versions
  add column edit_revision integer not null default 1 check(edit_revision>0),
  add column created_by uuid references auth.users(id) on delete set null,
  add column based_on_version integer,
  add column based_on_revision integer,
  add constraint exam_catalog_source_pair check (
    (based_on_version is null and based_on_revision is null) or
    (based_on_version is not null and based_on_revision is not null and based_on_version>0 and based_on_version<version and based_on_revision>0)),
  add foreign key(model_id,based_on_version) references public.exam_catalog_versions(model_id,version) on delete restrict;
create index exam_catalog_version_creator_idx on public.exam_catalog_versions(created_by);
create index exam_catalog_source_version_idx on public.exam_catalog_versions(model_id,based_on_version) where based_on_version is not null;
-- Audit rows keep composite keys in JSON; index the exact paths queried by the API.
create index editorial_audit_catalog_new_model_idx on public.editorial_audit_log((new_data->>'model_id'))
 where table_name in ('exam_catalog_models','exam_catalog_versions','exam_catalog_items');
create index editorial_audit_catalog_old_model_idx on public.editorial_audit_log((old_data->>'model_id'))
 where table_name in ('exam_catalog_models','exam_catalog_versions','exam_catalog_items');

create function exam_catalog_private.advance_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.edit_revision:=old.edit_revision+1;
  return new;
end;
$$;
revoke all on function exam_catalog_private.advance_revision() from public,anon,authenticated;
-- Runs after the integrity guard, including a status-only return to draft.
create trigger zz_exam_catalog_revision before update on public.exam_catalog_versions
 for each row execute function exam_catalog_private.advance_revision();

create function exam_catalog_private.version_snapshot(p_model uuid,p_version integer) returns jsonb
language sql security invoker set search_path='' as $$
 select to_jsonb(v)||jsonb_build_object('items',coalesce((
   select jsonb_agg(jsonb_build_object('position',i.position,'question_id',i.question_id,'subject_id',i.subject_id) order by i.position)
   from public.exam_catalog_items i where i.model_id=v.model_id and i.version=v.version),'[]'::jsonb))
 from public.exam_catalog_versions v where v.model_id=p_model and v.version=p_version
$$;
revoke all on function exam_catalog_private.version_snapshot(uuid,integer) from public,anon,authenticated;

create function exam_catalog_private.write_draft(p_action text,p_model uuid,p_version integer,p_expected_revision integer,p_fields jsonb)
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
   if exists(select 1 from jsonb_object_keys(p_fields) k where k not in ('title','description','kind','questionCount','questionIds'))
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
     if m.created_by=actor and v.edit_revision=1 and v.title=title_value and v.description=description_value and v.kind=kind_value and v.question_count=count_value then replay:=true;
     else raise exception using errcode='40001',message='Model identity already in use'; end if;
   else
     insert into public.exam_catalog_versions(model_id,version,title,description,kind,question_count,duration_minutes,created_by)
       values(p_model,1,title_value,description_value,kind_value,count_value,count_value*6,actor);
   end if;
 elsif p_action='clone' then
   if p_expected_revision is null or p_expected_revision<1 then raise exception using errcode='22023',message='Source revision required'; end if;
   if v.model_id is not null then
     if v.based_on_version=(p_fields->>'sourceVersion')::integer and v.based_on_revision=p_expected_revision and v.created_by=actor then replay:=true;
     else raise exception using errcode='40001',message='Version already exists'; end if;
   else
     select * into src from public.exam_catalog_versions where model_id=p_model and version=(p_fields->>'sourceVersion')::integer for update;
     if not found then raise exception using errcode='P0002',message='Source version not found'; end if;
     if src.edit_revision<>p_expected_revision or p_version<>(select max(version)+1 from public.exam_catalog_versions where model_id=p_model) then
       raise exception using errcode='40001',message='Stale source or version number'; end if;
     insert into public.exam_catalog_versions(model_id,version,title,description,kind,question_count,duration_minutes,created_by,based_on_version,based_on_revision)
       values(p_model,p_version,src.title,src.description,src.kind,src.question_count,src.duration_minutes,actor,src.version,src.edit_revision);
     insert into public.exam_catalog_items(model_id,version,position,question_id,subject_id)
       select model_id,p_version,position,question_id,subject_id from public.exam_catalog_items where model_id=p_model and version=src.version order by position;
   end if;
 else
   if v.model_id is null then raise exception using errcode='P0002',message='Version not found'; end if;
   if p_expected_revision is null or p_expected_revision<1 then raise exception using errcode='22023',message='Expected revision required'; end if;
   if v.edit_revision<>p_expected_revision then raise exception using errcode='40001',message='Stale editorial revision'; end if;
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
 return jsonb_build_object('version',exam_catalog_private.version_snapshot(p_model,p_version),'replayed',replay);
end;
$$;
revoke all on function exam_catalog_private.write_draft(text,uuid,integer,integer,jsonb) from public,anon,authenticated;
-- Wrappers remain invoker; the private function enforces identity/role itself.
grant usage on schema exam_catalog_private to authenticated;
grant execute on function exam_catalog_private.write_draft(text,uuid,integer,integer,jsonb) to authenticated;
create function public.write_exam_catalog_draft(p_action text,p_model_id uuid,p_version integer,p_expected_revision integer,p_fields jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
 select exam_catalog_private.write_draft(p_action,p_model_id,p_version,p_expected_revision,p_fields)
$$;
revoke all on function public.write_exam_catalog_draft(text,uuid,integer,integer,jsonb) from public,anon;
grant execute on function public.write_exam_catalog_draft(text,uuid,integer,integer,jsonb) to authenticated;
