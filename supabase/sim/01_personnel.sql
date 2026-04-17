-- =============================================================================
-- SIM 01_personnel.sql — Orchard, blocks, rows, users, pickers
-- Auth user IDs (created via admin API after db reset):
--   manager@harvestpro.nz => 309c03b5-fc6f-4362-b02e-716005ba59b9
--   james@harvestpro.nz   => 78e8fdbd-b080-4083-9447-c26b7957f4a4
--   sarah@harvestpro.nz   => c1de2730-7599-42ca-b733-4449c09189e6
--   mike@harvestpro.nz    => 2a195086-6f6f-4037-99ab-286fce433da7
--   hemi@harvestpro.nz    => afc2c75a-69ee-4c17-a635-d6925d66ef84
-- =============================================================================

-- Orchard: Sunrise Apple Orchard (fixed UUID para idempotencia)
INSERT INTO public.orchards (id, code, name, location, total_blocks, total_rows)
VALUES (
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'SUNRISE',
  'Sunrise Apple Orchard',
  'Hawke''s Bay, New Zealand',
  3,
  60
)
ON CONFLICT (id) DO NOTHING;

-- Harvest season 2026
INSERT INTO public.harvest_seasons (id, orchard_id, name, start_date, end_date, status)
VALUES (
  'aaaa0001-0000-0000-0000-000000000001',
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  'Autumn 2026',
  '2026-03-01',
  '2026-05-31',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Blocks
INSERT INTO public.orchard_blocks (id, orchard_id, season_id, name, total_rows, start_row, status)
VALUES
  ('bbbb0001-0000-0000-0000-000000000001', 'e1337e6a-54cc-431c-9c00-980e8ea270a4', 'aaaa0001-0000-0000-0000-000000000001', 'A', 20, 1,  'active'),
  ('bbbb0002-0000-0000-0000-000000000002', 'e1337e6a-54cc-431c-9c00-980e8ea270a4', 'aaaa0001-0000-0000-0000-000000000001', 'B', 20, 21, 'active'),
  ('bbbb0003-0000-0000-0000-000000000003', 'e1337e6a-54cc-431c-9c00-980e8ea270a4', 'aaaa0001-0000-0000-0000-000000000001', 'C', 20, 41, 'idle')
ON CONFLICT (id) DO NOTHING;

-- Block A rows (rows 1-20, variety = Royal Gala)
INSERT INTO public.block_rows (id, block_id, row_number, variety, target_buckets)
SELECT
  gen_random_uuid(),
  'bbbb0001-0000-0000-0000-000000000001',
  n,
  'Royal Gala',
  100
FROM generate_series(1, 20) AS n
ON CONFLICT DO NOTHING;

-- Block B rows (rows 21-40, variety = Braeburn)
-- BUG SEED 1.2.3: row_number=23 (B-R03) gets variety=NULL intentionally
INSERT INTO public.block_rows (id, block_id, row_number, variety, target_buckets)
SELECT
  CASE WHEN n = 23 THEN 'cccc0023-0000-0000-0000-000000000023'::uuid ELSE gen_random_uuid() END,
  'bbbb0002-0000-0000-0000-000000000002',
  n,
  CASE WHEN n = 23 THEN NULL ELSE 'Braeburn' END,
  100
FROM generate_series(21, 40) AS n
ON CONFLICT DO NOTHING;

-- Block C rows (rows 41-60, variety = Fuji) — no assignments in 14 days
INSERT INTO public.block_rows (id, block_id, row_number, variety, target_buckets)
SELECT
  gen_random_uuid(),
  'bbbb0003-0000-0000-0000-000000000003',
  n,
  'Fuji',
  100
FROM generate_series(41, 60) AS n
ON CONFLICT DO NOTHING;

-- ============================================================
-- USERS (public.users — extends auth.users already created)
-- ============================================================

INSERT INTO public.users (id, email, full_name, role, orchard_id, is_active)
VALUES
  ('309c03b5-fc6f-4362-b02e-716005ba59b9', 'manager@harvestpro.nz', 'Alex Manager',   'manager',     'e1337e6a-54cc-431c-9c00-980e8ea270a4', true),
  ('78e8fdbd-b080-4083-9447-c26b7957f4a4', 'james@harvestpro.nz',   'James Wilson',   'team_leader', 'e1337e6a-54cc-431c-9c00-980e8ea270a4', true),
  ('c1de2730-7599-42ca-b733-4449c09189e6', 'sarah@harvestpro.nz',   'Sarah Ngapo',    'team_leader', 'e1337e6a-54cc-431c-9c00-980e8ea270a4', true),
  ('2a195086-6f6f-4037-99ab-286fce433da7', 'mike@harvestpro.nz',    'Mike O''Brien',  'runner',      'e1337e6a-54cc-431c-9c00-980e8ea270a4', true),
  ('afc2c75a-69ee-4c17-a635-d6925d66ef84', 'hemi@harvestpro.nz',    'Hemi Tane',      'runner',      'e1337e6a-54cc-431c-9c00-980e8ea270a4', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- HARVEST SETTINGS
-- ============================================================

INSERT INTO public.harvest_settings (orchard_id, min_wage_rate, piece_rate, min_buckets_per_hour, target_tons)
VALUES (
  'e1337e6a-54cc-431c-9c00-980e8ea270a4',
  23.95,
  6.50,
  3.6,
  40.0
)
ON CONFLICT (orchard_id) DO UPDATE SET
  min_wage_rate = EXCLUDED.min_wage_rate,
  piece_rate = EXCLUDED.piece_rate;

-- ============================================================
-- PICKERS: P001-P014 → James (team_leader_id = james), P015-P028 → Sarah
-- Nombres NZ realistas
-- ============================================================

INSERT INTO public.pickers (picker_id, name, orchard_id, team_leader_id, role, safety_verified, status)
VALUES
  ('P001','Liam Tane',        'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P002','Aroha Parata',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P003','Jake Ngata',       'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P004','Mere Williams',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P005','Rawiri Mason',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P006','Hana Brown',       'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P007','Wiremu Clarke',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P008','Ngaire Thompson',  'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P009','Tama Robinson',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P010','Rangi Taylor',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P011','Mihi Anderson',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P012','Tuini Harris',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P013','Hoani Wilson',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P014','Amiria Peters',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','78e8fdbd-b080-4083-9447-c26b7957f4a4','picker',true,'active'),
  ('P015','Kiri Tamati',      'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P016','Tane Heke',        'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P017','Rina Walker',      'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P018','Pita Nuku',        'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P019','Hemi Ruru',        'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P020','Aotea Morgan',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P021','Rongo Smith',      'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P022','Ngareta Jones',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P023','Tūhoe Black',      'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P024','Pareake Davis',    'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P025','Rere Thomas',      'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P026','Taura Ropata',     'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P027','Iwa Ngapo',        'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  ('P028','Kohi Murray',      'e1337e6a-54cc-431c-9c00-980e8ea270a4','c1de2730-7599-42ca-b733-4449c09189e6','picker',true,'active'),
  -- Casuals
  ('P029','Tom Blackwood',    'e1337e6a-54cc-431c-9c00-980e8ea270a4', NULL, 'picker', true, 'active'),
  ('P030','Emily Foster',     'e1337e6a-54cc-431c-9c00-980e8ea270a4', NULL, 'picker', true, 'active')
ON CONFLICT (picker_id) DO NOTHING;

-- BUG SEED 1.2.4: James Wilson desactivado desde 11 abr
-- (Se aplica luego en 03_attendance.sql tras insertar el check-out NULL del 11 abr)
