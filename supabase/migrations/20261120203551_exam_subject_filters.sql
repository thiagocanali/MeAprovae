-- Additive filtering; legacy sessions and the three-argument RPC remain valid.
alter table public.exam_sessions
  add column subject_id uuid references public.study_subjects(id),
  add column topic_id uuid,
  add constraint exam_sessions_topic_subject_fk foreign key (topic_id, subject_id) references public.study_topics(id, subject_id),
  add constraint exam_sessions_topic_requires_subject check (topic_id is null or subject_id is not null),
  drop constraint exam_sessions_question_count_check,
  add constraint exam_sessions_question_count_check check (question_count between 1 and 20);
create index exam_sessions_subject_idx on public.exam_sessions(subject_id);
create index exam_sessions_topic_subject_idx on public.exam_sessions(topic_id, subject_id);

-- Helpers are private and never executable by browser roles.
create function exam_private.validate_filters(p_contest_id uuid, p_subject_id uuid, p_topic_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if (p_contest_id is not null and not exists(select 1 from public.study_contests where id = p_contest_id and status = 'published'))
    or (p_subject_id is not null and not exists(select 1 from public.study_subjects where id = p_subject_id))
    or (p_topic_id is not null and (p_subject_id is null or not exists(select 1 from public.study_topics where id = p_topic_id and subject_id = p_subject_id))) then
    raise exception using errcode = '22023', message = 'Invalid exam filters';
  end if;
end;
$$;
revoke all on function exam_private.validate_filters(uuid, uuid, uuid) from public, anon, authenticated;

create function exam_private.get_availability(p_contest_id uuid, p_subject_id uuid, p_topic_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  perform exam_private.validate_filters(p_contest_id, p_subject_id, p_topic_id);
  select count(*) into v_count from public.study_questions q
    join public.study_notices n on n.id = q.notice_id join public.study_contests c on c.id = n.contest_id
    join public.study_question_answer_keys k on k.question_id = q.id
    where q.status = 'published' and n.status = 'published' and c.status = 'published'
      and (p_contest_id is null or c.id = p_contest_id)
      and (p_subject_id is null or q.subject_id = p_subject_id)
      and (p_topic_id is null or q.topic_id = p_topic_id);
  return jsonb_build_object('available', v_count, 'maxQuestions', least(20, v_count));
end;
$$;
create or replace function exam_private.get_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.exam_sessions%rowtype; v_items jsonb; v_correct integer; v_answered integer;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_session from public.exam_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found then raise exception using errcode = 'P0002', message = 'Session not found'; end if;
  if v_session.status = 'active' and clock_timestamp() >= v_session.expires_at then
    update public.exam_sessions set status = 'expired', finished_at = expires_at where id = p_session_id returning * into v_session;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('position', position, 'question', question_snapshot, 'result', result) order by position), '[]'::jsonb),
    count(*) filter(where result is not null), count(*) filter(where (result->>'isCorrect')::boolean)
    into v_items, v_answered, v_correct from public.exam_session_items where session_id = p_session_id;
  return jsonb_build_object('id', v_session.id, 'status', v_session.status, 'questionCount', v_session.question_count,
    'contestId', v_session.contest_id, 'subjectId', v_session.subject_id, 'topicId', v_session.topic_id,
    'startedAt', v_session.started_at, 'expiresAt', v_session.expires_at, 'finishedAt', v_session.finished_at,
    'serverNow', clock_timestamp(), 'answeredCount', v_answered, 'correctCount', v_correct,
    'score', round(100.0 * v_correct / v_session.question_count, 1), 'questions', v_items);
end;
$$;

