-- Migration: Enforce NZ minimum wage floor on harvest_settings.min_wage_rate
-- Effective: 2026-04-12
-- Reason: calculate-payroll Edge Function reads min_wage_rate from harvest_settings.
--         All 10 orchard settings were provisioned with the 2025 default ($23.50).
--         The 2026-04-01 migration updated wage_rates (empty table) but not harvest_settings.

-- 1. Bump all harvest_settings with stale minimum to the 2026 floor ($23.95)
UPDATE public.harvest_settings
SET
    min_wage_rate = 23.95,
    updated_at    = NOW()
WHERE min_wage_rate < 23.95;

-- 2. Add a CHECK constraint so future inserts/updates cannot go below the 2026 floor
ALTER TABLE public.harvest_settings
    DROP CONSTRAINT IF EXISTS harvest_settings_min_wage_floor;

ALTER TABLE public.harvest_settings
    ADD CONSTRAINT harvest_settings_min_wage_floor
    CHECK (min_wage_rate >= 23.95);

COMMENT ON COLUMN public.harvest_settings.min_wage_rate IS
    'Effective minimum wage for this orchard. Must be >= NZ Minimum Wage Order 2026 ($23.95/hr as of 2026-04-01).';
