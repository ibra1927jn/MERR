-- ============================================================================
-- Migration: 20260328_quality_inspections_rls.sql
-- Problema: quality_inspections tiene RLS habilitado pero CERO policies.
-- Esto bloquea acceso a todos los usuarios (deny-by-default).
--
-- La tabla NO tiene orchard_id directo. El aislamiento de tenant se logra
-- via bucket_records.orchard_id (FK bucket_id) y users.orchard_id (FK inspector_id).
--
-- Policies creadas:
--   SELECT — miembros del orchard pueden leer inspecciones de sus buckets
--   INSERT — qc_inspector e inspectores pueden crear inspecciones
--   UPDATE — managers y admins pueden actualizar inspecciones de su orchard
-- ============================================================================

-- ── SELECT: usuarios autenticados ven inspecciones de su orchard ───────────
DROP POLICY IF EXISTS "quality_inspections_select" ON public.quality_inspections;
CREATE POLICY "quality_inspections_select" ON public.quality_inspections
  FOR SELECT
  TO authenticated
  USING (
    -- Via bucket: la inspeccion pertenece a un bucket de mi orchard
    EXISTS (
      SELECT 1 FROM public.bucket_records br
      WHERE br.id = quality_inspections.bucket_id
        AND br.orchard_id = ANY(get_user_orchard_ids())
    )
    OR
    -- Via inspector: yo cree esta inspeccion
    inspector_id = auth.uid()
  );

-- ── INSERT: solo qc_inspectors pueden crear inspecciones ──────────────────
DROP POLICY IF EXISTS "quality_inspections_insert" ON public.quality_inspections;
CREATE POLICY "quality_inspections_insert" ON public.quality_inspections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- El inspector debe ser el usuario autenticado
    inspector_id = auth.uid()
    -- Y el bucket debe pertenecer a un orchard al que tiene acceso
    AND EXISTS (
      SELECT 1 FROM public.bucket_records br
      WHERE br.id = quality_inspections.bucket_id
        AND br.orchard_id = ANY(get_user_orchard_ids())
    )
  );

-- ── UPDATE: managers/admins pueden modificar inspecciones de su orchard ────
DROP POLICY IF EXISTS "quality_inspections_update" ON public.quality_inspections;
CREATE POLICY "quality_inspections_update" ON public.quality_inspections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bucket_records br
      WHERE br.id = quality_inspections.bucket_id
        AND br.orchard_id = ANY(get_user_orchard_ids())
    )
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'manager', 'qc_inspector')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bucket_records br
      WHERE br.id = quality_inspections.bucket_id
        AND br.orchard_id = ANY(get_user_orchard_ids())
    )
  );
