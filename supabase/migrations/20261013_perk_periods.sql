-- History of each credit period: how much of a credit was used before it
-- reset. Lets Clavis show credits captured (and lost) over a whole year
-- instead of only the current month.
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.perk_periods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  perk_id      text not null,
  card_id      text not null,
  perk_name    text,
  period_end   date not null,
  total_amount numeric not null,
  used_amount  numeric not null,
  created_at   timestamptz not null default now()
);

create index if not exists perk_periods_user_end on public.perk_periods (user_id, period_end);

alter table public.perk_periods enable row level security;

drop policy if exists "perk_periods own rows" on public.perk_periods;
create policy "perk_periods own rows" on public.perk_periods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
