-- Atomic editorial mutations: both tables participate in the same PostgreSQL transaction.
-- SECURITY DEFINER is required for protected question columns; both functions
-- explicitly enforce authenticated editorial membership before any mutation.
-- The RPC grants are restricted to authenticated, with no anonymous execution.
create or replace function public.create_editorial_question(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_question public.study_questions%rowtype;
  v_explanation text := coalesce(p_payload->>'explanation', '');
begin
  if (select auth.uid()) is null or not (select public.has_platform_role('editor')) then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;
  if length(v_explanation) > 12000 then
    raise exception using errcode = '22023', message = 'Explanation too long';
  end if;
  insert into public.study_questions (
    notice_id, subject_id, topic_id, difficulty, difficulty_reviewed,
    statement, source_label, source_url, source_year, status
  ) values (
    (p_payload->>'notice_id')::uuid,
    (p_payload->>'subject_id')::uuid,
    nullif(p_payload->>'topic_id', '')::uuid,
    coalesce(p_payload->>'difficulty', 'medium'),
    coalesce((p_payload->>'difficulty_reviewed')::boolean, false),
    p_payload->>'statement',
    nullif(p_payload->>'source_label', ''),
    nullif(p_payload->>'source_url', ''),
    (p_payload->>'source_year')::integer,
    'draft'
  ) returning * into v_question;

  insert into public.study_question_editorial_details (question_id, explanation)
  values (v_question.id, v_explanation);

  return jsonb_build_object('id', v_question.id, 'notice_id', v_question.notice_id,
    'subject_id', v_question.subject_id, 'topic_id', v_question.topic_id,
    'difficulty', v_question.difficulty, 'difficulty_reviewed', v_question.difficulty_reviewed,
    'statement', v_question.statement, 'source_label', v_question.source_label,
    'source_url', v_question.source_url, 'source_year', v_question.source_year,
    'status', v_question.status, 'created_at', v_question.created_at,
    'explanation', v_explanation);
end;
$$;

create or replace function public.update_editorial_question(p_question_id uuid, p_updates jsonb, p_explanation text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_question public.study_questions%rowtype;
begin
  if (select auth.uid()) is null or not (select public.has_platform_role('editor')) then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;
  if p_explanation is not null and length(p_explanation) > 12000 then
    raise exception using errcode = '22023', message = 'Explanation too long';
  end if;
  -- Lock first; the existing history guard prevents editing attempted questions.
  select * into v_question from public.study_questions where id = p_question_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Question not found'; end if;
  if p_updates <> '{}'::jsonb then
    update public.study_questions set
      notice_id = case when p_updates ? 'notice_id' then (p_updates->>'notice_id')::uuid else notice_id end,
      subject_id = case when p_updates ? 'subject_id' then (p_updates->>'subject_id')::uuid else subject_id end,
      topic_id = case when p_updates ? 'topic_id' then nullif(p_updates->>'topic_id','')::uuid else topic_id end,
      difficulty = case when p_updates ? 'difficulty' then p_updates->>'difficulty' else difficulty end,
      difficulty_reviewed = case when p_updates ? 'difficulty_reviewed' then (p_updates->>'difficulty_reviewed')::boolean else difficulty_reviewed end,
      statement = case when p_updates ? 'statement' then p_updates->>'statement' else statement end,
      source_label = case when p_updates ? 'source_label' then nullif(p_updates->>'source_label','') else source_label end,
      source_url = case when p_updates ? 'source_url' then nullif(p_updates->>'source_url','') else source_url end,
      source_year = case when p_updates ? 'source_year' then (p_updates->>'source_year')::integer else source_year end,
      status = case when p_updates ? 'status' then p_updates->>'status' else status end
    where id = p_question_id returning * into v_question;
  end if;
  if p_explanation is not null then
    insert into public.study_question_editorial_details(question_id, explanation)
    values(p_question_id, p_explanation)
    on conflict(question_id) do update set explanation = excluded.explanation;
  end if;
  return jsonb_build_object('id', v_question.id, 'notice_id', v_question.notice_id,
    'subject_id', v_question.subject_id, 'topic_id', v_question.topic_id,
    'difficulty', v_question.difficulty, 'difficulty_reviewed', v_question.difficulty_reviewed,
    'statement', v_question.statement, 'source_label', v_question.source_label,
    'source_url', v_question.source_url, 'source_year', v_question.source_year,
    'status', v_question.status, 'created_at', v_question.created_at);
end;
$$;

revoke all on function public.create_editorial_question(jsonb) from public, anon;
revoke all on function public.update_editorial_question(uuid, jsonb, text) from public, anon;
grant execute on function public.create_editorial_question(jsonb) to authenticated;
grant execute on function public.update_editorial_question(uuid, jsonb, text) to authenticated;
