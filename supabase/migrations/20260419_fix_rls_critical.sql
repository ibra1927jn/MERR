-- ============================================================================
-- FIX CRITICAL RLS — 14 open policies USING(true) WITH CHECK(true)
-- ============================================================================
-- Audit 2026-04-19 identified 14 tables with fully-open RLS policies. Any
-- authenticated user could read/write/delete rows, including `harvest_settings`
-- (affects payroll legality) and `sync_queue` (offline sync forgery vector).
--
-- This migration:
--   1. DROPS the open policies.
--   2. KEEPS existing restrictive policies where they're already correct.
--   3. CREATES new role/orchard-scoped policies for each table.
--
-- Helper functions used (already exist in DB, verified via pg_proc):
--   - get_auth_role()                  → current user's role (STABLE)
--   - get_my_orchard_id()              → current user's orchard_id
--   - is_admin()                       → role = 'admin'
--   - is_manager_or_leader()           → role IN ('manager','team_leader')
--   - is_hr_manager_or_admin()         → role IN ('manager','hr_admin','admin')
--
-- Postgres RLS combines multiple policies with OR. If we leave the open
-- `USING(true)` policies, restrictive ones are useless. We drop the open ones.
--
-- Rollback strategy:
--   If this breaks app: `supabase/migrations/20260419_rollback_rls_critical.sql`
--   contains the exact DROP + re-CREATE of the old open policies.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. alerts (orchard_id direct)
--    Reasoning:
--    - SELECT: any authenticated user in same orchard (needs to see team alerts)
--    - INSERT: manager/team_leader/admin (create alerts operationally)
--    - UPDATE/DELETE: manager/admin only (resolve/dismiss)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for alerts" ON public.alerts;
DROP POLICY IF EXISTS "Create alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can manage alerts" ON public.alerts;
-- Keep: "Read alerts" (SELECT orchard_id = get_my_orchard_id())
-- Keep: "Manage alerts" (ALL with orchard + manager/admin check)

DROP POLICY IF EXISTS alerts_insert_by_ops ON public.alerts;
CREATE POLICY alerts_insert_by_ops ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (
    orchard_id = get_my_orchard_id()
    AND get_auth_role() = ANY (ARRAY['manager', 'team_leader', 'admin'])
  );

-- ============================================================================
-- 2. block_rows (NO direct orchard_id — via block_id → orchard_blocks.orchard_id)
--    Reasoning:
--    - SELECT: orchard members (read layout of their orchard rows)
--    - WRITE: manager/admin (only they should manage physical rows)
-- ============================================================================
DROP POLICY IF EXISTS "Managers can manage rows" ON public.block_rows;
DROP POLICY IF EXISTS "Users can read rows" ON public.block_rows;
-- Keep: "Manage rows" and "Read rows" (both join to orchard_blocks and filter)

-- ============================================================================
-- 3. break_logs (NO direct orchard_id — via day_setup_id → day_setups.orchard_id)
--    Reasoning:
--    - SELECT: self (picker sees own breaks) + team_leader/manager same orchard
--    - INSERT: self (log my break) + team_leader/manager (log on behalf)
--    - UPDATE/DELETE: manager only (correct retroactively)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for break_logs" ON public.break_logs;

DROP POLICY IF EXISTS break_logs_select_self_or_supervisor ON public.break_logs;
CREATE POLICY break_logs_select_self_or_supervisor ON public.break_logs FOR SELECT
  USING (
    picker_id = auth.uid()
    OR (
      get_auth_role() = ANY (ARRAY['manager', 'team_leader', 'admin'])
      AND EXISTS (
        SELECT 1 FROM public.day_setups ds
        WHERE ds.id = break_logs.day_setup_id
          AND ds.orchard_id = get_my_orchard_id()
      )
    )
  );

DROP POLICY IF EXISTS break_logs_insert_self_or_supervisor ON public.break_logs;
CREATE POLICY break_logs_insert_self_or_supervisor ON public.break_logs FOR INSERT
  WITH CHECK (
    picker_id = auth.uid()
    OR get_auth_role() = ANY (ARRAY['manager', 'team_leader', 'admin'])
  );

