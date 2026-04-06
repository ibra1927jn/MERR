-- =============================================
-- TIMESTAMPTZ AUDIT MIGRATION
-- Ensures all timestamp columns storing NZ-relevant times use TIMESTAMPTZ
-- =============================================

-- Safe: only alter if not already timestamptz
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucket_records' AND column_name = 'scanned_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE bucket_records ALTER COLUMN scanned_at TYPE TIMESTAMPTZ USING scanned_at AT TIME ZONE 'Pacific/Auckland';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_attendance' AND column_name = 'check_in_time'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE daily_attendance ALTER COLUMN check_in_time TYPE TIMESTAMPTZ USING check_in_time AT TIME ZONE 'Pacific/Auckland';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_attendance' AND column_name = 'check_out_time'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE daily_attendance ALTER COLUMN check_out_time TYPE TIMESTAMPTZ USING check_out_time AT TIME ZONE 'Pacific/Auckland';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_closures' AND column_name = 'closed_at'
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE day_closures ALTER COLUMN closed_at TYPE TIMESTAMPTZ USING closed_at AT TIME ZONE 'Pacific/Auckland';
  END IF;
END $$;

-- COMMENT: If columns were already TIMESTAMPTZ, these are safe no-ops.
