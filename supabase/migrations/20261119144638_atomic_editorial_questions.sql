-- One RPC call is one transaction, including editorial audit triggers.
-- No table grants or RLS policies are broadened.
create or replace function public.create_editorial_question(
  p_fields jsonb, p_explanation text default ''
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_question record;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if not public.has_platform_role('editor') then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object'
    or (p_fields - array['notice_id', 'subject_id', 'topic_id', 'difficulty', 'difficulty_reviewed', 'statement', 'source_label', 'source_url', 'source_year']) <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Invalid editorial fields';
  end if;
  insert into public.study_questions (
    notice_id, subject_id, topic_id, difficulty, difficulty_reviewed, statement,
    source_label, source_url, source_year, status
  ) values (
    (p_fields->>'notice_id')::uuid, (p_fields->>'subject_id')::uuid,
    (p_fields->>'topic_id')::uuid, coalesce(p_fields->>'difficulty', 'medium'),
    coalesce((p_fields->>'difficulty_reviewed')::boolean, false),
    p_fields->>'statement', p_fields->>'source_label', p_fields->>'source_url',
    (p_fields->>'source_year')::integer, 'draft'
  ) returning id, notice_id, subject_id, topic_id, difficulty, difficulty_reviewed, statement, source_label, source_url, source_year, status, created_at into v_question;

  insert into public.study_question_editorial_details(question_id, explanation)
    values (v_question.id, p_explanation);

  return to_jsonb(v_question) || jsonb_build_object('explanation', p_explanation);
end;
$$;

create or replace function public.update_editorial_question(
  p_question_id uuid, p_fields jsonb,
  p_explanation text default null, p_set_explanation boolean default false
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_question record;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if not public.has_platform_role('editor') then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object'
    or (p_fields - array['notice_id', 'subject_id', 'topic_id', 'difficulty', 'difficulty_reviewed', 'statement', 'source_label', 'source_url', 'source_year', 'status']) <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Invalid editorial fields';
  end if;
  if p_question_id is null or p_set_explanation is null
    or (p_fields = '{}'::jsonb and not p_set_explanation) then
    raise exception using errcode = '22023', message = 'No editorial changes supplied';
  end if;

  -- Serialize with answer submission's SHARE lock and all component editors.
  -- Never select the legacy explanation column, which is not granted to clients.
  select id, notice_id, subject_id, topic_id, difficulty, difficulty_reviewed, statement, source_label, source_url, source_year, status, created_at into v_question
    from public.study_questions where id = p_question_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Question not found';
  end if;

  if p_fields <> '{}'::jsonb then
    update public.study_questions set
      notice_id = case when p_fields ? 'notice_id' then (p_fields->>'notice_id')::uuid else v_question.notice_id end,
      subject_id = case when p_fields ? 'subject_id' then (p_fields->>'subject_id')::uuid else v_question.subject_id end,
      topic_id = case when p_fields ? 'topic_id' then (p_fields->>'topic_id')::uuid else v_question.topic_id end,
      difficulty = case when p_fields ? 'difficulty' then p_fields->>'difficulty' else v_question.difficulty end,
      difficulty_reviewed = case
        when p_fields ? 'difficulty_reviewed' then (p_fields->>'difficulty_reviewed')::boolean
        when p_fields ? 'difficulty' then false
        else v_question.difficulty_reviewed end,
      statement = case when p_fields ? 'statement' then p_fields->>'statement' else v_question.statement end,
      source_label = case when p_fields ? 'source_label' then p_fields->>'source_label' else v_question.source_label end,
      source_url = case when p_fields ? 'source_url' then p_fields->>'source_url' else v_question.source_url end,
      source_year = case when p_fields ? 'source_year' then (p_fields->>'source_year')::integer else v_question.source_year end,
      status = case when p_fields ? 'status' then p_fields->>'status' else v_question.status end
    where id = p_question_id
    returning id, notice_id, subject_id, topic_id, difficulty, difficulty_reviewed, statement, source_label, source_url, source_year, status, created_at into v_question;
  end if;

  if p_set_explanation then
    insert into public.study_question_editorial_details(question_id, explanation)
      values (p_question_id, p_explanation)
      on conflict (question_id) do update
        set explanation = excluded.explanation, updated_at = now();
    return to_jsonb(v_question) || jsonb_build_object('explanation', p_explanation);
  end if;
  return to_jsonb(v_question);
end;
$$;

revoke all on function public.create_editorial_question(jsonb, text) from public, anon, authenticated;
revoke all on function public.update_editorial_question(uuid, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.create_editorial_question(jsonb, text) to authenticated;
grant execute on function public.update_editorial_question(uuid, jsonb, text, boolean) to authenticated;
