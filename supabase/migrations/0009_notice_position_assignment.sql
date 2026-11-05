-- Editorial association between notices and positions.
-- Positions remain reusable at contest level; this table defines which positions
-- belong to a specific notice, preserving the contest relationship with a composite FK.

create table if not exists public.study_notice_positions (
  notice_id uuid not null references public.study_notices(id) on delete cascade,
  position_id uuid not null,
  position integer not null default 0 check (position >= 0),
  primary key (notice_id, position_id),
  constraint study_notice_positions_position_fk
    foreign key (notice_id, position_id)
    references public.study_positions(notice_id, id)
);

create index if not exists study_notice_positions_notice_position_idx
  on public.study_notice_positions (notice_id, position);

alter table public.study_notice_positions enable row level security;

create policy "Anyone can read published notice positions"
  on public.study_notice_positions for select to anon, authenticated
  using (exists (
    select 1
    from public.study_notices n
    join public.study_contests c on c.id = n.contest_id
    join public.study_positions p on p.id = position_id
    where n.id = notice_id
      and n.status = 'published'
      and c.status = 'published'
      and p.status = 'published'
  ));

create policy "Editors can manage notice positions"
  on public.study_notice_positions for all to authenticated
  using (public.has_platform_role('editor'))
  with check (public.has_platform_role('editor'));

revoke all on public.study_notice_positions from anon, authenticated;
grant select on public.study_notice_positions to anon, authenticated;
grant insert, update, delete on public.study_notice_positions to authenticated;

create or replace function public.set_notice_positions(
  p_notice_id uuid,
  p_position_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notice public.study_notices%rowtype;
  v_position_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not public.has_platform_role('editor') then
    raise exception using errcode = '42501', message = 'Editorial role required';
  end if;

  if p_notice_id is null or p_position_ids is null then
    raise exception using errcode = '22023', message = 'Notice and position list are required';
  end if;

  if array_position(p_position_ids, null) is not null then
    raise exception using errcode = '22023', message = 'Position identifiers cannot be null';
  end if;

  select * into v_notice
  from public.study_notices
  where id = p_notice_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Notice not found';
  end if;

  if v_notice.status = 'published' then
    raise exception using errcode = '23514', message = 'Unpublish the notice before changing its positions';
  end if;

  select count(*) into v_position_count
  from (
    select distinct unnest(p_position_ids) as id
  ) requested
  join public.study_positions p
    on p.id = requested.id
   and p.contest_id = v_notice.contest_id;

  if v_position_count <> cardinality(p_position_ids) then
    raise exception using errcode = '22023', message = 'One or more positions do not belong to the notice contest or are duplicated';
  end if;

  delete from public.study_notice_positions
  where notice_id = p_notice_id;

  insert into public.study_notice_positions (notice_id, position_id, position)
  select p_notice_id, requested.position_id, (requested.ordinality - 1)::integer
  from unnest(p_position_ids) with ordinality as requested(position_id, ordinality);

  return jsonb_build_object(
    'noticeId', p_notice_id,
    'positionIds', to_jsonb(p_position_ids),
    'count', cardinality(p_position_ids)
  );
end;
$$;

revoke all on function public.set_notice_positions(uuid, uuid[]) from public, anon;
grant execute on function public.set_notice_positions(uuid, uuid[]) to authenticated;
