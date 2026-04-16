-- =============================================
-- v16 minor fixes — 2026-04-16
-- BUG-11: Limpiar row_assignments orphan con status='completed'
-- BUG-13: Valor por defecto en block_rows.variety para NULL
-- BUG-14: Añadir safety_harness_verified a daily_attendance
-- =============================================

-- BUG-11: Eliminar row_assignments con status='completed' que no tienen
-- correspondencia en block_rows (orphan records del sim de 14 dias)
DELETE FROM public.row_assignments ra
WHERE ra.status = 'completed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.block_rows br
    INNER JOIN public.orchard_blocks ob ON ob.id = br.block_id
    WHERE br.row_number = ra.row_number
      AND ob.orchard_id = ra.orchard_id
      AND br.deleted_at IS NULL
  );

-- BUG-13: Rellenar variety=NULL con 'Unknown' y añadir default
UPDATE public.block_rows
SET variety = 'Unknown'
WHERE variety IS NULL;

ALTER TABLE public.block_rows
ALTER COLUMN variety SET DEFAULT 'Unknown';

-- BUG-14: Añadir safety_harness_verified a daily_attendance (nullable por retrocompatibilidad)
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS safety_harness_verified BOOLEAN DEFAULT false;

SELECT 'v16 minor fixes applied' AS result;
