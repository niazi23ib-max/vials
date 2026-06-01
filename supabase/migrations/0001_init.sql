-- Peptide Tracker — initial schema
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- Every table is owner-scoped via Row Level Security so each user only ever
-- sees their own data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Inventory: physical vials you own
-- ---------------------------------------------------------------------------
create table if not exists public.vials (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  peptide_name     text not null,
  vial_mass_mg     numeric not null check (vial_mass_mg > 0),
  bac_water_ml     numeric check (bac_water_ml > 0),
  reconstituted_at date,
  expires_at       date,
  status           text not null default 'sealed'
                     check (status in ('sealed', 'active', 'finished', 'expired')),
  quantity         integer not null default 1 check (quantity >= 0),
  notes            text,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Protocols: how/when a peptide is dosed
-- ---------------------------------------------------------------------------
create table if not exists public.schedules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  peptide_name    text not null,
  dose_mcg        numeric not null check (dose_mcg > 0),
  frequency_type  text not null
                    check (frequency_type in ('daily', 'days_of_week', 'every_n_days', 'cycle')),
  days_of_week    integer[],
  every_n_days    integer,
  cycle_days_on   integer,
  cycle_days_off  integer,
  time_of_day     text,
  start_date      date not null,
  end_date        date,
  vial_id         uuid references public.vials (id) on delete set null,
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dose log: what was actually taken / skipped
-- ---------------------------------------------------------------------------
create table if not exists public.dose_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  schedule_id    uuid references public.schedules (id) on delete set null,
  peptide_name   text not null,
  dose_mcg       numeric not null,
  scheduled_date date not null,
  status         text not null default 'taken' check (status in ('taken', 'skipped')),
  taken_at       timestamptz,
  vial_id        uuid references public.vials (id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  -- one log per (schedule, day) so marking taken is idempotent (upsertable)
  unique (schedule_id, scheduled_date)
);

create index if not exists vials_user_idx     on public.vials (user_id);
create index if not exists schedules_user_idx on public.schedules (user_id);
create index if not exists dose_logs_user_idx on public.dose_logs (user_id);
create index if not exists dose_logs_date_idx on public.dose_logs (user_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only access
-- ---------------------------------------------------------------------------
alter table public.vials     enable row level security;
alter table public.schedules enable row level security;
alter table public.dose_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['vials', 'schedules', 'dose_logs'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s;', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s;', t);
    execute format('drop policy if exists %1$s_update on public.%1$s;', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s;', t);

    execute format(
      'create policy %1$s_select on public.%1$s for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy %1$s_update on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
