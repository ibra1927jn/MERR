-- seed_today_local.sql — Registros de hoy y ayer para dev local
-- Orchard: e1337e6a-54cc-431c-9c00-980e8ea270a4 (Sunrise Apple Orchard)
-- Pickers: 20 activos
-- ON CONFLICT DO NOTHING — seguro para re-ejecutar

-- ============================================================
-- PARTE 1: Registros matutinos de hoy NZ (7 AM - noon NZ)
-- NZ = UTC+12 en abril (NZST)
-- 7:05 AM NZ = 2026-04-15 19:05 UTC
-- 11:55 AM NZ = 2026-04-15 23:55 UTC
-- ============================================================
INSERT INTO public.bucket_records (picker_id, orchard_id, row_number, quality_grade, scanned_by, scanned_at)
SELECT
    p.id,
    'e1337e6a-54cc-431c-9c00-980e8ea270a4',
    (1 + (n % 20)) AS row_number,
    CASE (n % 4) WHEN 0 THEN 'A' WHEN 1 THEN 'A' WHEN 2 THEN 'B' ELSE 'A' END,
    '35d0af50-4ca1-4862-a79c-76b622276d2f', -- scanned_by (primer picker como proxy)
    '2026-04-15 19:05:00+00'::timestamptz + (n * 170 * INTERVAL '1 second')
FROM
    generate_series(0, 199) AS n,
    LATERAL (
        SELECT id FROM public.pickers
        WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
          AND status = 'active'
        ORDER BY name
        LIMIT 1
        OFFSET (n % 20)
    ) AS p
WHERE '2026-04-15 19:05:00+00'::timestamptz + (n * 170 * INTERVAL '1 second') < '2026-04-15 23:55:00+00'::timestamptz
ON CONFLICT (picker_id, scanned_at) DO NOTHING;

-- ============================================================
-- PARTE 2: Registros recientes (últimas 2 horas desde NOW)
-- Para que el cálculo de velocity sea > 0
-- ============================================================
INSERT INTO public.bucket_records (picker_id, orchard_id, row_number, quality_grade, scanned_by, scanned_at)
SELECT
    p.id,
    'e1337e6a-54cc-431c-9c00-980e8ea270a4',
    (1 + (n % 20)) AS row_number,
    CASE (n % 3) WHEN 0 THEN 'A' WHEN 1 THEN 'A' ELSE 'B' END,
    '35d0af50-4ca1-4862-a79c-76b622276d2f',
    NOW() - INTERVAL '90 minutes' + (n * 65 * INTERVAL '1 second')
FROM
    generate_series(0, 79) AS n,
    LATERAL (
        SELECT id FROM public.pickers
        WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
          AND status = 'active'
        ORDER BY name
        LIMIT 1
        OFFSET (n % 20)
    ) AS p
ON CONFLICT (picker_id, scanned_at) DO NOTHING;

-- Verificación final
SELECT
    to_char(scanned_at AT TIME ZONE 'Pacific/Auckland', 'YYYY-MM-DD HH24:MI') as nz_time_sample,
    COUNT(*) as count
FROM public.bucket_records
WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND scanned_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1;

SELECT 'total_today_nz' as label, COUNT(*) as count
FROM public.bucket_records
WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND (scanned_at AT TIME ZONE 'Pacific/Auckland')::date = CURRENT_DATE;

SELECT 'in_velocity_window' as label, COUNT(*) as count
FROM public.bucket_records
WHERE orchard_id = 'e1337e6a-54cc-431c-9c00-980e8ea270a4'
  AND scanned_at > NOW() - INTERVAL '2 hours';
