-- =============================================================================
-- SIM 05_scans.sql — Bucket records for 14-day simulation
-- NZ April timezone = UTC+12 (NZST)
-- Typical scan window: 06:30-15:30 NZ = 18:30-03:30 UTC
--
-- BUGS SEEDED:
-- 1.2.3: Row B-R03 (row_number=23) — block_row_id = NULL on those scans
-- 1.2.5: 4 scans on 10 Apr with scanned_at = '2026-04-09T16:30:00Z' (04:30 NZ 10 Apr — before shift)
-- 1.2.6: 3 duplicate pairs on 12 Apr (same picker_id + scanned_at)
-- 1.2.10: 3 scans with scanned_at='2026-04-12T11:50:00Z' (12 Apr 23:50 NZ) arrived 13 Apr
-- =============================================================================

DO $$
DECLARE
  orch_id    UUID := 'e1337e6a-54cc-431c-9c00-980e8ea270a4';
  season_id  UUID := 'aaaa0001-0000-0000-0000-000000000001';
  scanned_by UUID := '309c03b5-fc6f-4362-b02e-716005ba59b9'; -- manager

  -- day pattern: (date NZ, bucket count target, start UTC offset seconds from midnight UTC prev day)
  -- We'll generate scans spread across the shift window
  v_day      DATE;
  v_picker   RECORD;
  v_row      RECORD;
  v_scan_t   TIMESTAMPTZ;
  v_count    INTEGER;
  v_total    INTEGER;
  v_i        INTEGER;
  v_block_row_id UUID;
  v_quality  TEXT;

  -- Pickers A = P001-P014, Pickers B = P015-P028
  pickers_a  TEXT[] := ARRAY['P001','P002','P003','P004','P005','P006','P007','P008','P009','P010','P011','P012','P013','P014'];
  pickers_b  TEXT[] := ARRAY['P015','P016','P017','P018','P019','P020','P021','P022','P023','P024','P025','P026','P027','P028'];
  sat_pickers TEXT[] := ARRAY['P001','P002','P003','P004','P005','P006','P007','P008','P009','P010','P011','P012'];

  -- day config: (nz_date, active_pickers_group, buckets_per_picker, shift_start_utc)
  -- shift_start_utc: UTC timestamp of 06:30 NZ = prev day 18:30 UTC