DROP POLICY IF EXISTS break_logs_update_manager ON public.break_logs;
CREATE POLICY break_logs_update_manager ON public.break_logs FOR UPDATE
  USING (is_admin() OR get_auth_role() = 'manager')
  WITH CHECK (is_admin() OR get_auth_role() = 'manager');

DROP POLICY IF EXISTS break_logs_delete_admin ON public.break_logs;
CREATE POLICY break_logs_delete_admin ON public.break_logs FOR DELETE
  USING (is_admin());

-- ============================================================================
-- 4. broadcasts (orchard_id direct)
--    Reasoning:
--    - SELECT: any authenticated user in same orchard
--    - INSERT: manager/admin/hr_admin only (they send broadcasts)
--    - UPDATE/DELETE: manager/admin only
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Users can manage broadcasts" ON public.broadcasts;
-- Keep: "Users can view relevant broadcasts" + "Managers can send broadcasts"
-- Keep: broadcasts_{view,insert,update,delete}_policy (already role-checked)

-- ============================================================================
-- 5. bucket_runners (user_id + orchard_id direct)
--    Reasoning:
--    - SELECT: self OR same-orchard manager/team_leader
--    - UPDATE: self (update own status/location) OR manager
--    - INSERT/DELETE: manager/admin (add/remove runners from system)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for bucket_runners" ON public.bucket_runners;

DROP POLICY IF EXISTS bucket_runners_select ON public.bucket_runners;
CREATE POLICY bucket_runners_select ON public.bucket_runners FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      orchard_id = get_my_orchard_id()
      AND get_auth_role() = ANY (ARRAY['manager', 'team_leader', 'admin'])
    )
  );

DROP POLICY IF EXISTS bucket_runners_insert_manager ON public.bucket_runners;
CREATE POLICY bucket_runners_insert_manager ON public.bucket_runners FOR INSERT
  WITH CHECK (
    orchard_id = get_my_orchard_id()
    AND get_auth_role() = ANY (ARRAY['manager', 'admin'])
  );

DROP POLICY IF EXISTS bucket_runners_update_self_or_manager ON public.bucket_runners;
CREATE POLICY bucket_runners_update_self_or_manager ON public.bucket_runners FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (orchard_id = get_my_orchard_id() AND get_auth_role() = ANY (ARRAY['manager', 'admin']))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (orchard_id = get_my_orchard_id() AND get_auth_role() = ANY (ARRAY['manager', 'admin']))
  );

DROP POLICY IF EXISTS bucket_runners_delete_manager ON public.bucket_runners;
CREATE POLICY bucket_runners_delete_manager ON public.bucket_runners FOR DELETE
  USING (
    orchard_id = get_my_orchard_id()
    AND get_auth_role() = ANY (ARRAY['manager', 'admin'])
  );

-- ============================================================================
-- 6. harvest_seasons (orchard_id)
--    Reasoning:
--    - SELECT: any authenticated user in same orchard (see current season)
--    - WRITE: manager/admin (create/close seasons)
-- ============================================================================
DROP POLICY IF EXISTS "Managers can manage seasons" ON public.harvest_seasons;
DROP POLICY IF EXISTS "Users can read seasons for their orchard" ON public.harvest_seasons;
-- Keep: "Manage seasons" (existing, already restricted to orchard + role)

DROP POLICY IF EXISTS harvest_seasons_select_orchard ON public.harvest_seasons;
CREATE POLICY harvest_seasons_select_orchard ON public.harvest_seasons FOR SELECT
  USING (orchard_id = get_my_orchard_id() OR is_admin());

-- ============================================================================
-- 7. harvest_settings (orchard_id)  ⚠️ PAYROLL-CRITICAL
--    Reasoning:
--    - SELECT: any authenticated user in same orchard (UI shows rates)
--    - WRITE: manager/admin/payroll_admin only (they control wage floor + rates)
-- ============================================================================
DROP POLICY IF EXISTS "Managers can manage settings" ON public.harvest_settings;
DROP POLICY IF EXISTS "Users can read settings" ON public.harvest_settings;
DROP POLICY IF EXISTS "Read Harvest Settings" ON public.harvest_settings;
DROP POLICY IF EXISTS "Manage Harvest Settings" ON public.harvest_settings;

