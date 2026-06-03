-- Let signed-in users read + snooze their own reminder rows from the app /
-- the /api/dose-action endpoint (the "Snooze" notification action upserts
-- next_at). The cron keeps using the service-role key, which bypasses RLS, so
-- its behavior is unchanged.
drop policy if exists reminder_log_select on public.reminder_log;
drop policy if exists reminder_log_insert on public.reminder_log;
drop policy if exists reminder_log_update on public.reminder_log;

create policy reminder_log_select on public.reminder_log
  for select using (auth.uid() = user_id);
create policy reminder_log_insert on public.reminder_log
  for insert with check (auth.uid() = user_id);
create policy reminder_log_update on public.reminder_log
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
