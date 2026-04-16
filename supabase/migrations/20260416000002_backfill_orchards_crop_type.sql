-- =============================================
-- Backfill orchards.crop_type desde harvest_settings.variety
-- ISSUE: crop_type NULL → Orchard Details muestra "Fruit Varieties: —"
-- harvest_settings.variety ya tiene datos (variety TEXT, ej: 'Cherry', 'Apple')
-- =============================================

UPDATE public.orchards o
SET crop_type = hs.variety
FROM public.harvest_settings hs
WHERE hs.orchard_id = o.id
  AND hs.variety IS NOT NULL
  AND o.crop_type IS NULL;

SELECT 'orchards.crop_type backfilled from harvest_settings' AS result;
