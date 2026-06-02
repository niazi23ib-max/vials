-- Body metrics = a user's progress measurements over time (weight, waist,
-- body-fat %, free-text note). One row per user per day; logging the same day
-- again upserts. Owner-scoped via RLS like every other table.

create table if not exists public.body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        date not null,
  weight      numeric,
  waist       numeric,
  body_fat    numeric,
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date);

alter table public.body_metrics enable row level security;

drop policy if exists "body_metrics_select" on public.body_metrics;
drop policy if exists "body_metrics_insert" on public.body_metrics;
drop policy if exists "body_metrics_update" on public.body_metrics;
drop policy if exists "body_metrics_delete" on public.body_metrics;

create policy "body_metrics_select" on public.body_metrics for select using (auth.uid() = user_id);
create policy "body_metrics_insert" on public.body_metrics for insert with check (auth.uid() = user_id);
create policy "body_metrics_update" on public.body_metrics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "body_metrics_delete" on public.body_metrics for delete using (auth.uid() = user_id);
