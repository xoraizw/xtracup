-- Adds an 'owner' role: same cafe-scoped visibility as staff (so an owner
-- can also use the Scan/Pending/Today staff tools), plus exclusive rights to
-- edit cafe settings and manage staff. An owner is seeded manually via SQL
-- (see README) — there's no self-service owner invite flow, since a single
-- pilot cafe only ever has one owner and it's not worth building UI for.

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('customer', 'staff', 'owner'));

-- Re-seed of the RLS helper: 'owner' now reads as cafe-scoped staff-equivalent
-- everywhere current_user_role() = 'staff' was checked, via this second helper
-- rather than rewriting every existing policy's string comparison.
create or replace function current_user_is_staff_or_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select role in ('staff', 'owner') from users where id = (auth.jwt()->>'sub');
$$;

create or replace function current_user_is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select role = 'owner' from users where id = (auth.jwt()->>'sub');
$$;

-- Replace the staff-only read policies so owners get the same visibility.
drop policy if exists "staff read customers" on users;
create policy "staff or owner read customers"
  on users for select
  to authenticated
  using (current_user_is_staff_or_owner());

drop policy if exists "staff read cafe passes" on passes;
create policy "staff or owner read cafe passes"
  on passes for select
  to authenticated
  using (current_user_is_staff_or_owner() and cafe_id = current_user_cafe_id());

drop policy if exists "staff read cafe redemptions" on redemptions;
create policy "staff or owner read cafe redemptions"
  on redemptions for select
  to authenticated
  using (
    current_user_is_staff_or_owner()
    and exists (
      select 1 from passes
      where passes.id = redemptions.pass_id
      and passes.cafe_id = current_user_cafe_id()
    )
  );

-- Owners can update their own cafe's settings directly (no Edge Function
-- needed here — nothing about pricing changes needs to bypass RLS, unlike
-- balance mutation which must stay server-side).
create policy "owner update own cafe"
  on cafes for update
  to authenticated
  using (current_user_is_owner() and id = current_user_cafe_id())
  with check (current_user_is_owner() and id = current_user_cafe_id());

-- Revoking staff (demoting back to customer) still goes through a policy,
-- not an Edge Function, since it's a simple same-cafe role downgrade with
-- no side effects to coordinate — but only an owner may change someone
-- else's role, and only within their own cafe, and only staff -> customer.
create policy "owner revoke staff in own cafe"
  on users for update
  to authenticated
  using (
    current_user_is_owner()
    and cafe_id = current_user_cafe_id()
    and role = 'staff'
  )
  with check (
    cafe_id = current_user_cafe_id()
    and role = 'customer'
  );
