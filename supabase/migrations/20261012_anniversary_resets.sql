-- Annual credits that reset on the card's anniversary instead of Dec 31.
-- Run once in the Supabase SQL editor (Project > SQL > New query).
-- Safe to re-run. Existing rows keep calendar-year resets.

-- When the card account was opened. Only the month and day are used.
alter table public.cards
  add column if not exists opened_on date;

-- How an annual credit resets: 'calendar' (Dec 31) or 'anniversary'.
alter table public.perks
  add column if not exists resets_on text not null default 'calendar';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'perks_resets_on_check'
  ) then
    alter table public.perks
      add constraint perks_resets_on_check check (resets_on in ('calendar', 'anniversary'));
  end if;
end $$;
