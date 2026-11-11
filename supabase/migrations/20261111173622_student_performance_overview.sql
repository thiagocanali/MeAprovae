-- Aggregate all attempts in a bounded calendar window, without row sampling.
-- Invoker rights, ownership predicates and existing RLS apply throughout.
create index exam_sessions_user_result_time_idx on public.exam_sessions
  (user_id, (coalesce(finished_at, expires_at)) desc, id);

create function public.get_student_performance(p_days integer default 30, p_timezone text default 'America/Sao_Paulo')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_today date;
  v_start timestamptz;
  v_result jsonb;
begin
  if v_user is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_days is null or p_days not in (7, 30, 90) or p_timezone is null or p_timezone not in ('America/Sao_Paulo', 'UTC') then
    raise exception using errcode = '22023', message = 'Invalid performance period or timezone';
  end if;
  v_today := (v_now at time zone p_timezone)::date;
  v_start := (v_today - (p_days - 1))::timestamp at time zone p_timezone;
  with attempts as materialized (
    select question_id, is_correct, submitted_at from public.question_attempts
    where user_id = v_user and submitted_at >= v_start and submitted_at <= v_now
  ), daily as (
    select (submitted_at at time zone p_timezone)::date as day, count(*) as attempts,
      count(*) filter(where is_correct) as correct from attempts group by 1
  ), calendar as (
    select v_today - (p_days - 1 - offset_day) as day from generate_series(0, p_days - 1) offset_day
  ), subject_stats as (
    -- Keep attempts when the related question is archived/hidden by RLS.
    select q.subject_id, coalesce(s.name, 'Conteúdo indisponível') as name,
      count(*) as attempts, count(*) filter(where a.is_correct) as correct
    from attempts a left join public.study_questions q on q.id = a.question_id
      left join public.study_subjects s on s.id = q.subject_id
    group by q.subject_id, s.name
  ), ended_exams as materialized (
    select id, question_count, answered_count, correct_count,
      case when status = 'active' then 'expired' else status end as status,
      coalesce(finished_at, expires_at) as ended_at,
      round(100.0 * correct_count / question_count, 1) as score
    from public.exam_sessions
    where user_id = v_user and coalesce(finished_at, expires_at) >= v_start
      and coalesce(finished_at, expires_at) <= v_now
  )
  select jsonb_build_object(
    'periodDays', p_days, 'timezone', p_timezone, 'periodStart', v_start, 'generatedAt', v_now,
    'days', (select jsonb_agg(jsonb_build_object(
      'date', c.day, 'attempts', coalesce(d.attempts, 0), 'correct', coalesce(d.correct, 0),
      'accuracy', coalesce(round(100.0 * d.correct / nullif(d.attempts, 0), 1), 0)
    ) order by c.day) from calendar c left join daily d on d.day = c.day),
    'totals', (select jsonb_build_object('attempts', count(*), 'correct', count(*) filter(where is_correct),
      'accuracy', coalesce(round(100.0 * count(*) filter(where is_correct) / nullif(count(*), 0), 1), 0),
      'activeDays', (select count(*) from daily)) from attempts),
    'performanceBySubject', (select coalesce(jsonb_agg(jsonb_build_object(
      'subjectId', subject_id, 'subjectName', name, 'attempts', attempts, 'correctAnswers', correct,
      'accuracy', round(100.0 * correct / attempts, 1)
    ) order by round(100.0 * correct / attempts, 1), name), '[]'::jsonb) from subject_stats),
    'examSummary', (select jsonb_build_object('count', count(*),
      'averageScore', round(avg(100.0 * correct_count / question_count), 1), 'bestScore', max(score)) from ended_exams),
    'recentExams', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'status', status,
      'questionCount', question_count, 'answeredCount', answered_count, 'score', score, 'finishedAt', ended_at
    ) order by ended_at, id), '[]'::jsonb) from (select * from ended_exams order by ended_at desc, id desc limit 20) recent)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_student_performance(integer, text) from public, anon;
grant execute on function public.get_student_performance(integer, text) to authenticated;
