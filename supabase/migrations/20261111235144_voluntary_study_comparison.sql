-- Voluntary, parameterless, question-matched practice comparison.
-- No preference is inserted/enabled by this migration.
create schema comparison_private;
revoke all on schema comparison_private from public, anon;
grant usage on schema comparison_private to authenticated;
create table public.study_comparison_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  consent_version text,
  updated_at timestamptz not null default clock_timestamp(),
  check(not enabled or (consent_version is not null and consent_version = '2026-11-v1'))
);
alter table public.study_comparison_preferences enable row level security;
revoke all on public.study_comparison_preferences from public, anon, authenticated;
grant select on public.study_comparison_preferences to authenticated;
create policy "Students read own comparison choice" on public.study_comparison_preferences for select to authenticated
  using(user_id = (select auth.uid()));
create index study_goals_comparison_contest_idx on public.study_goals(contest_id, user_id) where status = 'active';

create table comparison_private.reference_sets (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.study_contests(id),
  month_start date not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(contest_id, month_start)
);
create table comparison_private.reference_items (
  set_id uuid not null references comparison_private.reference_sets(id) on delete cascade,
  position integer not null check(position between 1 and 20),
  question_id uuid not null references public.study_questions(id),
  primary key(set_id, position),
  unique(set_id, question_id)
);
create index comparison_reference_question_idx on comparison_private.reference_items(question_id);
alter table comparison_private.reference_sets enable row level security;
alter table comparison_private.reference_items enable row level security;
revoke all on comparison_private.reference_sets, comparison_private.reference_items from public, anon, authenticated;

