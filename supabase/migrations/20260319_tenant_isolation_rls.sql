-- ============================================
-- RLS Policies for Core Tables
-- AUDIT F-4: Tenant isolation via RLS
-- ============================================

-- Ensure RLS is enabled on core tables
ALTER TABLE bucket_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;

-- bucket_records: Users can only access records for their orchard
CREATE POLICY IF NOT EXISTS "bucket_records_tenant_isolation"
ON bucket_records FOR ALL USING (
    orchard_id IN (
        SELECT orchard_id FROM users WHERE id = auth.uid()
    )
);

-- pickers: Users can only access pickers in their orchard
CREATE POLICY IF NOT EXISTS "pickers_tenant_isolation"
ON pickers FOR ALL USING (
    orchard_id IN (
        SELECT orchard_id FROM users WHERE id = auth.uid()
    )
);

-- daily_attendance: Users can only access attendance for their orchard
CREATE POLICY IF NOT EXISTS "attendance_tenant_isolation"
ON daily_attendance FOR ALL USING (
    orchard_id IN (
        SELECT orchard_id FROM users WHERE id = auth.uid()
    )
);

COMMENT ON POLICY "bucket_records_tenant_isolation" ON bucket_records IS
'AUDIT F-4: Tenant isolation — users can only access bucket_records for their assigned orchard';

COMMENT ON POLICY "pickers_tenant_isolation" ON pickers IS
'AUDIT F-4: Tenant isolation — users can only access pickers in their assigned orchard';

COMMENT ON POLICY "attendance_tenant_isolation" ON daily_attendance IS
'AUDIT F-4: Tenant isolation — users can only access attendance for their assigned orchard';
