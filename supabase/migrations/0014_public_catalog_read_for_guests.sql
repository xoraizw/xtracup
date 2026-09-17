-- Lets a signed-out visitor browse the customer-facing catalog (cafés,
-- their branches, pass tiers, and menu photos) before ever creating an
-- account. These tables already carry a "no sensitive data" read policy
-- for authenticated users (see 0001/0007) — this just extends the same
-- `using (true)` read access to the `anon` role, additively (Postgres ORs
-- permissive policies together, so the existing authenticated policies are
-- untouched). Anything that could identify a person (users, passes,
-- redemptions) stays authenticated-only.
create policy "cafes are readable by guests"
  on cafes for select
  to anon
  using (true);

create policy "branches are readable by guests"
  on branches for select
  to anon
  using (true);

create policy "pass_tiers are readable by guests"
  on pass_tiers for select
  to anon
  using (true);

create policy "menu_photos are readable by guests"
  on menu_photos for select
  to anon
  using (true);
