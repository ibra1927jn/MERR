-- Migration: Fix settings and row_assignments drift
-- Fecha: 2026-04-14
-- Motivo: El esquema actual no cuadra con lo que la app escribe y lee.
--   1) row_assignments no tenia orchard_id pero repo y storeSync lo usan para filtrar por huerto.
--   2) harvest_settings DEFAULT min_wage_rate=23.50 viola su propio CHECK>=23.95.
--   3) harvest_settings no tenia variety/shift_start_time/shift_end_time/mfa_device_trust_ttl_hours
--      que la UI manda en cada save -> upsert fallaba con 42703 en prod.
--   4) daily_attendance tenia 25 filas huerfanas sin season_id (seed del 2026-02-27).

BEGIN;

-- Desactivar triggers (incl. bump_version_and_update_time en daily_attendance)
-- para que los backfills no disparen optimistic lock.
-- SET LOCAL solo aplica a esta transaccion.
SET LOCAL session_replication_role = replica;

-- ============================================
-- 1. row_assignments: anadir orchard_id + backfill desde season
-- ============================================
ALTER TABLE public.row_assignments
  ADD COLUMN IF NOT EXISTS orchard_id uuid;

-- Backfill del unico row existente (y cualquiera futuro) via season_id -> harvest_seasons
UPDATE public.row_assignments ra
SET orchard_id = hs.orchard_id
FROM public.harvest_seasons hs
WHERE ra.season_id = hs.id
  AND ra.orchard_id IS NULL;

-- FK hacia orchards
ALTER TABLE public.row_assignments
  DROP CONSTRAINT IF EXISTS row_assignments_orchard_id_fkey;
ALTER TABLE public.row_assignments
  ADD CONSTRAINT row_assignments_orchard_id_fkey
  FOREIGN KEY (orchard_id) REFERENCES public.orchards(id);

-- Index para el patron de lectura de storeSync (filtrar por orchard + status activo)
CREATE INDEX IF NOT EXISTS idx_row_assignments_orchard_active
  ON public.row_assignments (orchard_id, status)
  WHERE deleted_at IS NULL;

-- ============================================
-- 2. harvest_settings: corregir DEFAULT para que no viole el CHECK
-- ============================================
ALTER TABLE public.harvest_settings
  ALTER COLUMN min_wage_rate SET DEFAULT 23.95;

-- ============================================
-- 3. harvest_settings: anadir columnas que la UI ya envia
-- ============================================
ALTER TABLE public.harvest_settings
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS shift_start_time text DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS shift_end_time text DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS mfa_device_trust_ttl_hours integer DEFAULT 72;

-- ============================================
-- 4. daily_attendance: backfill 25 filas huerfanas con season activa de su huerto
-- ============================================
UPDATE public.daily_attendance da
SET season_id = sub.season_id
FROM (
  SELECT DISTINCT ON (orchard_id) id AS season_id, orchard_id
  FROM public.harvest_seasons
  WHERE status = 'active' AND deleted_at IS NULL
  ORDER BY orchard_id, start_date DESC
) sub
WHERE da.orchard_id = sub.orchard_id
  AND da.season_id IS NULL;

SET LOCAL session_replication_role = DEFAULT;

COMMIT;

-- ============================================
-- Verificaciones post-migration (ejecutar manualmente si se quiere):
-- ============================================
-- SELECT count(*) FROM public.row_assignments WHERE orchard_id IS NULL;
--   -> esperado: 0
-- SELECT count(*) FROM public.daily_attendance WHERE season_id IS NULL;
--   -> esperado: 0 (o igual a los que no tengan harvest_season activa para su orchard)
-- SELECT column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='harvest_settings' AND column_name='min_wage_rate';
--   -> esperado: 23.95
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='harvest_settings'
--   ORDER BY ordinal_position;
--   -> esperado: incluye variety, shift_start_time, shift_end_time, mfa_device_trust_ttl_hours