DROP POLICY IF EXISTS harvest_settings_select_orchard ON public.harvest_settings;
CREATE POLICY harvest_settings_select_orchard ON public.harvest_settings FOR SELECT
  USING (orchard_id = get_my_orchard_id() OR is_admin());

DROP POLICY IF EXISTS harvest_settings_write_authorized ON public.harvest_settings;
CREATE POLICY harvest_settings_write_authorized ON public.harvest_settings FOR ALL
  USING (
    orchard_id = get_my_orchard_id()
    AND get_auth_role() = ANY (ARRAY['manager', 'admin', 'payroll_admin'])
  )
  WITH CHECK (
    orchard_id = get_my_orchard_id()
    AND get_auth_role() = ANY (ARRAY['manager', 'admin', 'payroll_admin'])
  );

-- ============================================================================
-- 8. orchard_blocks (orchard_id)
--    Reasoning:
--    - SELECT: any authenticated user in same orchard
--    - WRITE: manager/admin only
-- ============================================================================
DROP POLICY IF EXISTS "Managers can manage blocks" ON public.orchard_blocks;
DROP POLICY IF EXISTS "Users can read blocks" ON public.orchard_blocks;
-- Keep: "Manage blocks" and "Read blocks" (already have orchard+role checks)

-- ============================================================================
-- 9. performance_metrics (day_setup_id → day_setups.orchard_id)
--    Reasoning:
--    - SELECT: same-orchard manager/team_leader/admin (analytics)
--    - INSERT: service_role only (computed by edge functions) — by not creating
--      a permissive insert policy, only bypass-RLS roles (service_role) can insert.
--    - UPDATE/DELETE: admin only (audit correctness)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for performance_metrics" ON public.performance_metrics;

DROP POLICY IF EXISTS performance_metrics_select_orchard_staff ON public.performance_metrics;
CREATE POLICY performance_metrics_select_orchard_staff ON public.performance_metrics FOR SELECT
  USING (
    is_admin()
    OR (
      get_auth_role() = ANY (ARRAY['manager', 'team_leader'])
      AND EXISTS (
        SELECT 1 FROM public.day_setups ds
        WHERE ds.id = performance_metrics.day_setup_id
          AND ds.orchard_id = get_my_orchard_id()
      )
    )
  );

DROP POLICY IF EXISTS performance_metrics_admin_write ON public.performance_metrics;
CREATE POLICY performance_metrics_admin_write ON public.performance_metrics FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
-- service_role bypasses RLS by default, so edge functions can still INSERT.

-- ============================================================================
-- 10. row_assignments (orchard_id — added in migration 20260414)
--     Reasoning:
--     - SELECT: any authenticated user in same orchard
--     - WRITE: team_leader/manager/admin
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for row_assignments" ON public.row_assignments;
DROP POLICY IF EXISTS "Anyone read row assignments" ON public.row_assignments;
-- Keep: "Managers manage row assignments" (already has role+exists check)

DROP POLICY IF EXISTS row_assignments_select_orchard ON public.row_assignments;
CREATE POLICY row_assignments_select_orchard ON public.row_assignments FOR SELECT
  USING (
    is_admin()
    OR orchard_id = get_my_orchard_id()
  );

-- ============================================================================
-- 11. session_signatures (signer_id = user who signs, day_setup_id)
--     Reasoning:
--     - SELECT: self (my own signatures) OR same-orchard manager/admin (audit)
--     - INSERT: self only (I sign on my behalf)
--     - UPDATE/DELETE: admin only (immutability)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for session_signatures" ON public.session_signatures;

DROP POLICY IF EXISTS session_signatures_select ON public.session_signatures;
CREATE POLICY session_signatures_select ON public.session_signatures FOR SELECT
  USING (
    signer_id = auth.uid()
    OR is_admin()
    OR (
      get_auth_role() = ANY (ARRAY['manager', 'admin'])
      AND EXISTS (
        SELECT 1 FROM public.day_setups ds
        WHERE ds.id = session_signatures.day_setup_id
          AND ds.orchard_id = get_my_orchard_id()
      )
    )
  );

DROP POLICY IF EXISTS session_signatures_insert_self ON public.session_signatures;
CREATE POLICY session_signatures_insert_self ON public.session_signatures FOR INSERT
  WITH CHECK (signer_id = auth.uid());

