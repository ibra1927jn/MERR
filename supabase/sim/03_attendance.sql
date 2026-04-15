-- =============================================================================
-- SIM 03_attendance.sql — 14 days of attendance records
-- NZ timezone in April = NZST = UTC+12
-- Typical day: check_in ~06:20-06:40 NZ = ~18:20-18:40 UTC (prev day)
--              check_out ~15:30-16:00 NZ = ~03:30-04:00 UTC (same UTC day)
--
-- SCHEMA NOTE: daily_attendance uses columns check_in / check_out (TIMESTAMPTZ)
--   NOT check_in / check_out — those columns do NOT exist in schema.
--   Functions (check_in_picker, check_out_picker) reference check_in → BROKEN.
--   This seed uses the ACTUAL column names (check_in, check_out).
-- =============================================================================

-- Helper: we need the pickers' UUIDs. We resolve them via picker_id text.
-- This file uses subqueries (SELECT id FROM pickers WHERE picker_id = 'P001')

DO $$
DECLARE
  orch_id UUID := 'e1337e6a-54cc-431c-9c00-980e8ea270a4';
  season_id UUID := 'aaaa0001-0000-0000-0000-000000000001';
  james_uid UUID := '78e8fdbd-b080-4083-9447-c26b7957f4a4';
  sarah_uid UUID := 'c1de2730-7599-42ca-b733-4449c09189e6';
  -- pickers as user UUIDs (james/sarah are also in pickers via their team_leader role)
  -- We'll insert daily_attendance for ALL staff including TLs and runners.
  -- TL picker records don't exist in pickers table — daily_attendance.picker_id references pickers.id.
  -- TLs and runners are NOT in pickers table, only managers and pickers are.
  -- So attendance for TLs/runners uses the users table link — but daily_attendance.picker_id
  -- references pickers(id) NOT users(id).
  -- SCHEMA DRIFT: No way to record TL/runner attendance in daily_attendance without a pickers row.
  -- We insert pickers rows for TLs/runners as role='team_leader'/'runner' in pickers table.
  james_pk UUID;
  sarah_pk UUID;
  mike_pk UUID;
  hemi_pk UUID;
BEGIN
  -- Insert TLs and runners into pickers table so we can reference them in daily_attendance
  INSERT INTO public.pickers (picker_id, name, orchard_id, team_leader_id, role, safety_verified, status)
  VALUES
    ('TL001', 'James Wilson',  orch_id, NULL, 'team_leader', true, 'active'),
    ('TL002', 'Sarah Ngapo',   orch_id, NULL, 'team_leader', true, 'active'),
    ('RN001', 'Mike O''Brien', orch_id, NULL, 'runner',      true, 'active'),
    ('RN002', 'Hemi Tane',     orch_id, NULL, 'runner',      true, 'active')
  ON CONFLICT (picker_id) DO NOTHING;

  SELECT id INTO james_pk FROM public.pickers WHERE picker_id = 'TL001';
  SELECT id INTO sarah_pk FROM public.pickers WHERE picker_id = 'TL002';
  SELECT id INTO mike_pk  FROM public.pickers WHERE picker_id = 'RN001';
  SELECT id INTO hemi_pk  FROM public.pickers WHERE picker_id = 'RN002';
END $$;

-- =============================================================================
-- Insert attendance for weekdays (Mon-Fri): 28 pickers + 2 TLs + 2 runners
-- Weekend Sat: P001-P012 + 2 runners only
-- Sunday: no records
-- =============================================================================

-- WEEKDAYS: 01 Apr (Tue), 02 Apr (Wed), 04 Apr (Fri)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  d.day::date,
  (d.day::date::text || 'T18:25:00Z')::TIMESTAMPTZ,  -- 06:25 NZ = 18:25 UTC prev day
  ((d.day::date + 1)::text || 'T04:15:00Z')::TIMESTAMPTZ, -- 16:15 NZ = 04:15 UTC next day
  'present',
  9.83
