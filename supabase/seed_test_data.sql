-- Test data: a few cafe brands with branches + pass tiers, and sample
-- passes assigned to a specific customer. Run in the Supabase SQL Editor.
-- Not part of the migration chain — one-off seeding, safe to re-run
-- (guarded with "where not exists" / upsert-style inserts).

-- ── Part 1: find the customer's user id ───────────────────────────────
-- users.id is the Clerk user id (no email column on this table), so look
-- them up by name if you know what they entered at sign-up. If this
-- returns nothing or the wrong row, open Supabase Dashboard →
-- Authentication is N/A here (Clerk-managed) — instead check Clerk's
-- dashboard for the user's Clerk ID directly and use that in Part 2.
select id, name, role, branch_id, created_at
from users
where role = 'customer'
order by created_at desc
limit 20;

-- ── Part 2: create test cafe brands, branches, pass tiers ─────────────
with new_cafe as (
  insert into cafes (name, city, description)
  values ('Brew & Co', 'Karachi', 'A cozy specialty coffee spot in Clifton.')
  returning id
), new_branch as (
  insert into branches (cafe_id, name, address, invite_code)
  select id, 'Clifton Branch', 'Block 5, Clifton, Karachi', 'BREW-0001'
  from new_cafe
  returning id, cafe_id
)
insert into pass_tiers (cafe_id, name, cups, price_pkr, cup_price_pkr, discount_pct, payment_account_label, active)
select cafe_id, 'Starter', 5, 1250, 250, 0, 'EasyPaisa 0300-1234567', true
from new_branch
union all
select cafe_id, 'Standard', 10, 2200, 220, 12, 'EasyPaisa 0300-1234567', true
from new_branch
union all
select cafe_id, 'Bulk', 20, 4000, 200, 20, 'EasyPaisa 0300-1234567', true
from new_branch;

with new_cafe as (
  insert into cafes (name, city, description)
  values ('Grind House', 'Lahore', 'Third-wave coffee roastery and bar in Gulberg.')
  returning id
), new_branch as (
  insert into branches (cafe_id, name, address, invite_code)
  select id, 'Gulberg Branch', 'MM Alam Road, Gulberg, Lahore', 'GRIND-0001'
  from new_cafe
  returning id, cafe_id
)
insert into pass_tiers (cafe_id, name, cups, price_pkr, cup_price_pkr, discount_pct, payment_account_label, active)
select cafe_id, 'Starter', 5, 1400, 280, 0, 'JazzCash 0301-7654321', true
from new_branch
union all
select cafe_id, 'Standard', 10, 2500, 250, 11, 'JazzCash 0301-7654321', true
from new_branch;

with new_cafe as (
  insert into cafes (name, city, description)
  values ('Espresso Lane', 'Islamabad', 'Fast, friendly espresso bar near Blue Area.')
  returning id
), new_branch as (
  insert into branches (cafe_id, name, address, invite_code)
  select id, 'Blue Area Branch', 'Jinnah Avenue, Blue Area, Islamabad', 'ESPR-0001'
  from new_cafe
  returning id, cafe_id
)
insert into pass_tiers (cafe_id, name, cups, price_pkr, cup_price_pkr, discount_pct, payment_account_label, active)
select cafe_id, 'Standard', 10, 2000, 200, 9, 'Bank Transfer — Meezan 01234567', true
from new_branch;

-- ── Part 3: assign passes to the test customer ─────────────────────────
-- Replace 'CUSTOMER_USER_ID_HERE' with the id found in Part 1 (or from
-- Clerk's dashboard) before running this block.
do $$
declare
  target_user_id text := 'user_3I6Aul1kuvAR1YdoVQwsYZEO8eG';
  brew_cafe_id uuid;
  brew_tier_id uuid;
  grind_cafe_id uuid;
  grind_tier_id uuid;
begin
  select id into brew_cafe_id from cafes where name = 'Brew & Co' limit 1;
  select id into brew_tier_id from pass_tiers where cafe_id = brew_cafe_id and name = 'Standard' limit 1;

  select id into grind_cafe_id from cafes where name = 'Grind House' limit 1;
  select id into grind_tier_id from pass_tiers where cafe_id = grind_cafe_id and name = 'Starter' limit 1;

  -- Active pass, partially used
  insert into passes (user_id, cafe_id, pass_tier_id, cups_total, cups_remaining, status, payment_ref, purchased_at, confirmed_at)
  values (target_user_id, brew_cafe_id, brew_tier_id, 10, 6, 'active', 'TESTREF-001', now() - interval '5 days', now() - interval '5 days');

  -- Pending pass, awaiting staff confirmation
  insert into passes (user_id, cafe_id, pass_tier_id, cups_total, cups_remaining, status, payment_ref)
  values (target_user_id, grind_cafe_id, grind_tier_id, 5, 5, 'pending', 'TESTREF-002');
end $$;

-- Verify
select p.id, p.status, p.cups_remaining, p.cups_total, c.name as cafe_name, pt.name as tier_name
from passes p
join cafes c on c.id = p.cafe_id
left join pass_tiers pt on pt.id = p.pass_tier_id
where p.user_id = 'user_3I6Aul1kuvAR1YdoVQwsYZEO8eG';

-- ── Part 4: move the staff test account (xoraizw1@gmail.com) onto
--    Brew & Co's Clifton Branch, so it can redeem the seeded pass above.
--    Overwrites their previous branch_id — they lose access to whatever
--    café they were staff at before this. ───────────────────────────────
-- First, find their user id (look for role = 'staff'):
select id, name, role, branch_id, created_at
from users
where role = 'staff'
order by created_at desc
limit 20;

-- Then fill in their id below and run:
update users
set branch_id = (select id from branches where invite_code = 'BREW-0001')
where id = 'user_3I3T4CCYor5HEJSVF4eRYQVUA6v'
  and role = 'staff';

-- Verify
select u.id, u.name, u.role, b.name as branch_name, c.name as cafe_name
from users u
left join branches b on b.id = u.branch_id
left join cafes c on c.id = b.cafe_id
where u.role = 'staff';

-- ── Part 5: top up Ahmad's Brew & Co pass so testing can continue ─────
-- Resets cups_remaining to cups_total and reactivates the pass if it had
-- been depleted by earlier redemption tests.
update passes
set cups_remaining = cups_total, status = 'active'
where user_id = 'user_3I6Aul1kuvAR1YdoVQwsYZEO8eG'
  and cafe_id = (select id from cafes where name = 'Brew & Co' limit 1);

-- Verify
select p.id, p.status, p.cups_remaining, p.cups_total, c.name as cafe_name
from passes p
join cafes c on c.id = p.cafe_id
where p.user_id = 'user_3I6Aul1kuvAR1YdoVQwsYZEO8eG'
  and c.name = 'Brew & Co';
