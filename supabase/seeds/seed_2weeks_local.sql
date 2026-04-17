-- =============================================
-- SEED: 2 semanas de datos realistas para desarrollo local
-- Orchard: Sunrise Apple Orchard
-- Periodo: 14 días terminando HOY (NZ time)
-- Pickers: 20 | Variedad: Royal Gala | ~450-600 buckets/día
-- =============================================

DO $$
DECLARE
  v_orchard_id    UUID := 'e1337e6a-54cc-431c-9c00-980e8ea270a4';
  v_manager_id    UUID := 'ca4d4673-321b-47bf-883b-4cf897f71a0e';
  v_season_id     UUID;
  v_block_a       UUID;
  v_block_b       UUID;
  v_team1_id      UUID;
  v_team2_id      UUID;
  v_tl1_id        UUID;
  v_tl2_id        UUID;
  v_runner1_id    UUID;
  v_runner2_id    UUID;
  v_picker_ids    UUID[];
  v_row_ids       UUID[];
  v_today         DATE := (NOW() AT TIME ZONE 'Pacific/Auckland')::DATE;
  v_start_date    DATE;
  v_day           DATE;
  v_day_offset    INT;
  v_picker        RECORD;
  v_row_rec       RECORD;
  v_bucket_count  INT;
  v_hour          INT;
  v_scan_time     TIMESTAMPTZ;
  v_total_buckets INT := 0;
  i               INT;
  v_picker_names  TEXT[] := ARRAY[
    'Aroha Walker','Tane Williams','Sofia Brown','Liam Smith',
    'Maia Taylor','Nikau Wilson','Jade Thompson','Kai White',
    'Emma Harris','Matiu Martin','Isla Anderson','Rawiri Thomas',
    'Olivia Jackson','Wiremu Clark','Anika Robinson','Hemi Lewis',
    'Lily Young','Rua Hall','Zoe King','Te Koha Wright'
  ];
  v_daily_factor  DECIMAL;
  v_checkin       TIMESTAMPTZ;
  v_checkout      TIMESTAMPTZ;
  v_hours         DECIMAL;
