-- Atomic editorial imports. No function in this migration bypasses RLS.
create table public.question_import_batches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  source_name text not null check (source_name ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
  notice_id uuid not null references public.study_notices(id),
  created_by uuid not null references auth.users(id),
  payload_hash text not null,
  question_count integer not null check (question_count between 1 and 100),
  created_at timestamptz not null default now()
);
create index question_import_batches_created_at_idx on public.question_import_batches (created_at desc);
create index question_import_batches_notice_id_idx on public.question_import_batches (notice_id);
create index question_import_batches_created_by_idx on public.question_import_batches (created_by);

create table public.question_import_items (
  batch_id uuid not null references public.question_import_batches(id),
  question_id uuid not null unique references public.study_questions(id),
  source_name text not null,
  external_id text not null check (external_id ~ '^[a-zA-Z0-9._:-]{1,120}$'),
  rights text not null check (rights in ('original', 'licensed', 'public-domain')),
  rights_evidence text not null check (length(trim(rights_evidence)) between 1 and 2000),
  primary key (source_name, external_id)
);
create index question_import_items_batch_id_idx on public.question_import_items (batch_id);

alter table public.question_import_batches enable row level security;
alter table public.question_import_items enable row level security;
revoke all on public.question_import_batches, public.question_import_items from anon, authenticated;
grant select, insert on public.question_import_batches, public.question_import_items to authenticated;
create policy "Editors read import batches" on public.question_import_batches for select to authenticated
  using ((select public.has_platform_role('editor')));
create policy "Editors create own import batches" on public.question_import_batches for insert to authenticated
  with check ((select public.has_platform_role('editor')) and created_by = (select auth.uid()));
create policy "Editors read import items" on public.question_import_items for select to authenticated
  using ((select public.has_platform_role('editor')));
create policy "Editors create import items" on public.question_import_items for insert to authenticated
  with check ((select public.has_platform_role('editor')));

create trigger question_import_batch_audit after insert on public.question_import_batches
  for each row execute function public.capture_editorial_change();
create trigger question_import_item_audit after insert on public.question_import_items
  for each row execute function public.capture_editorial_change();

-- These columns were readable, but the editor had no INSERT/UPDATE grant.
grant insert (difficulty, difficulty_reviewed), update (difficulty, difficulty_reviewed)
  on public.study_questions to authenticated;

-- Non-unique: preserve existing versions while speeding up duplicate detection.
create index study_questions_import_fingerprint_idx on public.study_questions
  (md5(lower(regexp_replace(trim(statement), '\s+', ' ', 'g'))));