FROM public.pickers p
CROSS JOIN (VALUES ('2026-04-01'), ('2026-04-02'), ('2026-04-04')) AS d(day)
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030')  -- casuals excluded standard days
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- 03 Apr (Thu): Rain half day, only morning (06:00-11:00 NZ)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-03',
  '2026-04-02T18:25:00Z',  -- 06:25 NZ
  '2026-04-02T23:05:00Z',  -- 11:05 NZ = 23:05 UTC prev day
  'half_day',
  4.67
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030')
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- Emily Foster appears on day 03 Apr (BUG SEED: she'll have 8h attendance on 09 Apr but no scans)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT p.id, 'e1337e6a-54cc-431c-9c00-980e8ea270a4', 'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-03', '2026-04-02T18:25:00Z', '2026-04-02T23:05:00Z', 'half_day', 4.67
FROM public.pickers p WHERE p.picker_id = 'P030'
ON CONFLICT (picker_id, date) DO NOTHING;

-- SAT 05 Apr: 12 pickers + 2 runners only
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-05',
  '2026-04-04T18:30:00Z',
  '2026-04-05T04:00:00Z',
  'present',
  9.50
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id IN ('P001','P002','P003','P004','P005','P006','P007','P008','P009','P010','P011','P012','RN001','RN002')
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- SUN 06 Apr: NO RECORDS (correct — no operation)

-- MON 07 Apr: all regulars
-- BUG SEED 1.2.1: Tom Blackwood (P029) has scans on 07 Apr but NO daily_attendance row
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-07',
  '2026-04-06T18:20:00Z',
  '2026-04-07T04:10:00Z',
  'present',
  9.83
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030')  -- Tom excluded intentionally (bug seed)
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- TUE 08 Apr: all regulars
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-08',
  '2026-04-07T18:25:00Z',
  '2026-04-08T04:20:00Z',
  'present',
  9.92
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030')
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- WED 09 Apr: all regulars
-- BUG SEED 1.2.2: Emily Foster gets full 8h attendance but ZERO scans (inserted below, no bucket_records)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-09',
  '2026-04-08T18:22:00Z',
  '2026-04-09T04:18:00Z',
  'present',
  9.93
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029')  -- Emily included here (P030)
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- THU 10 Apr: all regulars
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-10',
  '2026-04-09T18:28:00Z',
  '2026-04-10T04:05:00Z',
  'present',
  9.62
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030')
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- FRI 11 Apr: all regulars
-- BUG SEED 1.2.4: James Wilson (TL001) — check_out is NULL (left at 10:00 NZ)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-11',
  '2026-04-10T18:25:00Z',
  CASE WHEN p.picker_id = 'TL001' THEN NULL ELSE '2026-04-11T04:15:00Z'::TIMESTAMPTZ END,
  'present',
  CASE WHEN p.picker_id = 'TL001' THEN 0 ELSE 9.83 END
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030')
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- BUG SEED 1.2.4 continued: James Wilson is_active = false from 11 Apr
UPDATE public.users SET is_active = false WHERE id = '78e8fdbd-b080-4083-9447-c26b7957f4a4';

-- SAT 12 Apr: 12 pickers + 2 runners only (Tom casual appears on day 10)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-12',
  '2026-04-11T18:28:00Z',
  '2026-04-12T04:00:00Z',
  'present',
  9.53
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id IN ('P001','P002','P003','P004','P005','P006','P007','P008','P009','P010','P011','P012','RN001','RN002')
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- SUN 13 Apr: NO RECORDS

-- MON 14 Apr: all regulars (James still listed but is_active=false)
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT
  p.id,
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-14',
  '2026-04-13T18:22:00Z',
  '2026-04-14T04:12:00Z',
  'present',
  9.83
FROM public.pickers p
WHERE p.orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND p.picker_id NOT IN ('P029','P030','TL001')  -- James excluded (inactive)
  AND p.deleted_at IS NULL
ON CONFLICT (picker_id, date) DO NOTHING;

-- Tom Blackwood appears on days 5, 7 (no attendance!), 10
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT p.id, 'e1337e6a-54cc-431c-9c00-980e8ea270a4', 'aaaa0001-0000-0000-0000-000000000001',
  d.day::date, (d.cin)::TIMESTAMPTZ, (d.cout)::TIMESTAMPTZ, 'present', 9.0
FROM public.pickers p
CROSS JOIN (VALUES
  ('2026-04-05', '2026-04-04T18:35:00Z', '2026-04-05T03:55:00Z'),
  ('2026-04-10', '2026-04-09T18:30:00Z', '2026-04-10T04:00:00Z')
) AS d(day, cin, cout)
WHERE p.picker_id = 'P029'
ON CONFLICT (picker_id, date) DO NOTHING;

-- Emily Foster appears on days 3 (done above), 9 (done above), 12
INSERT INTO public.daily_attendance (picker_id, orchard_id, season_id, date, check_in, check_out, status, hours_worked)
SELECT p.id, 'e1337e6a-54cc-431c-9c00-980e8ea270a4', 'aaaa0001-0000-0000-0000-000000000001',
  '2026-04-12', '2026-04-11T18:30:00Z', '2026-04-12T03:55:00Z', 'present', 9.42
FROM public.pickers p WHERE p.picker_id = 'P030'
ON CONFLICT (picker_id, date) DO NOTHING;
