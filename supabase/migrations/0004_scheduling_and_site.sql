-- Flexible schedules (interval / cycle) + optional course window, and
-- injection-site logging. (Applied to production via the dashboard; this
-- reproduces it for fresh environments.)

alter table public.substances
  add column if not exists schedule_kind text not null default 'weekly',
  add column if not exists interval_days int,
  add column if not exists cycle_on int,
  add column if not exists cycle_off int,
  add column if not exists anchor_date date,
  add column if not exists course_start date,
  add column if not exists course_weeks int;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'substances_schedule_kind_check') then
    alter table public.substances
      add constraint substances_schedule_kind_check check (schedule_kind in ('weekly', 'interval', 'cycle'));
  end if;
end $$;

-- Which body site a dose was administered at (rotation tracking).
alter table public.dose_logs add column if not exists site text;
