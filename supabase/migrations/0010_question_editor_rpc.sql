-- Atomic editorial replacement of question alternatives.
create or replace function public.set_question_options(
  p_question_id uuid,
  p_options jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_status text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;
  if not public.has_platform_role('editor') then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;
  if p_question_id is null or p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception using errcode = '22023', message = 'Question and options are required';
  end if;

  select status into v_status
  from public.study_questions
  where id = p_question_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Question not found';
  end if;
  if v_status = 'published' then
    raise exception using errcode = '23514', message = 'Unpublish the question before changing alternatives';
  end if;

  select count(*) into v_count from jsonb_array_elements(p_options);
  if v_count < 2 or v_count > 10 then
    raise exception using errcode = '22023', message = 'A question requires between 2 and 10 options';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_options) as x(option_label text, content text, position integer)
    where coalesce(length(trim(x.option_label)), 0) not between 1 and 4
       or coalesce(length(trim(x.content)), 0) not between 1 and 5000
       or x.position < 1 or x.position > 10
  ) then
    raise exception using errcode = '22023', message = 'Invalid option data';
  end if;

  if (select count(distinct upper(trim(x.option_label))) from jsonb_to_recordset(p_options) as x(option_label text, content text, position integer))
     <> v_count then
    raise exception using errcode = '22023', message = 'Option labels must be unique';
  end if;

  if (select count(distinct x.position) from jsonb_to_recordset(p_options) as x(option_label text, content text, position integer))
     <> v_count then
    raise exception using errcode = '22023', message = 'Option positions must be unique';
  end if;

  delete from public.study_question_options where question_id = p_question_id;

  insert into public.study_question_options (question_id, option_label, content, position)
  select p_question_id, upper(trim(x.option_label)), trim(x.content), x.position
  from jsonb_to_recordset(p_options) as x(option_label text, content text, position integer);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'questionId', o.question_id,
    'optionLabel', o.option_label,
    'content', o.content,
    'position', o.position
  ) order by o.position), '[]'::jsonb)
  into v_result
  from public.study_question_options o
  where o.question_id = p_question_id;

  return v_result;
end;
$$;

revoke all on function public.set_question_options(uuid, jsonb) from public, anon;
grant execute on function public.set_question_options(uuid, jsonb) to authenticated;
