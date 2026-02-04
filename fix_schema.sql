-- =============================================
-- HARVESTPRO NZ - FIX SCHEMA SCRIPT
-- Purpose: Align Database with Codebase Expectations (Phase 1 Refactor)
-- =============================================

-- 1. UNIFY BUCKET TABLES
-- Goal: Use 'bucket_records' as the single source of truth.
-- We will ensure bucket_records has all necessary columns from bucket_events.
-- =============================================

-- Ensure bucket_records has UUID id (standard)
-- (Assuming it already exists, but making sure columns match)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'device_id') THEN
        ALTER TABLE public.bucket_records ADD COLUMN device_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'synced') THEN
        ALTER TABLE public.bucket_records ADD COLUMN synced BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'quality_grade') THEN
        ALTER TABLE public.bucket_records ADD COLUMN quality_grade TEXT DEFAULT 'A';
    END IF;
    
    -- Ensure coords exist (for heatmaps)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'coords') THEN
        ALTER TABLE public.bucket_records ADD COLUMN coords JSONB;
    END IF;
END $$;

-- 2. DYNAMIC CONFIGURATION (Harvest Settings)
-- Goal: Move hardcoded financial values to DB.
-- We can use 'day_setups' for daily rates, but a global 'harvest_settings' is better for defaults.
-- =============================================

CREATE TABLE IF NOT EXISTS public.harvest_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orchard_id UUID REFERENCES public.orchards(id) NOT NULL,
    min_wage_rate DECIMAL(10,2) DEFAULT 23.50,
    piece_rate DECIMAL(10,2) DEFAULT 6.50,
    min_buckets_per_hour DECIMAL(10,2) DEFAULT 3.6,
    target_tons DECIMAL(10,2) DEFAULT 100.0,
    default_start_time TIME DEFAULT '07:00:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(orchard_id)
);

-- Insert default settings for existing orchards if missing
-- Note: Assuming there is at least one orchard
INSERT INTO public.harvest_settings (orchard_id)
SELECT id FROM public.orchards
ON CONFLICT (orchard_id) DO NOTHING;

-- 3. ENSURE PICKERS COLUMNS
-- Goal: Standardize on 'buckets' vs 'total_buckets_today'
-- We will allow 'total_buckets_today' as a cached counter (legacy support)
-- but ensure new code can rely on bucket_records queries.
-- =============================================

DO $$ 
BEGIN 
    -- Ensure status column exists and has defaults
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'status') THEN
        ALTER TABLE public.pickers ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

SELECT 'Schema alignment script executed successfully' as result;
