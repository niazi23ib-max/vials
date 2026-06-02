-- Vial — initial schema (applied to the Supabase project).
-- Each table is owner-scoped via Row Level Security so a user only ever
-- sees their own data.

create extension if not exists "pgcrypto";

-- Substances = a user's vials (inventory + embedded schedule + dosing)
create table public.substances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  category        text not null default 'Peptide',
  sub             text,
  route           text not null default 'Subcutaneous',
  hue             integer not null default 200,
  vial_mg         numeric not null check (vial_mg > 0),
  bac_ml          numeric not null check (bac_ml > 0),
  dose_mcg        numeric not null check (dose_mcg > 0),
  unit            text not null default 'mcg' check (unit in ('mcg', 'mg')),
  every           text not null default 'day',
  days            text[] not null default '{}',
  time            text,
  period          text,
  remaining       numeric not null default 0,
  expiry          date,
  price_per_vial  numeric not null default 0,
  lot             text,
  titration       jsonb,
  created_at      timestamptz not null default now()
);

-- Dose logs = what was taken / skipped, per substance per day
create table public.dose_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  substance_id    uuid not null references public.substances (id) on delete cascade,
  scheduled_date  date not null,
  status          text not null default 'taken' check (status in ('taken', 'skipped')),
  taken_at        timestamptz,
  created_at      timestamptz not null default now(),
  unique (substance_id, scheduled_date)
);

create index substances_user_idx     on public.substances (user_id);
create index dose_logs_user_idx       on public.dose_logs (user_id);
create index dose_logs_user_date_idx  on public.dose_logs (user_id, scheduled_date);

-- Row Level Security: each user only ever touches their own rows
alter table public.substances enable row level security;
alter table public.dose_logs  enable row level security;

create policy "substances_select" on public.substances for select using (auth.uid() = user_id);
create policy "substances_insert" on public.substances for insert with check (auth.uid() = user_id);
create policy "substances_update" on public.substances for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "substances_delete" on public.substances for delete using (auth.uid() = user_id);

create policy "dose_logs_select" on public.dose_logs for select using (auth.uid() = user_id);
create policy "dose_logs_insert" on public.dose_logs for insert with check (auth.uid() = user_id);
create policy "dose_logs_update" on public.dose_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dose_logs_delete" on public.dose_logs for delete using (auth.uid() = user_id);
