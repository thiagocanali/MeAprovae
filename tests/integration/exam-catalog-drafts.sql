-- Runs exclusively on disposable loopback PostgreSQL via scripts/test-database.sh.
begin;

do $$
begin
  if exists (select 1 from public.exam_catalog_models)
    or exists (select 1 from public.exam_catalog_versions)
    or exists (select 1 from public.exam_catalog_items) then
    raise exception 'New catalog must start empty; no model was published or imported';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename in ('exam_catalog_models','exam_catalog_versions','exam_catalog_items')) <> 3 then
    raise exception 'Expected three editor-only read policies';
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public'
      and tablename in ('exam_catalog_models','exam_catalog_versions','exam_catalog_items')
      and rowsecurity is not true) then
    raise exception 'A catalog table has RLS disabled';
  end if;
  if has_table_privilege('anon','public.exam_catalog_models','select')
     or has_table_privilege('anon','public.exam_catalog_versions','select')
     or has_table_privilege('anon','public.exam_catalog_items','select')
     or has_table_privilege('authenticated','public.exam_catalog_models','insert')
     or has_table_privilege('authenticated','public.exam_catalog_versions','update')
     or has_table_privilege('authenticated','public.exam_catalog_items','delete') then
    raise exception 'Unexpected catalog grants to browser roles';
  end if;
end $$;

insert into auth.users(id) values
 ('aaaa9999-aaaa-4999-8999-aaaaaaaa9999'),
 ('bbbb9999-bbbb-4999-8999-bbbbbbbb9999');
insert into public.platform_admins(user_id, role) values
 ('aaaa9999-aaaa-4999-8999-aaaaaaaa9999','editor');

insert into public.exam_catalog_models(id,title,description,kind,created_by)
values ('cccc9999-cccc-4999-8999-cccccccc9999','Fundamentos de Matemática',
  'Definição editorial sem publicação.','subject-foundations','aaaa9999-aaaa-4999-8999-aaaaaaaa9999');
insert into public.exam_catalog_versions(model_id,version,question_count,duration_minutes)
values ('cccc9999-cccc-4999-8999-cccccccc9999',1,10,60);

do $$
begin
  begin
    insert into public.exam_catalog_versions(model_id,version,status,question_count,duration_minutes)
      values ('cccc9999-cccc-4999-8999-cccccccc9999',2,'published',10,60);
    raise exception 'Published version was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.exam_catalog_versions(model_id,version,question_count,duration_minutes)
      values ('cccc9999-cccc-4999-8999-cccccccc9999',2,10,61);
    raise exception 'Invalid duration accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.exam_catalog_items(model_id,version,position,question_id)
      values ('cccc9999-cccc-4999-8999-cccccccc9999',1,1,'dddd9999-dddd-4999-8999-dddddddd9999');
    raise exception 'Missing question FK accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbb9999-bbbb-4999-8999-bbbbbbbb9999', true);
do $$
begin
  if exists (select 1 from public.exam_catalog_models)
    or exists (select 1 from public.exam_catalog_versions)
    or exists (select 1 from public.exam_catalog_items) then
    raise exception 'Non-editor saw private draft catalog';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaa9999-aaaa-4999-8999-aaaaaaaa9999', true);
do $$
begin
  if (select count(*) from public.exam_catalog_models) <> 1
    or (select count(*) from public.exam_catalog_versions) <> 1 then
    raise exception 'Editor could not read the draft model and version';
  end if;
  begin
    insert into public.exam_catalog_models(title, description, kind)
      values('Unauthorized insert','Direct browser write','subject-foundations');
    raise exception 'Browser wrote catalog model';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role anon;
do $$
begin
  begin
    perform 1 from public.exam_catalog_models;
    raise exception 'Anonymous catalog SELECT was granted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
