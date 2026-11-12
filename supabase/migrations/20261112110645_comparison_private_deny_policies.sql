-- Explicitly document/deny every client operation in addition to revoked grants.
-- Trusted table-owning definer functions retain their intended internal access.
create policy "Deny direct client reference access" on comparison_private.reference_sets
  as restrictive for all to anon, authenticated using(false) with check(false);
create policy "Deny direct client reference access" on comparison_private.reference_items
  as restrictive for all to anon, authenticated using(false) with check(false);
