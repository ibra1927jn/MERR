-- =============================================
-- FIX COLUMN MISMATCHES (FINAL POLISH)
-- Run this in Supabase > SQL Editor
-- =============================================

-- 1. FIX: bucket_records timestamp (scanned_at vs recorded_at)
-- We standardize on 'scanned_at' as requested by the Codebase.
DO $$ 
BEGIN 
    -- If 'recorded_at' exists but 'scanned_at' does not, rename it.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'recorded_at') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'scanned_at') THEN
        ALTER TABLE public.bucket_records RENAME COLUMN recorded_at TO scanned_at;
    
    -- If neither exists (unlikely but possible if new table), create scanned_at
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'scanned_at') THEN
        ALTER TABLE public.bucket_records ADD COLUMN scanned_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Ensure 'created_at' also exists as a system audit field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'created_at') THEN
        ALTER TABLE public.bucket_records ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. FIX: Pickers columns (safety_verified vs onboarded)
DO $$ 
BEGIN 
    -- If 'onboarded' exists, we rename it or ensure safety_verified exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'onboarded') THEN
        -- Check if safety_verified already exists before renaming
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'safety_verified') THEN
            ALTER TABLE public.pickers RENAME COLUMN onboarded TO safety_verified;
        END IF;
    END IF;

    -- Ensure safety_verified exists regardless
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'safety_verified') THEN
        ALTER TABLE public.pickers ADD COLUMN safety_verified BOOLEAN DEFAULT false;
    END IF;
    
    -- Ensure total_buckets_today exists (cache column)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'total_buckets_today') THEN
        ALTER TABLE public.pickers ADD COLUMN total_buckets_today INTEGER DEFAULT 0;
    END IF;
END $$;

SELECT '✅ Database columns aligned with TypeScript interfaces.' as result;