BEGIN
  v_start_date := v_today - 13; -- 14 días incluyendo hoy

  RAISE NOTICE '=== SEED: Sunrise Apple Orchard — 2 semanas ===';
  RAISE NOTICE 'Periodo: % → %', v_start_date, v_today;

  -- ============================================
  -- 1. HARVEST SEASON
  -- ============================================
  INSERT INTO public.harvest_seasons (id, orchard_id, name, start_date, end_date, status)
  VALUES (
    gen_random_uuid(),
    v_orchard_id,
    'Apple Season 2026',
    v_start_date,
    v_today + 30,
    'active'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_season_id;

  IF v_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM public.harvest_seasons
    WHERE orchard_id = v_orchard_id AND status = 'active' LIMIT 1;
  END IF;
  RAISE NOTICE 'Season ID: %', v_season_id;

  -- ============================================
  -- 2. BLOCKS Y ROWS
  -- ============================================
  INSERT INTO public.orchard_blocks (id, orchard_id, season_id, name, total_rows, start_row, status)
  VALUES (gen_random_uuid(), v_orchard_id, v_season_id, 'Block A', 15, 1, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.orchard_blocks (id, orchard_id, season_id, name, total_rows, start_row, status)
  VALUES (gen_random_uuid(), v_orchard_id, v_season_id, 'Block B', 12, 16, 'active')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_block_a FROM public.orchard_blocks
    WHERE orchard_id = v_orchard_id AND name = 'Block A' LIMIT 1;
  SELECT id INTO v_block_b FROM public.orchard_blocks
    WHERE orchard_id = v_orchard_id AND name = 'Block B' LIMIT 1;

  -- Rows Block A (15 filas)
  FOR i IN 1..15 LOOP
    INSERT INTO public.block_rows (id, block_id, row_number, variety)
    VALUES (gen_random_uuid(), v_block_a, i, 'Royal Gala')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Rows Block B (12 filas)
  FOR i IN 1..12 LOOP
    INSERT INTO public.block_rows (id, block_id, row_number, variety)
    VALUES (gen_random_uuid(), v_block_b, i + 15, 'Braeburn')
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Blocks y rows creados';

  -- ============================================
  -- 3. STAFF — Team leaders + runners
  -- ============================================
  v_tl1_id  := gen_random_uuid();
  v_tl2_id  := gen_random_uuid();
  v_runner1_id := gen_random_uuid();
  v_runner2_id := gen_random_uuid();

  -- Auth users para staff (via insert directo — solo local)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud)
  VALUES
    (v_tl1_id,    'tl1@harvestpro.nz',     crypt('111111',gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
    (v_tl2_id,    'tl2@harvestpro.nz',     crypt('111111',gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
    (v_runner1_id,'runner1@harvestpro.nz', crypt('111111',gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
    (v_runner2_id,'runner2@harvestpro.nz', crypt('111111',gen_salt('bf')), NOW(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, email, full_name, role, orchard_id, is_active)
  VALUES
    (v_tl1_id,    'tl1@harvestpro.nz',     'James Tane',     'team_leader', v_orchard_id, true),
    (v_tl2_id,    'tl2@harvestpro.nz',     'Maria Aroha',    'team_leader', v_orchard_id, true),
    (v_runner1_id,'runner1@harvestpro.nz', 'Wiremu Heke',    'runner',      v_orchard_id, true),
    (v_runner2_id,'runner2@harvestpro.nz', 'Sofia Ngata',    'runner',      v_orchard_id, true)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================
  -- 4. PICKERS (20)
  -- ============================================
  v_picker_ids := ARRAY[]::UUID[];
  FOR i IN 1..20 LOOP
    DECLARE v_pid UUID := gen_random_uuid();
    BEGIN
      INSERT INTO public.pickers (
        id, picker_id, name, orchard_id, role,
        safety_verified, status, current_row
      )
      VALUES (
        v_pid,
        'LOC-' || LPAD(i::TEXT, 3, '0'),
        v_picker_names[i],
        v_orchard_id,
        'picker',
        true,
        'active',
        ((i - 1) % 27) + 1
      )
      ON CONFLICT (picker_id) DO UPDATE SET status = 'active'
      RETURNING id INTO v_pid;

      v_picker_ids := v_picker_ids || v_pid;
    END;
  END LOOP;

  -- Re-fetch picker ids en caso de conflict
  IF array_length(v_picker_ids, 1) IS NULL OR array_length(v_picker_ids, 1) < 20 THEN
    SELECT ARRAY_AGG(id ORDER BY picker_id) INTO v_picker_ids
    FROM public.pickers
    WHERE orchard_id = v_orchard_id AND picker_id LIKE 'LOC-%';
  END IF;

  RAISE NOTICE 'Pickers creados: %', array_length(v_picker_ids, 1);

  -- ============================================
  -- 5. ROW ASSIGNMENTS (rows → pickers array)
  -- ============================================
  FOR i IN 1..27 LOOP
    INSERT INTO public.row_assignments (
      orchard_id, season_id, row_number, assigned_pickers, status
    )
    VALUES (
      v_orchard_id, v_season_id, i,
      ARRAY[v_picker_ids[((i - 1) % 20) + 1]],
      'active'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ============================================
  -- 6. BUCKET RECORDS + ATTENDANCE — 14 días
  -- ============================================
  FOR v_day_offset IN 0..13 LOOP
    v_day := v_today - (13 - v_day_offset);

    -- Factor de variabilidad diaria (lunes bajo, viernes alto, finde no hay)
    CASE EXTRACT(DOW FROM v_day)::INT
      WHEN 0 THEN CONTINUE; -- domingo sin trabajo
      WHEN 1 THEN v_daily_factor := 0.7;  -- lunes
      WHEN 2 THEN v_daily_factor := 0.9;
      WHEN 3 THEN v_daily_factor := 1.0;
      WHEN 4 THEN v_daily_factor := 1.05;
      WHEN 5 THEN v_daily_factor := 1.1;  -- viernes
      WHEN 6 THEN v_daily_factor := 0.6;  -- sábado medio día
      ELSE v_daily_factor := 1.0;
    END CASE;

    -- Para hoy, solo datos de la mañana (día en curso)
    FOR i IN 1..20 LOOP
      -- Bucket records por picker
      v_bucket_count := (
        CASE
          WHEN i <= 5  THEN 28 + (random() * 12)::INT  -- top pickers
          WHEN i <= 12 THEN 18 + (random() * 10)::INT  -- mid pickers
          ELSE              8  + (random() * 8)::INT   -- new/slow pickers
        END * v_daily_factor
      )::INT;

      -- Hoy: solo la mitad (turno en curso)
      IF v_day = v_today THEN
        v_bucket_count := (v_bucket_count * 0.5)::INT;
      END IF;

      FOR j IN 1..v_bucket_count LOOP
        v_hour := 6 + ((j * 9) / GREATEST(v_bucket_count, 1));
        IF v_hour > 15 THEN v_hour := 15; END IF;

        v_scan_time := (
          v_day::TEXT || ' ' ||
          LPAD(v_hour::TEXT, 2, '0') || ':' ||
          LPAD((random() * 59)::INT::TEXT, 2, '0') || ':' ||
          LPAD((random() * 59)::INT::TEXT, 2, '0') ||
          '+12'
        )::TIMESTAMPTZ;

        INSERT INTO public.bucket_records (
          orchard_id, season_id, picker_id, scanned_at,
          row_number, quality_grade
        )
        VALUES (
          v_orchard_id, v_season_id, v_picker_ids[i],
          v_scan_time,
          ((i - 1) % 27) + 1,
          CASE
            WHEN random() < 0.55 THEN 'A'
            WHEN random() < 0.82 THEN 'B'
            WHEN random() < 0.96 THEN 'C'
            ELSE 'reject'
          END
        )
        ON CONFLICT (picker_id, scanned_at) DO NOTHING;
        v_total_buckets := v_total_buckets + 1;
      END LOOP;

      -- Attendance por picker
      IF v_day <= v_today THEN
        v_checkin  := (v_day::TEXT || ' 06:' || LPAD((20 + (random()*15)::INT)::TEXT,2,'0') || ':00+12')::TIMESTAMPTZ;
        v_hours    := CASE WHEN v_day = v_today THEN 4 + (random()*2)::DECIMAL
                          WHEN EXTRACT(DOW FROM v_day)::INT = 6 THEN 4 + (random()*1)::DECIMAL
                          ELSE 7.5 + (random()*1.5)::DECIMAL END;
        v_checkout := CASE WHEN v_day = v_today THEN NULL
                          ELSE v_checkin + (v_hours * INTERVAL '1 hour') END;

        INSERT INTO public.daily_attendance (
          picker_id, orchard_id, season_id, date, status,
          check_in, check_out, hours_worked
        )
        SELECT
          v_picker_ids[i], v_orchard_id, v_season_id, v_day,
          'present', v_checkin, v_checkout, v_hours
        WHERE NOT EXISTS (
          SELECT 1 FROM public.daily_attendance
          WHERE picker_id = v_picker_ids[i] AND date = v_day
        );
      END IF;
    END LOOP;

    -- Day closures para días pasados
    IF v_day < v_today THEN
      INSERT INTO public.day_closures (
        orchard_id, date, status, closed_by, closed_at,
        total_buckets, total_cost
      )
      SELECT
        v_orchard_id,
        v_day,
        'closed',
        v_manager_id,
        (v_day::TEXT || ' 16:30:00+12')::TIMESTAMPTZ,
        COUNT(*),
        COUNT(*) * 6.50
      FROM public.bucket_records
      WHERE orchard_id = v_orchard_id
        AND DATE(scanned_at AT TIME ZONE 'Pacific/Auckland') = v_day
      ON CONFLICT (orchard_id, date) DO NOTHING;
    END IF;

    RAISE NOTICE 'Día % completado', v_day;
  END LOOP;

  RAISE NOTICE '=== SEED COMPLETADO ===';
  RAISE NOTICE 'Total bucket records: %', v_total_buckets;
  RAISE NOTICE 'Pickers: 20 | Staff: 4 | Días: 14';
  RAISE NOTICE 'Login: manager@harvestpro.nz / 111111';
END $$;