create function comparison_private.set_participation(p_enabled boolean, p_consent_version text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception using errcode='42501',message='Authentication required';end if;
  if p_enabled is null or (p_enabled and p_consent_version is distinct from '2026-11-v1') then
    raise exception using errcode='22023',message='Explicit current consent required';
  end if;
  insert into public.study_comparison_preferences(user_id,enabled,consent_version,updated_at)
    values(v_user,p_enabled,case when p_enabled then '2026-11-v1' else null end,clock_timestamp())
  on conflict(user_id) do update set enabled=excluded.enabled,consent_version=excluded.consent_version,updated_at=excluded.updated_at;
  return jsonb_build_object('enabled',p_enabled);
end;
$$;

create function comparison_private.get_comparison() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();v_now timestamptz := clock_timestamp();v_month date;v_start timestamptz;
 v_enabled boolean;v_contest uuid;v_title text;v_set uuid;v_ids uuid[];v_q uuid;v_position integer:=0;
 v_answered integer;v_correct integer;v_peers integer;v_average numeric;v_questions jsonb;v_base jsonb;
begin
 if v_user is null then raise exception using errcode='42501',message='Authentication required';end if;
 v_month:=date_trunc('month',v_now at time zone 'America/Sao_Paulo')::date;
 v_start:=v_month::timestamp at time zone 'America/Sao_Paulo';
 select (enabled and consent_version = '2026-11-v1') into v_enabled from public.study_comparison_preferences where user_id=v_user;
 v_base:=jsonb_build_object('enabled',coalesce(v_enabled,false),'consentVersion','2026-11-v1','monthStart',v_month,
   'timezone','America/Sao_Paulo','requiredQuestions',20,'minimumPeers',10,'yourAnswered',0,'yourAccuracy',null,
   'peerAverage',null,'questions','[]'::jsonb,'contestTitle',null);
 if not coalesce(v_enabled,false) then return v_base||jsonb_build_object('status','disabled');end if;
 select c.id,c.title into v_contest,v_title from public.study_goals g join public.study_contests c on c.id=g.contest_id
   where g.user_id=v_user and g.status='active' and c.status='published';
 if not found then return v_base||jsonb_build_object('status','missing_goal');end if;
 v_base:=v_base||jsonb_build_object('contestTitle',v_title);
 select id into v_set from comparison_private.reference_sets where contest_id=v_contest and month_start=v_month;
 if v_set is null then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_contest::text||v_month::text,879));
   select id into v_set from comparison_private.reference_sets where contest_id=v_contest and month_start=v_month;
   if v_set is null then
     select array_agg(id) into v_ids from (
       select q.id from public.study_questions q join public.study_notices n on n.id=q.notice_id
         join public.study_contests c on c.id=n.contest_id join public.study_question_answer_keys k on k.question_id=q.id
       where c.id=v_contest and c.status='published' and n.status='published' and q.status='published'
       order by q.created_at,q.id limit 20 for share of q
     ) eligible;
     if coalesce(array_length(v_ids,1),0)<>20 then return v_base||jsonb_build_object('status','insufficient_questions');end if;
     insert into comparison_private.reference_sets(contest_id,month_start) values(v_contest,v_month) returning id into v_set;
     foreach v_q in array v_ids loop
       v_position:=v_position+1;
       insert into comparison_private.reference_items(set_id,position,question_id) values(v_set,v_position,v_q);
     end loop;
   end if;
 end if;
 perform q.id from comparison_private.reference_items i join public.study_questions q on q.id=i.question_id
   where i.set_id=v_set order by q.id for share of q;
 -- A monthly set never changes. Hide comparison while a reference item is unpublished.
 if (select count(*) from comparison_private.reference_items i join public.study_questions q on q.id=i.question_id
     join public.study_notices n on n.id=q.notice_id where i.set_id=v_set and q.status='published' and n.status='published')<>20 then
   return v_base||jsonb_build_object('status','reference_unavailable');
 end if;
 with first_answers as (
   select distinct on(a.question_id) a.question_id,a.is_correct from public.question_attempts a
     join comparison_private.reference_items i on i.question_id=a.question_id and i.set_id=v_set
   where a.user_id=v_user and a.submitted_at>=v_start and a.submitted_at<=v_now
   order by a.question_id,a.submitted_at,a.id
 )
 select count(f.question_id),count(*) filter(where f.is_correct),jsonb_agg(jsonb_build_object('id',q.id,
   'position',i.position,'statementPreview',left(q.statement,180),'answered',f.question_id is not null) order by i.position)
 into v_answered,v_correct,v_questions
 from comparison_private.reference_items i join public.study_questions q on q.id=i.question_id
   left join first_answers f on f.question_id=q.id where i.set_id=v_set;
 v_base:=v_base||jsonb_build_object('yourAnswered',v_answered,'questions',v_questions);
 if v_answered<20 then return v_base||jsonb_build_object('status','incomplete_reference');end if;
 v_base:=v_base||jsonb_build_object('yourAccuracy',v_correct*5);
 with opted_peers as (
   select p.user_id from public.study_comparison_preferences p join public.study_goals g on g.user_id=p.user_id
   where p.enabled and p.consent_version='2026-11-v1' and g.status='active' and g.contest_id=v_contest and p.user_id<>v_user
 ), first_answers as (
   select distinct on(a.user_id,a.question_id) a.user_id,a.question_id,a.is_correct
   from public.question_attempts a join opted_peers p on p.user_id=a.user_id
     join comparison_private.reference_items i on i.question_id=a.question_id and i.set_id=v_set
   where a.submitted_at>=v_start and a.submitted_at<=v_now
   order by a.user_id,a.question_id,a.submitted_at,a.id
 ), complete_peers as (
   select user_id,5.0*count(*) filter(where is_correct) as accuracy from first_answers group by user_id having count(*)=20
 )
 select count(*),avg(accuracy) into v_peers,v_average from complete_peers;
 if v_peers<10 then return v_base||jsonb_build_object('status','insufficient_group');end if;
 -- Never return identities, exact membership counts, individual scores or ranks.
 return v_base||jsonb_build_object('status','ready','peerAverage',round(v_average/5)*5);
end;
$$;
revoke all on all functions in schema comparison_private from public, anon, authenticated;
grant execute on function comparison_private.set_participation(boolean,text),comparison_private.get_comparison() to authenticated;
create function public.get_study_comparison() returns jsonb language sql security invoker set search_path='' as $$ select comparison_private.get_comparison() $$;
create function public.set_study_comparison_participation(p_enabled boolean,p_consent_version text default null) returns jsonb
language sql security invoker set search_path='' as $$ select comparison_private.set_participation(p_enabled,p_consent_version) $$;
revoke all on function public.get_study_comparison(),public.set_study_comparison_participation(boolean,text) from public,anon;
grant execute on function public.get_study_comparison(),public.set_study_comparison_participation(boolean,text) to authenticated;
