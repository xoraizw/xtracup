-- Fixes a real RLS gap: "staff read cafe customers" (from 0006) has no
-- scoping filter beyond current_user_role() = 'staff' — any staff account
-- can currently read every row in `users`, across every brand, not just
-- their own customers. This also breaks any client-side `.single()` read
-- of the caller's own row (BranchesScreen, PassTiersScreen, PhotosScreen),
-- since Postgres RLS policies are OR'd together: a staff caller matches
-- both "users read own row" AND this policy, so a query meant to return
-- one row returns every user instead, and .single() throws "Cannot coerce
-- the result to a single JSON object".
--
-- Customers don't carry a cafe_id of their own to scope against directly,
-- so this policy is scoped via passes: a staff member may read a user's
-- row if that user has ever purchased a pass from the staff's own brand.
drop policy if exists "staff read cafe customers" on users;

create policy "staff read own brand customers"
  on users for select
  to authenticated
  using (
    current_user_role() = 'staff'
    and exists (
      select 1 from passes
      where passes.user_id = users.id
      and passes.cafe_id = current_user_cafe_id()
    )
  );
