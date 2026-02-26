-- SEED: Test Blocks & Rows for Default Orchard
-- Run this in Supabase SQL Editor AFTER all 7 phases are complete
-- Replace the orchard_id if yours differs from the default
-- Get the active season ID for the default orchard
DO $$
DECLARE v_orchard_id UUID := 'a0000000-0000-0000-0000-000000000001';
v_season_id UUID;
v_block_a_id UUID;
v_block_b_id UUID;
v_block_c_id UUID;
BEGIN -- Get active season
SELECT id INTO v_season_id
FROM public.harvest_seasons
WHERE orchard_id = v_orchard_id
    AND status = 'active'
    AND deleted_at IS NULL
LIMIT 1;
IF v_season_id IS NULL THEN RAISE EXCEPTION 'No active season found. Run Phase 2 first.';
END IF;
-- Block A: Lapins (rows 1-10)
INSERT INTO public.orchard_blocks (
        id,
        orchard_id,
        season_id,
        name,
        total_rows,
        start_row,
        color_code,
        status
    )
VALUES (
        gen_random_uuid(),
        v_orchard_id,
        v_season_id,
        'Block A',
        10,
        1,
        '#dc2626',
        'active'
    )
RETURNING id INTO v_block_a_id;
INSERT INTO public.block_rows (block_id, row_number, variety, target_buckets)
SELECT v_block_a_id,
    r,
    'Lapins',
    100
FROM generate_series(1, 10) AS r;
-- Block B: Sweetheart (rows 11-20)
INSERT INTO public.orchard_blocks (
        id,
        orchard_id,
        season_id,
        name,
        total_rows,
        start_row,
        color_code,
        status
    )
VALUES (
        gen_random_uuid(),
        v_orchard_id,
        v_season_id,
        'Block B',
        10,
        11,
        '#2563eb',
        'active'
    )
RETURNING id INTO v_block_b_id;
INSERT INTO public.block_rows (block_id, row_number, variety, target_buckets)
SELECT v_block_b_id,
    r,
    'Sweetheart',
    80
FROM generate_series(11, 20) AS r;
-- Block C: Mixed (rows 21-30, alternating varieties)
INSERT INTO public.orchard_blocks (
        id,
        orchard_id,
        season_id,
        name,
        total_rows,
        start_row,
        color_code,
        status
    )
VALUES (
        gen_random_uuid(),
        v_orchard_id,
        v_season_id,
        'Block C',
        10,
        21,
        '#16a34a',
        'idle'
    )
RETURNING id INTO v_block_c_id;
INSERT INTO public.block_rows (block_id, row_number, variety, target_buckets)
SELECT v_block_c_id,
    r,
    CASE
        WHEN r % 2 = 1 THEN 'Staccato'
        ELSE 'Skeena'
    END,
    120
FROM generate_series(21, 30) AS r;
RAISE NOTICE 'Seed complete: 3 blocks, 30 rows created for season %',
v_season_id;
END $$;
-- Verify
SELECT ob.name AS block_name,
    ob.total_rows,
    ob.color_code,
    ob.status,
    COUNT(br.id) AS rows_created,
    string_agg(DISTINCT br.variety, ', ') AS varieties
FROM public.orchard_blocks ob
    LEFT JOIN public.block_rows br ON br.block_id = ob.id
    AND br.deleted_at IS NULL
WHERE ob.deleted_at IS NULL
GROUP BY ob.id,
    ob.name,
    ob.total_rows,
    ob.color_code,
    ob.status
ORDER BY ob.start_row;