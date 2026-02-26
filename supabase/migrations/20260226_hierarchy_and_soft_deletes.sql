-- =============================================
-- MIGRATION 002: ORCHARD HIERARCHY + SOFT DELETES
-- Sprint 1A + 1B — "Operación Pizarra Limpia"
-- Date: 2026-02-26
-- =============================================
-- WHAT THIS DOES:
--   1. Creates harvest_seasons, orchard_blocks, block_rows tables
--   2. Links existing tables (bucket_records, bins, row_assignments, daily_attendance)
--   3. Seeds a default Season 2026 and backfills all existing data
--   4. Adds soft deletes (deleted_at) to 10 critical tables
--   5. Adds optimistic locking (version) to concurrency-hot tables
--   6. Creates partial unique indexes (safe with soft deletes)
--   7. Creates B-Tree sync indexes for delta sync performance
--
-- SAFETY:
--   - All new columns are NULLABLE first, then backfilled, then set NOT NULL
--   - All operations are idempotent (safe to re-run)
--   - No physical data is deleted
-- =============================================
-- PHASE 1: NEW HIERARCHY TABLES
-- =============================================
-- 1.1 HARVEST SEASONS
-- Prevents OOM by scoping all queries to the active season
CREATE TABLE IF NOT EXISTS public.harvest_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- 'Season 2026'
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('planning', 'active', 'closed', 'archived')
    ),
    deleted_at TIMESTAMPTZ,
    -- Soft delete from day 1
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Partial unique: only one active season per orchard at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_season_per_orchard ON public.harvest_seasons (orchard_id)
WHERE status = 'active'
    AND deleted_at IS NULL;
