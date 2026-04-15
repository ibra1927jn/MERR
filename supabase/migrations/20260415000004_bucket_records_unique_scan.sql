-- fix(db): add unique constraint (picker_id, scanned_at) to bucket_records
-- Previene duplicados de escaneo en la simulacion y en produccion.
-- Los duplicados existentes deben eliminarse antes de aplicar esta migracion.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints
    WHERE  table_name      = 'bucket_records'
      AND  constraint_name = 'bucket_records_picker_scan_unique'
      AND  constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE public.bucket_records
      ADD CONSTRAINT bucket_records_picker_scan_unique
      UNIQUE (picker_id, scanned_at);
  END IF;
END $$;
