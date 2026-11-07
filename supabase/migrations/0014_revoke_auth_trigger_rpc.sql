-- The Auth trigger invokes this function internally. It must not be callable as a public PostgREST RPC.
revoke all on function public.handle_new_student() from public, anon, authenticated;