create or replace function public.import_question_batch(
  p_request_id uuid, p_notice_id uuid, p_source_name text, p_questions jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch public.question_import_batches%rowtype;
  v_hash text;
  v_item jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_option_id uuid;
  v_correct_id uuid;
  v_subject_id uuid;
  v_index integer;
  v_fingerprint text;
  v_seen text[] := '{}';
begin
  if auth.uid() is null or not public.has_platform_role('editor') then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;
  if p_request_id is null or p_notice_id is null or p_source_name is null
     or p_source_name !~ '^[a-z0-9][a-z0-9._-]{2,79}$'
     or p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid import request';
  end if;
  if jsonb_array_length(p_questions) not between 1 and 100 or octet_length(p_questions::text) > 4194304 then
    raise exception using errcode = '22023', message = 'Import limit exceeded';
  end if;
  -- Serialize this workflow across sources to prevent racing duplicate imports.
  perform pg_catalog.pg_advisory_xact_lock(726351, 1);
  v_hash := md5(jsonb_build_object('notice', p_notice_id, 'source', p_source_name, 'questions', p_questions)::text);
  select * into v_batch from public.question_import_batches where request_id = p_request_id;
  if found then
    if v_batch.created_by <> auth.uid() or v_batch.payload_hash <> v_hash then
      raise exception using errcode = '22023', message = 'Request identifier already used with another payload';
    end if;
    return jsonb_build_object('id', v_batch.id, 'questionCount', v_batch.question_count, 'replayed', true);
  end if;
  if not exists (select 1 from public.study_notices where id = p_notice_id and status <> 'archived') then
    raise exception using errcode = '22023', message = 'Notice is unavailable';
  end if;

  insert into public.question_import_batches(request_id, source_name, notice_id, created_by, payload_hash, question_count)
  values (p_request_id, p_source_name, p_notice_id, auth.uid(), v_hash, jsonb_array_length(p_questions))
  returning * into v_batch;

  for v_item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = '22023', message = 'Question must be an object';
    end if;
    if coalesce(v_item->>'externalId', '') !~ '^[a-zA-Z0-9._:-]{1,120}$'
       or coalesce(length(trim(v_item->>'statement')), 0) not between 10 and 20000
       or coalesce(length(trim(v_item->>'explanation')), 0) not between 1 and 12000
       or coalesce(length(trim(v_item->>'sourceLabel')), 0) not between 1 and 180
       or coalesce(v_item->>'rights', '') not in ('original', 'licensed', 'public-domain')
       or coalesce(length(trim(v_item->>'rightsEvidence')), 0) not between 1 and 2000
       or coalesce(v_item->>'difficulty', '') not in ('easy', 'medium', 'hard')
       or coalesce(jsonb_typeof(v_item->'options'), '') <> 'array'
       or coalesce(jsonb_typeof(v_item->'correctOption'), '') <> 'number'
       or coalesce(v_item->>'correctOption', '') !~ '^[0-4]$' then
      raise exception using errcode = '22023', message = 'Invalid question data';
    end if;
    if jsonb_array_length(v_item->'options') not between 2 and 5
       or (v_item->>'correctOption')::integer >= jsonb_array_length(v_item->'options') then
      raise exception using errcode = '22023', message = 'Invalid answer or options';
    end if;
    if (v_item->>'rights' <> 'original' and coalesce(trim(v_item->>'sourceUrl'), '') = '')
       or (coalesce(trim(v_item->>'sourceUrl'), '') <> '' and
         (length(v_item->>'sourceUrl') > 2000 or v_item->>'sourceUrl' !~ '^https?://[^[:space:]]+$')) then
      raise exception using errcode = '22023', message = 'Invalid source URL';
    end if;
    v_subject_id := (v_item->>'subjectId')::uuid;
    if not exists (select 1 from public.study_notice_subjects where notice_id = p_notice_id and subject_id = v_subject_id) then
      raise exception using errcode = '22023', message = 'Subject is not assigned to notice';
    end if;
    v_fingerprint := md5(lower(regexp_replace(trim(v_item->>'statement'), '\s+', ' ', 'g')));
    if v_fingerprint = any(v_seen) or exists (
      select 1 from public.study_questions
      where md5(lower(regexp_replace(trim(statement), '\s+', ' ', 'g'))) = v_fingerprint
    ) then
      raise exception using errcode = '23505', message = 'Duplicate question statement';
    end if;
    v_seen := array_append(v_seen, v_fingerprint);
    if (select count(distinct lower(trim(value #>> '{}'))) from jsonb_array_elements(v_item->'options')) <> jsonb_array_length(v_item->'options') then
      raise exception using errcode = '22023', message = 'Duplicate options';
    end if;
    insert into public.study_questions(notice_id, subject_id, statement, source_label, source_url, difficulty, difficulty_reviewed, status)
    values(p_notice_id, v_subject_id, trim(v_item->>'statement'), trim(v_item->>'sourceLabel'), nullif(trim(v_item->>'sourceUrl'), ''), v_item->>'difficulty', false, 'draft')
    returning id into v_question_id;
    insert into public.study_question_editorial_details(question_id, explanation)
    values(v_question_id, trim(v_item->>'explanation'));
    v_index := 0;
    v_correct_id := null;
    for v_option in select value from jsonb_array_elements(v_item->'options') loop
      if jsonb_typeof(v_option) <> 'string' or length(trim(v_option #>> '{}')) not between 1 and 5000 then
        raise exception using errcode = '22023', message = 'Invalid option';
      end if;
      insert into public.study_question_options(question_id, option_label, content, position)
      values(v_question_id, chr(65 + v_index), trim(v_option #>> '{}'), v_index + 1) returning id into v_option_id;
      if v_index = (v_item->>'correctOption')::integer then v_correct_id := v_option_id; end if;
      v_index := v_index + 1;
    end loop;
    insert into public.study_question_answer_keys(question_id, correct_option_id) values(v_question_id, v_correct_id);
    insert into public.question_import_items(batch_id, question_id, source_name, external_id, rights, rights_evidence)
    values(v_batch.id, v_question_id, p_source_name, v_item->>'externalId', v_item->>'rights', trim(v_item->>'rightsEvidence'));
  end loop;
  return jsonb_build_object('id', v_batch.id, 'questionCount', v_batch.question_count, 'replayed', false);
end;
$$;
revoke all on function public.import_question_batch(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.import_question_batch(uuid, uuid, text, jsonb) to authenticated;
