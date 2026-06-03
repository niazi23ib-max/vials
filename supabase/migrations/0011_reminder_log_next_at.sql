-- Smarter reminders: when set, the cron sends one follow-up/snooze ping for this
-- dose at next_at (if it's still unlogged), then clears it back to null.
alter table public.reminder_log add column if not exists next_at timestamptz;
