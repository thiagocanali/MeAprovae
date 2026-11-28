-- Additive *draft-only* catalog foundation. Not a release/publication migration.
-- Do not apply to production until separate authorization and rollout review.
-- Current student exam_sessions and exam_session_items are not modified.

create table public.exam_catalog_models (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 3 and 800),
  kind text not null check (kind in ('subject-foundations', 'subject-application', 'multidisciplinary')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.exam_catalog_versions (
  model_id uuid not null references public.exam_catalog_models(id) on delete cascade,
  version integer not null check (version between 1 and 2147483647),
  -- Publication is intentionally unavailable until a separate reviewed migration
  -- verifies question eligibility, immutable snapshots and authorization.
  status text not null default 'draft' check (status in ('draft', 'in_review')),
  -- Each version keeps its own editorial metadata, independent of later labels.
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 3 and 800),
  kind text not null check (kind in ('subject-foundations', 'subject-application', 'multidisciplinary')),
  question_count integer not null check (question_count between 1 and 20),
  duration_minutes integer not null,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  rights_checked boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (model_id, version),
  constraint exam_catalog_duration_matches_count check (duration_minutes = question_count * 6),
  constraint exam_catalog_unpublished_only check (published_at is null),
  constraint exam_catalog_review_metadata_pair check (
    (reviewed_by is null and reviewed_at is null) or (reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.exam_catalog_items (
  model_id uuid not null,
  version integer not null,
  position integer not null check (position between 1 and 20),
  question_id uuid not null references public.study_questions(id) on delete restrict,
  -- Snapshot for the explicit distribution; checked against the source on write.
  subject_id uuid not null references public.study_subjects(id) on delete restrict,
  primary key (model_id, version, position),
  unique (model_id, version, question_id),
  foreign key (model_id, version) references public.exam_catalog_versions(model_id, version) on delete cascade
);

create index exam_catalog_versions_status_idx on public.exam_catalog_versions(status);
create index exam_catalog_items_question_idx on public.exam_catalog_items(question_id);
create index exam_catalog_items_subject_idx on public.exam_catalog_items(subject_id);
create index exam_catalog_models_created_by_idx on public.exam_catalog_models(created_by);
create index exam_catalog_versions_reviewed_by_idx on public.exam_catalog_versions(reviewed_by);

-- Explicit grants + RLS on every public table. No browser-write permissions.
-- Drafts are visible ONLY to authorized platform editors/owners.
alter table public.exam_catalog_models enable row level security;
alter table public.exam_catalog_versions enable row level security;
alter table public.exam_catalog_items enable row level security;

revoke all on public.exam_catalog_models, public.exam_catalog_versions, public.exam_catalog_items
  from public, anon, authenticated;
grant select on public.exam_catalog_models, public.exam_catalog_versions, public.exam_catalog_items
  to authenticated;

create policy "Editors read exam catalog models"
  on public.exam_catalog_models for select to authenticated
  using ((select public.has_platform_role('editor')));

create policy "Editors read exam catalog versions"
  on public.exam_catalog_versions for select to authenticated
  using ((select public.has_platform_role('editor')));

create policy "Editors read exam catalog items"
  on public.exam_catalog_items for select to authenticated
  using ((select public.has_platform_role('editor')));


-- These invoker trigger helpers are not browser RPCs. No new definer privilege.
create schema exam_catalog_private;
revoke all on schema exam_catalog_private from public, anon, authenticated;

create function exam_catalog_private.guard_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare m public.exam_catalog_models; n integer; lo integer; hi integer; subjects integer;
begin
  if tg_op='DELETE' then
    if old.status='in_review' then
      raise exception using errcode='23514',message='Return the version to draft before deleting it';
    end if;
    return old;
  end if;
  if tg_op='UPDATE' then
    if new.model_id<>old.model_id or new.version<>old.version then
      raise exception using errcode='23514',message='Version identity is immutable';
    end if;
    if old.status='in_review' and (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
      raise exception using errcode='23514',message='Return to draft before editing a reviewed composition';
    end if;
  else
    select * into m from public.exam_catalog_models where id=new.model_id;
    if not found then raise exception using errcode='23503',message='Missing catalog model'; end if;
    new.title:=coalesce(new.title,m.title);
    new.description:=coalesce(new.description,m.description);
    new.kind:=coalesce(new.kind,m.kind);
  end if;
  if exists(select 1 from public.exam_catalog_items where model_id=new.model_id and version=new.version and position>new.question_count) then
    raise exception using errcode='23514',message='An item exceeds the declared question count';
  end if;
  if new.status='in_review' then
    select count(*),min(position),max(position),count(distinct subject_id) into n,lo,hi,subjects
      from public.exam_catalog_items where model_id=new.model_id and version=new.version;
    if n<>new.question_count or lo<>1 or hi<>new.question_count then
      raise exception using errcode='23514',message='Review requires a complete contiguous composition';
    end if;
    if (new.kind='multidisciplinary' and subjects<2) or (new.kind<>'multidisciplinary' and subjects<>1) then
      raise exception using errcode='23514',message='Composition does not match the model kind';
    end if;
    if exists(select 1 from public.exam_catalog_items i join public.study_questions q on q.id=i.question_id
      join public.study_notices n on n.id=q.notice_id join public.study_contests c on c.id=n.contest_id
      where i.model_id=new.model_id and i.version=new.version
        and (i.subject_id<>q.subject_id or q.status='archived' or n.status='archived' or c.status='archived')) then
      raise exception using errcode='23514',message='Composition has stale subjects or archived content';
    end if;
  end if;
  return new;
end;
$$;

create function exam_catalog_private.guard_item() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v public.exam_catalog_versions; source_subject uuid; model uuid; rev integer;
begin
  if tg_op='UPDATE' and (new.model_id<>old.model_id or new.version<>old.version) then
    raise exception using errcode='23514',message='Items cannot be moved to a different version';
  end if;
  if tg_op='DELETE' then model:=old.model_id; rev:=old.version;
  else model:=new.model_id; rev:=new.version; end if;
  -- Serializes item mutations with transition to in_review on the same row.
  select * into v from public.exam_catalog_versions where model_id=model and version=rev for update;
  if not found then
    if tg_op='DELETE' then return old; end if; -- draft parent cascade
    raise exception using errcode='23503',message='Missing catalog version';
  end if;
  if v.status<>'draft' then
    raise exception using errcode='23514',message='Return to draft before editing version items';
  end if;
  if tg_op='DELETE' then return old; end if;
  if new.position>v.question_count then
    raise exception using errcode='23514',message='Item position exceeds the declared count';
  end if;
  select subject_id into source_subject from public.study_questions where id=new.question_id;
  if not found then raise exception using errcode='23503',message='Missing composition question'; end if;
  if new.subject_id is not null and new.subject_id<>source_subject then
    raise exception using errcode='23514',message='Item subject must match its question';
  end if;
  new.subject_id:=source_subject;
  return new;
end;
$$;
revoke all on function exam_catalog_private.guard_version(),exam_catalog_private.guard_item() from public,anon,authenticated;

create trigger exam_catalog_version_integrity before insert or update or delete
  on public.exam_catalog_versions for each row execute function exam_catalog_private.guard_version();
create trigger exam_catalog_item_integrity before insert or update or delete
  on public.exam_catalog_items for each row execute function exam_catalog_private.guard_item();

-- Existing immutable audit mechanism; administrative SQL has no human actor.
create trigger exam_catalog_models_audit after insert or update or delete on public.exam_catalog_models
  for each row execute function public.capture_editorial_change();
create trigger exam_catalog_versions_audit after insert or update or delete on public.exam_catalog_versions
  for each row execute function public.capture_editorial_change();
create trigger exam_catalog_items_audit after insert or update or delete on public.exam_catalog_items
  for each row execute function public.capture_editorial_change();
