-- XtraCup pilot schema: single-cafe Brand Pass, staff-scanned QR redemption.

create extension if not exists "pgcrypto";

create table if not exists cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  discount_pct numeric(5,2) not null check (discount_pct >= 0 and discount_pct <= 100),
  cup_price_pkr numeric(10,2) not null check (cup_price_pkr > 0),
  cups_per_pass integer not null check (cups_per_pass > 0),
  pass_price_pkr numeric(10,2) not null check (pass_price_pkr > 0),
  payment_account_label text not null default '',
  created_at timestamptz not null default now()
);

-- Mirrors auth.users; role/cafe_id drive RLS and in-app navigation.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  name text,
  role text not null default 'customer' check (role in ('customer', 'staff')),
  cafe_id uuid references cafes(id),
  created_at timestamptz not null default now()
);

create table if not exists passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  cafe_id uuid not null references cafes(id),
  cups_total integer not null check (cups_total > 0),
  cups_remaining integer not null check (cups_remaining >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'depleted', 'rejected')),
  payment_ref text,
  purchased_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists passes_user_id_idx on passes(user_id);
create index if not exists passes_cafe_id_idx on passes(cafe_id);

-- Append-only audit trail; also the source for pilot metrics (Section 6).
create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references passes(id) on delete cascade,
  staff_user_id uuid not null references users(id),
  redeemed_at timestamptz not null default now(),
  cups_before integer not null,
  cups_after integer not null
);

create index if not exists redemptions_pass_id_idx on redemptions(pass_id);

-- Helper: current user's role, used inside RLS policies without recursive
-- table lookups triggering their own RLS checks.
create or replace function current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from users where id = auth.uid();
$$;

create or replace function current_user_cafe_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select cafe_id from users where id = auth.uid();
$$;

alter table cafes enable row level security;
alter table users enable row level security;
alter table passes enable row level security;
alter table redemptions enable row level security;

-- cafes: readable by any authenticated user (pilot has one cafe, no sensitive data)
create policy "cafes are readable by authenticated users"
  on cafes for select
  to authenticated
  using (true);

-- users: a user can read/update their own row; staff can read customers of their cafe
create policy "users read own row"
  on users for select
  to authenticated
  using (id = auth.uid());

create policy "staff read customers"
  on users for select
  to authenticated
  using (current_user_role() = 'staff');

create policy "users update own row"
  on users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users insert own row"
  on users for insert
  to authenticated
  with check (id = auth.uid());

-- passes: customers see their own; staff see passes for their cafe
create policy "customers read own passes"
  on passes for select
  to authenticated
  using (user_id = auth.uid());

create policy "staff read cafe passes"
  on passes for select
  to authenticated
  using (current_user_role() = 'staff' and cafe_id = current_user_cafe_id());

create policy "customers create own pending pass"
  on passes for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- Balance/status mutation (confirm payment, redeem) goes through Edge
-- Functions using the service role key, not direct client updates.

-- redemptions: customers read redemptions on their own passes; staff read their cafe's
create policy "customers read own redemptions"
  on redemptions for select
  to authenticated
  using (
    exists (
      select 1 from passes
      where passes.id = redemptions.pass_id
      and passes.user_id = auth.uid()
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

-- Seed the pilot cafe. Adjust name/city/pricing before go-live.
insert into cafes (name, city, discount_pct, cup_price_pkr, cups_per_pass, pass_price_pkr, payment_account_label)
values ('Pilot Cafe', 'Karachi', 15.00, 850.00, 15, 10837.50, 'JazzCash: 0300-0000000')
on conflict do nothing;
