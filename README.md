# XtraCup — Pilot MVP

Multi-café Brand Pass app: customers browse café brands, prepay a pack of cups (choosing from that brand's pass tiers), and redeem one cup at a time by scanning a QR code at checkout. Built with Expo (React Native) + Supabase + Clerk (auth).

**Brand vs. branch:** a café **brand** (`cafes`) is the customer-facing thing — name, photos, menu, and one or more pass **tiers** (prepay bundles, e.g. Starter/Standard/Bulk, each with its own cup count and price). A brand can have several **branches** — physical locations, each with its own address, photo, and staff invite code. A pass is bought against the brand and redeemable at *any* of its branches.

Three roles:
- **Customer** — browses brands in Explore, buys a pass tier, holds multiple passes (My Passes), redeems cups at any branch of the brand it belongs to.
- **Staff** — joins one specific branch via that branch's invite code, but manages the whole brand's day-to-day: scan/redeem, confirm payments, pass tiers, photos, branches (including other branches' invite codes), and that brand's metrics/pass history.
- **Owner** — the XtraCup platform operator, not tied to any café or branch. Creates/deletes café brands, drills into a brand to see its branches and revoke branch staff, and sees metrics/pass history aggregated across all brands (or one).

See [`../xtracup-app-plan.md`](../xtracup-app-plan.md) for the full build plan this implements.

## 1. Prerequisites

- Node 22.13+ (project currently runs on 22.12 with an engine warning — upgrade when convenient)
- Expo Go app on your phone (must match the project's Expo SDK — see `expo` version in `package.json`), or an Android/iOS simulator
- A Supabase project (already created)
- A Clerk application (already created) with **Email address** sign-in enabled, **Password required: off**, **Username required: off** (see step 4a — this app is email-code-only, no password)

## 2. Environment setup

`.env` already contains your project URL, Supabase **publishable/anon key**, and Clerk **publishable key** — all safe to use client-side.

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

**Never put the Supabase service-role key or the Clerk secret key in `.env` or anywhere under `src/`.** The Supabase one only belongs in Edge Function secrets (step 5); the Clerk secret key isn't used by this app at all — Clerk verifies its own JWTs, Supabase verifies them independently via the third-party auth provider config (step 4).

## 3. Apply the database schema

Open the Supabase SQL Editor and run, in order:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — creates `cafes`, `users`, `passes`, `redemptions`, RLS policies, and seeds one pilot café.
2. [`supabase/migrations/0002_clerk_auth.sql`](supabase/migrations/0002_clerk_auth.sql) — switches `users.id` (and the FKs pointing at it) from a Supabase `auth.users` UUID to a plain text column holding Clerk's `user_xxx` id, and rewrites RLS policies to read `auth.jwt()->>'sub'` instead of `auth.uid()`.
3. [`supabase/migrations/0003_staff_invite.sql`](supabase/migrations/0003_staff_invite.sql) — adds `cafes.invite_code` (later moved to `branches` in 0007), and tightens `users` RLS so a client can never self-assign `role='staff'` — only the `join-staff` Edge Function can do that.
4. [`supabase/migrations/0004_owner_role.sql`](supabase/migrations/0004_owner_role.sql) — adds `role='owner'` (superseded by 0006 below — kept for history, don't skip it, later migrations depend on objects it creates).
5. [`supabase/migrations/0005_legal_acceptance.sql`](supabase/migrations/0005_legal_acceptance.sql) — adds `users.legal_accepted_at`, used to gate the app behind a one-time acceptance of the (mock) Terms/Refund/Privacy docs.
6. [`supabase/migrations/0006_platform_owner.sql`](supabase/migrations/0006_platform_owner.sql) — redefines `owner` as the platform operator, gives owners CRUD on `cafes` and cross-café read access to `passes`/`redemptions`/`users` (superseded further by 0007 — kept for history).
7. [`supabase/migrations/0007_brand_branch_split.sql`](supabase/migrations/0007_brand_branch_split.sql) — the big one: splits the single café concept into **`cafes`** (customer-facing brand: name, description, cover photo) and a new **`branches`** table (physical locations, each with its own address/photo/invite code). Adds **`pass_tiers`** (a brand can offer several prepay bundles instead of one fixed price) and **`menu_photos`**. Moves `users.cafe_id` → `users.branch_id` (staff join a specific branch) and adds `passes.pass_tier_id` / `redemptions.branch_id`. Rewrites every RLS policy that touched the old shape.
8. [`supabase/migrations/0008_photo_storage.sql`](supabase/migrations/0008_photo_storage.sql) — creates the public `cafe-photos` Storage bucket and its policies (public read; write restricted to staff of the brand a file's path claims to belong to, or the owner).

## 4a. Configure Clerk's sign-up requirements (email-code only, no password)

This app authenticates with a one-time email code — no password, no username, no phone. In Clerk Dashboard → **User & Authentication → Email, Phone, Username**:

- **Email address** → Required, sign-in enabled, sign-up enabled, verification via **Email code**.
- **Phone number** and **Username** → not required (turn off if enabled).
- **Password** → not required / disabled (Clerk Dashboard → **User & Authentication → Email, Phone, Username**, or under **Restrictions** depending on dashboard version — look for a "Password" requirement toggle and turn it off).

If any of `phone_number` / `username` / `password` stay marked required, sign-up will get stuck at `missing_requirements` after the email code verifies — the code shows as verified but the account never completes and the app can't sign the user in. If you hit that, this is almost certainly why.

## 4b. Configure Clerk as a Supabase third-party auth provider

This lets Supabase verify Clerk-issued JWTs directly — no shared secret, no Supabase-native user records.

1. Clerk Dashboard → find the **Supabase integration** setup page → activate it → copy the **Clerk domain** it shows you.
2. Supabase Dashboard → **Authentication → Sign In / Providers** → **Add provider** → choose **Clerk** → paste the Clerk domain.

Once this is set, any request carrying a valid Clerk session JWT is treated as `authenticated` by Postgres, and RLS policies can read the Clerk user id via `auth.jwt()->>'sub'`.

## 5. Deploy Edge Functions + set secrets

Five server-side functions handle everything that must not be trusted to the client: issuing redemption QR tokens, redeeming a cup, confirming a manual payment, granting staff access via invite code, and aggregating owner metrics.

```bash
npx supabase login
npx supabase link --project-ref conaufssdfieosazeuwr
npx supabase functions deploy issue-redeem-token
npx supabase functions deploy redeem
npx supabase functions deploy confirm-payment
npx supabase functions deploy join-staff
npx supabase functions deploy owner-metrics

# Service-role key: lets Edge Functions bypass RLS for admin actions.
# Get it from Supabase Dashboard → Project Settings → API → service_role key.
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Any random long string — used to sign/verify the rotating QR token.
npx supabase secrets set REDEEM_TOKEN_SECRET=<generate-a-random-32+-char-string>

# Your Clerk instance domain (the part after "https://" in Clerk Dashboard →
# API Keys → Frontend API URL, or decode it from the publishable key —
# pk_test_<base64> where the base64 part decodes to "<domain>$").
npx supabase secrets set CLERK_DOMAIN=<your-app>.clerk.accounts.dev
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are already available to Edge Functions automatically — no need to set those.

**Why `verify_jwt = false` in `supabase/config.toml`:** Supabase's Edge Function gateway only knows how to verify Supabase-native auth tokens — it rejects third-party tokens (Clerk's RS256/JWKS) with `UNAUTHORIZED_ASYMMETRIC_JWT` even though the same token works fine for direct table queries via PostgREST. This is a known Supabase limitation ([discussion](https://github.com/orgs/supabase/discussions/34988)), and their own recommended fix is to disable the gateway check and verify the JWT yourself inside the function. `supabase/functions/_shared/client.ts`'s `callerUserId()` does exactly that — it fetches Clerk's JWKS and verifies the token's signature before trusting the `sub` claim. This is required, not optional: every admin-privileged function (`redeem`, `confirm-payment`, `join-staff`, `owner-metrics`) uses `adminClient()` (bypasses RLS), so a version of `callerUserId()` that only *decodes* the JWT without verifying its signature would let a forged `Authorization` header impersonate any user.

**A note on the keys you shared in chat:** if you pasted your Supabase service-role key or Clerk secret key into this conversation to get started, treat both as compromised — rotate the Supabase one in Dashboard → Project Settings → API, and the Clerk one in Clerk Dashboard → API Keys, then update the Edge Function secret with the new Supabase value. Neither key was written into the app or committed anywhere.

## 6. Make yourself the platform owner

There's no self-service owner sign-up — owner is the platform operator, not a per-café role, so it's a one-time manual step:

1. Sign up through the app once (email code + name), which creates your `users` row as `role='customer'`.
2. In Supabase Dashboard → SQL Editor, run:
   ```sql
   update users set role = 'owner', branch_id = null
   where id = '<your Clerk user id>';
   ```
   Find your Clerk user id in Table Editor → `users` (it's the `id` column, looks like `user_xxx`), or in Clerk Dashboard → Users.
3. Reopen the app — you'll see the owner tab bar: **Manage Cafés / Profile**. Manage Cafés lets you create a café **brand** (name, city, description — no pricing here, that's set per-branch-staff once they join). Tap into a brand to see its branches (with their invite codes) and drill into a branch's staff roster to revoke access, or open that brand's Metrics/Pass History. The main Manage Cafés screen also has an all-brands Metrics/History view.

## 6a. Create your first staff account and branch

Once at least one café brand exists (step 6), staff sign-up is self-service via invite code — but a brand starts with **no branches**, so the very first staff member for a brand needs a branch to join. In the pilot, do this once via SQL to bootstrap the first branch and its code:

```sql
insert into branches (cafe_id, name, address, invite_code)
values ('<cafe id from step 6>', 'Main Branch', '', 'PILOT-STAFF-2026');
```

Then:

1. Sign up through the app once (email code + name).
2. On the "Almost there" profile-completion screen tap **"I'm café staff — join with a code"**, or from Profile (existing customer account) tap the same.
3. Enter the branch's invite code (`PILOT-STAFF-2026` above, or whatever you set).
4. The `join-staff` Edge Function validates the code and sets `role='staff'` + `branch_id` server-side — the client can never set these itself (see 0003_staff_invite.sql).
5. They'll see the staff tab bar: **Scan / Pending / Today / Café / Profile**. The Café tab covers the whole brand: Pass tiers, Photos, Branches (add more branches + their own invite codes from here — no more SQL needed after the first one), Metrics, and Pass History.

## 6b. Legal / ops placeholder

Every account — customer, staff, owner — hits a one-time "Before you continue" screen right after `CompleteProfileScreen`/`JoinStaffScreen`, showing placeholder Terms of Service, Refund Policy, and Privacy Policy ([`src/content/legal.ts`](src/content/legal.ts) — **not reviewed by counsel, replace before real launch**). Tapping through all three tabs enables "I agree," which stamps `users.legal_accepted_at` and unblocks the rest of the app. The same three documents are reachable afterward from each role's **Profile** tab → Legal.

## 7. Run the app

```bash
npm install
npx expo start
```

Scan the QR with Expo Go, or press `a`/`i` for a simulator.

## 8. Pilot flow to test end-to-end

1. Owner creates a café brand via **Manage Cafés**.
2. Bootstrap its first branch + invite code via SQL (step 6a) — or once any staff exists, they can add more branches themselves from **Café → Branches**.
3. A staff test account signs up, joins that branch via the invite code, taps through its legal gate.
4. Staff sets up the brand: **Café → Pass tiers** (add at least one bundle), **Café → Photos** (optional cover/menu photos).
5. A customer test account signs up, taps through its legal gate, goes to **Explore**, taps the café card → **View Passes** (or opens the café's detail page first to see photos/branches), picks a tier, submits a payment reference.
6. Staff sees the pass under **Pending**, taps **Confirm**.
7. Customer's **My Passes** tab shows the new pass; tapping it opens the QR code (updates live once confirmed).
8. Staff taps **Scan**, scans the customer's QR — balance decrements, both sides update.
9. Staff's **Today** tab shows the redemption; **Café → Metrics** and **Café → Pass history** reflect it too.
10. Owner's **Manage Cafés** → that brand → Metrics/Pass History show the same activity; the all-brands view aggregates across every café.

## Project structure

```
src/
  components/ui.tsx         Shared themed UI primitives (includes BackLink)
  components/TabIcon.tsx    Custom icon set for the bottom tab bars
  components/TabBarButton.tsx  Shared icon+label tab button (all 3 role shells)
  components/AppHeader.tsx  Logo + role-aware greeting, sits above tab content
  components/Logo.tsx       The XtraCup mark (SVG, scalable)
  hooks/useAuth.tsx         Clerk session -> profile context + Clerk-bound Supabase client
  lib/supabase.ts           Supabase client factory (accessToken from Clerk, anon key only) + invokeFunction helper
  lib/photoUpload.ts        Picks an image and uploads it to the cafe-photos Storage bucket
  navigation/                Role-gated tab shells (customer / staff / owner)
  screens/AuthScreen.tsx     Clerk sign-in/sign-up (email code only)
  screens/CompleteProfileScreen.tsx   Name entry for new customers, or hand-off to JoinStaffScreen
  screens/JoinStaffScreen.tsx          Invite-code entry, calls the join-staff Edge Function
  screens/AcceptLegalScreen.tsx         One-time legal acceptance gate (all roles)
  screens/LegalDocsScreen.tsx           Reusable ToS/Refund/Privacy viewer (gate + Profile both use it)
  screens/ProfileScreen.tsx             Account info, join-staff link (customers only), Legal, sign out
  screens/customer/          Explore (brand cards), CafeDetail (photos/branches/tiers), MyPasses, PassDetail (QR), PassTierModal (purchase)
  screens/staff/              Scan, Pending payments, Today's redemptions, Café hub → Pass tiers / Photos / Branches / Metrics / History
  screens/owner/               Manage Cafés (create/delete brand, branch+staff drill-down), Metrics, Pass history — shared with staff
  content/legal.ts            Mock ToS/Refund/Privacy text — not reviewed by counsel
  theme/theme.ts             Brand colors, fonts (Sora + Plus Jakarta Sans), spacing (playbook Section 10)
  types/database.ts          Row types for Supabase tables (Cafe, Branch, PassTier, MenuPhoto, ...)

supabase/
  migrations/
    0001_init.sql             Schema + RLS policies + seed café
    0002_clerk_auth.sql        Switches users.id to Clerk id, RLS to auth.jwt()->>'sub'
    0003_staff_invite.sql      Adds cafes.invite_code (later moved to branches), locks users RLS
    0004_owner_role.sql        Adds 'owner' role (superseded by 0006 — keep, don't skip)
    0005_legal_acceptance.sql  Adds users.legal_accepted_at
    0006_platform_owner.sql    Redefines owner as platform operator (superseded further by 0007 — keep)
    0007_brand_branch_split.sql  Splits cafes into brand + branches; adds pass_tiers, menu_photos; repoints users.branch_id / passes.pass_tier_id / redemptions.branch_id
    0008_photo_storage.sql    Public cafe-photos Storage bucket + RLS (staff write their own brand, owner write any)
  functions/
    _shared/client.ts          adminClient (service role), userClient, callerUserId (verifies Clerk JWT via JWKS)
    issue-redeem-token/       Signs short-lived QR token (customer-invoked)
    redeem/                    Verifies token, decrements balance, records branch_id (staff-invoked)
    confirm-payment/           Activates a pending pass (staff-invoked)
    join-staff/                 Validates a branch's invite code, grants staff role + branch_id (service role only)
    owner-metrics/               Aggregates redemption rate, revenue, new-vs-repeat customers, priced from pass_tiers (owner: any/all brands; staff: own brand only)
```

## Out of scope for this pilot

No live JazzCash/Easypaisa merchant API (manual payment confirmation instead — see `confirm-payment`), no analytics dashboard beyond the in-app Metrics/Pass History views, no cross-brand pooled balance (a pass belongs to exactly one brand, spendable at any of its branches, but not shared across different brands).