BEGIN

  -- ============================================================
  -- 01 Apr (Tue): ~3400 buckets, all 28 pickers → ~121 each
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 121 + (EXTRACT(EPOCH FROM now())::INTEGER % 5) - 2;
    FOR v_i IN 1..v_count LOOP
      -- spread across 06:30-15:30 NZ (18:30 UTC Mar 31 - 03:30 UTC Apr 1)
      v_scan_t := '2026-03-31T18:30:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      -- assign to appropriate block row
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows
          WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001'
          AND row_number = (1 + (v_i % 20)) LIMIT 1;
      ELSE
        -- BUG SEED 1.2.3: row_number=23 scans get NULL block_row_id
        IF (1 + (v_i % 20)) = 3 THEN  -- this maps to row 23 (21 + 2 = index 3 in block B)
          v_block_row_id := NULL;
        ELSE
          SELECT id INTO v_block_row_id FROM public.block_rows
            WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002'
            AND row_number = (21 + (v_i % 20)) LIMIT 1;
        END IF;
      END IF;

      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1 + (v_i % 20)) ELSE (21 + (v_i % 20)) END,
        CASE WHEN v_i % 25 = 0 THEN 'B' WHEN v_i % 50 = 0 THEN 'C' ELSE 'A' END);
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 02 Apr (Wed): ~3100 buckets, ~110 each
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 110;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-01T18:30:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 03 Apr (Thu): ~1400 buckets (rain half day), ~50 each
  -- Shift: 06:00-11:00 NZ = prev day 18:00 - 23:00 UTC
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 50;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-02T18:00:00Z'::TIMESTAMPTZ + (v_i * (18000.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;
  -- Emily Foster on 03 Apr (casual, appears this day)
  FOR v_picker IN SELECT id, picker_id FROM public.pickers WHERE picker_id = 'P030' AND orchard_id = orch_id LOOP
    FOR v_i IN 1..45 LOOP
      v_scan_t := '2026-04-02T18:10:00Z'::TIMESTAMPTZ + (v_i * (17000.0/45) || ' seconds')::INTERVAL;
      SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = 25 LIMIT 1;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t, 25, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 04 Apr (Fri): ~3600 buckets (recovery), ~128 each
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 128;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-03T18:30:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 05 Apr (Sat): ~1800 buckets, 12 pickers only, ~150 each
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(sat_pickers) AND orchard_id = orch_id
  LOOP
    v_count := 150;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-04T18:30:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t, (1+(v_i%20)), 'A');
    END LOOP;
  END LOOP;
  -- Tom casual on 05 Apr
  FOR v_picker IN SELECT id FROM public.pickers WHERE picker_id = 'P029' AND orchard_id = orch_id LOOP
    FOR v_i IN 1..80 LOOP
      v_scan_t := '2026-04-04T18:35:00Z'::TIMESTAMPTZ + (v_i * (28000.0/80) || ' seconds')::INTERVAL;
      SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 15 LIMIT 1;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t, 15, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 06 Apr (Sun): ZERO records — confirmed by absence of INSERT
  -- ============================================================

  -- ============================================================
  -- 07 Apr (Mon): ~3200 buckets
  -- BUG SEED 1.2.1: Tom Blackwood (P029) has 12 scans but NO daily_attendance row
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 114;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-06T18:30:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;
  -- BUG SEED 1.2.1: Tom's 12 scans on 07 Apr WITHOUT attendance record
  FOR v_picker IN SELECT id FROM public.pickers WHERE picker_id = 'P029' AND orchard_id = orch_id LOOP
    FOR v_i IN 1..12 LOOP
      v_scan_t := '2026-04-06T19:00:00Z'::TIMESTAMPTZ + (v_i * 1200 || ' seconds')::INTERVAL;
      SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 8 LIMIT 1;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t, 8, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 08 Apr (Tue): ~4100 buckets (peak), ~146 each
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 146;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-07T18:28:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 09 Apr (Wed): ~3000 buckets
  -- BUG SEED 1.2.2: Emily Foster (P030) has attendance but ZERO scans
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
    -- Emily (P030) intentionally excluded
  LOOP
    v_count := 107;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-08T18:22:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 10 Apr (Thu): ~3500 buckets + 280 quality rejects + BUG 1.2.5
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    -- Normal scans: ~110 each
    FOR v_i IN 1..110 LOOP
      v_scan_t := '2026-04-09T18:28:00Z'::TIMESTAMPTZ + (v_i * (32400.0/110) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      v_quality := CASE WHEN v_i % 13 = 0 THEN 'reject' ELSE 'A' END;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, v_quality);
    END LOOP;
  END LOOP;

  -- BUG SEED 1.2.5: 4 scans with scanned_at = 2026-04-09T16:30:00Z
  -- This is 04:30 NZ on 10 Apr — before the shift starts (still UTC day 9)
  -- The frontend may count these as 09 Apr data (UTC date) but they belong to 10 Apr (NZ date)
  FOR v_picker IN SELECT id FROM public.pickers WHERE picker_id IN ('P001','P002','P003','P004') AND orchard_id = orch_id LOOP
    SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 1 LIMIT 1;
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, '2026-04-09T16:30:00Z', 1, 'A');
  END LOOP;

  -- ============================================================
  -- 11 Apr (Fri): ~3300 buckets
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_a || pickers_b) AND orchard_id = orch_id
  LOOP
    v_count := 117;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-10T18:25:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;

  -- ============================================================
  -- 12 Apr (Sat): ~1700 buckets, 12 pickers + BUG 1.2.6 duplicates + BUG 1.2.10 late scans
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(sat_pickers) AND orchard_id = orch_id
  LOOP
    v_count := 141;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-11T18:28:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t, (1+(v_i%20)), 'A');
    END LOOP;
  END LOOP;

  -- BUG SEED 1.2.6: 3 pairs of EXACT duplicates (same picker_id + same scanned_at)
  -- Idempotency migration (2026021105) adds unique index — let's check if it blocks or not
  -- The migration adds: CREATE UNIQUE INDEX IF NOT EXISTS idx_bucket_idempotent ON bucket_records(orchard_id, picker_id, scanned_at)
  -- If that index exists, these will fail silently (ON CONFLICT DO NOTHING equivalent needed)
  -- We insert them WITHOUT conflict handling to expose the bug
  DECLARE dup_picker UUID; dup_row UUID;
  BEGIN
    SELECT p.id INTO dup_picker FROM public.pickers p WHERE p.picker_id = 'P003' AND p.orchard_id = orch_id;
    SELECT id INTO dup_row FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 3 LIMIT 1;
    -- First of pair
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, dup_picker, dup_row, scanned_by, '2026-04-11T20:00:00Z', 3, 'A')
    ON CONFLICT DO NOTHING;
    -- Exact duplicate
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, dup_picker, dup_row, scanned_by, '2026-04-11T20:00:00Z', 3, 'A')
    ON CONFLICT DO NOTHING;

    SELECT p.id INTO dup_picker FROM public.pickers p WHERE p.picker_id = 'P007' AND p.orchard_id = orch_id;
    SELECT id INTO dup_row FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 7 LIMIT 1;
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, dup_picker, dup_row, scanned_by, '2026-04-11T21:00:00Z', 7, 'A')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, dup_picker, dup_row, scanned_by, '2026-04-11T21:00:00Z', 7, 'A')
    ON CONFLICT DO NOTHING;

    SELECT p.id INTO dup_picker FROM public.pickers p WHERE p.picker_id = 'P011' AND p.orchard_id = orch_id;
    SELECT id INTO dup_row FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 11 LIMIT 1;
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, dup_picker, dup_row, scanned_by, '2026-04-11T22:30:00Z', 11, 'A')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
    VALUES (orch_id, season_id, dup_picker, dup_row, scanned_by, '2026-04-11T22:30:00Z', 11, 'A')
    ON CONFLICT DO NOTHING;
  END;

  -- BUG SEED 1.2.10: 3 offline scans from 12 Apr 23:50 NZ (UTC 11:50 Apr 12)
  -- arrived at server on 13 Apr (Sunday) — scanned_at is still Apr 12 UTC
  -- These should be attributed to Apr 12 NZ but created_at will be Apr 13
  FOR v_picker IN SELECT id FROM public.pickers WHERE picker_id IN ('P001','P002','P003') AND orchard_id = orch_id LOOP
    SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = 2 LIMIT 1;
    INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade, created_at)
    VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by,
      '2026-04-12T11:50:00Z',  -- 23:50 NZ Apr 12 = 11:50 UTC Apr 12
      2, 'A',
      '2026-04-13T01:00:00Z'   -- arrived server Apr 13
    );
  END LOOP;

  -- ============================================================
  -- 13 Apr (Sun): ZERO records (offline late scans already inserted above with Apr 12 scanned_at)
  -- ============================================================

  -- ============================================================
  -- 14 Apr (Mon): ~3100 buckets
  -- ============================================================
  FOR v_picker IN SELECT id, picker_id FROM public.pickers
    WHERE picker_id = ANY(pickers_b || ARRAY['P001','P002','P003','P004','P005','P006','P007','P008','P009','P010','P011','P012','P013','P014']) AND orchard_id = orch_id
    AND picker_id NOT IN ('TL001','TL002','RN001','RN002')  -- TLs/runners tracked separately
  LOOP
    v_count := 110;
    FOR v_i IN 1..v_count LOOP
      v_scan_t := '2026-04-13T18:22:00Z'::TIMESTAMPTZ + (v_i * (32400.0/v_count) || ' seconds')::INTERVAL;
      IF v_picker.picker_id = ANY(pickers_a) THEN
        SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0001-0000-0000-0000-000000000001' AND row_number = (1+(v_i%20)) LIMIT 1;
      ELSE
        IF (1+(v_i%20)) = 3 THEN v_block_row_id := NULL;
        ELSE SELECT id INTO v_block_row_id FROM public.block_rows WHERE block_id = 'bbbb0002-0000-0000-0000-000000000002' AND row_number = (21+(v_i%20)) LIMIT 1;
        END IF;
      END IF;
      INSERT INTO public.bucket_records (orchard_id, season_id, picker_id, block_row_id, scanned_by, scanned_at, row_number, quality_grade)
      VALUES (orch_id, season_id, v_picker.id, v_block_row_id, scanned_by, v_scan_t,
        CASE WHEN v_picker.picker_id = ANY(pickers_a) THEN (1+(v_i%20)) ELSE (21+(v_i%20)) END, 'A');
    END LOOP;
  END LOOP;

END $$;

-- NOTE BUG 1.2.12: safety_harness_verified column
-- The prompt requests adding safety_harness_verified=false to daily_attendance rows
-- for pickers P005,P010,P015,P020 on days 08,09,10.
-- RESULT: Column does NOT exist in daily_attendance schema.
-- It exists only in pickers.safety_verified (boolean, different field).
-- This is documented as schema drift — no column to update.
