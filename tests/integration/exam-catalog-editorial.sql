-- Disposable PostgreSQL only: no hosted users, no human approval, rollback all fixtures.
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('99999999-9999-4999-8999-999999999999');
insert into public.platform_admins(user_id,role) values('11111111-1111-4111-8111-111111111111','editor'),('99999999-9999-4999-8999-999999999999','owner');
insert into public.study_contests(id,slug,title) values('c0220000-0000-4000-8000-000000000001','catalog-api-test','Catalog API fixture');
insert into public.study_notices(id,contest_id,title) values('c0220000-0000-4000-8000-000000000002','c0220000-0000-4000-8000-000000000001','Fixture notice');
insert into public.study_subjects(id,name) values('c0220000-0000-4000-8000-000000000003','Catalog API subject');
insert into public.study_questions(id,notice_id,subject_id,statement) values
 ('c0220000-0000-4000-8000-000000000004','c0220000-0000-4000-8000-000000000002','c0220000-0000-4000-8000-000000000003','First draft composition question'),
 ('c0220000-0000-4000-8000-000000000005','c0220000-0000-4000-8000-000000000002','c0220000-0000-4000-8000-000000000003','Second draft composition question');
create function pg_temp.catalog_fields(ids jsonb default null) returns jsonb language sql as $$
 select jsonb_build_object('title','First version','description','Fixture only, never published','kind','subject-foundations','questionCount',2)
 ||case when ids is null then '{}'::jsonb else jsonb_build_object('questionIds',ids) end
$$;
do $$ begin
 if has_function_privilege('anon','public.write_exam_catalog_draft(text,uuid,integer,integer,jsonb)','execute')
 or has_function_privilege('anon','exam_catalog_private.write_draft(text,uuid,integer,integer,jsonb)','execute') then raise exception 'Anonymous catalog RPC exposure'; end if;
 if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='exam_catalog_private' and p.proname='write_draft' and p.prosecdef and p.proconfig=array['search_path=""']) then raise exception 'Writer settings missing'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform public.write_exam_catalog_draft('create',gen_random_uuid(),1,null,pg_temp.catalog_fields()); raise exception 'Unauthenticated writer'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","user_metadata":{"role":"owner"}}',true);
do $$ begin
 begin perform public.write_exam_catalog_draft('create',gen_random_uuid(),1,null,pg_temp.catalog_fields()); raise exception 'Student writer'; exception when insufficient_privilege then null; end;
 begin perform exam_catalog_private.write_draft('create',gen_random_uuid(),1,null,pg_temp.catalog_fields()); raise exception 'Student bypassed public wrapper'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare m uuid:='c0220000-0000-4000-8000-000000000010'; result jsonb; before_count bigint; before_audit bigint; payload jsonb;
