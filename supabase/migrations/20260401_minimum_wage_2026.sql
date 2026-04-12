-- Migration: Update NZ minimum wage to $23.95/hr (Minimum Wage Order 2026)
-- Effective: 1 April 2026
-- Ref: https://www.employment.govt.nz/hours-and-wages/pay/minimum-wage/minimum-wage-rates

-- 1. Update the check constraint from $23.15 to $23.95
ALTER TABLE public.wage_rates
  DROP CONSTRAINT IF EXISTS wage_above_nz_minimum;

ALTER TABLE public.wage_rates
  ADD CONSTRAINT wage_above_nz_minimum CHECK (hourly_rate >= 23.95);

-- 2. Update orchards where picker rate is still at the 2025 legal minimum ($23.15)
--    Only bumps to the new minimum — does not override custom rates above $23.95
UPDATE public.wage_rates
SET
  hourly_rate    = 23.95,
  notes          = 'Auto-updated to NZ Minimum Wage 2026-2027 ($23.95/hr)',
  updated_at     = NOW()
WHERE job_type   = 'picker'
  AND hourly_rate = 23.15;

-- 3. Update starting-out wage default if used (80% of $23.95 = $19.16)
--    Starting-out roles are not currently tracked separately in this table,
--    but this comment records the new rate for reference.
--    Starting-out/training wage from 1 April 2026: $19.16/hr

COMMENT ON TABLE public.wage_rates IS
  'Per-job-type hourly rates, configurable by Admin/HR. Enforces NZ minimum wage floor ($23.95/hr as of 2026-04-01). Replaces hardcoded MINIMUM_WAGE constant.';
