-- =============================================
-- Añadir crop_type y deleted_at a orchards
-- BUG: useSettings.ts consultaba estas columnas que no existían → 400
-- =============================================

ALTER TABLE public.orchards
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índice parcial para soft deletes (igual que en harvest_seasons)
CREATE INDEX IF NOT EXISTS idx_orchards_active
  ON public.orchards (name)
  WHERE deleted_at IS NULL;

SELECT 'orchards crop_type + deleted_at added' AS result;