DROP POLICY IF EXISTS session_signatures_admin_only_update_delete ON public.session_signatures;
CREATE POLICY session_signatures_admin_only_update_delete ON public.session_signatures FOR UPDATE
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS session_signatures_admin_only_delete ON public.session_signatures;
CREATE POLICY session_signatures_admin_only_delete ON public.session_signatures FOR DELETE
  USING (is_admin());

-- ============================================================================
-- 12. sync_queue (user_id — each row is someone's pending sync)
--     Reasoning:
--     - SELECT: self only (my own queue; no one else's)
--     - INSERT: self only (enqueue my own sync ops — prevents forgery)
--     - UPDATE: self (mark synced=true) OR admin
--     - DELETE: self (cleanup my own completed items) OR admin
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for sync_queue" ON public.sync_queue;

DROP POLICY IF EXISTS sync_queue_self_select ON public.sync_queue;
CREATE POLICY sync_queue_self_select ON public.sync_queue FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS sync_queue_self_insert ON public.sync_queue;
CREATE POLICY sync_queue_self_insert ON public.sync_queue FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sync_queue_self_update ON public.sync_queue;
CREATE POLICY sync_queue_self_update ON public.sync_queue FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS sync_queue_self_delete ON public.sync_queue;
CREATE POLICY sync_queue_self_delete ON public.sync_queue FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- 13. teams (orchard_id)
--     Reasoning:
--     - SELECT: any authenticated user in same orchard
--     - WRITE: manager/admin only
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for teams" ON public.teams;

DROP POLICY IF EXISTS teams_select_orchard ON public.teams;
CREATE POLICY teams_select_orchard ON public.teams FOR SELECT
  USING (is_admin() OR orchard_id = get_my_orchard_id());

DROP POLICY IF EXISTS teams_write_manager ON public.teams;
CREATE POLICY teams_write_manager ON public.teams FOR ALL
  USING (
    is_admin() OR (
      orchard_id = get_my_orchard_id()
      AND get_auth_role() = 'manager'
    )
  )
  WITH CHECK (
    is_admin() OR (
      orchard_id = get_my_orchard_id()
      AND get_auth_role() = 'manager'
    )
  );

-- ============================================================================
-- 14. tractor_fleet (orchard_id)
--     Reasoning:
--     - SELECT: any authenticated user in same orchard (ops visibility)
--     - WRITE: logistics/manager/admin (operational control)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all for tractor_fleet" ON public.tractor_fleet;

DROP POLICY IF EXISTS tractor_fleet_select_orchard ON public.tractor_fleet;
CREATE POLICY tractor_fleet_select_orchard ON public.tractor_fleet FOR SELECT
  USING (is_admin() OR orchard_id = get_my_orchard_id());

DROP POLICY IF EXISTS tractor_fleet_write_ops ON public.tractor_fleet;
CREATE POLICY tractor_fleet_write_ops ON public.tractor_fleet FOR ALL
  USING (
    is_admin() OR (
      orchard_id = get_my_orchard_id()
      AND get_auth_role() = ANY (ARRAY['logistics', 'manager'])
    )
  )
  WITH CHECK (
    is_admin() OR (
      orchard_id = get_my_orchard_id()
      AND get_auth_role() = ANY (ARRAY['logistics', 'manager'])
    )
  );

-- ============================================================================
-- Verification: confirm no open ALL/true/true policies remain
-- ============================================================================
DO $$
DECLARE
  bad_count INT;
BEGIN
  SELECT count(*) INTO bad_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'alerts','block_rows','break_logs','broadcasts','bucket_runners',
      'harvest_seasons','harvest_settings','orchard_blocks','performance_metrics',
      'row_assignments','session_signatures','sync_queue','teams','tractor_fleet'
    )
    AND cmd = 'ALL'
    AND qual = 'true'
    AND (with_check = 'true' OR with_check IS NULL);

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % open ALL/true/true policies remain', bad_count;
  END IF;

  RAISE NOTICE 'OK: 0 open ALL/true/true policies remain on the 14 critical tables';
END $$;

COMMIT;

-- ============================================================================
-- EOF
-- ============================================================================
