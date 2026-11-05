-- Atomic editorial assignment of subjects to a notice.
-- The notice row lock serializes concurrent edits and the function enforces the
-- same editor role as the administrative API, even when called directly.
create or replace function public.set_notice_subjects(
  p_notice_id uuid,
  p_subject_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notice public.study_notices%rowtype;
  v_subject_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not public.has_platform_role('editor') then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;

  if p_notice_id is null or p_subject_ids is null then
    raise exception using errcode = '22023', message = 'Notice and subject list are required';
  end if;

  if array_position(p_subject_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Subject identifiers cannot be null';
  end if;

  select * into v_notice
  from public.study_notices
  where id = p_notice_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Notice not found';
  end if;

  if v_notice.status = 'published' then
    raise exception using errcode = '23514', message = 'Unpublish the notice before changing its subjects';
  end if;

  select count(*) into v_subject_count
  from (
    select distinct unnest(p_subject_ids) as id
  ) requested
  join public.study_subjects s on s.id = requested.id;

  if v_subject_count <> cardinality(p_subject_ids) then
    raise exception using errcode = '22023', message = 'One or more subjects do not exist or are duplicated';
  end if;

  delete from public.study_notice_subjects
  where notice_id = p_notice_id;

  insert into public.study_notice_subjects (notice_id, subject_id, position)
  select p_notice_id, requested.subject_id, (requested.ordinality - 1)::integer
  from unnest(p_subject_ids) with ordinality as requested(subject_id, ordinality);

  return jsonb_build_object(
    'noticeId', p_notice_id,
    'subjectIds', to_jsonb(p_subject_ids),
    'count', cardinality(p_subject_ids)
  );
end;
$$;

revoke all on function public.set_notice_subjects(uuid, uuid[]) from public, anon;
grant execute on function public.set_notice_subjects(uuid, uuid[]) to authenticated;
