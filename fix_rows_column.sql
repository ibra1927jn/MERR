-- =============================================
-- FIX ROWS COLUMN SCRIPT
-- Purpose: Ensure pickers table has current_row column for map visualization.
-- Safety: Sets default to 0 for legacy data.
-- =============================================

DO $$ 
BEGIN 
    -- 1. Add column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'current_row') THEN
        ALTER TABLE public.pickers ADD COLUMN current_row INTEGER DEFAULT 0;
        
        -- 2. Update existing NULL records to 0
        UPDATE public.pickers SET current_row = 0 WHERE current_row IS NULL;
        
        RAISE NOTICE 'Added current_row column and backfilled data.';
    ELSE
        RAISE NOTICE 'Column current_row already exists.';
    END IF;
END $$;
