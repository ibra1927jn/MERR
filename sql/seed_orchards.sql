-- seed_orchards.sql
-- Populate orchards table with Central Pac sectors for Cooper Lane and more

-- 1. Ensure the default orchard exists
INSERT INTO public.orchards (id, name, location, total_rows, hectares)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Cooper Lane', 'Hastings, Hawkes Bay', 480, 12.5)
ON CONFLICT (id) DO NOTHING;

-- 2. Add more orchards from Central Pac for the selector
INSERT INTO public.orchards (id, name, location, total_rows, hectares) VALUES
    (gen_random_uuid(), 'Ormond Road', 'Gisborne', 320, 8.0),
    (gen_random_uuid(), 'Te Mata', 'Havelock North', 550, 15.0),
    (gen_random_uuid(), 'Brookfields', 'Meeanee', 280, 7.2),
    (gen_random_uuid(), 'Pakowhai', 'Hastings', 400, 10.5),
    (gen_random_uuid(), 'Maraekakaho', 'Hastings', 650, 18.0),
    (gen_random_uuid(), 'Omahu', 'Hastings', 220, 5.8),
    (gen_random_uuid(), 'Puketapu', 'Napier', 380, 9.5),
    (gen_random_uuid(), 'Bridge Pa', 'Hastings', 420, 11.0),
    (gen_random_uuid(), 'Fernhill', 'Hastings', 300, 7.8)
ON CONFLICT DO NOTHING;

-- 3. Verify
SELECT id, name, location, total_rows FROM public.orchards ORDER BY name;
