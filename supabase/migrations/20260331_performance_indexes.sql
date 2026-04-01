-- Migration: Performance indexes for production
-- Date: 2026-03-31
-- Purpose: Eliminate sequential scans on high-traffic tables
-- Impact: Payroll calculations, anomaly detection, and RLS policies will be significantly faster

-- 1. bucket_records: Used by calculate-payroll, detect-anomalies, api-v1/harvest
--    Without this index, every payroll calculation does a full table scan
CREATE INDEX IF NOT EXISTS idx_bucket_records_orchard_scanned
  ON bucket_records(orchard_id, scanned_at DESC);

-- 2. daily_attendance: Used by manage-attendance, api-v1/attendance, compliance checks
--    Attendance lookups by orchard + date are the most common query pattern
CREATE INDEX IF NOT EXISTS idx_daily_attendance_orchard_date
  ON daily_attendance(orchard_id, date);

-- 3. pickers: Used by RLS policies on nearly every table
--    Without this, RLS does a sequential scan on pickers for EVERY row-level check
CREATE INDEX IF NOT EXISTS idx_pickers_orchard
  ON pickers(orchard_id) WHERE deleted_at IS NULL;
