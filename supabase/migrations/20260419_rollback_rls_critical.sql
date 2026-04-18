-- ============================================================================
-- ROLLBACK — Reverts 20260419_fix_rls_critical.sql
-- ============================================================================
-- If the RLS migration breaks the app (e.g. missed role not in policy set),
-- run this file via `docker exec -i supabase-db psql -U postgres < this.sql`.
--
-- It restores the previous wide-open policies. This is UNSAFE for production
-- (the audit flagged them as CRITICAL). Use only as an emergency rollback
-- while a proper fix is prepared.
-- ============================================================================

BEGIN;

-- Drop the new restrictive policies introduced by 20260419_fix_rls_critical.sql
DROP POLICY IF EXISTS alerts_insert_by_ops ON public.alerts;

DROP POLICY IF EXISTS break_logs_select_self_or_supervisor ON public.break_logs;
DROP POLICY IF EXISTS break_logs_insert_self_or_supervisor ON public.break_logs;
DROP POLICY IF EXISTS break_logs_update_manager ON public.break_logs;
DROP POLICY IF EXISTS break_logs_delete_admin ON public.break_logs;

DROP POLICY IF EXISTS bucket_runners_select ON public.bucket_runners;
DROP POLICY IF EXISTS bucket_runners_insert_manager ON public.bucket_runners;
DROP POLICY IF EXISTS bucket_runners_update_self_or_manager ON public.bucket_runners;
DROP POLICY IF EXISTS bucket_runners_delete_manager ON public.bucket_runners;

DROP POLICY IF EXISTS harvest_seasons_select_orchard ON public.harvest_seasons;

DROP POLICY IF EXISTS harvest_settings_select_orchard ON public.harvest_settings;
DROP POLICY IF EXISTS harvest_settings_write_authorized ON public.harvest_settings;

DROP POLICY IF EXISTS performance_metrics_select_orchard_staff ON public.performance_metrics;
DROP POLICY IF EXISTS performance_metrics_admin_write ON public.performance_metrics;

DROP POLICY IF EXISTS row_assignments_select_orchard ON public.row_assignments;

DROP POLICY IF EXISTS session_signatures_select ON public.session_signatures;
DROP POLICY IF EXISTS session_signatures_insert_self ON public.session_signatures;
DROP POLICY IF EXISTS session_signatures_admin_only_update_delete ON public.session_signatures;
DROP POLICY IF EXISTS session_signatures_admin_only_delete ON public.session_signatures;

DROP POLICY IF EXISTS sync_queue_self_select ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_self_insert ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_self_update ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_self_delete ON public.sync_queue;

DROP POLICY IF EXISTS teams_select_orchard ON public.teams;
DROP POLICY IF EXISTS teams_write_manager ON public.teams;

DROP POLICY IF EXISTS tractor_fleet_select_orchard ON public.tractor_fleet;
DROP POLICY IF EXISTS tractor_fleet_write_ops ON public.tractor_fleet;

-- Re-create the original open policies (mirror of pre-migration state)
CREATE POLICY "Allow all for alerts" ON public.alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage alerts" ON public.alerts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Managers can manage rows" ON public.block_rows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can read rows" ON public.block_rows FOR SELECT USING (true);

CREATE POLICY "Allow all for break_logs" ON public.break_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for broadcasts" ON public.broadcasts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage broadcasts" ON public.broadcasts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for bucket_runners" ON public.bucket_runners FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Managers can manage seasons" ON public.harvest_seasons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can read seasons for their orchard" ON public.harvest_seasons FOR SELECT USING (true);

CREATE POLICY "Managers can manage settings" ON public.harvest_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can read settings" ON public.harvest_settings FOR SELECT USING (true);

CREATE POLICY "Managers can manage blocks" ON public.orchard_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can read blocks" ON public.orchard_blocks FOR SELECT USING (true);

CREATE POLICY "Allow all for performance_metrics" ON public.performance_metrics FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for row_assignments" ON public.row_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone read row assignments" ON public.row_assignments FOR SELECT USING (true);

CREATE POLICY "Allow all for session_signatures" ON public.session_signatures FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for sync_queue" ON public.sync_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for tractor_fleet" ON public.tractor_fleet FOR ALL USING (true) WITH CHECK (true);

COMMIT;

-- ============================================================================
-- EOF
-- ============================================================================