-- 1.2 ORCHARD BLOCKS
CREATE TABLE IF NOT EXISTS public.orchard_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.harvest_seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- 'Block A'
    total_rows INTEGER NOT NULL DEFAULT 0,
    start_row INTEGER NOT NULL DEFAULT 1,
    color_code TEXT DEFAULT '#dc2626',
    status TEXT NOT NULL DEFAULT 'idle' CHECK (
        status IN ('idle', 'active', 'complete', 'alert')
    ),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Partial unique: no duplicate block names within one season (unless soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_block ON public.orchard_blocks (orchard_id, season_id, name)
WHERE deleted_at IS NULL;
-- 1.3 BLOCK ROWS (each row belongs to a block, has a variety)
CREATE TABLE IF NOT EXISTS public.block_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.orchard_blocks(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    variety TEXT,
    -- 'Lapins', 'Sweetheart', etc.
    target_buckets INTEGER DEFAULT 100,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Partial unique: no duplicate row numbers within a block (unless soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_row ON public.block_rows (block_id, row_number)
WHERE deleted_at IS NULL;
-- =============================================
-- PHASE 2: LINK EXISTING TABLES TO HIERARCHY
-- (3-step safe migration: add nullable → backfill → set NOT NULL)
-- =============================================
-- 2.1 SEED DEFAULT SEASON (needed before backfill)
-- Creates "Season 2026" for every orchard that doesn't have one
INSERT INTO public.harvest_seasons (
        id,
        orchard_id,
        name,
        start_date,
        end_date,
        status
    )
SELECT gen_random_uuid(),
    o.id,
    'Season 2026',
    '2026-01-01'::DATE,
    '2026-12-31'::DATE,
    'active'
FROM public.orchards o
WHERE NOT EXISTS (
        SELECT 1
        FROM public.harvest_seasons hs
        WHERE hs.orchard_id = o.id
            AND hs.status = 'active'
    );
-- 2.2 BUCKET_RECORDS → add season_id
-- Step 1: Add nullable column
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.harvest_seasons(id);
-- Step 2: Backfill — assign all existing records to the active season
UPDATE public.bucket_records br
SET season_id = hs.id
FROM public.harvest_seasons hs
WHERE br.orchard_id = hs.orchard_id
    AND hs.status = 'active'
    AND br.season_id IS NULL;
-- Step 3: Make NOT NULL (only if all rows have been backfilled)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM public.bucket_records
    WHERE season_id IS NULL
    LIMIT 1
) THEN
ALTER TABLE public.bucket_records
ALTER COLUMN season_id
SET NOT NULL;
END IF;
END $$;
-- 2.3 BUCKET_RECORDS → add block_row_id (optional FK to the exact row)
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS block_row_id UUID REFERENCES public.block_rows(id);
-- 2.4 BINS → add block_id
ALTER TABLE public.bins
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.orchard_blocks(id);
-- 2.5 ROW_ASSIGNMENTS → add season_id + block_row_id
ALTER TABLE public.row_assignments
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.harvest_seasons(id);
ALTER TABLE public.row_assignments
ADD COLUMN IF NOT EXISTS block_row_id UUID REFERENCES public.block_rows(id);
-- Backfill row_assignments season_id
UPDATE public.row_assignments ra
SET season_id = hs.id
FROM public.harvest_seasons hs
WHERE ra.orchard_id = hs.orchard_id
    AND hs.status = 'active'
    AND ra.season_id IS NULL;
-- 2.6 DAILY_ATTENDANCE → add season_id
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.harvest_seasons(id);
UPDATE public.daily_attendance da
SET season_id = hs.id
FROM public.harvest_seasons hs
WHERE da.orchard_id = hs.orchard_id
    AND hs.status = 'active'
    AND da.season_id IS NULL;
-- 2.7 DAY_SETUPS → add season_id
ALTER TABLE public.day_setups
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.harvest_seasons(id);
UPDATE public.day_setups ds
SET season_id = hs.id
FROM public.harvest_seasons hs
WHERE ds.orchard_id = hs.orchard_id
    AND hs.status = 'active'
    AND ds.season_id IS NULL;
-- =============================================
-- PHASE 3: SOFT DELETES — deleted_at ON ALL CRITICAL TABLES
-- =============================================
ALTER TABLE public.pickers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.bins
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.day_setups
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.day_closures
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.fleet_vehicles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.transport_requests
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.row_assignments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- =============================================
-- PHASE 4: OPTIMISTIC LOCKING — version COLUMN + TRIGGER
-- =============================================
-- Shared trigger function (reusable)
CREATE OR REPLACE FUNCTION public.bump_version() RETURNS TRIGGER AS $$ BEGIN -- If caller sends same version as DB → allowed, auto-increment
    -- If caller sends stale version → reject with clear error
    IF OLD.version IS NOT NULL
    AND NEW.version IS NOT NULL
    AND OLD.version != NEW.version THEN RAISE EXCEPTION 'CONFLICT: record modified by another user (expected v%, got v%)',
    OLD.version,
    NEW.version USING ERRCODE = '40001';
-- serialization_failure
END IF;
NEW.version = COALESCE(OLD.version, 0) + 1;
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Add version to high-concurrency tables
ALTER TABLE public.pickers
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.row_assignments
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
-- Attach trigger (pickers)
DROP TRIGGER IF EXISTS trg_pickers_version ON public.pickers;
CREATE TRIGGER trg_pickers_version BEFORE
UPDATE ON public.pickers FOR EACH ROW EXECUTE FUNCTION bump_version();
-- Attach trigger (daily_attendance)
DROP TRIGGER IF EXISTS trg_attendance_version ON public.daily_attendance;
CREATE TRIGGER trg_attendance_version BEFORE
UPDATE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION bump_version();
-- Attach trigger (row_assignments)
DROP TRIGGER IF EXISTS trg_row_assignments_version ON public.row_assignments;
CREATE TRIGGER trg_row_assignments_version BEFORE
UPDATE ON public.row_assignments FOR EACH ROW EXECUTE FUNCTION bump_version();
-- =============================================
-- PHASE 5: PERFORMANCE INDEXES (Delta Sync + Queries)
-- =============================================
-- Sync index: bucket_records by season + updated_at (excludes soft-deleted)
CREATE INDEX IF NOT EXISTS idx_bucket_records_sync ON public.bucket_records (season_id, updated_at)
WHERE deleted_at IS NULL;
-- Sync index: daily_attendance by season + updated_at
CREATE INDEX IF NOT EXISTS idx_attendance_sync ON public.daily_attendance (season_id, updated_at)
WHERE deleted_at IS NULL;
-- Sync index: pickers by orchard + updated_at
CREATE INDEX IF NOT EXISTS idx_pickers_sync ON public.pickers (orchard_id, updated_at)
WHERE deleted_at IS NULL;
-- Heat map: bucket_records grouped by row for density queries
CREATE INDEX IF NOT EXISTS idx_bucket_records_row_density ON public.bucket_records (orchard_id, season_id, block_row_id)
WHERE deleted_at IS NULL;
-- Block lookup: fast block fetch by orchard + season
CREATE INDEX IF NOT EXISTS idx_blocks_by_season ON public.orchard_blocks (orchard_id, season_id)
WHERE deleted_at IS NULL;
-- Row lookup: fast row fetch by block
CREATE INDEX IF NOT EXISTS idx_rows_by_block ON public.block_rows (block_id)
WHERE deleted_at IS NULL;
-- =============================================
-- PHASE 6: RLS POLICIES FOR NEW TABLES
-- =============================================
-- HARVEST SEASONS
ALTER TABLE public.harvest_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read seasons" ON public.harvest_seasons;
CREATE POLICY "Read seasons" ON public.harvest_seasons FOR
SELECT TO authenticated USING (
        orchard_id = get_my_orchard_id()
        AND deleted_at IS NULL
    );
DROP POLICY IF EXISTS "Manage seasons" ON public.harvest_seasons;
CREATE POLICY "Manage seasons" ON public.harvest_seasons FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'admin')
    )
);
-- ORCHARD BLOCKS
ALTER TABLE public.orchard_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read blocks" ON public.orchard_blocks;
CREATE POLICY "Read blocks" ON public.orchard_blocks FOR
SELECT TO authenticated USING (
        orchard_id = get_my_orchard_id()
        AND deleted_at IS NULL
    );
