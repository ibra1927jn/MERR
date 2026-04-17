-- =============================================================================
-- SIM 02_wage_rates.sql — Wage rate setup
--
-- SCHEMA DRIFT NOTICE (BUG 1.2.8):
-- wage_rates table does NOT have an effective_date column.
-- Cannot model wage rate change mid-period at the row level.
-- The constraint wage_above_nz_minimum CHECK (hourly_rate >= 23.95) means
-- we CANNOT insert 23.50 as a historical rate — it would violate the CHECK.
-- We use harvest_settings.min_wage_rate to store the current rate instead.
-- The service layer reads this for wage calculations — confirmed in:
--   src/services/payroll.service.ts and src/services/harvestMetrics/perPicker.ts
-- =============================================================================

-- Insert wage rate for picker (only the post-April-1 rate is storable due to CHECK >= 23.95)
INSERT INTO public.wage_rates (orchard_id, job_type, hourly_rate, notes)
VALUES (
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'picker',
  23.95,
  'NZ Minimum Wage 2026-2027 (effective 2026-04-01)'
)
ON CONFLICT DO NOTHING;

-- DOCUMENTED SCHEMA DRIFT:
-- 1. wage_rates has no effective_date column → cannot model the $23.50→$23.95 transition
-- 2. The CHECK constraint (hourly_rate >= 23.95) BLOCKS inserting the pre-April rate ($23.50)
--    that would have been valid during days 1-6 of the simulation (01-06 Apr 2026)
-- 3. Any payroll calculation for days 1-6 at $23.50 requires workaround via
--    harvest_settings.min_wage_rate which is a single scalar — not date-indexed
-- 4. There is no way to correctly reconstruct historical payroll for this period from DB alone
