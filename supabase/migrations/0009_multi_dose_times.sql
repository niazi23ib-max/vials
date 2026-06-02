-- Multiple doses per day.
--   substances.times : list of HH:MM dose times for a due day (backfilled from `time`).
--   dose_logs.slot   : which dose-of-the-day a log is for. '' = single-dose substance
--                      (preserves every existing log); the HH:MM time on multi-dose days.

alter table public.substances add column if not exists times text[] not null default '{}';
update public.substances
  set times = array[time]
  where array_length(times, 1) is null and time is not null and time <> '';

alter table public.dose_logs add column if not exists slot text not null default '';

-- Widen log uniqueness from (substance, date) to (substance, date, slot). Existing rows
-- have slot = '' and remain unique per (substance, date), so nothing is lost.
alter table public.dose_logs drop constraint if exists dose_logs_substance_id_scheduled_date_key;
drop index if exists public.dose_logs_substance_id_scheduled_date_key;
create unique index if not exists dose_logs_substance_date_slot_key
  on public.dose_logs (substance_id, scheduled_date, slot);
