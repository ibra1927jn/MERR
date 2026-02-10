-- PILOT DATA: ORCHARD & STAFF (COOPER LANE)
-- Run this in the Supabase SQL Editor to populate the pilot environment.

-- 1. PILOT ORCHARD
INSERT INTO public.orchards (id, code, name, location, total_blocks)
VALUES (
    'b1111111-1111-1111-1111-111111111111', 
    'COOPER_LANE_01', 
    'Cooper Lane Orchard', 
    'Hastings, Hawkes Bay', 
    12
)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location;

-- 2. PILOT STAFF (Pickers for testing)
-- Liam O.
INSERT INTO public.pickers (picker_id, name, orchard_id, safety_verified, status)
VALUES (
    '402', 
    'Liam O.', 
    'b1111111-1111-1111-1111-111111111111', 
    true, 
    'active'
)
ON CONFLICT (picker_id) DO NOTHING;

-- Maria R.
INSERT INTO public.pickers (picker_id, name, orchard_id, safety_verified, status)
VALUES (
    '405', 
    'Maria R.', 
    'b1111111-1111-1111-1111-111111111111', 
    true, 
    'active'
)
ON CONFLICT (picker_id) DO NOTHING;

-- Tane W.
INSERT INTO public.pickers (picker_id, name, orchard_id, safety_verified, status)
VALUES (
    '408', 
    'Tane W.', 
    'b1111111-1111-1111-1111-111111111111', 
    true, 
    'active'
)
ON CONFLICT (picker_id) DO NOTHING;

-- 3. INITIAL BINS
INSERT INTO public.bins (id, orchard_id, bin_code, status)
VALUES 
    (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'B-101', 'empty'),
    (gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'B-102', 'empty')
ON CONFLICT DO NOTHING;

SELECT 'Pilot Data (Cooper Lane) Ready' as status;
