-- Migration: wage_rates table for per-job-type configurable hourly rates
-- Replaces hardcoded MINIMUM_WAGE constant across the codebase
-- Editable from Admin → Settings → Wage Rates and HR → Wage Rates panels

CREATE TABLE IF NOT EXISTS public.wage_rates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchard_id       UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
  job_type         TEXT NOT NULL,  -- picker | team_leader | runner | qc_inspector | logistics | hr_admin | manager | admin

  -- Operational rate (must be >= NZ legal minimum)
  hourly_rate      NUMERIC(8, 2) NOT NULL,

  -- Piece rate config (for eligible roles)
  is_piece_rate_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  piece_rate_per_bin     NUMERIC(8, 2) NOT NULL DEFAULT 6.50,

  -- Effective dating: supports future-dated rate changes
  effective_from   DATE NOT NULL DEFAULT CURRENT_DATE,

  notes            TEXT,
  updated_by       UUID REFERENCES auth.users(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One rate per job type per orchard (upsert target)
  UNIQUE (orchard_id, job_type),

  -- NZ legal minimum wage floor constraint (2024: $23.15/hr)
  CONSTRAINT wage_above_nz_minimum CHECK (hourly_rate >= 23.15)
);

-- Row Level Security
ALTER TABLE public.wage_rates ENABLE ROW LEVEL SECURITY;

-- Managers and admins can read their orchard's rates
CREATE POLICY "wage_rates_read" ON public.wage_rates
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE orchard_id = wage_rates.orchard_id
        AND role IN ('manager', 'admin', 'hr_admin', 'payroll_admin')
        AND is_active = TRUE
    )
  );

-- Only admin and hr_admin can modify rates
CREATE POLICY "wage_rates_write" ON public.wage_rates
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE orchard_id = wage_rates.orchard_id
        AND role IN ('admin', 'hr_admin')
        AND is_active = TRUE
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE orchard_id = wage_rates.orchard_id
        AND role IN ('admin', 'hr_admin')
        AND is_active = TRUE
    )
  );

-- Seed default rates for existing orchards (uses NZ 2024 minimums)
INSERT INTO public.wage_rates (orchard_id, job_type, hourly_rate, is_piece_rate_eligible, piece_rate_per_bin, notes)
SELECT
  o.id,
  job.job_type,
  job.hourly_rate,
  job.is_piece_rate,
  job.piece_rate,
  'Default — update via Admin → Settings → Wage Rates'
FROM public.orchards o
CROSS JOIN (VALUES
  ('picker',       23.15, TRUE,  6.50),
  ('team_leader',  26.00, TRUE,  6.50),
  ('runner',       24.00, FALSE, 0.00),
  ('qc_inspector', 27.50, FALSE, 0.00),
  ('logistics',    25.00, FALSE, 0.00),
  ('hr_admin',     32.00, FALSE, 0.00),
  ('manager',      45.00, FALSE, 0.00),
  ('admin',        35.00, FALSE, 0.00)
) AS job(job_type, hourly_rate, is_piece_rate, piece_rate)
ON CONFLICT (orchard_id, job_type) DO NOTHING;

-- Audit trigger
CREATE OR REPLACE FUNCTION public.wage_rates_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name, record_id, action, changed_by,
    old_values, new_values, created_at
  ) VALUES (
    'wage_rates',
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER wage_rates_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.wage_rates
  FOR EACH ROW EXECUTE FUNCTION public.wage_rates_audit();

COMMENT ON TABLE public.wage_rates IS
  'Per-job-type hourly rates, configurable by Admin/HR. Enforces NZ minimum wage floor. Replaces hardcoded MINIMUM_WAGE constant.';
