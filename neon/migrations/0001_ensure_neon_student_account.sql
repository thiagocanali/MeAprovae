-- Called only with an authenticated JWT validated by the Neon Data API.
-- auth.uid() is Neon's native trusted JWT identity function, not a client parameter.
create or replace function public.ensure_neon_student_account(p_display_name text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_name text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select coalesce(nullif(left(btrim(u.name), 60), ''), 'Estudante')
  into v_name
  from neon_auth."user" u
  where u.id = v_user_id and coalesce(u.banned, false) = false;
  if not found then
    raise exception using errcode = '42501', message = 'Authenticated user does not exist';
  end if;

  if p_display_name is not null then
    if char_length(btrim(p_display_name)) not between 2 and 60 then
      raise exception using errcode = '22023', message = 'Invalid display name';
    end if;
    v_name := btrim(p_display_name);
  end if;

  insert into public.auth_users (id, raw_user_meta_data)
  values (v_user_id, jsonb_build_object('display_name', v_name))
  on conflict (id) do nothing;

  -- The existing handle_new_student trigger inserts student_profiles atomically.
  if not exists (select 1 from public.student_profiles where id = v_user_id) then
    insert into public.student_profiles (id, display_name)
    values (v_user_id, v_name)
    on conflict (id) do nothing;
  end if;

  return jsonb_build_object('id', v_user_id);
end;
$fn$;

revoke all on function public.ensure_neon_student_account(text) from public, anon, anonymous;
grant execute on function public.ensure_neon_student_account(text) to authenticated;
