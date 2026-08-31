-- Tracks one-time acceptance of the (currently mock) Terms of Service,
-- Refund Policy, and Privacy Policy. A single timestamp is enough for now —
-- all three documents are accepted together as one bundle. If they ever need
-- independent versioning/acceptance, split this into a separate table keyed
-- on document + version.

alter table users add column if not exists legal_accepted_at timestamptz;

-- Users can already update their own profile (0003_staff_invite.sql), and
-- that policy's WITH CHECK only blocks changes to role/cafe_id — accepting
-- legal terms is an ordinary profile field update, no new policy needed.
