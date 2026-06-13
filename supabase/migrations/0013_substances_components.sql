-- Blends: the actives + their mg in a vial, e.g.
--   [{"name":"BPC-157","mg":5},{"name":"TB-500","mg":5}]
-- Null for single-active substances. vialMg stays the source of truth for the
-- reconstitution/draw math and equals the sum of the components.
alter table public.substances add column if not exists components jsonb;
