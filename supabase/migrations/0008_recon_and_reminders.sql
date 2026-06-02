-- Reconstitution shelf-life tracking + a per-substance reminder toggle.
--   reconstituted_at : the date an injectable vial was mixed (beyond-use date is
--                      derived as reconstituted_at + bud_days).
--   bud_days         : how many days the mixed vial stays good (refrigerated).
--                      Null → the app's default (28). Only meaningful once mixed.
--   reminders_enabled: whether the dose-reminder cron pings for this substance.
--                      Default true so existing items keep their current behavior.

alter table public.substances
  add column if not exists reconstituted_at date,
  add column if not exists bud_days int,
  add column if not exists reminders_enabled boolean not null default true;
