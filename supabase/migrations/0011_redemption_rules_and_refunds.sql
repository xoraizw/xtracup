-- Two additions:
--   1. Per-tier redemption rules: how long a pass stays valid after
--      activation (replaces confirm-payment's hardcoded 30-day expiry), and
--      a minimum gap between redemptions on the same pass (0 = unrestricted).
--   2. Refund tracking on redemptions, so staff can undo a mis-scan from the
--      new all-time order history screen — restores the cup to the pass
--      rather than just flagging the row (see refund-redemption function).

alter table pass_tiers add column if not exists validity_days integer not null default 30 check (validity_days > 0);
alter table pass_tiers add column if not exists min_redemption_gap_minutes integer not null default 0 check (min_redemption_gap_minutes >= 0);

alter table redemptions add column if not exists refunded_at timestamptz;
alter table redemptions add column if not exists refunded_by text references users(id);
