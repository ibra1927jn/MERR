-- =============================================
-- BUCKET LEDGER - Append-Only Bucket Events
-- =============================================
-- This replaces counter-based updates with immutable event log
-- to prevent data loss during LWW sync conflicts.

-- Create the bucket_events table
CREATE TABLE IF NOT EXISTS bucket_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picker_id UUID NOT NULL REFERENCES pickers(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id TEXT NOT NULL,
    orchard_id UUID REFERENCES orchards(id),
    row_number INTEGER,
    quality_grade TEXT CHECK (quality_grade IN ('A', 'B', 'C', 'reject')) DEFAULT 'A',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by picker and date
CREATE INDEX idx_bucket_events_picker_date 
ON bucket_events (picker_id, recorded_at);

-- Index for orchard-wide queries
CREATE INDEX idx_bucket_events_orchard_date 
ON bucket_events (orchard_id, recorded_at);

-- Enable RLS
ALTER TABLE bucket_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone in the same orchard can insert/view bucket events
CREATE POLICY "Bucket events are viewable by orchard members"
ON bucket_events FOR SELECT
USING (
    orchard_id IN (
        SELECT orchard_id FROM users WHERE id = auth.uid()
    )
);

CREATE POLICY "Bucket events can be inserted by authenticated users"
ON bucket_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- HELPER FUNCTION: Get bucket count for a picker on a date
-- =============================================
CREATE OR REPLACE FUNCTION get_picker_bucket_count(
    p_picker_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total BIGINT,
    grade_a BIGINT,
    grade_b BIGINT,
    grade_c BIGINT,
    grade_reject BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE quality_grade = 'A')::BIGINT as grade_a,
        COUNT(*) FILTER (WHERE quality_grade = 'B')::BIGINT as grade_b,
        COUNT(*) FILTER (WHERE quality_grade = 'C')::BIGINT as grade_c,
        COUNT(*) FILTER (WHERE quality_grade = 'reject')::BIGINT as grade_reject
    FROM bucket_events
    WHERE picker_id = p_picker_id
    AND recorded_at::date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Get all picker counts for an orchard
-- =============================================
CREATE OR REPLACE FUNCTION get_orchard_bucket_counts(
    p_orchard_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    picker_id UUID,
    total BIGINT,
    grade_a BIGINT,
    grade_b BIGINT,
    grade_c BIGINT,
    grade_reject BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        be.picker_id,
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE be.quality_grade = 'A')::BIGINT as grade_a,
        COUNT(*) FILTER (WHERE be.quality_grade = 'B')::BIGINT as grade_b,
        COUNT(*) FILTER (WHERE be.quality_grade = 'C')::BIGINT as grade_c,
        COUNT(*) FILTER (WHERE be.quality_grade = 'reject')::BIGINT as grade_reject
    FROM bucket_events be
    WHERE be.orchard_id = p_orchard_id
    AND be.recorded_at::date = p_date
    GROUP BY be.picker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ENABLE REALTIME FOR BUCKET EVENTS
-- =============================================
ALTER publication supabase_realtime ADD TABLE bucket_events;
