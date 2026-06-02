-- Multivitamins have no single per-capsule strength, so dose_mcg = 0 is valid.
-- Relax the original CHECK (dose_mcg > 0) to allow 0.
alter table public.substances drop constraint if exists substances_dose_mcg_check;
alter table public.substances add constraint substances_dose_mcg_check check (dose_mcg >= 0);
