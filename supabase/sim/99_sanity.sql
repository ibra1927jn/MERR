-- =============================================================================
-- SIM 99_sanity.sql — Sanity queries to confirm seed state
-- Run after all other seed files
-- =============================================================================

-- 1. Overall counts by table
SELECT 'orchards'         AS tbl, COUNT(*) AS cnt FROM public.orchards
UNION ALL SELECT 'harvest_seasons',  COUNT(*) FROM public.harvest_seasons
UNION ALL SELECT 'orchard_blocks',   COUNT(*) FROM public.orchard_blocks
UNION ALL SELECT 'block_rows',       COUNT(*) FROM public.block_rows
UNION ALL SELECT 'pickers',          COUNT(*) FROM public.pickers
UNION ALL SELECT 'users (public)',   COUNT(*) FROM public.users
UNION ALL SELECT 'daily_attendance', COUNT(*) FROM public.daily_attendance
UNION ALL SELECT 'row_assignments',  COUNT(*) FROM public.row_assignments
UNION ALL SELECT 'bucket_records',   COUNT(*) FROM public.bucket_records
UNION ALL SELECT 'wage_rates',       COUNT(*) FROM public.wage_rates
UNION ALL SELECT 'harvest_settings', COUNT(*) FROM public.harvest_settings
ORDER BY tbl;

-- 2. Bucket counts by NZ date
SELECT
  (scanned_at AT TIME ZONE 'Pacific/Auckland')::DATE AS nz_date,
  COUNT(*) AS scan_count,
  COUNT(DISTINCT picker_id) AS unique_pickers,
  COUNT(*) FILTER (WHERE quality_grade = 'reject') AS rejects,
  COUNT(*) FILTER (WHERE block_row_id IS NULL) AS null_row_id
FROM public.bucket_records
WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
GROUP BY 1
ORDER BY 1;

-- 3. Attendance by date
SELECT
  date,
  COUNT(*) AS attendees,
  COUNT(*) FILTER (WHERE check_out IS NULL) AS missing_checkout,
  COUNT(*) FILTER (WHERE hours_worked = 0) AS zero_hours
FROM public.daily_attendance
WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
GROUP BY date
ORDER BY date;

-- 4. DIRTY DATA CHECKS

-- CHECK 1: Sunday 06 Apr — should be 0 in both tables
SELECT 'CHECK1_sunday_06apr_bucket' AS check_name,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.bucket_records
WHERE (scanned_at AT TIME ZONE 'Pacific/Auckland')::DATE = '2026-04-06'
  AND orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4';

SELECT 'CHECK1_sunday_06apr_attendance' AS check_name,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.daily_attendance
WHERE date = '2026-04-06'
  AND orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4';

-- CHECK 2: Emily Foster 09 Apr — attendance with 0 scans
SELECT 'CHECK2_emily_09apr_attendance' AS check_name,
  da.hours_worked,
  COUNT(br.id) AS scans,
  CASE WHEN da.hours_worked > 0 AND COUNT(br.id) = 0 THEN 'BUG_CONFIRMED' ELSE 'NOT_BUG' END AS result
FROM public.daily_attendance da
JOIN public.pickers p ON p.id = da.picker_id
LEFT JOIN public.bucket_records br ON br.picker_id = da.picker_id
  AND (br.scanned_at AT TIME ZONE 'Pacific/Auckland')::DATE = da.date
WHERE p.picker_id = 'P030'
  AND da.date = '2026-04-09'
  AND da.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
GROUP BY da.hours_worked;

-- CHECK 3: Row B-R03 (row_number=23) — variety NULL
SELECT 'CHECK3_row_23_variety_null' AS check_name,
  row_number,
  variety,
  CASE WHEN variety IS NULL THEN 'BUG_CONFIRMED' ELSE 'NOT_BUG' END AS result
FROM public.block_rows
WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002'
  AND row_number = 23;

-- CHECK 4: Block C (rows 41-60) — should have 0 bucket_records
SELECT 'CHECK4_block_c_no_scans' AS check_name,
  COUNT(br.id) AS scan_count,
  CASE WHEN COUNT(br.id) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.block_rows row
LEFT JOIN public.bucket_records br ON br.block_row_id = row.id
WHERE row.block_id = 'bbbb0003-0000-0000-0000-000000000003';

