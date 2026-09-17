-- Age is now collected at sign-up (see AuthScreen) alongside name/email/
-- password, instead of being asked for at all.
alter table users add column if not exists age integer;
