-- Staff onboarding via per-cafe invite code, validated server-side by the
-- join-staff Edge Function (service role) — never trust the client to
-- self-assign role='staff'. Also tightens the existing users RLS policies,
-- which previously let any authenticated user set role/cafe_id to anything
-- on insert or update.

alter table cafes add column if not exists invite_code text;

-- One invite code per cafe; NULL is fine (means staff signup disabled until set).
create unique index if not exists cafes_invite_code_idx on cafes(invite_code) where invite_code is not null;

-- Seed the pilot cafe with a starter code — change this before real use.
update cafes set invite_code = 'PILOT-STAFF-2026' where invite_code is null;

drop policy if exists "users insert own row" on users;
drop policy if exists "users update own row" on users;

-- Client-side inserts may only ever create a customer row for themselves.
-- Staff rows are created exclusively by the join-staff Edge Function, which
-- uses the service role and bypasses RLS after validating the invite code.
create policy "customers insert own row"
  on users for insert
  to authenticated
  with check (id = (auth.jwt()->>'sub') and role = 'customer' and cafe_id is null);

-- Users may update their own profile fields but can never change their own
-- role or cafe_id through a direct client update.
create policy "users update own profile"
  on users for update
  to authenticated
  using (id = (auth.jwt()->>'sub'))
  with check (
    id = (auth.jwt()->>'sub')
    and role = (select role from users where id = (auth.jwt()->>'sub'))
    and cafe_id is not distinct from (select cafe_id from users where id = (auth.jwt()->>'sub'))
  );
