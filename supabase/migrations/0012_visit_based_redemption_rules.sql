-- Replaces the flat "minimum minutes between any two redemptions" rule
-- (0011's min_redemption_gap_minutes) with a visit-based model:
--   - visit_window_minutes: redemptions on the same pass within this many
--     minutes of the visit's FIRST redemption count as the same visit
--     (e.g. a group ordering multiple cups together).
--   - max_cups_per_visit: how many cups can be redeemed within one visit.
--   - cooldown_hours: how long after a visit's first redemption before a
--     NEW visit is allowed to start. 0 on either column disables that half
--     of the rule (e.g. cooldown_hours = 0 with visit_window_minutes/
--     max_cups_per_visit set still caps cups-per-visit with no cooldown).
alter table pass_tiers drop column if exists min_redemption_gap_minutes;
alter table pass_tiers add column if not exists visit_window_minutes integer not null default 5 check (visit_window_minutes >= 0);
alter table pass_tiers add column if not exists max_cups_per_visit integer not null default 1 check (max_cups_per_visit > 0);
alter table pass_tiers add column if not exists cooldown_hours integer not null default 0 check (cooldown_hours >= 0);
