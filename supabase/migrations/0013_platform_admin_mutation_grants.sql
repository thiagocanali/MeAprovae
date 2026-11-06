-- Allow authenticated owners to manage administrative role assignments.
-- RLS policies from 0006 remain the authorization boundary: only current
-- platform owners may insert, update or delete rows in platform_admins.
grant insert, update, delete on public.platform_admins to authenticated;
