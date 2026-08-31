-- Redefines 'owner' as the XtraCup platform operator, not a per-cafe role.
-- Owners are no longer pinned to a single cafe_id — they manage the roster
-- of cafes across the whole platform (create, delete, issue invite codes,
-- see cross-cafe metrics/history). Cafe-level day-to-day operation (pricing,
-- redemption, that cafe's own metrics/history/staff) now belongs entirely
-- to the 'staff' role for that cafe, via a shared staff account per cafe.

-- Existing owner test rows predate this model and may carry a cafe_id from
-- when 'owner' was cafe-scoped — clear it so they match the new shape.
update users set cafe_id = null where role = 'owner';

create or replace function current_user_is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select role = 'owner' from users where id = (auth.jwt()->>'sub');
$$;

-- Owner can now manage ANY cafe, not just their own (they have none).
drop policy if exists "owner update own cafe" on cafes;
create policy "owner update any cafe"
  on cafes for update
  to authenticated
  using (current_user_is_owner())
  with check (current_user_is_owner());

create policy "owner insert cafe"
  on cafes for insert
  to authenticated
  with check (current_user_is_owner());

create policy "owner delete cafe"
  on cafes for delete
  to authenticated
  using (current_user_is_owner());

-- Owner can revoke staff at any cafe (previously scoped to their own cafe_id).
drop policy if exists "owner revoke staff in own cafe" on users;
create policy "owner revoke staff at any cafe"
  on users for update
  to authenticated
  using (current_user_is_owner() and role = 'staff')
  with check (role = 'customer');

-- Owner needs cross-cafe visibility into passes/redemptions for aggregate
-- metrics and history — previously "staff or owner" policies required the
-- caller's own cafe_id to match, which no longer applies to an owner.
drop policy if exists "staff or owner read cafe passes" on passes;
create policy "staff read own cafe passes"
  on passes for select
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "owner read all passes"
  on passes for select
  to authenticated
  using (current_user_is_owner());

drop policy if exists "staff or owner read cafe redemptions" on redemptions;
create policy "staff read own cafe redemptions"
  on redemptions for select
  to authenticated
  using (
    current_user_role() = 'staff'
    and exists (
      select 1 from passes
      where passes.id = redemptions.pass_id
      and passes.cafe_id = current_user_cafe_id()
    )
  );

create policy "owner read all redemptions"
  on redemptions for select
  to authenticated
  using (current_user_is_owner());

-- Owner needs to see all staff (across cafes) to manage them from Manage Cafes.
drop policy if exists "staff or owner read customers" on users;
create policy "staff read cafe customers"
  on users for select
  to authenticated
  using (current_user_role() = 'staff');

create policy "owner read all users"
  on users for select
  to authenticated
  using (current_user_is_owner());

-- Staff now edits their own cafe's settings directly (moved from the old
-- owner-only "Cafe Settings" screen) — same RLS shape as the owner update
-- policy above, but scoped to the staff member's own cafe_id.
create policy "staff update own cafe"
  on cafes for update
  to authenticated
  using (current_user_role() = 'staff' and id = current_user_cafe_id())
  with check (current_user_role() = 'staff' and id = current_user_cafe_id());
