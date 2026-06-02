-- Whether a logged dose decremented current inventory. Lets backfilled doses
-- optionally NOT pull from the current vial, and makes un-marking restore
-- inventory only when the dose actually consumed it. Existing logs all
-- consumed (the prior always-subtract behavior), hence default true.
alter table public.dose_logs add column if not exists consumed boolean not null default true;
