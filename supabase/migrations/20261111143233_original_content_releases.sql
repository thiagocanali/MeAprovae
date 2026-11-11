-- Repository-authored releases retain machine provenance without assigning
-- authorship/review to a human auth account. Administrative SQL installs drafts.
create table public.question_content_releases (
  id uuid primary key default gen_random_uuid(),
  release_name text not null unique check(release_name ~ '^[a-z0-9][a-z0-9._-]{2,99}$'),
  content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),
  git_commit text not null check(git_commit ~ '^[a-f0-9]{40}$'),
  notice_id uuid not null references public.study_notices(id),
  question_count integer not null check(question_count between 1 and 100),
  manifest jsonb not null,
  installed_at timestamptz not null default now(),
  installation_method text not null default 'authorized_administrative_sql'
    check(installation_method = 'authorized_administrative_sql')
);
create index question_content_releases_notice_idx on public.question_content_releases(notice_id);
create table public.question_content_release_items (
  release_id uuid not null references public.question_content_releases(id),
  external_id text not null,
  question_id uuid not null unique references public.study_questions(id),
  rights_evidence text not null,
  primary key(release_id, external_id)
);
alter table public.question_content_releases enable row level security;
alter table public.question_content_release_items enable row level security;
revoke all on public.question_content_releases, public.question_content_release_items from public, anon, authenticated;
grant select on public.question_content_releases, public.question_content_release_items to authenticated;
create policy "Editors read repository content releases" on public.question_content_releases for select to authenticated
  using ((select public.has_platform_role('editor')));
create policy "Editors read repository release items" on public.question_content_release_items for select to authenticated
  using ((select public.has_platform_role('editor')));
create trigger question_content_release_audit after insert on public.question_content_releases
  for each row execute function public.capture_editorial_change();
create trigger question_content_release_item_audit after insert on public.question_content_release_items
  for each row execute function public.capture_editorial_change();

