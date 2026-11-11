-- Session writes and grading are server-authoritative. Browser roles only read
-- their sessions; privileged mutation code lives outside the exposed schema.
create schema exam_private;
revoke all on schema exam_private from public, anon;
grant usage on schema exam_private to authenticated;

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  answered_count integer not null default 0,
  correct_count integer not null default 0,
  contest_id uuid references public.study_contests(id),
  question_count integer not null check (question_count in (10, 20)),
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  unique(user_id, request_id),
  check (expires_at > started_at),
  check (answered_count between 0 and question_count and correct_count between 0 and answered_count),
  check ((status = 'active' and finished_at is null) or (status <> 'active' and finished_at is not null))
);
create unique index exam_sessions_one_active_idx on public.exam_sessions(user_id) where status = 'active';
create index exam_sessions_user_created_idx on public.exam_sessions(user_id, started_at desc);
create index exam_sessions_contest_idx on public.exam_sessions(contest_id);
create table public.exam_session_items (
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  position integer not null check(position between 1 and 20),
  question_id uuid not null references public.study_questions(id),
  question_snapshot jsonb not null,
  result jsonb,
  primary key(session_id, position),
  unique(session_id, question_id)
);
create index exam_session_items_question_idx on public.exam_session_items(question_id);
alter table public.exam_sessions enable row level security;
alter table public.exam_session_items enable row level security;
revoke all on public.exam_sessions, public.exam_session_items from public, anon, authenticated;
grant select on public.exam_sessions, public.exam_session_items to authenticated;
create policy "Students read own exam sessions" on public.exam_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Students read own exam items" on public.exam_session_items for select to authenticated
  using (exists(select 1 from public.exam_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

-- Preserve every version selected into a session, even before the first answer.
create function exam_private.guard_exam_content() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_id uuid;
begin
  if tg_table_name = 'study_questions' then
    if (to_jsonb(new) - 'status') is not distinct from (to_jsonb(old) - 'status') then return new; end if;
    v_ids := array[old.id];
  else
    if tg_op <> 'INSERT' then v_ids := array_append(v_ids, (to_jsonb(old)->>'question_id')::uuid); end if;
    if tg_op <> 'DELETE' then v_ids := array_append(v_ids, (to_jsonb(new)->>'question_id')::uuid); end if;
    for v_id in select distinct id from unnest(v_ids) id order by id loop
      perform 1 from public.study_questions where id = v_id for update;
    end loop;
  end if;
  if exists(select 1 from public.exam_session_items where question_id = any(v_ids)) then
    raise exception using errcode = '23514', message = 'Question belongs to an exam session; create a new version';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function exam_private.guard_exam_content() from public, anon, authenticated;
create trigger exam_question_version_guard before update on public.study_questions
  for each row execute function exam_private.guard_exam_content();
create trigger exam_option_version_guard before insert or update or delete on public.study_question_options
  for each row execute function exam_private.guard_exam_content();
create trigger exam_answer_version_guard before insert or update or delete on public.study_question_answer_keys
  for each row execute function exam_private.guard_exam_content();
create trigger exam_explanation_version_guard before insert or update or delete on public.study_question_editorial_details
  for each row execute function exam_private.guard_exam_content();

create function exam_private.get_session(p_session_id uuid) returns jsonb
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
    'startedAt', v_session.started_at, 'expiresAt', v_session.expires_at, 'finishedAt', v_session.finished_at,
    'serverNow', clock_timestamp(), 'answeredCount', v_answered, 'correctCount', v_correct,
    'score', round(100.0 * v_correct / v_session.question_count, 1), 'questions', v_items);
end;
$$;

create function exam_private.start_session(p_request_id uuid, p_contest_id uuid, p_question_count integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_session public.exam_sessions%rowtype; v_ids uuid[]; v_id uuid; v_position integer := 0; v_snapshot jsonb; v_now timestamptz;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_request_id is null or p_question_count is null or p_question_count not in (10, 20) then
    raise exception using errcode = '22023', message = 'Invalid session configuration';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 428));
  select * into v_session from public.exam_sessions where user_id = v_user and request_id = p_request_id;
  if found then
    if v_session.contest_id is distinct from p_contest_id or v_session.question_count <> p_question_count then
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
    order by random() limit p_question_count for share of q
  ) candidates;
  if coalesce(array_length(v_ids, 1), 0) <> p_question_count then
    raise exception using errcode = '22023', message = 'Not enough published questions';
  end if;
  v_now := clock_timestamp();
  insert into public.exam_sessions(user_id, request_id, contest_id, question_count, started_at, expires_at)
    values(v_user, p_request_id, p_contest_id, p_question_count, v_now, v_now + make_interval(mins => case when p_question_count = 10 then 60 else 120 end))
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