create function exam_private.start_filtered_session(p_request_id uuid, p_contest_id uuid, p_subject_id uuid, p_topic_id uuid, p_question_count integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_session public.exam_sessions%rowtype; v_ids uuid[]; v_id uuid; v_position integer := 0; v_snapshot jsonb; v_now timestamptz;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_request_id is null or p_question_count is null or p_question_count not between 1 and 20 then
    raise exception using errcode = '22023', message = 'Invalid session configuration';
  end if;
  perform exam_private.validate_filters(p_contest_id, p_subject_id, p_topic_id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 428));
  select * into v_session from public.exam_sessions where user_id = v_user and request_id = p_request_id;
  if found then
    if v_session.contest_id is distinct from p_contest_id or v_session.question_count <> p_question_count
      or v_session.subject_id is distinct from p_subject_id or v_session.topic_id is distinct from p_topic_id then
      raise exception using errcode = '22023', message = 'Request identifier reused with different configuration';
    end if;
    return exam_private.get_session(v_session.id);
  end if;
  update public.exam_sessions set status = 'expired', finished_at = expires_at
    where user_id = v_user and status = 'active' and expires_at <= clock_timestamp();
  if exists(select 1 from public.exam_sessions where user_id = v_user and status = 'active') then
    raise exception using errcode = '23514', message = 'Resume or finish your active session first';
  end if;
  select array_agg(id) into v_ids from (
    select q.id from public.study_questions q
    join public.study_notices n on n.id = q.notice_id join public.study_contests c on c.id = n.contest_id
    join public.study_question_answer_keys k on k.question_id = q.id
    where q.status = 'published' and n.status = 'published' and c.status = 'published'
      and (p_contest_id is null or c.id = p_contest_id)
      and (p_subject_id is null or q.subject_id = p_subject_id)
      and (p_topic_id is null or q.topic_id = p_topic_id)
    order by random() limit p_question_count for share of q, n, c
  ) candidates;
  if coalesce(array_length(v_ids, 1), 0) <> p_question_count then
    raise exception using errcode = '22023', message = 'Not enough published questions';
  end if;
  v_now := clock_timestamp();
  insert into public.exam_sessions(user_id, request_id, contest_id, subject_id, topic_id, question_count, started_at, expires_at)
    values(v_user, p_request_id, p_contest_id, p_subject_id, p_topic_id, p_question_count, v_now, v_now + make_interval(mins => 6 * p_question_count))
    returning * into v_session;
  foreach v_id in array v_ids loop
    v_position := v_position + 1;
    select jsonb_build_object('id', q.id, 'statement', q.statement, 'source_label', q.source_label, 'source_url', q.source_url, 'source_year', q.source_year,
      'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'option_label', o.option_label, 'content', o.content, 'position', o.position) order by random())
        from public.study_question_options o where o.question_id = q.id))
    into v_snapshot from public.study_questions q where q.id = v_id;
    insert into public.exam_session_items(session_id, position, question_id, question_snapshot) values(v_session.id, v_position, v_id, v_snapshot);
  end loop;
  return exam_private.get_session(v_session.id);
end;
$$;


-- Preserve the original public contract for existing clients.
create or replace function exam_private.start_session(p_request_id uuid, p_contest_id uuid, p_question_count integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_question_count is null or p_question_count not in (10, 20) then
    raise exception using errcode = '22023', message = 'Invalid session configuration';
  end if;
  return exam_private.start_filtered_session(p_request_id, p_contest_id, null, null, p_question_count);
end;
$$;
create function public.start_filtered_exam_session(p_request_id uuid, p_contest_id uuid, p_subject_id uuid, p_topic_id uuid, p_question_count integer) returns jsonb
language sql security invoker set search_path = '' as $$
  select exam_private.start_filtered_session(p_request_id, p_contest_id, p_subject_id, p_topic_id, p_question_count)
$$;
create function public.get_exam_availability(p_contest_id uuid, p_subject_id uuid, p_topic_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select exam_private.get_availability(p_contest_id, p_subject_id, p_topic_id)
$$;
revoke all on function exam_private.start_filtered_session(uuid, uuid, uuid, uuid, integer),
  exam_private.get_availability(uuid, uuid, uuid), public.start_filtered_exam_session(uuid, uuid, uuid, uuid, integer),
  public.get_exam_availability(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function exam_private.start_filtered_session(uuid, uuid, uuid, uuid, integer),
  exam_private.get_availability(uuid, uuid, uuid), public.start_filtered_exam_session(uuid, uuid, uuid, uuid, integer),
  public.get_exam_availability(uuid, uuid, uuid) to authenticated;
