-- fix(db): allow historic wage rates and add effective_date column to wage_rates
-- El CHECK wage_above_nz_minimum bloqueaba tasas historicas < $23.95.
-- Se reemplaza por un floor absoluto ($0.01) para permitir datos historicos.
-- effective_date permite lookup de tasa vigente en una fecha concreta.

-- 1. Eliminar CHECK restrictivo
ALTER TABLE public.wage_rates
  DROP CONSTRAINT IF EXISTS wage_above_nz_minimum;

-- 2. Agregar effective_date si no existe
ALTER TABLE public.wage_rates
  ADD COLUMN IF NOT EXISTS effective_date date NOT NULL DEFAULT '2026-04-01';

-- 3. CHECK minimo absoluto: previene valores absurdos (< $0.01)
ALTER TABLE public.wage_rates
  ADD CONSTRAINT wage_rate_positive CHECK (hourly_rate > 0);

-- 4. Indice para lookup eficiente de tasa vigente en fecha
CREATE INDEX IF NOT EXISTS idx_wage_rates_effective
  ON public.wage_rates(orchard_id, job_type, effective_date DESC);

COMMENT ON COLUMN public.wage_rates.effective_date IS
  'Fecha desde la que rige esta tasa. Para obtener la tasa vigente, tomar la fila con effective_date <= target_date ORDER BY effective_date DESC LIMIT 1.';