begin
 result:=public.write_exam_catalog_draft('create',m,1,null,pg_temp.catalog_fields());
 if result#>>'{version,status}'<>'draft' or result#>>'{version,edit_revision}'<>'1' or result#>>'{version,created_by}'<>auth.uid()::text then raise exception 'Create contract'; end if;
 select count(*) into before_audit from public.editorial_audit_log;
 result:=public.write_exam_catalog_draft('create',m,1,null,pg_temp.catalog_fields());
 if not (result->>'replayed')::boolean or (select count(*) from public.editorial_audit_log)<>before_audit then raise exception 'Create replay wrote data'; end if;
 begin perform public.write_exam_catalog_draft('create',m,1,null,pg_temp.catalog_fields()||'{"title":"Collision title"}'); raise exception 'Create collision overwritten'; exception when serialization_failure then null; end;
 begin perform public.write_exam_catalog_draft('save',m,1,1,pg_temp.catalog_fields('[]')||'{"rightsChecked":true}'); raise exception 'Forged review marker'; exception when invalid_parameter_value then null; end;
 payload:=pg_temp.catalog_fields('["c0220000-0000-4000-8000-000000000004","c0220000-0000-4000-8000-000000000005"]');
 result:=public.write_exam_catalog_draft('save',m,1,1,payload);
 if result#>>'{version,edit_revision}'<>'2' or jsonb_array_length(result#>'{version,items}')<>2 then raise exception 'Save contract'; end if;
 select count(*) into before_audit from public.editorial_audit_log;
 begin perform public.write_exam_catalog_draft('save',m,1,1,payload||'{"title":"Stale edit"}'); raise exception 'Stale update accepted'; exception when serialization_failure then null; end;
 begin perform public.write_exam_catalog_draft('save',m,1,2,pg_temp.catalog_fields('["c0220000-0000-4000-8000-000000000099"]')); raise exception 'Missing question accepted'; exception when foreign_key_violation then null; end;
 if (select edit_revision from public.exam_catalog_versions where model_id=m and version=1)<>2
 or (select count(*) from public.exam_catalog_items where model_id=m and version=1)<>2
 or (select count(*) from public.editorial_audit_log)<>before_audit then raise exception 'Rejected write left partial state or audit'; end if;
 result:=public.write_exam_catalog_draft('request_review',m,1,2,'{}');
 if result#>>'{version,status}'<>'in_review' or result#>>'{version,edit_revision}'<>'3' then raise exception 'Review transition'; end if;
 begin perform public.write_exam_catalog_draft('save',m,1,3,payload); raise exception 'Review edited'; exception when check_violation then null; end;
 result:=public.write_exam_catalog_draft('clone',m,2,3,'{"sourceVersion":1}');
 if result#>>'{version,status}'<>'draft' or result#>>'{version,based_on_version}'<>'1' or result#>>'{version,based_on_revision}'<>'3' then raise exception 'Clone contract'; end if;
 select count(*) into before_audit from public.editorial_audit_log;
 result:=public.write_exam_catalog_draft('clone',m,2,3,'{"sourceVersion":1}');
 if not (result->>'replayed')::boolean or (select count(*) from public.editorial_audit_log)<>before_audit then raise exception 'Clone replay changed audit'; end if;
 begin perform public.write_exam_catalog_draft('clone',m,4,3,'{"sourceVersion":1}'); raise exception 'Version numbering skipped'; exception when serialization_failure then null; end;
 result:=public.write_exam_catalog_draft('save',m,2,1,pg_temp.catalog_fields('["c0220000-0000-4000-8000-000000000004"]')||'{"title":"Second version","questionCount":1}');
 if (select title from public.exam_catalog_versions where model_id=m and version=1)<>'First version'
 or (select count(*) from public.exam_catalog_items where model_id=m and version=1)<>2 then raise exception 'New version changed previous snapshot'; end if;
 result:=public.write_exam_catalog_draft('return_to_draft',m,1,3,'{}');
 if result#>>'{version,edit_revision}'<>'4' then raise exception 'Return did not increment revision'; end if;
 begin perform public.write_exam_catalog_draft('publish',m,1,4,'{}'); raise exception 'Publication command exists'; exception when invalid_parameter_value then null; end;
 if exists(select 1 from public.exam_catalog_versions where model_id=m and (rights_checked or reviewed_by is not null or published_at is not null)) then raise exception 'Human review or rights fabricated'; end if;
 if not exists(select 1 from public.editorial_audit_log where table_name='exam_catalog_versions' and actor_id=auth.uid() and new_data->>'model_id'=m::text and action='UPDATE') then raise exception 'Missing authenticated actor audit'; end if;
 begin delete from public.exam_catalog_items where model_id=m; raise exception 'Direct table mutation granted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',true);
do $$ declare r jsonb; begin
 r:=public.write_exam_catalog_draft('create','c0220000-0000-4000-8000-000000000011',1,null,pg_temp.catalog_fields());
 if r#>>'{version,created_by}'<>auth.uid()::text then raise exception 'Owner access or actor mismatch'; end if;
end $$;
reset role;
rollback;
