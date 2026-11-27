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

-- Additional fixture transaction: integrity, review locking, full grants matrix.
begin;
insert into auth.users(id) values ('aaaa9999-aaaa-4999-8999-aaaaaaaa9999'),('bbbb9999-bbbb-4999-8999-bbbbbbbb9999'),('eeee9999-eeee-4999-8999-eeeeeeee9999');
insert into public.platform_admins(user_id,role) values('aaaa9999-aaaa-4999-8999-aaaaaaaa9999','editor'),('eeee9999-eeee-4999-8999-eeeeeeee9999','owner');
insert into public.study_contests(id,slug,title) values('11009999-0000-4000-8000-000000000001','catalog-review-test','Catalog fixture');
insert into public.study_notices(id,contest_id,title) values('11009999-0000-4000-8000-000000000002','11009999-0000-4000-8000-000000000001','Fixture notice');
insert into public.study_subjects(id,name) values('11009999-0000-4000-8000-000000000003','Fixture subject A'),('11009999-0000-4000-8000-000000000004','Fixture subject B');
insert into public.study_questions(id,notice_id,subject_id,statement) values
 ('11009999-0000-4000-8000-000000000005','11009999-0000-4000-8000-000000000002','11009999-0000-4000-8000-000000000003','Catalog draft question one'),
 ('11009999-0000-4000-8000-000000000006','11009999-0000-4000-8000-000000000002','11009999-0000-4000-8000-000000000003','Catalog draft question two'),
 ('11009999-0000-4000-8000-000000000007','11009999-0000-4000-8000-000000000002','11009999-0000-4000-8000-000000000004','Catalog draft question three');
insert into public.exam_catalog_models(id,title,description,kind) values
 ('cccc9999-cccc-4999-8999-cccccccc9999','Versioned fixture','Original version description','subject-foundations');
insert into public.exam_catalog_versions(model_id,version,question_count,duration_minutes) values('cccc9999-cccc-4999-8999-cccccccc9999',1,2,12);

do $$ declare m uuid:='cccc9999-cccc-4999-8999-cccccccc9999'; t text; r text; p text; begin
 foreach t in array array['exam_catalog_models','exam_catalog_versions','exam_catalog_items'] loop
   foreach r in array array['anon','authenticated'] loop
     foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
       if has_table_privilege(r,'public.'||t,p) then raise exception 'Unexpected % grant on % for %',p,t,r; end if;
     end loop;
   end loop;
   if has_table_privilege('anon','public.'||t,'SELECT') then raise exception 'Anon SELECT on %',t; end if;
 end loop;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='exam_catalog_private' and p.prosecdef) then raise exception 'Unexpected definer helper'; end if;
 begin update public.exam_catalog_versions set status='in_review' where model_id=m; raise exception 'Incomplete composition accepted'; exception when check_violation then null; end;
 begin insert into public.exam_catalog_items(model_id,version,position,question_id) values(m,1,3,'11009999-0000-4000-8000-000000000005'); raise exception 'Position beyond count'; exception when check_violation then null; end;
 begin insert into public.exam_catalog_items(model_id,version,position,question_id,subject_id) values(m,1,1,'11009999-0000-4000-8000-000000000005','11009999-0000-4000-8000-000000000004'); raise exception 'False distribution accepted'; exception when check_violation then null; end;
 insert into public.exam_catalog_items(model_id,version,position,question_id) values(m,1,1,'11009999-0000-4000-8000-000000000005');
 begin insert into public.exam_catalog_items(model_id,version,position,question_id) values(m,1,2,'11009999-0000-4000-8000-000000000005'); raise exception 'Duplicate question'; exception when unique_violation then null; end;
 insert into public.exam_catalog_items(model_id,version,position,question_id) values(m,1,2,'11009999-0000-4000-8000-000000000006');
 begin update public.exam_catalog_versions set question_count=1,duration_minutes=6 where model_id=m; raise exception 'Count truncated composition'; exception when check_violation then null; end;
 update public.exam_catalog_versions set status='in_review' where model_id=m;
 begin delete from public.exam_catalog_items where model_id=m; raise exception 'Review items deleted'; exception when check_violation then null; end;
 begin update public.exam_catalog_items set question_id='11009999-0000-4000-8000-000000000007' where model_id=m and position=2; raise exception 'Review composition changed'; exception when check_violation then null; end;
 begin update public.exam_catalog_versions set title='Changed review title' where model_id=m; raise exception 'Review metadata changed'; exception when check_violation then null; end;
 begin delete from public.exam_catalog_models where id=m; raise exception 'Review model cascaded'; exception when check_violation then null; end;
 update public.exam_catalog_models set title='New default model title' where id=m;
 if (select title from public.exam_catalog_versions where model_id=m)<>'Versioned fixture' then raise exception 'Version snapshot overwritten'; end if;
 update public.exam_catalog_versions set status='draft' where model_id=m;
 update public.exam_catalog_items set question_id='11009999-0000-4000-8000-000000000007',subject_id=null where model_id=m and position=2;
 begin update public.exam_catalog_versions set status='in_review' where model_id=m; raise exception 'Single subject model accepted mixed distribution'; exception when check_violation then null; end;
 update public.exam_catalog_versions set kind='multidisciplinary' where model_id=m;
 update public.exam_catalog_versions set status='in_review' where model_id=m;
 update public.exam_catalog_versions set status='draft' where model_id=m;
 update public.study_questions set status='archived' where id='11009999-0000-4000-8000-000000000007';
 begin update public.exam_catalog_versions set status='in_review' where model_id=m; raise exception 'Archived source entered review'; exception when check_violation then null; end;
 if not exists(select 1 from public.editorial_audit_log where table_name='exam_catalog_versions' and action='UPDATE')
 or not exists(select 1 from public.editorial_audit_log where table_name='exam_catalog_items' and action='INSERT') then raise exception 'Missing catalog audit'; end if;
end $$;

-- Same browser role, different identities: editor and owner can read, never write.
set local role authenticated;
do $$ declare u text; t text; n bigint; begin
 foreach u in array array['aaaa9999-aaaa-4999-8999-aaaaaaaa9999','eeee9999-eeee-4999-8999-eeeeeeee9999','bbbb9999-bbbb-4999-8999-bbbbbbbb9999'] loop
   perform set_config('request.jwt.claim.sub',u,true);
   foreach t in array array['exam_catalog_models','exam_catalog_versions','exam_catalog_items'] loop
     execute format('select count(*) from public.%I',t) into n;
     if (u='bbbb9999-bbbb-4999-8999-bbbbbbbb9999' and n<>0) or (u<>'bbbb9999-bbbb-4999-8999-bbbbbbbb9999' and n=0) then raise exception 'Wrong read isolation for % on %',u,t; end if;
     begin execute format('delete from public.%I',t); raise exception 'Direct DELETE allowed on %',t; exception when insufficient_privilege then null; end;
     begin execute format('truncate table public.%I',t); raise exception 'Direct TRUNCATE allowed on %',t; exception when insufficient_privilege then null; end;
   end loop;
 end loop;
end $$;
reset role;
rollback;
