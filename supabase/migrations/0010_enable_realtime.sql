-- Realtime (postgres_changes) only streams events for tables explicitly
-- added to the supabase_realtime publication — this was never done for
-- `passes`, so PassDetailScreen's live balance updates and
-- RedemptionCelebration's global popup have been silently inert this whole
-- time despite correct subscription code (the .channel()/.on() calls
-- succeed and never error; they just never receive anything).
alter publication supabase_realtime add table passes;
