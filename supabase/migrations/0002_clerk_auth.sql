-- Switches auth from Supabase's own auth.users to Clerk. Clerk is configured
-- as a third-party auth provider in Supabase Dashboard > Authentication >
-- Sign In / Providers (see README) — Supabase then verifies Clerk-issued
-- JWTs directly, no shared secret. RLS reads the Clerk user id from
-- auth.jwt()->>'sub' instead of auth.uid(), and users.id becomes a plain
-- text column holding Clerk's "user_xxx" id instead of a Postgres-generated
-- UUID FK into auth.users.

-- Policies must be dropped before altering users.id's type — Postgres
-- refuses to alter a column referenced by a policy definition.
drop policy if exists "users read own row" on users;
drop policy if exists "staff read customers" on users;
drop policy if exists "users update own row" on users;
drop policy if exists "users insert own row" on users;
drop policy if exists "customers read own passes" on passes;
drop policy if exists "staff read cafe passes" on passes;
drop policy if exists "customers create own pending pass" on passes;
drop policy if exists "customers read own redemptions" on redemptions;
drop policy if exists "staff read cafe redemptions" on redemptions;

-- Drop FKs pointing at users.id — both sides must be retyped together, so
-- these have to go before any of the three alter column calls below.
alter table users drop constraint if exists users_id_fkey;
alter table passes drop constraint if exists passes_user_id_fkey;
alter table redemptions drop constraint if exists redemptions_staff_user_id_fkey;

alter table users alter column id type text;
alter table users alter column id drop default;

alter table passes alter column user_id type text;
alter table redemptions alter column staff_user_id type text;

-- Re-add the FKs now that both sides are text.
alter table passes
  add constraint passes_user_id_fkey foreign key (user_id) references users(id) on delete cascade;
alter table redemptions
  add constraint redemptions_staff_user_id_fkey foreign key (staff_user_id) references users(id);

create or replace function current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from users where id = (auth.jwt()->>'sub');
$$;

create or replace function current_user_cafe_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select cafe_id from users where id = (auth.jwt()->>'sub');
$$;

create policy "users read own row"
  on users for select
  to authenticated
  using (id = (auth.jwt()->>'sub'));

create policy "staff read customers"
  on users for select
  to authenticated
  using (current_user_role() = 'staff');

create policy "users update own row"
  on users for update
  to authenticated
  using (id = (auth.jwt()->>'sub'))
  with check (id = (auth.jwt()->>'sub'));

create policy "users insert own row"
  on users for insert
  to authenticated
  with check (id = (auth.jwt()->>'sub'));

create policy "customers read own passes"
  on passes for select
  to authenticated
  using (user_id = (auth.jwt()->>'sub'));

create policy "staff read cafe passes"
  on passes for select
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "customers create own pending pass"
  on passes for insert
  to authenticated
  with check (user_id = (auth.jwt()->>'sub') and status = 'pending');

create policy "customers read own redemptions"
  on redemptions for select
  to authenticated
  using (
    exists (
      select 1 from passes
      where passes.id = redemptions.pass_id
      and passes.user_id = (auth.jwt()->>'sub')
    )
  );

create policy "staff read cafe redemptions"
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
