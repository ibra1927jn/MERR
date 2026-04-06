-- =============================================
-- MIGRATION: Security Hardening
-- Date: 2026-03-03
-- Fixes: Supabase Security Advisor issues
-- =============================================

-- ============================================
-- PART 1: Fix mutable search_path on all public functions
-- Wrapped in DO blocks to skip if function does not exist
-- ============================================

DO $$ BEGIN
  ALTER FUNCTION public.auto_update_updated_at() SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.bump_version() SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.bump_version_and_update_time() SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_orchard_bucket_counts(uuid, date) SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_picker_bucket_count(uuid, date) SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.unlock_account(text, text) SET search_path = '';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================
-- PART 2: Fix pickers_performance_today view
-- ============================================
DROP VIEW IF EXISTS public.pickers_performance_today;
CREATE VIEW public.pickers_performance_today WITH (security_invoker = true) AS
SELECT p.id,
    p.full_name,
    p.orchard_id,
    COALESCE(count(br.id), 0::bigint) AS buckets_today,
    COALESCE(
        sum(
            CASE
                WHEN br.quality_grade = 'A' THEN 1
                ELSE 0
            END
        ),
        0::bigint
    ) AS grade_a,
    COALESCE(
        sum(
            CASE
                WHEN br.quality_grade = 'B' THEN 1
                ELSE 0
            END
        ),
        0::bigint
    ) AS grade_b,
    COALESCE(
        sum(
            CASE
                WHEN br.quality_grade = 'C' THEN 1
                ELSE 0
            END
        ),
        0::bigint
    ) AS grade_c,
    COALESCE(
        sum(
            CASE
                WHEN br.quality_grade = 'reject' THEN 1
                ELSE 0
            END
        ),
        0::bigint
    ) AS rejects
FROM public.users p
    LEFT JOIN public.bucket_records br ON br.picker_id = p.id
    AND br.scanned_at::date = CURRENT_DATE
WHERE p.role = 'picker'
    AND p.is_active = true
GROUP BY p.id,
    p.full_name,
    p.orchard_id;

-- ============================================
-- PART 3: Performance — ensure key indexes exist
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bucket_records_scanned_at ON public.bucket_records (scanned_at);
CREATE INDEX IF NOT EXISTS idx_bucket_records_picker_orchard ON public.bucket_records (picker_id, orchard_id);
CREATE INDEX IF NOT EXISTS idx_bucket_records_quality ON public.bucket_records (quality_grade);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON public.daily_attendance (date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_orchard_date ON public.daily_attendance (orchard_id, date);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_orchard_active ON public.users (orchard_id, is_active);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON public.contracts (employee_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_orchard ON public.qc_inspections (orchard_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);

-- alerts table may not exist in all environments
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_alerts_orchard ON public.alerts (orchard_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;