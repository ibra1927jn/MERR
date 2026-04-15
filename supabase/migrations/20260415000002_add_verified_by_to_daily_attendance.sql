-- fix(db): agregar verified_by y verified_at a daily_attendance
-- Ambas nullable — solo se rellenan cuando un manager verifica la asistencia manualmente.
ALTER TABLE public.daily_attendance
  ADD COLUMN IF NOT EXISTS verified_by  uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at  timestamptz;

COMMENT ON COLUMN public.daily_attendance.verified_by IS 'UUID del manager que verifico el registro (nullable)';
COMMENT ON COLUMN public.daily_attendance.verified_at  IS 'Timestamp de verificacion por manager (nullable)';
