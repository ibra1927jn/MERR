-- =============================================
-- IDEMPOTENCY: Unique constraint on bucket_records.id
-- Prevents duplicate bucket inserts from network retries
-- =============================================

-- If bucket_records.id doesn't have a unique constraint, add one.
-- This ensures that if HarvestSyncBridge retries a batch (due to Wi-Fi
-- flicker), the duplicate UUIDs are rejected by the DB automatically.

-- Safe: if the constraint already exists (common on 'id' as PK), this is a no-op error.
DO $$
BEGIN
    -- Check if 'id' is already a primary key or has a unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bucket_records'::regclass
        AND contype IN ('p', 'u')  -- primary key or unique
        AND array_length(conkey, 1) = 1
        AND conkey[1] = (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'bucket_records'::regclass AND attname = 'id'
        )
    ) THEN
        ALTER TABLE bucket_records ADD CONSTRAINT bucket_records_id_unique UNIQUE (id);
        RAISE NOTICE 'Added UNIQUE constraint on bucket_records.id';
    ELSE
        RAISE NOTICE 'bucket_records.id already has a unique/primary key constraint';
    END IF;
END $$;
