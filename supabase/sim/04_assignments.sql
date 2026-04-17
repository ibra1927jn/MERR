-- =============================================================================
-- SIM 04_assignments.sql — Row assignments for 14-day period
-- P001-P014 → Block A (rows 1-20), rotate every 3 days
-- P015-P028 → Block B (rows 21-40), rotate every 3 days
-- Block C (rows 41-60): NO assignments
-- BUG SEED 1.2.7: rows 5,6,7 of block A have status='completed' from day 05 but
--   assignments still exist (orphan completed assignment)
-- =============================================================================

-- Operational dates (no Sundays: 06 Apr and 13 Apr excluded)
-- Days: 01,02,03,04,05,07,08,09,10,11,12,14

-- For Block A pickers (P001-P014), assign rows 1-20 rotating every 3 days
-- Rotation groups:
--   Days 01-03: P001-P007 → rows 1-10, P008-P014 → rows 11-20
--   Days 04-06: P001-P007 → rows 11-20, P008-P014 → rows 1-10
--   Days 07-09: P001-P007 → rows 1-10, P008-P014 → rows 11-20
--   Days 10-12: P001-P007 → rows 11-20, P008-P014 → rows 1-10
--   Days 13-14: P001-P007 → rows 1-10, P008-P014 → rows 11-20

-- Using a simplified approach: one row_assignment per active day per block
-- assigned_pickers is an array of UUIDs

INSERT INTO public.row_assignments (
  orchard_id, season_id, block_row_id, row_number, side, assigned_pickers, completion_percentage, status
)
SELECT
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  br.id,
  br.row_number,
  'north',
  ARRAY(
    SELECT p.id FROM public.pickers p
    WHERE p.picker_id = ANY(
      CASE
        WHEN br.row_number BETWEEN 1 AND 10 THEN ARRAY['P001','P002','P003','P004','P005','P006','P007']
        ELSE ARRAY['P008','P009','P010','P011','P012','P013','P014']
      END
    )
  ),
  CASE
    -- BUG SEED 1.2.7: rows 5,6,7 show as 100% complete
    WHEN br.row_number IN (5, 6, 7) THEN 100
    ELSE 45
  END,
  CASE
    -- BUG SEED 1.2.7: rows 5,6,7 have status=completed from day 05 but are NOT removed
    WHEN br.row_number IN (5, 6, 7) THEN 'completed'
    ELSE 'active'
  END
FROM public.block_rows br
WHERE br.block_id = 'bbbb0001-0000-0000-0000-000000000001'
  AND br.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Block B assignments (P015-P028)
INSERT INTO public.row_assignments (
  orchard_id, season_id, block_row_id, row_number, side, assigned_pickers, completion_percentage, status
)
SELECT
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'aaaa0001-0000-0000-0000-000000000001',
  br.id,
  br.row_number,
  'south',
  ARRAY(
    SELECT p.id FROM public.pickers p
    WHERE p.picker_id = ANY(
      CASE
        WHEN br.row_number BETWEEN 21 AND 30 THEN ARRAY['P015','P016','P017','P018','P019','P020','P021']
        ELSE ARRAY['P022','P023','P024','P025','P026','P027','P028']
      END
    )
  ),
  38,
  'active'
FROM public.block_rows br
WHERE br.block_id = 'bbbb0002-0000-0000-0000-000000000002'
  AND br.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Block C: NO assignments (intentional — Fuji block not started)
-- Confirmed: no INSERT for bbbb0003-0000-0000-0000-000000000003
