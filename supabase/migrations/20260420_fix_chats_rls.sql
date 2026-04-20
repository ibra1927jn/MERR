-- ═════════════════════════════════════════════════════════════════════════
-- HP-SEC-03 — Tighten RLS on `chats` (audit 2026-04-20)
-- ═════════════════════════════════════════════════════════════════════════
--
-- The `chats` table currently has two policies that allow unrestricted
-- access to any caller:
--
--   POLICY "Enable all for authenticated users"  FOR ALL   USING (true)
--   POLICY "Enable read access for all users"    FOR SELECT USING (true)
--
-- Context: `chats` is a legacy table that is presently UNUSED
--   - 0 rows as of 2026-04-20
--   - 0 references in src/ (see audit AUDIT-harvestpro-2026-04.md HP-SEC-03)
--   - The active chat model uses `conversations` + `chat_messages`
--     which already have proper participant-scoped RLS.
--
-- This migration does the MINIMUM safe change: drop the two open policies
-- and create a deny-by-default configuration with an explicit
-- authenticated-SELECT allow. Inserts/updates/deletes become unavailable
-- except to `service_role` (which bypasses RLS).
--
-- Rationale for NOT dropping the table here:
--   - "Never delete data" rule of this sprint.
--   - Human should decide whether to DROP TABLE or migrate data
--     from conversations to chats (or vice versa).
--   - Tightening RLS is reversible; dropping the table is not.
--
-- Rollback: supabase/migrations/20260420_fix_chats_rls_rollback.sql
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop the open policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.chats;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chats;

-- 2. Ensure RLS is ON (should already be, but make explicit)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- 3. Allow SELECT only for authenticated users (not anon).
--    This matches the lowest-privilege-that-doesn't-break-tools stance.
CREATE POLICY chats_authenticated_select ON public.chats
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. No INSERT/UPDATE/DELETE policies created on purpose.
--    Any write path must be added explicitly when the table's purpose is clarified.
--    `service_role` (edge functions) bypasses RLS, so internal processes are unaffected.

-- 5. Self-verification: must have exactly 1 permissive policy (select) after this migration.
DO $$
DECLARE
  open_count int;
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO open_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'chats'
    AND cmd = 'ALL'
    AND (qual IS NULL OR qual = 'true');

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE schemaname='public' AND tablename='chats';

  IF open_count > 0 THEN
    RAISE EXCEPTION 'HP-SEC-03 fix failed: % open ALL policies still present on chats', open_count;
  END IF;

  IF policy_count <> 1 THEN
    RAISE EXCEPTION 'HP-SEC-03 fix failed: expected 1 policy on chats, got %', policy_count;
  END IF;

  RAISE NOTICE 'HP-SEC-03 fix verified: chats has 1 tight select policy.';
END $$;

COMMIT;