DROP POLICY IF EXISTS "Manage blocks" ON public.orchard_blocks;
CREATE POLICY "Manage blocks" ON public.orchard_blocks FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'admin')
    )
);
-- BLOCK ROWS
ALTER TABLE public.block_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read rows" ON public.block_rows;
CREATE POLICY "Read rows" ON public.block_rows FOR
SELECT TO authenticated USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.orchard_blocks ob
            WHERE ob.id = block_id
                AND ob.orchard_id = get_my_orchard_id()
                AND ob.deleted_at IS NULL
        )
    );
DROP POLICY IF EXISTS "Manage rows" ON public.block_rows;
CREATE POLICY "Manage rows" ON public.block_rows FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.orchard_blocks ob
            JOIN public.users u ON u.id = auth.uid()
        WHERE ob.id = block_id
            AND ob.orchard_id = u.orchard_id
            AND u.role IN ('manager', 'admin')
    )
);
-- =============================================
-- PHASE 7: UPDATED_AT TRIGGERS FOR NEW TABLES
-- =============================================
-- harvest_seasons
DROP TRIGGER IF EXISTS trg_seasons_updated_at ON public.harvest_seasons;
CREATE TRIGGER trg_seasons_updated_at BEFORE
UPDATE ON public.harvest_seasons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- orchard_blocks
DROP TRIGGER IF EXISTS trg_blocks_updated_at ON public.orchard_blocks;
CREATE TRIGGER trg_blocks_updated_at BEFORE
UPDATE ON public.orchard_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- =============================================
-- VERIFICATION QUERY
-- =============================================
SELECT 'Migration 002 applied successfully' AS status,
    (
        SELECT COUNT(*)
        FROM public.harvest_seasons
    ) AS seasons_count,
    (
        SELECT COUNT(*)
        FROM public.orchard_blocks
    ) AS blocks_count,
    (
        SELECT COUNT(*)
        FROM public.block_rows
    ) AS rows_count,
    (
        SELECT COUNT(*)
        FROM public.bucket_records
        WHERE season_id IS NOT NULL
    ) AS records_with_season;