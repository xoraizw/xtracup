-- Splits the single "cafe" concept into a brand/branch model:
--   cafes     -> the customer-facing brand (name, photos, menu, pass tiers)
--   branches  -> physical locations under a brand (address, own staff
--                roster, own invite code, where redemption actually happens)
-- Staff now join a BRANCH (not a brand directly); a customer's pass is
-- brand-wide and redeemable at any of that brand's branches. Pass pricing
-- moves out of `cafes` into a new `pass_tiers` table so a brand can offer
-- multiple prepay bundles instead of exactly one.

-- ── cafes: strip pricing/invite fields (moving to branches/pass_tiers),
--    add customer-facing brand fields ──────────────────────────────────
alter table cafes add column if not exists description text not null default '';
alter table cafes add column if not exists cover_photo_url text;

-- ── branches: the operational unit — what "cafes" used to mean ────────
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  name text not null,
  address text not null default '',
  photo_url text,
  invite_code text,
  created_at timestamptz not null default now()
);

create index if not exists branches_cafe_id_idx on branches(cafe_id);
create unique index if not exists branches_invite_code_idx on branches(invite_code) where invite_code is not null;

-- Backfill: one branch per existing cafe, carrying over its old invite_code,
-- so existing staff accounts have something to point at post-migration.
insert into branches (cafe_id, name, address, invite_code)
select id, name || ' — Main Branch', city, invite_code from cafes
where not exists (select 1 from branches where branches.cafe_id = cafes.id);

alter table cafes drop column if exists invite_code;

-- ── pass_tiers: replaces the single price/discount/cups columns that used
--    to live directly on cafes — a brand can now offer several bundles ───
create table if not exists pass_tiers (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  name text not null,
  cups integer not null check (cups > 0),
  price_pkr numeric(10,2) not null check (price_pkr > 0),
  cup_price_pkr numeric(10,2) not null check (cup_price_pkr > 0),
  discount_pct numeric(5,2) not null check (discount_pct >= 0 and discount_pct <= 100),
  payment_account_label text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists pass_tiers_cafe_id_idx on pass_tiers(cafe_id);

-- Backfill: one tier per existing cafe from its old single-price columns.
insert into pass_tiers (cafe_id, name, cups, price_pkr, cup_price_pkr, discount_pct, payment_account_label)
select id, 'Standard', cups_per_pass, pass_price_pkr, cup_price_pkr, discount_pct, payment_account_label
from cafes
where not exists (select 1 from pass_tiers where pass_tiers.cafe_id = cafes.id);

alter table cafes drop column if exists cups_per_pass;
alter table cafes drop column if exists pass_price_pkr;
alter table cafes drop column if exists cup_price_pkr;
alter table cafes drop column if exists discount_pct;
alter table cafes drop column if exists payment_account_label;

-- ── menu_photos: staff-uploaded menu images, many per cafe ────────────
create table if not exists menu_photos (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists menu_photos_cafe_id_idx on menu_photos(cafe_id);

-- ── users: staff now point at a branch, not a cafe directly ───────────
-- Both existing policies below reference cafe_id directly — Postgres
-- refuses to drop a column still referenced by a policy, so they're
-- recreated against branch_id before the drop, matching the same pattern
-- 0002/0004 already used for this exact class of error.
drop policy if exists "customers insert own row" on users;
drop policy if exists "users update own profile" on users;

alter table users add column if not exists branch_id uuid references branches(id);
update users set branch_id = (select id from branches where branches.cafe_id = users.cafe_id limit 1)
where cafe_id is not null and branch_id is null;
alter table users drop column if exists cafe_id;

create policy "customers insert own row"
  on users for insert
  to authenticated
  with check (id = (auth.jwt()->>'sub') and role = 'customer' and branch_id is null);

create policy "users update own profile"
  on users for update
  to authenticated
  using (id = (auth.jwt()->>'sub'))
  with check (
    id = (auth.jwt()->>'sub')
    and role = (select role from users where id = (auth.jwt()->>'sub'))
    and branch_id is not distinct from (select branch_id from users where id = (auth.jwt()->>'sub'))
  );

-- ── passes: still brand-wide (cafe_id), plus which tier was bought ────
alter table passes add column if not exists pass_tier_id uuid references pass_tiers(id);
update passes set pass_tier_id = (select id from pass_tiers where pass_tiers.cafe_id = passes.cafe_id limit 1)
where pass_tier_id is null;

-- ── redemptions: record which branch actually redeemed the cup ────────
alter table redemptions add column if not exists branch_id uuid references branches(id);

-- ── RLS helpers: current_user_cafe_id() renamed/replaced since staff are
--    now branch-scoped; current_user_branch_id() is the direct FK, and
--    current_user_cafe_id() is derived (branch's parent brand) so existing
--    "same brand" checks (pass tiers, menu photos, brand-wide history)
--    keep working without every policy needing a branch join. ───────────
-- Three existing policies still reference the old current_user_cafe_id()
-- signature — same class of drop-blocked-by-dependent-policy error as
-- 0002/0004, so they're dropped here (and recreated further below,
-- pointing at the new function) before the function itself is dropped.
drop policy if exists "staff update own cafe" on cafes;
drop policy if exists "staff read own cafe passes" on passes;
drop policy if exists "staff read own cafe redemptions" on redemptions;

drop function if exists current_user_cafe_id();

create or replace function current_user_branch_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select branch_id from users where id = (auth.jwt()->>'sub');
$$;

create or replace function current_user_cafe_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select b.cafe_id from users u join branches b on b.id = u.branch_id
  where u.id = (auth.jwt()->>'sub');
$$;

-- ── RLS: cafes, branches, pass_tiers, menu_photos are all customer-facing
--    catalog data — readable by everyone, writable by staff of that brand
--    (any branch) or the platform owner. ────────────────────────────────
create policy "branches are readable by authenticated users"
  on branches for select
  to authenticated
  using (true);

create policy "pass_tiers are readable by authenticated users"
  on pass_tiers for select
  to authenticated
  using (true);

create policy "menu_photos are readable by authenticated users"
  on menu_photos for select
  to authenticated
  using (true);

alter table branches enable row level security;
alter table pass_tiers enable row level security;
alter table menu_photos enable row level security;

create policy "staff manage own brand pass_tiers"
  on pass_tiers for all
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id())
  with check (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "owner manage any pass_tiers"
  on pass_tiers for all
  to authenticated
  using (current_user_is_owner())
  with check (current_user_is_owner());

create policy "staff manage own brand menu_photos"
  on menu_photos for all
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id())
  with check (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "owner manage any menu_photos"
  on menu_photos for all
  to authenticated
  using (current_user_is_owner())
  with check (current_user_is_owner());

create policy "staff manage own brand branches"
  on branches for all
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id())
  with check (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "owner manage any branches"
  on branches for all
  to authenticated
  using (current_user_is_owner())
  with check (current_user_is_owner());

-- Staff can also update their own brand's cafe row (cover photo,
-- description) — same shape as the pass_tiers/branches policies above.
create policy "staff update own brand cafe"
  on cafes for update
  to authenticated
  using (current_user_role() = 'staff' and id = current_user_cafe_id())
  with check (current_user_role() = 'staff' and id = current_user_cafe_id());

-- ── passes/redemptions/users policies that referenced the old cafe_id-on-
--    users shape need re-pointing at branch_id. ────────────────────────
create policy "staff read own brand passes"
  on passes for select
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "staff read own brand redemptions"
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
