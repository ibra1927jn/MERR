-- ============================================
-- API Keys + MPI Traceability Tables
-- Migration: 20260319_saas_expansion
-- ============================================

-- API Keys for public REST API authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id  UUID NOT NULL REFERENCES orchards(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    key_hash    TEXT NOT NULL UNIQUE,
    key_prefix  TEXT NOT NULL,
    scopes      TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    request_count INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_orchard ON api_keys(orchard_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE is_active = true;

-- RLS: Only orchard managers/admins can manage API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select" ON api_keys FOR SELECT USING (
    orchard_id IN (
        SELECT orchard_id FROM users
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);

CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT WITH CHECK (
    orchard_id IN (
        SELECT orchard_id FROM users
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);

CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE USING (
    orchard_id IN (
        SELECT orchard_id FROM users
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);

CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE USING (
    orchard_id IN (
        SELECT orchard_id FROM users
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
);

-- Add crop_type to orchards table for Feature 2 (Crop Agnostic)
DO $$ BEGIN
    ALTER TABLE orchards ADD COLUMN crop_type TEXT DEFAULT 'cherry';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN orchards.crop_type IS 'Crop type: cherry, apple, kiwifruit, grape, generic';