create function exam_private.answer_session(p_session_id uuid, p_position integer, p_option_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.exam_sessions%rowtype; v_item public.exam_session_items%rowtype; v_correct_id uuid; v_explanation text; v_attempt public.question_attempts%rowtype;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_session from public.exam_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found then raise exception using errcode = 'P0002', message = 'Session not found'; end if;
  select * into v_item from public.exam_session_items where session_id = p_session_id and position = p_position;
  if not found or p_option_id is null then raise exception using errcode = '22023', message = 'Invalid session question'; end if;
  -- Saved answers can always be retrieved after a timeout or lost response.
  if v_item.result is not null then
    if v_item.result->>'selectedOptionId' <> p_option_id::text then
      raise exception using errcode = '23514', message = 'This answer is already final';
    end if;
    return exam_private.get_session(p_session_id);
  end if;
  if v_session.status <> 'active' or clock_timestamp() >= v_session.expires_at then
    return exam_private.get_session(p_session_id);
  end if;
  if not exists(select 1 from public.study_question_options where question_id = v_item.question_id and id = p_option_id) then
    raise exception using errcode = '22023', message = 'Option does not belong to question';
  end if;
  perform 1 from public.study_questions where id = v_item.question_id for share;
  select k.correct_option_id, coalesce(d.explanation, '') into v_correct_id, v_explanation
    from public.study_question_answer_keys k left join public.study_question_editorial_details d on d.question_id = k.question_id
    where k.question_id = v_item.question_id;
  if not found then raise exception using errcode = 'P0002', message = 'Answer key unavailable'; end if;
  -- Recheck after locks: waiting for a row must not extend the deadline.
  if clock_timestamp() >= v_session.expires_at then return exam_private.get_session(p_session_id); end if;
  insert into public.question_attempts(user_id, question_id, selected_option_id, is_correct, idempotency_key)
    values(auth.uid(), v_item.question_id, p_option_id, p_option_id = v_correct_id, gen_random_uuid()) returning * into v_attempt;
  update public.exam_session_items set result = jsonb_build_object('attemptId', v_attempt.id, 'selectedOptionId', p_option_id,
    'isCorrect', v_attempt.is_correct, 'correctOptionId', v_correct_id, 'explanation', v_explanation, 'submittedAt', v_attempt.submitted_at)
    where session_id = p_session_id and position = p_position;
  update public.exam_sessions set answered_count = answered_count + 1,
    correct_count = correct_count + case when v_attempt.is_correct then 1 else 0 end where id = p_session_id;
  return exam_private.get_session(p_session_id);
end;
$$;

create function exam_private.finish_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.exam_sessions%rowtype; v_now timestamptz;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into v_session from public.exam_sessions where id = p_session_id and user_id = auth.uid() for update;
  if not found then raise exception using errcode = 'P0002', message = 'Session not found'; end if;
  if v_session.status = 'active' then
    v_now := clock_timestamp();
    update public.exam_sessions set status = case when v_now >= expires_at then 'expired' else 'completed' end,
      finished_at = least(v_now, expires_at) where id = p_session_id;
  end if;
  return exam_private.get_session(p_session_id);
end;
$$;

revoke all on all functions in schema exam_private from public, anon, authenticated;
grant execute on function exam_private.get_session(uuid), exam_private.start_session(uuid, uuid, integer),
  exam_private.answer_session(uuid, integer, uuid), exam_private.finish_session(uuid) to authenticated;
create function public.start_exam_session(p_request_id uuid, p_contest_id uuid, p_question_count integer) returns jsonb
language sql security invoker set search_path = '' as $$ select exam_private.start_session(p_request_id, p_contest_id, p_question_count) $$;
create function public.get_exam_session(p_session_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select exam_private.get_session(p_session_id) $$;
create function public.answer_exam_session(p_session_id uuid, p_position integer, p_option_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select exam_private.answer_session(p_session_id, p_position, p_option_id) $$;
create function public.finish_exam_session(p_session_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select exam_private.finish_session(p_session_id) $$;
revoke all on function public.start_exam_session(uuid, uuid, integer), public.get_exam_session(uuid),
  public.answer_exam_session(uuid, integer, uuid), public.finish_exam_session(uuid) from public, anon;
grant execute on function public.start_exam_session(uuid, uuid, integer), public.get_exam_session(uuid),
  public.answer_exam_session(uuid, integer, uuid), public.finish_exam_session(uuid) to authenticated;
