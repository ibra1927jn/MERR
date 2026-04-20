-- ═════════════════════════════════════════════════════════════════════════
-- HP-SEC-03 ROLLBACK — Restore original open policies on chats
-- ═════════════════════════════════════════════════════════════════════════
--
-- EMERGENCY USE ONLY. Re-opens the RLS on `chats`. Run only if the
-- tight policy causes a regression that blocks a release.
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

DROP POLICY IF EXISTS chats_authenticated_select ON public.chats;

CREATE POLICY "Enable all for authenticated users" ON public.chats
  FOR ALL
  USING (true);

CREATE POLICY "Enable read access for all users" ON public.chats
  FOR SELECT
  USING (true);

COMMIT;
