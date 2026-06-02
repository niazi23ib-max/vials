-- Form-aware substances: oral (capsule count + per-dose) and "dose" forms
-- (intranasal/sublingual/topical) alongside injectables. vial_mg/bac_ml become
-- optional; add count + caps_per_dose; allow IU as a unit.
-- (Applied to production earlier via the dashboard; this reproduces it for fresh envs.)

alter table public.substances add column if not exists count numeric;
alter table public.substances add column if not exists caps_per_dose numeric;

alter table public.substances alter column vial_mg drop not null;
alter table public.substances alter column bac_ml drop not null;

-- Replace any existing unit CHECK so 'IU' is permitted in addition to mg/mcg.
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.substances'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%unit%'
  limit 1;
  if c is not null then execute format('alter table public.substances drop constraint %I', c); end if;
end $$;

alter table public.substances
  add constraint substances_unit_check check (unit in ('mg', 'mcg', 'IU'));
