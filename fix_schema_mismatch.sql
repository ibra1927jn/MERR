-- FIXED SCHEMA SCRIPT
-- Run this in Supabase SQL Editor

-- 1. Ensure 'picker_id' exists (used by local code)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'picker_id') THEN
        ALTER TABLE public.pickers ADD COLUMN picker_id TEXT;
    END IF;
END $$;

-- 2. Ensure 'total_buckets_today' exists (used locally) and matches our expectations
ALTER TABLE public.pickers 
ADD COLUMN IF NOT EXISTS total_buckets_today INTEGER DEFAULT 0;

-- 3. We do NOT add 'daily_buckets' or 'external_picker_id' because they are deprecated/incorrect in local code.

-- 4. Reload schema cache to apply changes immediately
NOTIFY pgrst, 'reload schema';
