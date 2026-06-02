-- Per-dose reminder dedup so a multi-dose substance can be reminded once per time
-- (e.g. morning AND evening). slot = '' for single-dose; the HH:MM time otherwise.
alter table public.reminder_log add column if not exists slot text not null default '';
alter table public.reminder_log drop constraint if exists reminder_log_pkey;
alter table public.reminder_log add constraint reminder_log_pkey primary key (substance_id, scheduled_date, slot);
