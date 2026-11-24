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
  question_count integer not null check (question_count between 1 and 20),
  duration_minutes integer not null,
  reviewed_by uuid references auth.users(id) on delete set null,
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
  primary key (model_id, version, position),
  unique (model_id, version, question_id),
  foreign key (model_id, version) references public.exam_catalog_versions(model_id, version) on delete cascade
);

create index exam_catalog_versions_status_idx on public.exam_catalog_versions(status);
create index exam_catalog_items_question_idx on public.exam_catalog_items(question_id);

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