-- Invoker privileges only, no browser execution. No service key or user
-- impersonation is needed by the SQL operator; audit actor may legitimately be null.
create function public.install_original_question_release(
  p_release_name text, p_notice_id uuid, p_git_commit text, p_jsonl text, p_manifest jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_hash text; v_existing public.question_content_releases%rowtype;
  v_questions jsonb; v_item jsonb; v_release_id uuid; v_subject_id uuid; v_topic_id uuid;
  v_question_id uuid; v_option_id uuid; v_correct_id uuid; v_option jsonb; v_index integer; v_count integer;
begin
  if p_release_name is null or p_release_name !~ '^[a-z0-9][a-z0-9._-]{2,99}$'
    or p_notice_id is null or p_git_commit is null or p_git_commit !~ '^[a-f0-9]{40}$'
    or p_jsonl is null or octet_length(p_jsonl) > 2097152 or p_manifest is null then
    raise exception using errcode = '22023', message = 'Invalid repository release';
  end if;
  v_hash := encode(sha256(convert_to(p_jsonl, 'UTF8')), 'hex');
  if p_manifest->>'release' is distinct from p_release_name
    or p_manifest->>'contentSha256' is distinct from v_hash
    or p_manifest->>'reviewStatus' is distinct from 'pending_human_review'
    or p_manifest->'reviewer' is distinct from 'null'::jsonb then
    raise exception using errcode = '22023', message = 'Release hash or review declaration mismatch';
  end if;
  -- Coordinate with the other import workflow and serialize duplicate checks.
  perform pg_catalog.pg_advisory_xact_lock(726351, 1);
  select * into v_existing from public.question_content_releases where release_name = p_release_name;
  if found then
    if v_existing.content_sha256 <> v_hash or v_existing.notice_id <> p_notice_id then
      raise exception using errcode = '22023', message = 'Release identifier already used for different content or destination';
    end if;
    return jsonb_build_object('id', v_existing.id, 'questionCount', v_existing.question_count, 'replayed', true);
  end if;
  if not exists(select 1 from public.study_notices where id = p_notice_id and status <> 'archived') then
    raise exception using errcode = '22023', message = 'Notice unavailable';
  end if;
  select jsonb_agg(line::jsonb) into v_questions from regexp_split_to_table(p_jsonl, E'\n') line where trim(line) <> '';
  v_count := coalesce(jsonb_array_length(v_questions), 0);
  if v_count not between 1 and 100 or p_manifest->>'questionCount' is distinct from v_count::text then
    raise exception using errcode = '22023', message = 'Invalid release size';
  end if;
  if (select count(distinct value->>'externalId') from jsonb_array_elements(v_questions)) <> v_count then
    raise exception using errcode = '22023', message = 'Duplicate external identifier';
  end if;
  insert into public.question_content_releases(release_name, content_sha256, git_commit, notice_id, question_count, manifest)
    values(p_release_name, v_hash, p_git_commit, p_notice_id, v_count, p_manifest) returning id into v_release_id;
  for v_item in select value from jsonb_array_elements(v_questions) loop
    if coalesce(v_item->>'externalId', '') !~ '^[a-zA-Z0-9._:-]{1,120}$'
      or coalesce(length(trim(v_item->>'statement')), 0) not between 10 and 20000
      or coalesce(length(trim(v_item->>'explanation')), 0) not between 1 and 12000
      or coalesce(length(trim(v_item->>'sourceLabel')), 0) not between 1 and 180
      or v_item->>'rights' is distinct from 'original'
      or coalesce(length(trim(v_item->>'rightsEvidence')), 0) not between 1 and 2000
      or coalesce(v_item->>'difficulty', '') not in ('easy', 'medium', 'hard')
      or coalesce(jsonb_typeof(v_item->'options'), '') <> 'array'
      or coalesce(jsonb_typeof(v_item->'correctOption'), '') <> 'number'
      or coalesce(v_item->>'correctOption', '') !~ '^[0-4]$'
      or coalesce(length(trim(v_item->>'topic')), 0) not between 2 and 120
      or v_item->>'subject' is distinct from p_manifest->>'subject' then
      raise exception using errcode = '22023', message = 'Invalid original question';
    end if;
    if jsonb_array_length(v_item->'options') not between 2 and 5
      or (v_item->>'correctOption')::integer >= jsonb_array_length(v_item->'options') then
      raise exception using errcode = '22023', message = 'Invalid answer key';
    end if;
    select id into v_subject_id from public.study_subjects where name = v_item->>'subject';
    if v_subject_id is null or not exists(select 1 from public.study_notice_subjects where notice_id = p_notice_id and subject_id = v_subject_id) then
      raise exception using errcode = '22023', message = 'Subject unavailable or unassigned';
    end if;
    if exists(select 1 from public.study_questions where
      md5(lower(regexp_replace(trim(statement), '\s+', ' ', 'g'))) = md5(lower(regexp_replace(trim(v_item->>'statement'), '\s+', ' ', 'g')))) then
      raise exception using errcode = '23505', message = 'Duplicate statement';
    end if;
    if (select count(distinct lower(trim(value #>> '{}'))) from jsonb_array_elements(v_item->'options')) <> jsonb_array_length(v_item->'options') then
      raise exception using errcode = '22023', message = 'Duplicate options';
    end if;
    select id into v_topic_id from public.study_topics where subject_id = v_subject_id and name = trim(v_item->>'topic') and parent_topic_id is null order by created_at, id limit 1;
    if v_topic_id is null then
      insert into public.study_topics(subject_id, name) values(v_subject_id, trim(v_item->>'topic')) returning id into v_topic_id;
    end if;
    insert into public.study_questions(notice_id, subject_id, topic_id, statement, source_label, difficulty, difficulty_reviewed, status)
      values(p_notice_id, v_subject_id, v_topic_id, trim(v_item->>'statement'), trim(v_item->>'sourceLabel'), v_item->>'difficulty', false, 'draft') returning id into v_question_id;
    insert into public.study_question_editorial_details(question_id, explanation) values(v_question_id, trim(v_item->>'explanation'));
    v_index := 0; v_correct_id := null;
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
    insert into public.question_content_release_items(release_id, external_id, question_id, rights_evidence)
      values(v_release_id, v_item->>'externalId', v_question_id, trim(v_item->>'rightsEvidence'));
  end loop;
  return jsonb_build_object('id', v_release_id, 'questionCount', v_count, 'replayed', false);
end;
$$;
revoke all on function public.install_original_question_release(text, uuid, text, text, jsonb) from public, anon, authenticated;
