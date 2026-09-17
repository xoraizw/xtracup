-- Brand-level opening hours, shown as basic info on the customer-facing
-- café page. Free text (e.g. "Daily 8am – 11pm") rather than a structured
-- per-day schedule — the pilot has one set of hours per brand, and
-- structured hours would need staff/owner UI to maintain, which is
-- currently hidden (see src/config/features.ts). Address is deliberately
-- NOT duplicated here — it already lives per-branch on `branches.address`
-- (a brand can have several locations), and the café page surfaces the
-- primary branch's address instead of adding a conflicting brand-level one.
alter table cafes add column if not exists hours_text text;
