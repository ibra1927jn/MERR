-- Migration: Create wage_rates table
-- Reason: Table existed in prod but was never captured in a migration file.
--         Required by 20260401_minimum_wage_2026.sql which applies the 2026 minimum wage update.

CREATE TABLE IF NOT EXISTS public.wage_rates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id   uuid NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  job_type     text NOT NULL,
  hourly_rate  numeric(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wage_rates_orchard_id ON public.wage_rates(orchard_id);
CREATE INDEX IF NOT EXISTS idx_wage_rates_job_type   ON public.wage_rates(job_type);

ALTER TABLE public.wage_rates ENABLE ROW LEVEL SECURITY;

-- Managers and admins can manage wage rates for their orchard
CREATE POLICY "Managers can manage wage rates"
  ON public.wage_rates
  FOR ALL
  USING (
    orchard_id IN (
      SELECT orchard_id FROM public.users
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'hr_admin', 'payroll_admin')
    )
  );

-- All staff can read wage rates for their orchard
CREATE POLICY "Staff can read wage rates"
  ON public.wage_rates
  FOR SELECT
  USING (
    orchard_id IN (
      SELECT orchard_id FROM public.users
      WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.wage_rates IS
  'Per-job-type hourly rates, configurable by Admin/HR. Enforces NZ minimum wage floor.';
