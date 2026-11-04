-- Subject-level performance and latest-incorrect review queue.
create or replace function public.get_student_subject_performance()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'subjectId', performance.subject_id,
    'subjectName', performance.subject_name,
    'attempts', performance.attempts,
    'correctAnswers', performance.correct_answers,
    'accuracy', performance.accuracy
  ) order by performance.accuracy asc, performance.attempts desc), '[]'::jsonb)
  into v_result
  from (
    select
      s.id as subject_id,
      s.name as subject_name,
      count(*) as attempts,
      count(*) filter (where a.is_correct) as correct_answers,
      round(100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0), 1) as accuracy
    from public.question_attempts a
    join public.study_questions q on q.id = a.question_id
    join public.study_subjects s on s.id = q.subject_id
    where a.user_id = v_user_id
    group by s.id, s.name
  ) performance;

  return v_result;
end;
$$;

revoke all on function public.get_student_subject_performance() from public, anon;
grant execute on function public.get_student_subject_performance() to authenticated;

create or replace function public.get_student_wrong_questions(p_limit integer default 50)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'questionId', review.question_id,
    'statement', review.statement,
    'subjectName', review.subject_name,
    'sourceLabel', review.source_label,
    'sourceYear', review.source_year,
    'lastAttemptAt', review.last_attempt_at,
    'options', review.options
  ) order by review.last_attempt_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      latest.question_id,
      q.statement,
      s.name as subject_name,
      q.source_label,
      q.source_year,
      latest.submitted_at as last_attempt_at,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', o.id,
          'label', o.option_label,
          'content', o.content,
          'position', o.position
        ) order by o.position), '[]'::jsonb)
        from public.study_question_options o
        where o.question_id = q.id
      ) as options
    from (
      select distinct on (a.question_id)
        a.question_id, a.is_correct, a.submitted_at
      from public.question_attempts a
      where a.user_id = v_user_id
      order by a.question_id, a.submitted_at desc
    ) latest
    join public.study_questions q on q.id = latest.question_id
    join public.study_subjects s on s.id = q.subject_id
    where latest.is_correct = false
    order by latest.submitted_at desc
    limit v_limit
  ) review;

  return v_result;
end;
$$;

revoke all on function public.get_student_wrong_questions(integer) from public, anon;
grant execute on function public.get_student_wrong_questions(integer) to authenticated;