-- CHECK 5: Late offline scans — scanned_at 12 Apr 11:50 UTC (23:50 NZ) with created_at 13 Apr
SELECT 'CHECK5_offline_late_scans' AS check_name,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) > 0 THEN 'BUG_PRESENT' ELSE 'NOT_FOUND' END AS result
FROM public.bucket_records
WHERE scanned_at = '2026-04-12T11:50:00Z'
  AND created_at >= '2026-04-13T00:00:00Z'
  AND orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4';

-- CHECK 6: Duplicates — same picker_id + scanned_at
SELECT 'CHECK6_duplicate_scans' AS check_name,
  picker_id, scanned_at, COUNT(*) AS dup_count
FROM public.bucket_records
WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
GROUP BY picker_id, scanned_at
HAVING COUNT(*) > 1
ORDER BY dup_count DESC
LIMIT 10;

-- CHECK 7: James Wilson is_active=false
SELECT 'CHECK7_james_inactive' AS check_name,
  full_name, is_active,
  CASE WHEN is_active = false THEN 'BUG_CONFIRMED' ELSE 'NOT_BUG' END AS result
FROM public.users
WHERE email = 'james@harvestpro.nz';

-- CHECK 8: Tom Blackwood 07 Apr — scans without attendance
SELECT 'CHECK8_tom_scans_no_attendance' AS check_name,
  COUNT(br.id) AS scans_07apr,
  COUNT(da.id) AS attendance_07apr,
  CASE WHEN COUNT(br.id) > 0 AND COUNT(da.id) = 0 THEN 'BUG_CONFIRMED' ELSE 'NOT_BUG' END AS result
FROM public.pickers p
LEFT JOIN public.bucket_records br ON br.picker_id = p.id
  AND (br.scanned_at AT TIME ZONE 'Pacific/Auckland')::DATE = '2026-04-07'
LEFT JOIN public.daily_attendance da ON da.picker_id = p.id
  AND da.date = '2026-04-07'
WHERE p.picker_id = 'P029';

-- 5. Schema drift verification
-- Check if check_in/check_out exist in daily_attendance
SELECT 'SCHEMA_DRIFT_check_in' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'COLUMN_MISSING (frontend uses check_in, DB has check_in)' ELSE 'EXISTS' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'daily_attendance' AND column_name = 'check_in';

SELECT 'SCHEMA_DRIFT_verified_by' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'COLUMN_MISSING' ELSE 'EXISTS' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'daily_attendance' AND column_name = 'verified_by';

SELECT 'SCHEMA_DRIFT_safety_harness_verified' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'COLUMN_MISSING' ELSE 'EXISTS' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'daily_attendance' AND column_name = 'safety_harness_verified';

SELECT 'SCHEMA_DRIFT_wage_rates_effective_date' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'COLUMN_MISSING' ELSE 'EXISTS' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wage_rates' AND column_name = 'effective_date';

-- 6. Row assignment orphan (completed rows 5,6,7 still have assignments)
SELECT 'CHECK_orphan_completed_rows' AS check_name,
  COUNT(*) AS completed_assignments_still_present,
  CASE WHEN COUNT(*) > 0 THEN 'BUG_CONFIRMED' ELSE 'NOT_FOUND' END AS result
FROM public.row_assignments ra
JOIN public.block_rows br ON br.id = ra.block_row_id
WHERE ra.status = 'completed'
  AND br.block_id = 'bbbb0001-0000-0000-0000-000000000001'
  AND br.row_number IN (5, 6, 7)
  AND ra.deleted_at IS NULL;

-- 7. Bug 1.2.5: Out-of-band UTC timestamp (scanned_at 09 Apr UTC but NZ date is 10 Apr)
SELECT 'CHECK_bug_125_utc_day_mismatch' AS check_name,
  COUNT(*) AS scan_count,
  MIN(scanned_at) AS utc_ts,
  MIN(scanned_at AT TIME ZONE 'Pacific/Auckland') AS nz_ts,
  CASE WHEN COUNT(*) > 0 THEN 'BUG_CONFIRMED' ELSE 'NOT_FOUND' END AS result
FROM public.bucket_records
WHERE scanned_at = '2026-04-09T16:30:00Z'
  AND orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4';

-- 8. row_assignments status='assigned' (not a valid value per schema CHECK)
SELECT 'CHECK_invalid_status_assigned' AS check_name,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) > 0 THEN 'SCHEMA_VIOLATION (status=assigned not in CHECK constraint)' ELSE 'OK' END AS result
FROM public.row_assignments
WHERE status = 'assigned';
