-- Tighten editorial lifecycle integrity and serialize concurrent goal changes.

-- Published notices cannot be moved away from a published contest, and a contest
-- cannot be unpublished while it still contains published notices.
create or replace function public.guard_study_contest_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published' and new.status <> 'published'
    and exists (
      select 1 from public.study_notices n
      where n.contest_id = old.id and n.status = 'published'
    ) then
    raise exception using errcode = '23514',
      message = 'Archive or unpublish all notices before unpublishing this contest';
  end if;
  return new;
end;
$$;

drop trigger if exists study_contest_lifecycle_guard on public.study_contests;
create trigger study_contest_lifecycle_guard
  before update of status on public.study_contests
  for each row execute function public.guard_study_contest_lifecycle();

-- A notice cannot be published under a draft contest, moved to another contest
-- while published, or unpublished while it still contains published questions.
create or replace function public.guard_study_notice_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and not exists (
    select 1 from public.study_contests c
    where c.id = new.contest_id and c.status = 'published'
  ) then
    raise exception using errcode = '23514',
      message = 'A notice can only be published under a published contest';
  end if;

  if old.status = 'published'
    and (new.status <> 'published' or new.contest_id <> old.contest_id)
    and exists (
      select 1 from public.study_questions q
      where q.notice_id = old.id and q.status = 'published'
    ) then
    raise exception using errcode = '23514',
      message = 'Archive or unpublish all questions before changing this notice';
  end if;
  return new;
end;
$$;

drop trigger if exists study_notice_publication_guard on public.study_notices;
create trigger study_notice_publication_guard
  before insert or update of status, contest_id on public.study_notices
  for each row execute function public.guard_study_notice_lifecycle();

-- Revalidate all fields that determine whether a published question belongs to
-- a published notice/contest and to a subject attached to that notice.
drop trigger if exists study_question_publication_guard on public.study_questions;
create trigger study_question_publication_guard
  before insert or update of status, notice_id, subject_id on public.study_questions
  for each row execute function public.guard_study_question_publication();

-- Never mutate alternatives or answer keys while their question is published.
-- Editors must first move the question to draft/archived, then edit and republish.
create or replace function public.guard_published_question_components()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_status text;
begin
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
    select q.status into v_status from public.study_questions q where q.id = v_question_id for update;
  elsif tg_op = 'UPDATE' then
    select q.status into v_status from public.study_questions q where q.id = old.question_id for update;
    if v_status = 'published' then
      raise exception using errcode = '23514', message = 'Unpublish the question before changing alternatives or answer keys';
    end if;
    v_question_id := new.question_id;
    select q.status into v_status from public.study_questions q where q.id = v_question_id for update;
  else
    v_question_id := new.question_id;
    select q.status into v_status from public.study_questions q where q.id = v_question_id for update;
  end if;

  if v_status = 'published' then
    raise exception using errcode = '23514',
      message = 'Unpublish the question before changing alternatives or answer keys';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists study_question_options_lifecycle_guard on public.study_question_options;
create trigger study_question_options_lifecycle_guard
  before insert or update or delete on public.study_question_options
  for each row execute function public.guard_published_question_components();

drop trigger if exists study_question_answer_keys_lifecycle_guard on public.study_question_answer_keys;
create trigger study_question_answer_keys_lifecycle_guard
  before insert or update or delete on public.study_question_answer_keys
  for each row execute function public.guard_published_question_components();

-- A published notice's subject mapping is part of its published exam structure.
create or replace function public.guard_published_notice_subjects()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_notice_id uuid;
  v_status text;
begin
  if tg_op = 'DELETE' then
    v_notice_id := old.notice_id;
    select n.status into v_status from public.study_notices n where n.id = v_notice_id for update;
  elsif tg_op = 'UPDATE' then
    select n.status into v_status from public.study_notices n where n.id = old.notice_id for update;
    if v_status = 'published' then
      raise exception using errcode = '23514', message = 'Unpublish the notice before changing its subjects';
    end if;
    v_notice_id := new.notice_id;
    select n.status into v_status from public.study_notices n where n.id = v_notice_id for update;
  else
    v_notice_id := new.notice_id;
    select n.status into v_status from public.study_notices n where n.id = v_notice_id for update;
  end if;

  if v_status = 'published' then
    raise exception using errcode = '23514',
      message = 'Unpublish the notice before changing its subjects';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists study_notice_subjects_lifecycle_guard on public.study_notice_subjects;
create trigger study_notice_subjects_lifecycle_guard
  before insert or update or delete on public.study_notice_subjects
  for each row execute function public.guard_published_notice_subjects();

-- Avoid two concurrent requests archiving/replacing one another's active goal.
-- Locking the authenticated user row serializes goal changes per student.
create or replace function public.set_student_study_goal(
  p_contest_id uuid,
  p_notice_id uuid default null,
  p_position_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.study_goals%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  perform 1 from auth.users u where u.id = v_user_id for update;

  if p_contest_id is null or not exists (
    select 1 from public.study_contests c
    where c.id = p_contest_id and c.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Contest is not available';
  end if;

  if p_notice_id is not null and not exists (
    select 1 from public.study_notices n
    where n.id = p_notice_id and n.contest_id = p_contest_id and n.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Notice does not belong to the selected contest';
  end if;

  if p_position_id is not null and not exists (
    select 1 from public.study_positions p
    where p.id = p_position_id and p.contest_id = p_contest_id and p.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Position does not belong to the selected contest';
  end if;

  update public.study_goals
  set status = 'archived', updated_at = now()
  where user_id = v_user_id and status = 'active';

  insert into public.study_goals (user_id, contest_id, notice_id, position_id)
  values (v_user_id, p_contest_id, p_notice_id, p_position_id)
  returning * into v_goal;

  return jsonb_build_object(
    'id', v_goal.id,
    'contestId', v_goal.contest_id,
    'noticeId', v_goal.notice_id,
    'positionId', v_goal.position_id,
    'status', v_goal.status,
    'createdAt', v_goal.created_at
  );
end;
$$;

revoke all on function public.set_student_study_goal(uuid, uuid, uuid) from public, anon;
grant execute on function public.set_student_study_goal(uuid, uuid, uuid) to authenticated;

-- Published records must be archived before deletion; archiving is reversible
-- and remains visible in the editorial audit trail.
create or replace function public.prevent_published_editorial_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if to_jsonb(old) ->> 'status' = 'published' then
    raise exception using errcode = '23514',
      message = 'Archive the editorial record before deleting it';
  end if;
  return old;
end;
$$;

drop trigger if exists study_contests_prevent_published_delete on public.study_contests;
create trigger study_contests_prevent_published_delete
  before delete on public.study_contests
  for each row execute function public.prevent_published_editorial_delete();
drop trigger if exists study_notices_prevent_published_delete on public.study_notices;
create trigger study_notices_prevent_published_delete
  before delete on public.study_notices
  for each row execute function public.prevent_published_editorial_delete();
drop trigger if exists study_positions_prevent_published_delete on public.study_positions;
create trigger study_positions_prevent_published_delete
  before delete on public.study_positions
  for each row execute function public.prevent_published_editorial_delete();
drop trigger if exists study_questions_prevent_published_delete on public.study_questions;
create trigger study_questions_prevent_published_delete
  before delete on public.study_questions
  for each row execute function public.prevent_published_editorial_delete();
