-- Web-push: per-device subscriptions (RLS, owner-scoped) + a reminder dedupe log
-- written only by the service-role cron sender.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own subs select" on public.push_subscriptions;
drop policy if exists "own subs insert" on public.push_subscriptions;
drop policy if exists "own subs update" on public.push_subscriptions;
drop policy if exists "own subs delete" on public.push_subscriptions;

create policy "own subs select" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "own subs insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "own subs update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subs delete" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- One reminder per dose per day. Written by the cron sender (service role); RLS on
-- with no policies = no client access.
create table if not exists public.reminder_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  substance_id uuid not null references public.substances(id) on delete cascade,
  scheduled_date date not null,
  created_at timestamptz not null default now(),
  primary key (substance_id, scheduled_date)
);

alter table public.reminder_log enable row level security;
