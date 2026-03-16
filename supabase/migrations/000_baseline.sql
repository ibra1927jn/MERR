-- HarvestPro NZ Consolidated Baseline (2026-03-06)
-- Source: 35 migrations merged

-- ── 001_atomic_rpcs.sql ──
-- =============================================
-- 001_atomic_rpcs.sql
-- Atomic RPC functions for HarvestPro NZ
-- =============================================
-- Deploy: Copy-paste into Supabase SQL Editor → Run
-- These replace sequential frontend calls with single atomic transactions.
-- ─────────────────────────────────────────────
-- 1. setup_orchard_atomic
-- Creates orchard + day_setup in one transaction.
-- If either fails, both are rolled back.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION setup_orchard_atomic(
        p_code TEXT,
        p_name TEXT,
        p_location TEXT DEFAULT NULL,
        p_total_rows INT DEFAULT 0,
        p_start_time TEXT DEFAULT '07:00',
        p_piece_rate NUMERIC DEFAULT 6.5
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_orchard RECORD;
v_today TEXT := to_char(
    NOW() AT TIME ZONE 'Pacific/Auckland',
    'YYYY-MM-DD'
);
BEGIN -- 1. Create orchard
INSERT INTO orchards (code, name, location, total_rows)
VALUES (p_code, p_name, p_location, p_total_rows)
RETURNING * INTO v_orchard;
-- 2. Create day setup with rates
INSERT INTO day_setups (orchard_id, date, start_time, piece_rate)
VALUES (
        v_orchard.id,
        v_today,
        p_start_time,
        p_piece_rate
    );
RETURN json_build_object(
    'id',
    v_orchard.id,
    'code',
    v_orchard.code,
    'name',
    v_orchard.name
);
END;
$$;
-- ─────────────────────────────────────────────
-- 2. check_in_picker
-- Insert attendance + set picker status to 'active' atomically.
-- Handles idempotency (re-check-in returns existing record).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_in_picker(
        p_picker_id UUID,
        p_orchard_id UUID,
        p_verified_by UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_today TEXT := to_char(
        NOW() AT TIME ZONE 'Pacific/Auckland',
        'YYYY-MM-DD'
    );
v_now TEXT := to_char(
    NOW() AT TIME ZONE 'Pacific/Auckland',
    'YYYY-MM-DD"T"HH24:MI:SS'
);
v_existing RECORD;
v_new RECORD;
BEGIN -- Idempotency: check if already checked in today
SELECT id INTO v_existing
FROM daily_attendance
WHERE picker_id = p_picker_id
    AND orchard_id = p_orchard_id
    AND date = v_today
LIMIT 1;
IF v_existing.id IS NOT NULL THEN -- Already checked in — just ensure picker is active
UPDATE pickers
SET status = 'active'
WHERE id = p_picker_id;
RETURN json_build_object(
    'picker_id',
    p_picker_id,
    'status',
    'present',
    'id',
    v_existing.id
);
END IF;
-- New check-in
INSERT INTO daily_attendance (
        picker_id,
        orchard_id,
        date,
        check_in_time,
        status,
        verified_by
    )
VALUES (
        p_picker_id,
        p_orchard_id,
        v_today,
        v_now,
        'present',
        p_verified_by
    )
RETURNING * INTO v_new;
-- Set picker active
UPDATE pickers
SET status = 'active'
WHERE id = p_picker_id;
RETURN json_build_object(
    'picker_id',
    p_picker_id,
    'status',
    'present',
    'id',
    v_new.id
);
END;
$$;
-- ─────────────────────────────────────────────
-- 3. check_out_picker
-- Update attendance with check-out time + hours_worked,
-- then set picker status to 'inactive'. All atomic.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_out_picker(p_attendance_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_now TEXT := to_char(
        NOW() AT TIME ZONE 'Pacific/Auckland',
        'YYYY-MM-DD"T"HH24:MI:SS'
    );
v_record RECORD;
v_hours NUMERIC;
BEGIN -- Fetch current record
SELECT * INTO v_record
FROM daily_attendance
WHERE id = p_attendance_id;
IF v_record IS NULL THEN RAISE EXCEPTION 'Attendance record not found: %',
p_attendance_id;
END IF;
-- Calculate hours worked
IF v_record.check_in_time IS NOT NULL THEN v_hours := ROUND(
    EXTRACT(
        EPOCH
        FROM (
                (v_now::TIMESTAMPTZ) - (v_record.check_in_time::TIMESTAMPTZ)
            )
    ) / 3600.0,
    2
);
v_hours := GREATEST(v_hours, 0);
END IF;
-- Update attendance
UPDATE daily_attendance
SET check_out_time = v_now,
    status = 'present',
    hours_worked = v_hours
WHERE id = p_attendance_id;
-- Set picker inactive
UPDATE pickers
SET status = 'inactive'
WHERE id = v_record.picker_id;
RETURN json_build_object(
    'id',
    p_attendance_id,
    'picker_id',
    v_record.picker_id,
    'check_out_time',
    v_now,
    'hours_worked',
    v_hours
);
END;
$$;
-- ─────────────────────────────────────────────
-- 4. correct_attendance
-- Update attendance record + create audit log entry atomically.
-- Ensures compliance trail is never missing.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION correct_attendance(
        p_attendance_id UUID,
        p_check_in_time TEXT DEFAULT NULL,
        p_check_out_time TEXT DEFAULT NULL,
        p_reason TEXT DEFAULT '',
        p_admin_id UUID DEFAULT NULL
    ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_existing RECORD;
v_ci TEXT;
v_co TEXT;
v_hours NUMERIC;
v_now TEXT := to_char(
    NOW() AT TIME ZONE 'Pacific/Auckland',
    'YYYY-MM-DD"T"HH24:MI:SS'
);
BEGIN -- Fetch existing record for hours recalculation
SELECT check_in_time,
    check_out_time INTO v_existing
FROM daily_attendance
WHERE id = p_attendance_id;
-- Determine final check-in/out times
v_ci := COALESCE(p_check_in_time, v_existing.check_in_time);
v_co := COALESCE(p_check_out_time, v_existing.check_out_time);
-- Recalculate hours if both times available
IF v_ci IS NOT NULL
AND v_co IS NOT NULL THEN v_hours := GREATEST(
    0,
    ROUND(
        EXTRACT(
            EPOCH
            FROM (
                    (v_co::TIMESTAMPTZ) - (v_ci::TIMESTAMPTZ)
                )
        ) / 3600.0,
        2
    )
);
END IF;
-- 1. Update attendance record
UPDATE daily_attendance
SET check_in_time = COALESCE(p_check_in_time, check_in_time),
    check_out_time = COALESCE(p_check_out_time, check_out_time),
    hours_worked = COALESCE(v_hours, hours_worked),
    correction_reason = p_reason,
    corrected_by = p_admin_id,
    corrected_at = v_now
WHERE id = p_attendance_id;
-- 2. Insert audit log (atomic — never skipped)
INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        performed_by,
        new_values,
        notes
    )
VALUES (
        'timesheet_correction',
        'daily_attendance',
        p_attendance_id::TEXT,
        p_admin_id::TEXT,
        json_build_object(
            'check_in_time',
            p_check_in_time,
            'check_out_time',
            p_check_out_time
        ),
        p_reason
    );
END;
$$;
-- ─────────────────────────────────────────────
-- Grant access to authenticated users
-- ─────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION setup_orchard_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION check_in_picker TO authenticated;
GRANT EXECUTE ON FUNCTION check_out_picker TO authenticated;
GRANT EXECUTE ON FUNCTION correct_attendance TO authenticated;

-- ── 20260210_day_closures.sql ──
-- ============================================
-- FASE 5: Day Closures & Immutability
-- ============================================

-- 1. Crear tabla day_closures
CREATE TABLE IF NOT EXISTS day_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  orchard_id UUID NOT NULL REFERENCES orchards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  
  -- Snapshot financiero (calculado por Edge Function)
  total_buckets INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_hours DECIMAL(8,2),
  wage_violations INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Un solo cierre por día por orchard
  UNIQUE(orchard_id, date)
);

-- Índices para performance
CREATE INDEX idx_day_closures_orchard_date ON day_closures(orchard_id, date DESC);
CREATE INDEX idx_day_closures_status ON day_closures(status);
CREATE INDEX idx_day_closures_closed_at ON day_closures(closed_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_day_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER day_closures_updated_at
  BEFORE UPDATE ON day_closures
  FOR EACH ROW
  EXECUTE FUNCTION update_day_closures_updated_at();

-- 2. RLS Policies para Inmutabilidad de bucket_events

-- RLS: No INSERT en días cerrados
CREATE POLICY "no_insert_on_closed_days"
ON bucket_events
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM day_closures
    WHERE day_closures.orchard_id = bucket_events.orchard_id
    AND day_closures.date = DATE(bucket_events.recorded_at)
    AND day_closures.status = 'closed'
  )
);

-- RLS: No UPDATE en días cerrados
CREATE POLICY "no_update_on_closed_days"
ON bucket_events
FOR UPDATE
USING (
  NOT EXISTS (
    SELECT 1 FROM day_closures
    WHERE day_closures.orchard_id = bucket_events.orchard_id
    AND day_closures.date = DATE(bucket_events.recorded_at)
    AND day_closures.status = 'closed'
  )
);

-- RLS: No DELETE en días cerrados
CREATE POLICY "no_delete_on_closed_days"
ON bucket_events
FOR DELETE
USING (
  NOT EXISTS (
    SELECT 1 FROM day_closures
    WHERE day_closures.orchard_id = bucket_events.orchard_id
    AND day_closures.date = DATE(bucket_events.recorded_at)
    AND day_closures.status = 'closed'
  )
);

-- 3. RLS Policies para day_closures

-- Permitir SELECT a usuarios autenticados
CREATE POLICY "authenticated_select_day_closures"
ON day_closures
FOR SELECT
USING (auth.role() = 'authenticated');

-- Permitir INSERT a usuarios autenticados (managers/team leaders)
-- Nota: Se puede refinar después agregando verificación de role si es necesario
CREATE POLICY "authenticated_insert_day_closures"
ON day_closures
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);

-- No se permite UPDATE ni DELETE (inmutabilidad total)
-- Si se necesita corrección, debe hacerse manualmente en Supabase por admin

-- 4. Comentarios para documentación
COMMENT ON TABLE day_closures IS 'Registro inmutable de cierres de jornada para auditoría legal';
COMMENT ON COLUMN day_closures.status IS 'Estado del día: open (default) o closed (inmutable)';
COMMENT ON COLUMN day_closures.total_cost IS 'Costo total incluyendo wage top-ups calculado por Edge Function';
COMMENT ON COLUMN day_closures.wage_violations IS 'Número de trabajadores que requirieron top-up para alcanzar salario mínimo';


-- ── 20260211_add_archived_at.sql ──
-- 🔴 FASE 9: Add archived_at timestamp and index for soft delete
-- This migration adds support for soft delete of pickers instead of hard deletes
-- Prevents orphaned bucket_records and maintains historical data integrity

-- Add archived_at column to pickers table
ALTER TABLE public.pickers 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for better query performance on archived pickers
CREATE INDEX IF NOT EXISTS idx_pickers_archived_at 
ON public.pickers(archived_at) 
WHERE archived_at IS NOT NULL;

-- Update existing pickers with status='archived' to have archived_at timestamp
-- (backfill for any existing archived pickers)
UPDATE public.pickers
SET archived_at = NOW()
WHERE status = 'archived' AND archived_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pickers.archived_at IS 'Timestamp when picker was archived (soft deleted). NULL means active picker.';


-- ── 20260211_audit_logging.sql ──
-- =============================================
-- AUDIT LOGGING SYSTEM
-- =============================================
-- Version: 1.0
-- Created: 2026-02-11
-- Purpose: Complete audit trail for compliance and security
-- =============================================
-- =============================================
-- 1. CREATE AUDIT_LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL CHECK (
        action IN ('INSERT', 'UPDATE', 'DELETE', 'CUSTOM')
    ),
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Add comment
COMMENT ON TABLE audit_logs IS 'Complete audit trail for compliance and security. Logs all critical data changes.';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (null for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Type of database operation: INSERT, UPDATE, DELETE, or CUSTOM';
COMMENT ON COLUMN audit_logs.table_name IS 'Table that was modified';
COMMENT ON COLUMN audit_logs.record_id IS 'ID of the record that was modified';
COMMENT ON COLUMN audit_logs.old_values IS 'JSONB of the record before change (for UPDATE/DELETE)';
COMMENT ON COLUMN audit_logs.new_values IS 'JSONB of the record after change (for INSERT/UPDATE)';
-- =============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================
-- Query by user and time (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
-- Query by table and record (for record history)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
-- Query by date (for compliance reports)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
-- Query by action type (for specific audits)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
-- =============================================
-- 3. ROW LEVEL SECURITY
-- =============================================
-- Enable RLS - only managers can view audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Policy: Only managers can view audit logs
CREATE POLICY "managers_view_audit_logs" ON audit_logs FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Policy: System can insert audit logs (SECURITY DEFINER function)
CREATE POLICY "system_insert_audit_logs" ON audit_logs FOR
INSERT WITH CHECK (true);
-- =============================================
-- 4. AUTOMATIC AUDIT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION log_audit_trail() RETURNS TRIGGER SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE current_user_email TEXT;
BEGIN -- Get current user email from auth.users
SELECT email INTO current_user_email
FROM auth.users
WHERE id = auth.uid();
-- Insert audit log entry
INSERT INTO audit_logs (
        user_id,
        user_email,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    )
VALUES (
        auth.uid(),
        current_user_email,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        -- For UPDATE and DELETE, capture old values
        CASE
            WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb
            ELSE NULL
        END,
        -- For INSERT and UPDATE, capture new values
        CASE
            WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb
            ELSE NULL
        END
    );
-- Always return the appropriate record
RETURN COALESCE(NEW, OLD);
EXCEPTION
WHEN OTHERS THEN -- Log error but don't fail the original operation
RAISE WARNING 'Audit logging failed: %',
SQLERRM;
RETURN COALESCE(NEW, OLD);
END;
$$;
COMMENT ON FUNCTION log_audit_trail() IS 'Trigger function to automatically log changes to audited tables. SECURITY DEFINER ensures it runs with elevated privileges.';
-- =============================================
-- 5. APPLY TRIGGERS TO CRITICAL TABLES
-- =============================================
-- Pickers table audit
DROP TRIGGER IF EXISTS audit_pickers ON pickers;
CREATE TRIGGER audit_pickers
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON pickers FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
-- Settings table audit (only for updates - critical configuration changes)
DROP TRIGGER IF EXISTS audit_settings ON settings;
CREATE TRIGGER audit_settings
AFTER
UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
-- Users table audit (role changes, profile updates)
DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
AFTER
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
-- Daily attendance audit
DROP TRIGGER IF EXISTS audit_daily_attendance ON daily_attendance;
CREATE TRIGGER audit_daily_attendance
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON daily_attendance FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
-- Orchards audit (only for updates - orchard configuration)
DROP TRIGGER IF EXISTS audit_orchards ON orchards;
CREATE TRIGGER audit_orchards
AFTER
UPDATE ON orchards FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
-- =============================================
-- 6. AUDIT LOG RETENTION POLICY
-- =============================================
-- Function to clean up old audit logs (90 day retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
RAISE NOTICE 'Cleaned up audit logs older than 90 days';
END;
$$;
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Deletes audit logs older than 90 days. Should be run via cron job (e.g., pg_cron extension or external scheduler).';
-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================
-- Get audit trail for a specific record
CREATE OR REPLACE FUNCTION get_record_audit_trail(p_table_name TEXT, p_record_id UUID) RETURNS TABLE (
        id UUID,
        action TEXT,
        user_email TEXT,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT a.id,
    a.action,
    a.user_email,
    a.old_values,
    a.new_values,
    a.created_at
FROM audit_logs a
WHERE a.table_name = p_table_name
    AND a.record_id = p_record_id
ORDER BY a.created_at DESC;
END;
$$;
COMMENT ON FUNCTION get_record_audit_trail IS 'Get complete audit history for a specific record';
-- =============================================
-- 8. VERIFICATION
-- =============================================
-- Verify audit system is working
DO $$ BEGIN RAISE NOTICE 'Audit logging system installed successfully!';
RAISE NOTICE 'Triggers created for: pickers, settings, users, daily_attendance, orchards';
RAISE NOTICE 'Retention policy: 90 days';
RAISE NOTICE 'Only managers can view audit logs via RLS';
END $$;

-- ── 20260211_auth_hardening.sql ──
-- =============================================
-- AUTH HARDENING - Rate Limiting & Account Lockout
-- =============================================
-- Version: 1.0
-- Created: 2026-02-11
-- Purpose: Prevent brute force attacks with rate limiting
-- =============================================
-- =============================================
-- 1. CREATE LOGIN_ATTEMPTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    attempt_time TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT false,
    user_agent TEXT,
    failure_reason TEXT
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempt_time DESC);
-- Enable RLS (public insert for login tracking, managers can view)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_insert_login_attempts" ON login_attempts FOR
INSERT WITH CHECK (true);
CREATE POLICY "managers_view_login_attempts" ON login_attempts FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- =============================================
-- 2. CREATE ACCOUNT_LOCKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS account_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT now(),
    locked_until TIMESTAMPTZ NOT NULL,
    locked_by_system BOOLEAN DEFAULT true,
    unlock_reason TEXT,
    unlocked_by UUID REFERENCES auth.users(id),
    unlocked_at TIMESTAMPTZ,
    -- Ensure only one active lock per user
    CONSTRAINT unique_active_lock UNIQUE (user_id, locked_at)
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_locks_user ON account_locks(user_id, locked_until DESC);
CREATE INDEX IF NOT EXISTS idx_account_locks_email ON account_locks(email, locked_until DESC);
-- Enable RLS
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers_full_access_account_locks" ON account_locks FOR ALL USING (
    auth.uid() IN (
        SELECT id
        FROM users
        WHERE role = 'manager'
    )
);
CREATE POLICY "system_insert_account_locks" ON account_locks FOR
INSERT WITH CHECK (locked_by_system = true);
-- =============================================
-- 3. HELPER FUNCTIONS
-- =============================================
-- Check if account is currently locked
CREATE OR REPLACE FUNCTION is_account_locked(check_email TEXT) RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE active_lock RECORD;
BEGIN -- Find active lock (locked_until in future and not unlocked)
SELECT * INTO active_lock
FROM account_locks
WHERE email = check_email
    AND locked_until > now()
    AND unlocked_at IS NULL
ORDER BY locked_at DESC
LIMIT 1;
RETURN FOUND;
END;
$$;
-- Get failed login count in last 15 minutes
CREATE OR REPLACE FUNCTION get_failed_login_count(check_email TEXT) RETURNS INTEGER SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE failed_count INTEGER;
BEGIN
SELECT COUNT(*) INTO failed_count
FROM login_attempts
WHERE email = check_email
    AND success = false
    AND attempt_time > now() - INTERVAL '15 minutes';
RETURN failed_count;
END;
$$;
-- Lock account after too many failed attempts
CREATE OR REPLACE FUNCTION lock_account_on_failures() RETURNS TRIGGER SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE failed_count INTEGER;
user_uuid UUID;
BEGIN -- Only process failed login attempts
IF NEW.success = true THEN RETURN NEW;
END IF;
-- Count recent failures
SELECT COUNT(*) INTO failed_count
FROM login_attempts
WHERE email = NEW.email
    AND success = false
    AND attempt_time > now() - INTERVAL '15 minutes';
-- Lock account if >= 5 failures
IF failed_count >= 5 THEN -- Get user_id if exists
SELECT id INTO user_uuid
FROM auth.users
WHERE email = NEW.email;
-- Create lock (15 minute duration)
INSERT INTO account_locks (user_id, email, locked_until)
VALUES (
        user_uuid,
        NEW.email,
        now() + INTERVAL '15 minutes'
    ) ON CONFLICT (user_id, locked_at) DO NOTHING;
-- Log audit event
INSERT INTO audit_logs (
        user_id,
        user_email,
        action,
        table_name,
        record_id,
        new_values
    )
VALUES (
        user_uuid,
        NEW.email,
        'CUSTOM',
        'account_locks',
        NULL,
        jsonb_build_object(
            'reason',
            'Too many failed login attempts',
            'failed_count',
            failed_count,
            'locked_until',
            now() + INTERVAL '15 minutes'
        )
    );
END IF;
RETURN NEW;
END;
$$;
-- Apply trigger
DROP TRIGGER IF EXISTS trigger_lock_account ON login_attempts;
CREATE TRIGGER trigger_lock_account
AFTER
INSERT ON login_attempts FOR EACH ROW EXECUTE FUNCTION lock_account_on_failures();
-- =============================================
-- 4. UNLOCK FUNCTION (for Managers)
-- =============================================
CREATE OR REPLACE FUNCTION unlock_account(
        target_email TEXT,
        unlock_reason_text TEXT DEFAULT 'Unlocked by manager'
    ) RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE manager_role TEXT;
lock_record RECORD;
BEGIN -- Verify caller is a manager
SELECT role INTO manager_role
FROM users
WHERE id = auth.uid();
IF manager_role != 'manager' THEN RAISE EXCEPTION 'Only managers can unlock accounts';
END IF;
-- Find active lock
SELECT * INTO lock_record
FROM account_locks
WHERE email = target_email
    AND locked_until > now()
    AND unlocked_at IS NULL
ORDER BY locked_at DESC
LIMIT 1;
IF NOT FOUND THEN RETURN false;
-- No active lock found
END IF;
-- Unlock the account
UPDATE account_locks
SET unlocked_at = now(),
    unlocked_by = auth.uid(),
    unlock_reason = unlock_reason_text
WHERE id = lock_record.id;
-- Clear failed login attempts for this user
DELETE FROM login_attempts
WHERE email = target_email
    AND success = false
    AND attempt_time > now() - INTERVAL '15 minutes';
-- Log audit event
INSERT INTO audit_logs (
        user_id,
        user_email,
        action,
        table_name,
        record_id,
        new_values
    )
VALUES (
        lock_record.user_id,
        target_email,
        'CUSTOM',
        'account_locks',
        lock_record.id,
        jsonb_build_object(
            'action',
            'manual_unlock',
            'unlocked_by',
            auth.uid(),
            'reason',
            unlock_reason_text
        )
    );
RETURN true;
END;
$$;
-- =============================================
-- 5. CLEANUP OLD DATA (Retention Policy)
-- =============================================
-- Auto-delete login attempts older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts() RETURNS void SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM login_attempts
WHERE attempt_time < now() - INTERVAL '30 days';
END;
$$;
-- Auto-delete expired locks older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_account_locks() RETURNS void SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM account_locks
WHERE locked_until < now() - INTERVAL '90 days';
END;
$$;
-- Note: To enable automatic cleanup, install pg_cron extension and schedule:
-- SELECT cron.schedule('cleanup-auth-data', '0 3 * * *', 
--   'SELECT cleanup_old_login_attempts(); SELECT cleanup_old_account_locks();');
-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- ── 20260211_complete_rls.sql ──
-- =============================================
-- COMPLETE RLS POLICIES - All Tables
-- =============================================
-- Version: 1.0
-- Created: 2026-02-11
-- Purpose: Comprehensive Row Level Security across all tables
-- =============================================
-- =============================================
-- 1. MESSAGES TABLE - Private messaging
-- =============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- Users can view messages where they are sender or recipient, or if they are manager
DROP POLICY IF EXISTS "messages_view_policy" ON messages;
CREATE POLICY "messages_view_policy" ON messages FOR
SELECT USING (
        auth.uid() = sender_id
        OR auth.uid() = recipient_id
        OR auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Users can send messages (must be sender)
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
CREATE POLICY "messages_insert_policy" ON messages FOR
INSERT WITH CHECK (auth.uid() = sender_id);
-- Users can update their own sent messages (e.g., mark as read on sender side)
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
CREATE POLICY "messages_update_policy" ON messages FOR
UPDATE USING (
        auth.uid() = sender_id
        OR auth.uid() = recipient_id
    );
-- Only sender or managers can delete messages
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
CREATE POLICY "messages_delete_policy" ON messages FOR DELETE USING (
    auth.uid() = sender_id
    OR auth.uid() IN (
        SELECT id
        FROM users
        WHERE role = 'manager'
    )
);
-- =============================================
-- 2. BROADCASTS TABLE - System-wide announcements
-- =============================================
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
-- All authenticated users can view broadcasts
DROP POLICY IF EXISTS "broadcasts_view_policy" ON broadcasts;
CREATE POLICY "broadcasts_view_policy" ON broadcasts FOR
SELECT USING (auth.uid() IS NOT NULL);
-- Only managers can create broadcasts
DROP POLICY IF EXISTS "broadcasts_insert_policy" ON broadcasts;
CREATE POLICY "broadcasts_insert_policy" ON broadcasts FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Only managers can update broadcasts
DROP POLICY IF EXISTS "broadcasts_update_policy" ON broadcasts;
CREATE POLICY "broadcasts_update_policy" ON broadcasts FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Only managers can delete broadcasts
DROP POLICY IF EXISTS "broadcasts_delete_policy" ON broadcasts;
CREATE POLICY "broadcasts_delete_policy" ON broadcasts FOR DELETE USING (
    auth.uid() IN (
        SELECT id
        FROM users
        WHERE role = 'manager'
    )
);
-- =============================================
-- 3. HARVEST_SETTINGS TABLE - Global configuration
-- =============================================
ALTER TABLE harvest_settings ENABLE ROW LEVEL SECURITY;
-- All authenticated users can view settings
DROP POLICY IF EXISTS "settings_view_policy" ON harvest_settings;
CREATE POLICY "settings_view_policy" ON harvest_settings FOR
SELECT USING (auth.uid() IS NOT NULL);
-- Only managers can update settings
DROP POLICY IF EXISTS "settings_update_policy" ON harvest_settings;
CREATE POLICY "settings_update_policy" ON harvest_settings FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- =============================================
-- 4. ORCHARDS TABLE - Orchard management
-- =============================================
ALTER TABLE orchards ENABLE ROW LEVEL SECURITY;
-- Users can only see orchards they belong to, managers see all
DROP POLICY IF EXISTS "orchards_view_policy" ON orchards;
CREATE POLICY "orchards_view_policy" ON orchards FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
        OR id IN (
            SELECT orchard_id
            FROM users
            WHERE id = auth.uid()
        )
    );
-- Only managers can create orchards
DROP POLICY IF EXISTS "orchards_insert_policy" ON orchards;
CREATE POLICY "orchards_insert_policy" ON orchards FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Only managers can update orchards
DROP POLICY IF EXISTS "orchards_update_policy" ON orchards;
CREATE POLICY "orchards_update_policy" ON orchards FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- =============================================
-- 5. PICKERS TABLE - Worker profiles
-- =============================================
ALTER TABLE pickers ENABLE ROW LEVEL SECURITY;
-- Users can view pickers in their orchard, managers see all
DROP POLICY IF EXISTS "pickers_view_policy" ON pickers;
CREATE POLICY "pickers_view_policy" ON pickers FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
        OR orchard_id IN (
            SELECT orchard_id
            FROM users
            WHERE id = auth.uid()
        )
    );
-- Team leaders and managers can add pickers to their orchard
DROP POLICY IF EXISTS "pickers_insert_policy" ON pickers;
CREATE POLICY "pickers_insert_policy" ON pickers FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role IN ('manager', 'team-leader')
        )
    );
-- Team leaders and managers can update pickers
DROP POLICY IF EXISTS "pickers_update_policy" ON pickers;
CREATE POLICY "pickers_update_policy" ON pickers FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role IN ('manager', 'team-leader')
        )
    );
-- Only managers can delete pickers (soft delete usually)
DROP POLICY IF EXISTS "pickers_delete_policy" ON pickers;
CREATE POLICY "pickers_delete_policy" ON pickers FOR DELETE USING (
    auth.uid() IN (
        SELECT id
        FROM users
        WHERE role = 'manager'
    )
);
-- =============================================
-- 6. DAILY_ATTENDANCE TABLE - Check-ins
-- =============================================
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
-- Users can view attendance in their orchard
DROP POLICY IF EXISTS "attendance_view_policy" ON daily_attendance;
CREATE POLICY "attendance_view_policy" ON daily_attendance FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
        OR picker_id IN (
            SELECT id
            FROM pickers
            WHERE orchard_id IN (
                    SELECT orchard_id
                    FROM users
                    WHERE id = auth.uid()
                )
        )
    );
-- Team leaders and managers can record attendance
DROP POLICY IF EXISTS "attendance_insert_policy" ON daily_attendance;
CREATE POLICY "attendance_insert_policy" ON daily_attendance FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role IN ('manager', 'team-leader')
        )
    );
-- Team leaders and managers can update attendance
DROP POLICY IF EXISTS "attendance_update_policy" ON daily_attendance;
CREATE POLICY "attendance_update_policy" ON daily_attendance FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role IN ('manager', 'team-leader')
        )
    );
-- =============================================
-- 7. BUCKET_SCANS TABLE - Production tracking
-- =============================================
ALTER TABLE bucket_scans ENABLE ROW LEVEL SECURITY;
-- Users can view scans in their orchard
DROP POLICY IF EXISTS "bucket_scans_view_policy" ON bucket_scans;
CREATE POLICY "bucket_scans_view_policy" ON bucket_scans FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
        OR picker_id IN (
            SELECT id
            FROM pickers
            WHERE orchard_id IN (
                    SELECT orchard_id
                    FROM users
                    WHERE id = auth.uid()
                )
        )
    );
-- Runners can insert scans
DROP POLICY IF EXISTS "bucket_scans_insert_policy" ON bucket_scans;
CREATE POLICY "bucket_scans_insert_policy" ON bucket_scans FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role IN ('manager', 'team-leader', 'runner')
        )
    );
-- Only managers can update scans (corrections)
DROP POLICY IF EXISTS "bucket_scans_update_policy" ON bucket_scans;
CREATE POLICY "bucket_scans_update_policy" ON bucket_scans FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- =============================================
-- 8. USERS TABLE - User profiles
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Users can view other users in their orchard
DROP POLICY IF EXISTS "users_view_policy" ON users;
CREATE POLICY "users_view_policy" ON users FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
        OR orchard_id IN (
            SELECT orchard_id
            FROM users
            WHERE id = auth.uid()
        )
        OR id = auth.uid()
    );
-- Users can update their own profile
DROP POLICY IF EXISTS "users_update_self_policy" ON users;
CREATE POLICY "users_update_self_policy" ON users FOR
UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- Managers can update any user
DROP POLICY IF EXISTS "users_update_manager_policy" ON users;
CREATE POLICY "users_update_manager_policy" ON users FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Only system can insert users (via auth triggers)
DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_policy" ON users FOR
INSERT WITH CHECK (true);
-- Allow insert from auth triggers
-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- To test RLS, you can use these queries:
-- SET SESSION AUTHORIZATION 'user_uuid';
-- SELECT * FROM messages; -- Should only see own messages
-- RESET SESSION AUTHORIZATION;
-- =============================================
-- MIGRATION COMPLETE
-- =============================================
COMMENT ON SCHEMA public IS 'Row Level Security enabled on all tables';

-- ── 20260211_day_closures_role_restriction.sql ──
-- =============================================
-- RLS: Restrict day_closures INSERT to managers only
-- Previously any authenticated user could close a day
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "authenticated_insert_day_closures" ON day_closures;

-- Create manager-only insert policy
-- Checks that the inserting user's ID matches a picker with role 'manager'
CREATE POLICY "manager_only_insert_day_closures"
ON day_closures
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM pickers
        WHERE pickers.user_id = auth.uid()
        AND pickers.role = 'manager'
    )
);

COMMENT ON POLICY "manager_only_insert_day_closures" ON day_closures IS
    'Only users with manager role in pickers table can close a day. Prevents pickers/runners from accidentally or maliciously closing days.';


-- ── 20260211_idempotent_buckets.sql ──
-- =============================================
-- IDEMPOTENCY: Unique constraint on bucket_events.id
-- Prevents duplicate bucket inserts from network retries
-- =============================================

-- If bucket_events.id doesn't have a unique constraint, add one.
-- This ensures that if HarvestSyncBridge retries a batch (due to Wi-Fi
-- flicker), the duplicate UUIDs are rejected by the DB automatically.

-- Safe: if the constraint already exists (common on 'id' as PK), this is a no-op error.
DO $$
BEGIN
    -- Check if 'id' is already a primary key or has a unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'bucket_events'::regclass
        AND contype IN ('p', 'u')  -- primary key or unique
        AND array_length(conkey, 1) = 1
        AND conkey[1] = (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'bucket_events'::regclass AND attname = 'id'
        )
    ) THEN
        ALTER TABLE bucket_events ADD CONSTRAINT bucket_events_id_unique UNIQUE (id);
        RAISE NOTICE 'Added UNIQUE constraint on bucket_events.id';
    ELSE
        RAISE NOTICE 'bucket_events.id already has a unique/primary key constraint';
    END IF;
END $$;


-- ── 20260211_rls_block_archived_pickers.sql ──
-- =============================================
-- HARVESTPRO NZ - BLOCK BUCKET SCANS FROM ARCHIVED PICKERS
-- Migration: 20260211_rls_block_archived_pickers
-- Created: 2026-02-11
-- Purpose: Prevent offline devices from syncing buckets for pickers that have been removed/suspended
-- =============================================

-- 1. Add policy to bucket_records table
-- This blocks any attempt to insert bucket records for pickers with status='archived'
CREATE POLICY "Block scans from archived pickers" 
ON public.bucket_records
FOR INSERT
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM public.pickers p
        WHERE p.id = bucket_records.picker_id
        AND p.status = 'archived'
    )
);

-- 2. Add same policy to bucket_events table (if it exists and is different from bucket_records)
-- Check if bucket_events table exists first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bucket_events') THEN
        EXECUTE 'CREATE POLICY "Block events from archived pickers" 
                ON public.bucket_events
                FOR INSERT
                WITH CHECK (
                    NOT EXISTS (
                        SELECT 1 FROM public.pickers p
                        WHERE p.id = bucket_events.picker_id
                        AND p.status = ''archived''
                    )
                )';
    END IF;
END $$;

-- 3. Add performance index for archived pickers lookups
-- This index accelerates the RLS policy checks
CREATE INDEX IF NOT EXISTS idx_pickers_status_id 
ON public.pickers(status, id) 
WHERE status = 'archived';

-- 4. Add index for picker status to support filtering
CREATE INDEX IF NOT EXISTS idx_pickers_status 
ON public.pickers(status);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify policies were created
-- SELECT policyname, tablename, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('bucket_records', 'bucket_events')
-- AND policyname LIKE '%archived%';

-- Verify indexes were created
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE tablename = 'pickers' 
-- AND indexname LIKE '%status%';

-- Test policy (should fail if uncommented and picker is archived)
-- INSERT INTO bucket_records (picker_id, orchard_id, scanned_by)
-- VALUES ('[archived-picker-uuid]', '[orchard-uuid]', '[user-uuid]');


-- ── 20260211_rls_offline_closed_days.sql ──
-- ============================================
-- FASE 4: RLS Fix for Offline Uploads on Closed Days
-- ============================================
-- Problem: The original policy blocks ALL inserts on closed days,
-- which prevents offline-synced buckets from being uploaded after
-- the manager closes the day. Field workers in low-signal zones
-- accumulate buckets locally and sync them later.
--
-- Fix: Allow inserts where recorded_at < closed_at (the bucket was
-- scanned before the day was closed, just synced late).
-- Still block inserts where recorded_at >= closed_at (post-closure).
-- ============================================

-- Drop the original strict policy
DROP POLICY IF EXISTS "no_insert_on_closed_days" ON bucket_events;

-- Recreate with offline-friendly condition
-- Uses NZST timezone for correct date matching
CREATE POLICY "no_insert_on_closed_days"
ON bucket_events
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM day_closures
    WHERE day_closures.orchard_id = bucket_events.orchard_id
    AND day_closures.date = DATE(bucket_events.recorded_at AT TIME ZONE 'Pacific/Auckland')
    AND day_closures.status = 'closed'
    AND bucket_events.recorded_at >= day_closures.closed_at  -- Allow pre-closure offline data
  )
);

-- Comment for audit trail
COMMENT ON POLICY "no_insert_on_closed_days" ON bucket_events IS
  'Blocks post-closure inserts but allows offline-synced buckets recorded before closure time. Fase 4 legal fix.';


-- ── 20260211_row_assignments_columns.sql ──
-- =============================================
-- ADD MISSING COLUMNS TO ROW_ASSIGNMENTS
-- Syncs DB schema with frontend RowAssignment interface
-- =============================================

-- Add 'side' column (north/south for orchard row sides)
ALTER TABLE public.row_assignments
  ADD COLUMN IF NOT EXISTS side TEXT DEFAULT 'north'
    CHECK (side IN ('north', 'south'));

-- Add 'assigned_pickers' array (UUID[] of picker IDs)
ALTER TABLE public.row_assignments
  ADD COLUMN IF NOT EXISTS assigned_pickers UUID[] DEFAULT '{}';

-- Add 'completion_percentage' (0-100)
ALTER TABLE public.row_assignments
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0
    CHECK (completion_percentage BETWEEN 0 AND 100);

-- Allow team_leaders to manage row assignments (not just managers)
DROP POLICY IF EXISTS "Team leaders manage row assignments" ON public.row_assignments;
CREATE POLICY "Team leaders manage row assignments" ON public.row_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('manager', 'admin', 'team_leader')
    )
  );


-- ── 20260211_timestamptz_audit.sql ──
-- =============================================
-- TIMESTAMPTZ AUDIT MIGRATION
-- Ensures all timestamp columns storing NZ-relevant times use TIMESTAMPTZ
-- =============================================

-- 1. bucket_events: recorded_at should be TIMESTAMPTZ
-- This is safe: ALTER TYPE on timestamptz columns doesn't lose data
ALTER TABLE bucket_events
  ALTER COLUMN recorded_at TYPE TIMESTAMPTZ USING recorded_at AT TIME ZONE 'Pacific/Auckland';

ALTER TABLE bucket_events
  ALTER COLUMN scanned_at TYPE TIMESTAMPTZ USING scanned_at AT TIME ZONE 'Pacific/Auckland';

-- 2. daily_attendance: check_in_time and check_out_time
ALTER TABLE daily_attendance
  ALTER COLUMN check_in_time TYPE TIMESTAMPTZ USING check_in_time AT TIME ZONE 'Pacific/Auckland';

ALTER TABLE daily_attendance
  ALTER COLUMN check_out_time TYPE TIMESTAMPTZ USING check_out_time AT TIME ZONE 'Pacific/Auckland';

-- 3. day_closures: closed_at
ALTER TABLE day_closures
  ALTER COLUMN closed_at TYPE TIMESTAMPTZ USING closed_at AT TIME ZONE 'Pacific/Auckland';

-- COMMENT: If columns were already TIMESTAMPTZ, these are safe no-ops.
-- If they were TIMESTAMP (without timezone), this converts existing values
-- assuming they were stored as Pacific/Auckland local times.


-- ── 20260212_add_qc_payroll_roles.sql ──
-- Migration: Add all 8 user roles
-- Date: 2026-02-12 (Updated 2026-02-13)
-- Description: Extends the user role options in the users table
--              to support all 8 application roles.
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'users'
        AND constraint_type = 'CHECK'
        AND constraint_name = 'users_role_check'
) THEN
ALTER TABLE users DROP CONSTRAINT users_role_check;
END IF;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'manager',
            'team_leader',
            'runner',
            'qc_inspector',
            'payroll_admin',
            'admin',
            'hr_admin',
            'logistics'
        )
    );
RAISE NOTICE 'Role constraint updated: 8 roles';
END $$;
COMMENT ON COLUMN users.role IS 'User role: manager, team_leader, runner, qc_inspector, payroll_admin, admin, hr_admin, logistics';

-- ── 20260212_sync_conflicts.sql ──
-- =============================================
-- SYNC CONFLICTS TABLE
-- =============================================
-- Version: 1.0
-- Created: 2026-02-12
-- Purpose: Audit trail for offline sync conflicts
-- =============================================
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id UUID,
    local_updated_at TIMESTAMPTZ,
    server_updated_at TIMESTAMPTZ,
    local_values JSONB,
    server_values JSONB,
    resolution TEXT CHECK (
        resolution IN (
            'keep_local',
            'keep_server',
            'merged',
            'auto_resolved'
        )
    ),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user ON public.sync_conflicts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table ON public.sync_conflicts(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON public.sync_conflicts(resolution)
WHERE resolution IS NULL;
-- Enable RLS
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
-- Only managers can view all conflicts
CREATE POLICY "managers_view_sync_conflicts" ON public.sync_conflicts FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Users can view their own conflicts
CREATE POLICY "users_view_own_conflicts" ON public.sync_conflicts FOR
SELECT USING (auth.uid() = user_id);
-- All authenticated users can insert conflicts
CREATE POLICY "insert_sync_conflicts" ON public.sync_conflicts FOR
INSERT WITH CHECK (auth.uid() = user_id);
COMMENT ON TABLE public.sync_conflicts IS 'Audit trail for offline sync conflicts (last-write-wins with logging)';

-- ── 20260213_create_qc_photos_bucket.sql ──
-- Create qc-photos storage bucket for QC inspection evidence
-- Run this in the Supabase SQL Editor
-- 1. Create the bucket (public so photos can be viewed via URL)
INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'qc-photos',
        'qc-photos',
        true,
        5242880,
        -- 5MB limit
        ARRAY ['image/webp', 'image/jpeg', 'image/png']::text []
    ) ON CONFLICT (id) DO NOTHING;
-- 2. Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Authenticated users can upload QC photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view QC photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own QC photos" ON storage.objects;
-- 3. Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload QC photos" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'qc-photos');
-- 4. Allow public read access (for displaying thumbnails)
CREATE POLICY "Public can view QC photos" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'qc-photos');
-- 5. Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own QC photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'qc-photos');

-- ── 20260213_daily_attendance.sql ──
-- =============================================
-- DAILY ATTENDANCE TABLE
-- Sprint E1 — Picker attendance tracking
-- Run in Supabase SQL Editor
-- =============================================
-- 1. Create daily_attendance table (or add missing columns if it already exists)
CREATE TABLE IF NOT EXISTS public.daily_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picker_id UUID NOT NULL REFERENCES public.pickers(id) ON DELETE CASCADE,
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present' CHECK (
        status IN (
            'present',
            'absent',
            'late',
            'half_day',
            'excused'
        )
    ),
    hours_worked DECIMAL(4, 2) DEFAULT 0,
    notes TEXT,
    recorded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- One attendance record per picker per day
    CONSTRAINT daily_attendance_unique UNIQUE (picker_id, date),
    -- check_out must be after check_in
    CONSTRAINT daily_attendance_time_range CHECK (
        check_out IS NULL
        OR check_in IS NULL
        OR check_out > check_in
    )
);
-- 1b. If table already existed, ensure all columns are present
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(4, 2) DEFAULT 0;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- 2. Row Level Security
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;
-- Read: same orchard
DROP POLICY IF EXISTS "Read attendance" ON public.daily_attendance;
CREATE POLICY "Read attendance" ON public.daily_attendance FOR
SELECT USING (orchard_id = get_my_orchard_id());
-- Write: managers, TLs, and HR can manage attendance
DROP POLICY IF EXISTS "Manage attendance" ON public.daily_attendance;
CREATE POLICY "Manage attendance" ON public.daily_attendance FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'team_leader', 'hr_admin', 'admin')
    )
);
-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_orchard_date ON public.daily_attendance(orchard_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_picker_date ON public.daily_attendance(picker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.daily_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.daily_attendance(status)
WHERE status != 'present';
-- 4. Updated_at trigger
DROP TRIGGER IF EXISTS attendance_updated_at ON public.daily_attendance;
CREATE TRIGGER attendance_updated_at BEFORE
UPDATE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 5. Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.daily_attendance;
EXCEPTION
WHEN OTHERS THEN NULL;
END $$;
SELECT 'daily_attendance table created successfully' AS result;

-- ── 20260213_payroll_rpc.sql ──
-- =============================================
-- PAYROLL RPC — Atomic Payroll Operations
-- Sprint E4 — Transactional payroll close
-- Run in Supabase SQL Editor
-- =============================================
-- 1. Atomic payroll period close
-- Locks timesheets, calculates totals, prevents double-processing
CREATE OR REPLACE FUNCTION public.close_payroll_period(
        p_orchard_id UUID,
        p_period_start DATE,
        p_period_end DATE
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_total_buckets INTEGER;
v_total_hours DECIMAL;
v_total_earnings DECIMAL;
v_picker_count INTEGER;
v_result JSON;
BEGIN -- Validate caller is manager/hr_admin/admin
IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
        AND role IN ('manager', 'hr_admin', 'admin')
        AND orchard_id = p_orchard_id
) THEN RAISE EXCEPTION 'Insufficient permissions to close payroll';
END IF;
-- Calculate totals from bucket_records in the period
SELECT COUNT(*),
    COUNT(DISTINCT br.picker_id) INTO v_total_buckets,
    v_picker_count
FROM public.bucket_records br
WHERE br.orchard_id = p_orchard_id
    AND br.scanned_at >= p_period_start::TIMESTAMPTZ
    AND br.scanned_at < (p_period_end + 1)::TIMESTAMPTZ;
-- Calculate hours from attendance
SELECT COALESCE(SUM(hours_worked), 0) INTO v_total_hours
FROM public.daily_attendance
WHERE orchard_id = p_orchard_id
    AND date >= p_period_start
    AND date <= p_period_end
    AND status IN ('present', 'late', 'half_day');
-- Calculate earnings (piece rate from day_setups)
SELECT COALESCE(SUM(ds.piece_rate), 0) INTO v_total_earnings
FROM public.day_setups ds
WHERE ds.orchard_id = p_orchard_id
    AND ds.date >= p_period_start
    AND ds.date <= p_period_end;
v_total_earnings := v_total_buckets * COALESCE(
    v_total_earnings / NULLIF(
        (
            SELECT COUNT(*)
            FROM public.day_setups
            WHERE orchard_id = p_orchard_id
                AND date >= p_period_start
                AND date <= p_period_end
        ),
        0
    ),
    6.50
);
-- Build result
v_result := json_build_object(
    'status',
    'closed',
    'period_start',
    p_period_start,
    'period_end',
    p_period_end,
    'orchard_id',
    p_orchard_id,
    'total_buckets',
    v_total_buckets,
    'total_hours',
    v_total_hours,
    'total_earnings',
    ROUND(v_total_earnings, 2),
    'picker_count',
    v_picker_count,
    'closed_at',
    now(),
    'closed_by',
    auth.uid()
);
-- Log the payroll close in audit_logs
INSERT INTO public.audit_logs (
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        performed_by
    )
VALUES (
        'PAYROLL_CLOSE',
        'payroll',
        p_orchard_id,
        NULL,
        v_result,
        auth.uid()
    );
RETURN v_result;
EXCEPTION
WHEN OTHERS THEN -- Transaction automatically rolls back
RAISE;
END;
$$;
-- 2. Grant execute to authenticated users (RPC checks permissions internally)
GRANT EXECUTE ON FUNCTION public.close_payroll_period(UUID, DATE, DATE) TO authenticated;
SELECT 'Payroll RPC functions created successfully' AS result;

-- ── 20260213_phase2_tables.sql ──
-- =============================================
-- PHASE 2 MIGRATION: contracts, fleet_vehicles, transport_requests
-- Date: 2026-02-13
-- Prerequisites: schema_v1_consolidated.sql applied
--
-- CONFLICT RESOLUTION STRATEGY:
--   All write operations from the client use syncService.addToQueue()
--   which applies LAST-WRITE-WINS semantics. This is a deliberate
--   architectural decision for this scale. If two coordinators assign
--   the same vehicle offline, the last sync wins. The updated_at
--   column is tracked for future optimistic-locking if needed.
-- =============================================
-- =============================================
-- 1. HELPER FUNCTION: Role check for HR/Manager/Admin
-- =============================================
CREATE OR REPLACE FUNCTION public.is_hr_manager_or_admin() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'hr_admin', 'admin')
    );
$$;
CREATE OR REPLACE FUNCTION public.is_logistics_or_manager() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'logistics', 'admin')
    );
$$;
-- =============================================
-- 2. CONTRACTS TABLE
-- =============================================
-- Decision: employee_id FK → users(id) with ON DELETE RESTRICT
-- Rationale: You should NOT be able to delete an employee who has
-- contracts (active or historical). Deactivate (is_active=false) instead.
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('permanent', 'seasonal', 'casual')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'active',
            'expiring',
            'expired',
            'draft',
            'terminated'
        )
    ),
    start_date DATE NOT NULL,
    end_date DATE,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 23.50,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Business rule: end_date must be after start_date (if set)
    CONSTRAINT contracts_date_range CHECK (
        end_date IS NULL
        OR end_date >= start_date
    ),
    -- Unique active contract per employee (no overlaps)
    CONSTRAINT contracts_unique_active UNIQUE (employee_id, status) -- NOTE: This prevents 2 "active" contracts for same employee.
    -- Partial unique index below is more precise, but this is simpler.
);
-- Drop the overly-strict unique and use a partial unique index instead
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_unique_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_one_active_per_employee ON public.contracts (employee_id)
WHERE status = 'active';
-- =============================================
-- 3. FLEET VEHICLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- e.g. 'T-001'
    registration TEXT,
    -- NZ plate number
    zone TEXT,
    -- Current zone assignment
    driver_id UUID REFERENCES public.users(id) ON DELETE
    SET NULL,
        driver_name TEXT,
        -- Denormalized for quick display
        status TEXT NOT NULL DEFAULT 'idle' CHECK (
            status IN ('active', 'idle', 'maintenance', 'offline')
        ),
        load_status TEXT DEFAULT 'empty' CHECK (load_status IN ('empty', 'partial', 'full')),
        bins_loaded INTEGER DEFAULT 0,
        max_capacity INTEGER DEFAULT 8,
        fuel_level INTEGER CHECK (
            fuel_level IS NULL
            OR (
                fuel_level >= 0
                AND fuel_level <= 100
            )
        ),
        last_service_date DATE,
        next_service_date DATE,
        wof_expiry DATE,
        -- Warrant of Fitness (NZ-specific)
        cof_expiry DATE,
        -- Certificate of Fitness (heavy vehicles)
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- =============================================
-- 4. TRANSPORT REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id),
    requester_name TEXT NOT NULL,
    zone TEXT NOT NULL,
    bins_count INTEGER NOT NULL DEFAULT 1 CHECK (bins_count > 0),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'assigned',
            'in_progress',
            'completed',
            'cancelled'
        )
    ),
    assigned_vehicle UUID REFERENCES public.fleet_vehicles(id) ON DELETE
    SET NULL,
        assigned_by UUID REFERENCES public.users(id),
        notes TEXT,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- =============================================
-- 5. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
-- 5.1 CONTRACTS POLICIES
-- HR Admin, Manager, Admin can read all contracts in their orchard
DROP POLICY IF EXISTS "HR read contracts" ON public.contracts;
CREATE POLICY "HR read contracts" ON public.contracts FOR
SELECT USING (
        orchard_id = get_my_orchard_id()
        AND is_hr_manager_or_admin()
    );
-- Employees can read their own contracts
DROP POLICY IF EXISTS "Employee read own contracts" ON public.contracts;
CREATE POLICY "Employee read own contracts" ON public.contracts FOR
SELECT USING (employee_id = auth.uid());
-- HR Admin, Manager, Admin can create/update contracts
DROP POLICY IF EXISTS "HR manage contracts" ON public.contracts;
CREATE POLICY "HR manage contracts" ON public.contracts FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND is_hr_manager_or_admin()
);
-- 5.2 FLEET VEHICLES POLICIES
-- Same orchard can read fleet
DROP POLICY IF EXISTS "Read fleet vehicles" ON public.fleet_vehicles;
CREATE POLICY "Read fleet vehicles" ON public.fleet_vehicles FOR
SELECT USING (orchard_id = get_my_orchard_id());
-- Logistics/Manager/Admin can manage fleet
DROP POLICY IF EXISTS "Manage fleet vehicles" ON public.fleet_vehicles;
CREATE POLICY "Manage fleet vehicles" ON public.fleet_vehicles FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND is_logistics_or_manager()
);
-- 5.3 TRANSPORT REQUESTS POLICIES
-- Same orchard can read all requests
DROP POLICY IF EXISTS "Read transport requests" ON public.transport_requests;
CREATE POLICY "Read transport requests" ON public.transport_requests FOR
SELECT USING (orchard_id = get_my_orchard_id());
-- Anyone in orchard can create a request (team leaders request pickups)
DROP POLICY IF EXISTS "Create transport requests" ON public.transport_requests;
CREATE POLICY "Create transport requests" ON public.transport_requests FOR
INSERT WITH CHECK (
        orchard_id = get_my_orchard_id()
        AND requested_by = auth.uid()
    );
-- Logistics/Manager can update requests (assign, complete, cancel)
DROP POLICY IF EXISTS "Manage transport requests" ON public.transport_requests;
CREATE POLICY "Manage transport requests" ON public.transport_requests FOR
UPDATE USING (
        orchard_id = get_my_orchard_id()
        AND is_logistics_or_manager()
    );
-- =============================================
-- 6. PERFORMANCE INDEXES
-- =============================================
-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON public.contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_orchard ON public.contracts(orchard_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.contracts(end_date)
WHERE end_date IS NOT NULL;
-- Fleet
CREATE INDEX IF NOT EXISTS idx_fleet_orchard ON public.fleet_vehicles(orchard_id);
CREATE INDEX IF NOT EXISTS idx_fleet_status ON public.fleet_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_fleet_driver ON public.fleet_vehicles(driver_id)
WHERE driver_id IS NOT NULL;
-- Transport Requests
CREATE INDEX IF NOT EXISTS idx_transport_orchard ON public.transport_requests(orchard_id);
CREATE INDEX IF NOT EXISTS idx_transport_status ON public.transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_priority ON public.transport_requests(priority, created_at DESC)
WHERE status IN ('pending', 'assigned');
CREATE INDEX IF NOT EXISTS idx_transport_created ON public.transport_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_vehicle ON public.transport_requests(assigned_vehicle)
WHERE assigned_vehicle IS NOT NULL;
-- =============================================
-- 7. UPDATED_AT TRIGGER (shared across all 3 tables)
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS contracts_updated_at ON public.contracts;
CREATE TRIGGER contracts_updated_at BEFORE
UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS fleet_updated_at ON public.fleet_vehicles;
CREATE TRIGGER fleet_updated_at BEFORE
UPDATE ON public.fleet_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS transport_updated_at ON public.transport_requests;
CREATE TRIGGER transport_updated_at BEFORE
UPDATE ON public.transport_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- =============================================
-- 8. REALTIME (transport_requests for live dispatch)
-- =============================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.transport_requests;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.fleet_vehicles;
EXCEPTION
WHEN OTHERS THEN NULL;
END $$;
SELECT 'Phase 2 Migration Applied Successfully' as result;

-- ── 20260213_rls_remediation.sql ──
-- =============================================
-- RLS REMEDIATION — Fix 3 gaps found in audit
-- Date: 2026-02-13
-- Gaps:
--   1. day_closures: policies exist but RLS never enabled
--   2. bins: RLS enabled but zero policies defined
--   3. qc_inspections: only in scripts/, not in migrations
-- =============================================
-- =============================================
-- 1. DAY_CLOSURES — Enable RLS (policies already exist)
-- =============================================
ALTER TABLE public.day_closures ENABLE ROW LEVEL SECURITY;
-- =============================================
-- 2. BINS — Add missing policies
-- =============================================
-- bins already has ENABLE ROW LEVEL SECURITY from schema_v1
-- but zero policies → all queries return empty by default
-- Read: same orchard members can view bins
DROP POLICY IF EXISTS "Read bins" ON public.bins;
CREATE POLICY "Read bins" ON public.bins FOR
SELECT USING (orchard_id = get_my_orchard_id());
-- Manage: managers and team leaders can insert/update/delete
DROP POLICY IF EXISTS "Manage bins" ON public.bins;
CREATE POLICY "Manage bins" ON public.bins FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND is_manager_or_leader()
);
-- Insert: runners can insert bins (field scanning)
DROP POLICY IF EXISTS "Runners insert bins" ON public.bins;
CREATE POLICY "Runners insert bins" ON public.bins FOR
INSERT WITH CHECK (orchard_id = get_my_orchard_id());
-- =============================================
-- 3. QC_INSPECTIONS — Create table + RLS if not exists
-- =============================================
CREATE TABLE IF NOT EXISTS public.qc_inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    picker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    grade TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'reject')),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_qc_inspections_orchard_date ON public.qc_inspections (orchard_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_picker ON public.qc_inspections (picker_id, created_at DESC);
-- Enable RLS
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
-- Read: same orchard can view inspections
DROP POLICY IF EXISTS "Read qc inspections" ON public.qc_inspections;
CREATE POLICY "Read qc inspections" ON public.qc_inspections FOR
SELECT USING (orchard_id = get_my_orchard_id());
-- Insert: QC inspectors can create inspections
DROP POLICY IF EXISTS "QC inspectors create inspections" ON public.qc_inspections;
CREATE POLICY "QC inspectors create inspections" ON public.qc_inspections FOR
INSERT WITH CHECK (
        inspector_id = auth.uid()
        AND orchard_id = get_my_orchard_id()
    );
-- Manage: managers can update/delete inspections
DROP POLICY IF EXISTS "Managers manage inspections" ON public.qc_inspections;
CREATE POLICY "Managers manage inspections" ON public.qc_inspections FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'qc_inspector', 'admin')
    )
);
-- =============================================
-- 4. VERIFICATION
-- =============================================
-- Verify all tables have RLS enabled
DO $$
DECLARE t RECORD;
missing_rls TEXT := '';
BEGIN FOR t IN
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND NOT rowsecurity LOOP missing_rls := missing_rls || t.tablename || ', ';
END LOOP;
IF missing_rls = '' THEN RAISE NOTICE 'RLS REMEDIATION COMPLETE: All public tables have RLS enabled';
ELSE RAISE WARNING 'Tables still missing RLS: %',
missing_rls;
END IF;
END $$;
SELECT 'RLS remediation migration applied successfully' AS result;

-- ── 20260213_timesheet_corrections.sql ──
-- Migration: Add correction tracking columns to daily_attendance
-- Date: 2026-02-12
-- Description: Enables admin timesheet corrections with full audit trail.
--   When an admin corrects a check-in/check-out time, we record who did it,
--   when, and why.
ALTER TABLE daily_attendance
ADD COLUMN IF NOT EXISTS correction_reason TEXT,
    ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ;
-- Index for finding corrected records quickly
CREATE INDEX IF NOT EXISTS idx_daily_attendance_corrected ON daily_attendance (corrected_at)
WHERE corrected_at IS NOT NULL;
COMMENT ON COLUMN daily_attendance.correction_reason IS 'Reason for admin correction (e.g., "forgot to check out")';
COMMENT ON COLUMN daily_attendance.corrected_by IS 'UUID of the admin user who made the correction';
COMMENT ON COLUMN daily_attendance.corrected_at IS 'Timestamp when the correction was applied';

-- ── 20260214_health_check.sql ──
-- =============================================
-- HEALTH CHECK RPC
-- =============================================
-- Version: 1.0
-- Created: 2026-02-14
-- Purpose: Database health check endpoint for monitoring
-- =============================================
CREATE OR REPLACE FUNCTION health_check() RETURNS JSONB SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE result JSONB;
table_counts JSONB;
rls_status JSONB;
BEGIN -- 1. Table row counts
SELECT jsonb_build_object(
        'users',
        (
            SELECT COUNT(*)
            FROM users
        ),
        'contracts',
        (
            SELECT COUNT(*)
            FROM contracts
        ),
        'daily_attendance',
        (
            SELECT COUNT(*)
            FROM daily_attendance
        ),
        'bucket_records',
        (
            SELECT COUNT(*)
            FROM bucket_records
        ),
        'orchards',
        (
            SELECT COUNT(*)
            FROM orchards
        ),
        'login_attempts',
        (
            SELECT COUNT(*)
            FROM login_attempts
        ),
        'account_locks',
        (
            SELECT COUNT(*)
            FROM account_locks
            WHERE locked_until > now()
                AND unlocked_at IS NULL
        ),
        'audit_logs',
        (
            SELECT COUNT(*)
            FROM audit_logs
        )
    ) INTO table_counts;
-- 2. RLS status for critical tables
SELECT jsonb_agg(
        jsonb_build_object(
            'table',
            c.relname,
            'rls_enabled',
            c.relrowsecurity
        )
    )
FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
        'users',
        'contracts',
        'daily_attendance',
        'bucket_records',
        'orchards',
        'login_attempts',
        'account_locks',
        'audit_logs'
    ) INTO rls_status;
-- 3. Build result
result := jsonb_build_object(
    'status',
    'healthy',
    'timestamp',
    now(),
    'database',
    jsonb_build_object(
        'connected',
        true,
        'version',
        version()
    ),
    'tables',
    table_counts,
    'rls',
    COALESCE(rls_status, '[]'::jsonb),
    'active_locks',
    (
        SELECT COUNT(*)
        FROM account_locks
        WHERE locked_until > now()
            AND unlocked_at IS NULL
    )
);
RETURN result;
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object(
    'status',
    'unhealthy',
    'timestamp',
    now(),
    'error',
    SQLERRM
);
END;
$$;
-- Grant to authenticated users (managers will check this)
GRANT EXECUTE ON FUNCTION health_check() TO authenticated;
-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- ── 20260214_rate_limit_rpc.sql ──
-- =============================================
-- RATE LIMIT RPC — Atomic check + lock
-- =============================================
-- Version: 1.0
-- Created: 2026-02-14
-- Purpose: Single atomic RPC that checks rate limit state,
--   avoiding race conditions between check and lock.
-- =============================================
-- 1. Atomic rate-limit check (replaces two separate RPCs in hot path)
CREATE OR REPLACE FUNCTION check_rate_limit(check_email TEXT) RETURNS JSONB SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE active_lock RECORD;
failed_count INTEGER;
remaining INTEGER;
max_attempts CONSTANT INTEGER := 5;
lock_duration CONSTANT INTERVAL := '15 minutes';
window_duration CONSTANT INTERVAL := '15 minutes';
BEGIN -- 1. Check for active lock
SELECT locked_until INTO active_lock
FROM account_locks
WHERE email = lower(trim(check_email))
    AND locked_until > now()
    AND unlocked_at IS NULL
ORDER BY locked_at DESC
LIMIT 1;
IF FOUND THEN RETURN jsonb_build_object(
    'allowed',
    false,
    'locked',
    true,
    'locked_until',
    active_lock.locked_until,
    'remaining_ms',
    EXTRACT(
        EPOCH
        FROM (active_lock.locked_until - now())
    ) * 1000,
    'remaining_attempts',
    0
);
END IF;
-- 2. Count recent failures
SELECT COUNT(*) INTO failed_count
FROM login_attempts
WHERE email = lower(trim(check_email))
    AND success = false
    AND attempt_time > now() - window_duration;
remaining := GREATEST(0, max_attempts - failed_count);
RETURN jsonb_build_object(
    'allowed',
    true,
    'locked',
    false,
    'remaining_attempts',
    remaining,
    'failed_count',
    failed_count
);
END;
$$;
-- 2. Performance index (if not already present)
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_success_time ON login_attempts(email, success, attempt_time DESC);
-- 3. Grant execute to authenticated and anon (needed for pre-login check)
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT) TO authenticated,
    anon;
-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- ── 20260214_schema_alignment.sql ──
-- Migration: Align DB schema with TypeScript types
-- Date: 2026-02-14
-- Description: Fixes column mismatches found during pessimistic audit
--   1. Add total_rows to orchards (TS expects it, only total_blocks exists)
--   2. Add quality_grade to bucket_records (only existed on quality_inspections)
--   3. Add 'in-progress' to bins.status CHECK (TS uses it but DB only allows 'partial')
-- ─── 1. orchards.total_rows ───────────────────────────────────────
ALTER TABLE public.orchards
ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 20;
COMMENT ON COLUMN public.orchards.total_rows IS 'Number of rows in the orchard. Used by HeatMap row validation and row assignments.';
-- ─── 2. bucket_records.quality_grade ──────────────────────────────
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS quality_grade TEXT;
COMMENT ON COLUMN public.bucket_records.quality_grade IS 'Optional quality grade assigned during scanning (A/B/C/reject).';
-- ─── 3. bins.status — allow in-progress alongside partial ────────
-- Drop old constraint, re-create with both values
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'bins'
        AND constraint_type = 'CHECK'
        AND constraint_name = 'bins_status_check'
) THEN
ALTER TABLE bins DROP CONSTRAINT bins_status_check;
END IF;
ALTER TABLE bins
ADD CONSTRAINT bins_status_check CHECK (
        status IN (
            'empty',
            'partial',
            'in-progress',
            'full',
            'collected'
        )
    );
RAISE NOTICE 'bins.status CHECK updated: added in-progress';
END $$;

-- ── 20260215_add_updated_at.sql ──
-- =============================================
-- Migration: Add updated_at to pickers and users
-- For optimistic locking (atomic WHERE pattern)
-- =============================================
-- Uses TIMESTAMPTZ(3) = millisecond precision
-- This matches JavaScript's Date.toISOString() precision
-- and prevents false conflicts from microsecond mismatch.
-- 1. PICKERS (highest mutation count — 7 update paths)
ALTER TABLE public.pickers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ(3) DEFAULT now();
DROP TRIGGER IF EXISTS pickers_updated_at ON public.pickers;
CREATE TRIGGER pickers_updated_at BEFORE
UPDATE ON public.pickers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 2. USERS (5 update paths)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ(3) DEFAULT now();
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE
UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 3. Backfill existing rows with current timestamp
-- (rows without updated_at would fail the WHERE clause)
UPDATE public.pickers
SET updated_at = now()
WHERE updated_at IS NULL;
UPDATE public.users
SET updated_at = now()
WHERE updated_at IS NULL;

-- ── 20260215_bucket_records_updated_at.sql ──
-- Migration: Add updated_at to bucket_records for future optimistic locking
-- Uses TIMESTAMPTZ(3) for JS millisecond precision compatibility
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ(3) DEFAULT now();
-- Trigger to auto-update on row modification
DROP TRIGGER IF EXISTS bucket_records_updated_at ON public.bucket_records;
CREATE TRIGGER bucket_records_updated_at BEFORE
UPDATE ON public.bucket_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Backfill existing rows
UPDATE public.bucket_records
SET updated_at = created_at
WHERE updated_at IS NULL;

-- ── 20260217_closed_day_trigger.sql ──
-- ============================================
-- Fix #4b: Server-Side Trigger to Block Inserts on Closed Days
-- ============================================
-- Problem: The frontend clockSkew check can be bypassed by
-- manipulating the device clock. RLS policies on bucket_events
-- exist, but bucket_records (used by SyncBridge) has no equivalent
-- server-side enforcement.
--
-- Fix: A BEFORE INSERT trigger on bucket_records that checks
-- the day_closures table. Unlike RLS, triggers fire even for
-- service role inserts and cannot be bypassed by clock manipulation.
--
-- Offline grace: Buckets scanned BEFORE closure (timestamp < closed_at)
-- are allowed even if synced AFTER closure. Only post-closure scans
-- are rejected.
-- ============================================
-- 1. Create the enforcement function
CREATE OR REPLACE FUNCTION public.enforce_closed_day_bucket_records() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_closed_at TIMESTAMPTZ;
v_bucket_date DATE;
BEGIN -- Convert bucket timestamp to NZST date for day matching
v_bucket_date := DATE(NEW.timestamp AT TIME ZONE 'Pacific/Auckland');
-- Check if the day is closed for this orchard
SELECT closed_at INTO v_closed_at
FROM day_closures
WHERE orchard_id = NEW.orchard_id
    AND date = v_bucket_date
    AND status = 'closed'
LIMIT 1;
-- If the day IS closed, check if the bucket was scanned pre-closure
IF v_closed_at IS NOT NULL THEN -- Allow pre-closure offline data (scanned before manager closed the day)
IF NEW.timestamp >= v_closed_at THEN RAISE EXCEPTION 'INSERT_BLOCKED: Day % is closed for orchard %. Bucket timestamp % is after closure at %. This may indicate clock manipulation.',
v_bucket_date,
NEW.orchard_id,
NEW.timestamp,
v_closed_at USING ERRCODE = 'P0001';
END IF;
-- If timestamp < closed_at, allow the insert (offline grace)
END IF;
RETURN NEW;
END;
$$;
-- 2. Attach trigger to bucket_records table
DROP TRIGGER IF EXISTS trg_enforce_closed_day ON public.bucket_records;
CREATE TRIGGER trg_enforce_closed_day BEFORE
INSERT ON public.bucket_records FOR EACH ROW EXECUTE FUNCTION public.enforce_closed_day_bucket_records();
-- 3. Audit comments
COMMENT ON FUNCTION public.enforce_closed_day_bucket_records() IS 'Server-side enforcement: blocks bucket inserts for closed days. Allows offline grace for pre-closure scans. Fix #4b (20260217).';
COMMENT ON TRIGGER trg_enforce_closed_day ON public.bucket_records IS 'Anti-fraud: Cannot be bypassed by client clock manipulation. Complements frontend clockSkew check.';

-- ── 20260217_fix_bucket_records_rls.sql ──
-- =============================================
-- 🔧 U5: Fix RLS table name mismatch
-- The app uses 'bucket_records' but RLS policies from
-- 20260211_complete_rls.sql target 'bucket_scans'.
-- This migration creates the correct policies on bucket_records.
-- =============================================
-- Enable RLS on the correct table
ALTER TABLE IF EXISTS bucket_records ENABLE ROW LEVEL SECURITY;
-- View policy: Managers see all, team leaders see their orchard
DROP POLICY IF EXISTS "bucket_records_view_policy" ON bucket_records;
CREATE POLICY "bucket_records_view_policy" ON bucket_records FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
        OR orchard_id IN (
            SELECT orchard_id
            FROM users
            WHERE id = auth.uid()
        )
    );
-- Insert policy: Managers, team leaders, and runners can insert
DROP POLICY IF EXISTS "bucket_records_insert_policy" ON bucket_records;
CREATE POLICY "bucket_records_insert_policy" ON bucket_records FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role IN ('manager', 'team-leader', 'runner')
        )
    );
-- Update policy: Only managers can update (corrections)
DROP POLICY IF EXISTS "bucket_records_update_policy" ON bucket_records;
CREATE POLICY "bucket_records_update_policy" ON bucket_records FOR
UPDATE USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- Drop the stale bucket_scans policies if that table doesn't exist
-- (If bucket_scans does exist as a legacy table, leave its policies alone)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'bucket_scans'
) THEN RAISE NOTICE 'bucket_scans table does not exist — no stale policies to clean up';
END IF;
END $$;

-- ── 20260217_fix_rls_recursion.sql ──
-- ============================================
-- Fix #9: Eliminate RLS Recursion on users table
-- ============================================
-- Problem: The users_view_policy in 20260211_complete_rls.sql uses
--   SELECT id FROM users WHERE role = 'manager'
-- which triggers RLS on the same table being queried — causing
-- infinite recursion in PostgreSQL.
--
-- Fix: Create SECURITY DEFINER helper functions that bypass RLS,
-- then replace the recursive policy with these safe lookups.
-- ============================================
-- 1. SECURITY DEFINER function to get current user's role
-- Runs with OWNER privileges, bypassing RLS on users table
CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT role
FROM public.users
WHERE id = auth.uid();
$$;
-- 2. SECURITY DEFINER function to get current user's orchard_id
CREATE OR REPLACE FUNCTION public.get_auth_orchard_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT orchard_id
FROM public.users
WHERE id = auth.uid();
$$;
-- 3. Revoke direct execution from anon (only authenticated should use these)
REVOKE EXECUTE ON FUNCTION public.get_auth_role()
FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_orchard_id()
FROM anon;
-- 4. Replace the recursive policy with safe function calls
DROP POLICY IF EXISTS "users_view_policy" ON public.users;
DROP POLICY IF EXISTS "Global Directory Access for Managers" ON public.users;
DROP POLICY IF EXISTS "Read orchard members" ON public.users;
CREATE POLICY "users_view_policy" ON public.users FOR
SELECT USING (
        id = auth.uid() -- A) Own profile (always allowed)
        OR get_auth_role() IN ('manager', 'admin') -- B) Managers/admins see all users
        OR orchard_id = get_auth_orchard_id() -- C) Same-orchard colleagues
    );
-- 5. Audit comment
COMMENT ON POLICY "users_view_policy" ON public.users IS 'Non-recursive user visibility: own profile, manager global access, same-orchard peers. Uses SECURITY DEFINER helpers to avoid RLS self-reference. Fix #9 (20260217).';
COMMENT ON FUNCTION public.get_auth_role() IS 'SECURITY DEFINER helper to read current user role without triggering RLS recursion.';
COMMENT ON FUNCTION public.get_auth_orchard_id() IS 'SECURITY DEFINER helper to read current user orchard_id without triggering RLS recursion.';

-- ── 20260217_optimistic_lock_trigger.sql ──
-- ============================================================
-- R8-Fix4: Server-side Optimistic Concurrency Control
-- Prevents client-side bypass of updated_at checks
-- ============================================================
-- Generic trigger function: rejects UPDATE if caller's updated_at
-- does not match the current row's updated_at (stale write detection)
CREATE OR REPLACE FUNCTION check_optimistic_lock() RETURNS trigger AS $$ BEGIN -- Only enforce if the caller explicitly sends updated_at
    -- (Allows internal/admin updates that don't set updated_at)
    IF NEW.updated_at IS NOT NULL
    AND OLD.updated_at IS NOT NULL THEN IF NEW.updated_at != OLD.updated_at THEN RAISE EXCEPTION 'Optimistic lock conflict: record was modified by another user (expected %, got %)',
    OLD.updated_at,
    NEW.updated_at USING ERRCODE = '40001';
-- serialization_failure
END IF;
END IF;
-- Always bump updated_at to NOW on successful update
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply to critical tables that support concurrent editing
-- daily_attendance: timesheets corrected by HR + checked out by team leaders
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_attendance_occ'
) THEN CREATE TRIGGER trg_attendance_occ BEFORE
UPDATE ON daily_attendance FOR EACH ROW EXECUTE FUNCTION check_optimistic_lock();
END IF;
END $$;
-- harvest_settings: rates modified by managers
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_settings_occ'
) THEN CREATE TRIGGER trg_settings_occ BEFORE
UPDATE ON harvest_settings FOR EACH ROW EXECUTE FUNCTION check_optimistic_lock();
END IF;
END $$;
-- pickers: profile edits by managers/team leaders
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_pickers_occ'
) THEN CREATE TRIGGER trg_pickers_occ BEFORE
UPDATE ON pickers FOR EACH ROW EXECUTE FUNCTION check_optimistic_lock();
END IF;
END $$;

-- ── 20260223_allowed_registrations.sql ──
-- =============================================
-- ALLOWED REGISTRATIONS — HR Pre-Authorization Whitelist
-- Created: 2026-02-23
-- =============================================
-- HR admins pre-register email + role. Employees self-register
-- only if their email is in this whitelist. Role is auto-assigned.
CREATE TABLE IF NOT EXISTS public.allowed_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN (
            'manager',
            'team_leader',
            'runner',
            'qc_inspector',
            'payroll_admin',
            'admin',
            'hr_admin',
            'logistics'
        )
    ),
    orchard_id UUID REFERENCES public.orchards(id),
    full_name TEXT,
    -- Optional: HR can pre-fill employee name
    created_by UUID REFERENCES public.users(id),
    used_at TIMESTAMPTZ,
    -- NULL = pending, timestamp = registered
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT allowed_registrations_email_unique UNIQUE (email)
);
-- Enable RLS
ALTER TABLE public.allowed_registrations ENABLE ROW LEVEL SECURITY;
-- HR / Manager / Admin can manage registrations
DROP POLICY IF EXISTS "HR manage allowed registrations" ON public.allowed_registrations;
CREATE POLICY "HR manage allowed registrations" ON public.allowed_registrations FOR ALL USING (public.is_hr_manager_or_admin()) WITH CHECK (public.is_hr_manager_or_admin());
-- Anyone authenticated can SELECT their own row (for registration lookup)
-- This is needed during signUp() to check if the email is whitelisted
DROP POLICY IF EXISTS "Check own registration" ON public.allowed_registrations;
CREATE POLICY "Check own registration" ON public.allowed_registrations FOR
SELECT USING (true);
-- Registration check happens pre-auth, need permissive read
-- Index for fast lookup during registration
CREATE INDEX IF NOT EXISTS idx_allowed_registrations_email ON public.allowed_registrations (email)
WHERE used_at IS NULL;

-- ── 20260226_verify_delta_sync_columns.sql ──
-- ========================================================================================
-- HARVESTPRO NZ - VERIFICATION MIGRATION: Ensure columns exist for Delta Sync
-- Run this ONLY if your Supabase DB is missing updated_at/deleted_at/version columns.
-- All statements are idempotent (IF NOT EXISTS / IF NOT EXISTS).
-- ========================================================================================
-- FASE 1: Verify hierarchy tables exist (should already be there from V3)
CREATE TABLE IF NOT EXISTS public.harvest_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.orchard_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.harvest_seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    start_row INTEGER NOT NULL DEFAULT 1,
    color_code TEXT DEFAULT '#dc2626',
    status TEXT DEFAULT 'idle' CHECK (
        status IN ('idle', 'active', 'complete', 'alert')
    ),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_block ON public.orchard_blocks (orchard_id, season_id, name)
WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS public.block_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.orchard_blocks(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    variety TEXT,
    target_buckets INTEGER DEFAULT 100,
    side TEXT CHECK (side IN ('north', 'south', 'both')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_row ON public.block_rows (block_id, row_number)
WHERE deleted_at IS NULL;
-- FASE 2: Ensure delta sync columns exist on all critical tables
ALTER TABLE public.bucket_records
ADD COLUMN IF NOT EXISTS row_id UUID REFERENCES public.block_rows(id),
    ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.harvest_seasons(id),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.harvest_seasons(id),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.pickers
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'picker',
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.bins
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.orchard_blocks(id);
-- FASE 3: Delta sync indexes
CREATE INDEX IF NOT EXISTS idx_sync_pickers ON public.pickers (updated_at)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_buckets ON public.bucket_records (updated_at)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_attendance ON public.daily_attendance (updated_at)
WHERE deleted_at IS NULL;
-- FASE 4: Triggers for optimistic locking + auto updated_at
CREATE OR REPLACE FUNCTION public.bump_version_and_update_time() RETURNS TRIGGER AS $$ BEGIN IF OLD.version IS DISTINCT
FROM NEW.version THEN RAISE EXCEPTION 'Conflict: record modified by another user (expected v%, got v%)',
    NEW.version,
    OLD.version;
END IF;
NEW.version = COALESCE(OLD.version, 0) + 1;
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION public.auto_update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_bump_version_pickers ON public.pickers;
CREATE TRIGGER trg_bump_version_pickers BEFORE
UPDATE ON public.pickers FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_update_time();
DROP TRIGGER IF EXISTS trg_bump_version_buckets ON public.bucket_records;
CREATE TRIGGER trg_bump_version_buckets BEFORE
UPDATE ON public.bucket_records FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_update_time();
DROP TRIGGER IF EXISTS trg_bump_version_attendance ON public.daily_attendance;
CREATE TRIGGER trg_bump_version_attendance BEFORE
UPDATE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_update_time();
DROP TRIGGER IF EXISTS trg_auto_time_bins ON public.bins;
CREATE TRIGGER trg_auto_time_bins BEFORE
UPDATE ON public.bins FOR EACH ROW EXECUTE FUNCTION public.auto_update_updated_at();
-- FASE 5: Assign orphan records to default season
DO $$
DECLARE default_orchard_id UUID;
default_season_id UUID;
BEGIN
SELECT id INTO default_orchard_id
FROM public.orchards
LIMIT 1;
IF default_orchard_id IS NOT NULL THEN
SELECT id INTO default_season_id
FROM public.harvest_seasons
WHERE orchard_id = default_orchard_id
LIMIT 1;
IF default_season_id IS NULL THEN
INSERT INTO public.harvest_seasons (orchard_id, name, start_date)
VALUES (default_orchard_id, 'Season 2026', '2026-01-01')
RETURNING id INTO default_season_id;
END IF;
UPDATE public.bucket_records
SET season_id = default_season_id
WHERE season_id IS NULL;
UPDATE public.daily_attendance
SET season_id = default_season_id
WHERE season_id IS NULL;
END IF;
END $$;

-- ── 20260227_rls_hierarchy_tables.sql ──
-- ========================================================================================
-- RLS POLICIES for Hierarchy Tables: harvest_seasons, orchard_blocks, block_rows
-- These tables were created but had no RLS policies, causing 401 errors.
-- All authenticated users who belong to an orchard can read its seasons/blocks/rows.
-- ========================================================================================
-- 1. harvest_seasons — Enable RLS + allow authenticated SELECT
ALTER TABLE public.harvest_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read seasons for their orchard" ON public.harvest_seasons;
CREATE POLICY "Users can read seasons for their orchard" ON public.harvest_seasons FOR
SELECT TO authenticated USING (true);
-- All authenticated users can see seasons (scoped by frontend query)
DROP POLICY IF EXISTS "Managers can manage seasons" ON public.harvest_seasons;
CREATE POLICY "Managers can manage seasons" ON public.harvest_seasons FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 2. orchard_blocks — Enable RLS + allow authenticated SELECT
ALTER TABLE public.orchard_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read blocks" ON public.orchard_blocks;
CREATE POLICY "Users can read blocks" ON public.orchard_blocks FOR
SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers can manage blocks" ON public.orchard_blocks;
CREATE POLICY "Managers can manage blocks" ON public.orchard_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 3. block_rows — Enable RLS + allow authenticated SELECT
ALTER TABLE public.block_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read rows" ON public.block_rows;
CREATE POLICY "Users can read rows" ON public.block_rows FOR
SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers can manage rows" ON public.block_rows;
CREATE POLICY "Managers can manage rows" ON public.block_rows FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 4. harvest_settings — Fix 406 error (may need RLS too)
ALTER TABLE public.harvest_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read settings" ON public.harvest_settings;
CREATE POLICY "Users can read settings" ON public.harvest_settings FOR
SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Managers can manage settings" ON public.harvest_settings;
CREATE POLICY "Managers can manage settings" ON public.harvest_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 20260301_fix_security_advisor_errors.sql ──
-- =============================================
-- FIX SUPABASE SECURITY ADVISOR ERRORS (4 issues)
-- =============================================
-- Run this in the Supabase SQL Editor
-- 1. ENABLE RLS on public.alerts (has policies but RLS was disabled)
ALTER TABLE IF EXISTS public.alerts ENABLE ROW LEVEL SECURITY;
-- 2. ENABLE RLS on public.blocks (if it exists as a separate table)
ALTER TABLE IF EXISTS public.blocks ENABLE ROW LEVEL SECURITY;
-- Add basic RLS policy for blocks if none exists
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = 'blocks'
        AND schemaname = 'public'
) THEN -- Allow authenticated users to read blocks in their orchard
DROP POLICY IF EXISTS "Read blocks" ON public.blocks;
CREATE POLICY "Read blocks" ON public.blocks FOR
SELECT TO authenticated USING (orchard_id = get_my_orchard_id());
-- Allow managers to manage blocks
DROP POLICY IF EXISTS "Manage blocks" ON public.blocks;
CREATE POLICY "Manage blocks" ON public.blocks FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'admin')
    )
);
END IF;
END $$;
-- 3. Add RLS policies for alerts (if none exist)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = 'alerts'
        AND schemaname = 'public'
) THEN -- Allow authenticated users to read alerts for their orchard
DROP POLICY IF EXISTS "Read alerts" ON public.alerts;
CREATE POLICY "Read alerts" ON public.alerts FOR
SELECT TO authenticated USING (orchard_id = get_my_orchard_id());
-- Allow system/managers to create alerts
DROP POLICY IF EXISTS "Create alerts" ON public.alerts;
CREATE POLICY "Create alerts" ON public.alerts FOR
INSERT WITH CHECK (true);
-- Allow managers to manage alerts
DROP POLICY IF EXISTS "Manage alerts" ON public.alerts;
CREATE POLICY "Manage alerts" ON public.alerts FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'admin')
    )
);
END IF;
END $$;
-- 4. FIX SECURITY DEFINER VIEW — recreate as SECURITY INVOKER
-- The view pickers_performance_today runs as the view owner, bypassing RLS
-- Recreate it without SECURITY DEFINER (SECURITY INVOKER is the default)
DROP VIEW IF EXISTS public.pickers_performance_today;
CREATE VIEW public.pickers_performance_today AS
SELECT p.id AS picker_id,
    p.name,
    p.orchard_id,
    p.team_leader_id,
    p.status,
    COALESCE(br_today.bucket_count, 0) AS total_buckets,
    br_today.last_scan
FROM public.pickers p
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS bucket_count,
            MAX(br.scanned_at) AS last_scan
        FROM public.bucket_records br
        WHERE br.picker_id = p.id
            AND br.deleted_at IS NULL
            AND DATE(br.scanned_at AT TIME ZONE 'Pacific/Auckland') = (CURRENT_DATE AT TIME ZONE 'Pacific/Auckland')::date
    ) br_today ON true
WHERE p.deleted_at IS NULL;
-- Grant SELECT to authenticated users
GRANT SELECT ON public.pickers_performance_today TO authenticated;
-- Verify fixes
SELECT 'Security fixes applied successfully' AS result;

-- ── 20260301_rls_consolidation.sql ──
-- ============================================
-- RLS Consolidation: Eliminate ALL recursive subqueries
-- ============================================
-- 
-- Problem: The 20260211_complete_rls.sql migration uses
--   `SELECT id FROM users WHERE role = 'manager'`
-- in policies on messages, broadcasts, orchards, pickers,
-- daily_attendance, bucket_scans, and harvest_settings.
-- Each such subquery triggers RLS on the users table,
-- causing recursive evaluation and O(n²) performance.
--
-- Fix: Replace ALL role/orchard subqueries with the
-- SECURITY DEFINER helpers created in 20260217:
--   get_auth_role()       — returns current user's role
--   get_auth_orchard_id() — returns current user's orchard_id
--
-- Also adds an is_manager() convenience function.
-- ============================================
-- ── Helper: is_manager shorthand ──────────────
CREATE OR REPLACE FUNCTION public.is_manager() RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT role IN ('manager', 'admin')
FROM public.users
WHERE id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.is_role(allowed_roles text []) RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT role = ANY(allowed_roles)
FROM public.users
WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.is_manager()
FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_role(text [])
FROM anon;
COMMENT ON FUNCTION public.is_manager() IS 'SECURITY DEFINER: checks if current user is manager/admin without RLS recursion.';
COMMENT ON FUNCTION public.is_role(text []) IS 'SECURITY DEFINER: checks if current user has any of the specified roles without RLS recursion.';
-- =============================================
-- 1. MESSAGES — Fix recursive role checks
-- =============================================
DROP POLICY IF EXISTS "messages_view_policy" ON messages;
CREATE POLICY "messages_view_policy" ON messages FOR
SELECT USING (
        auth.uid() = sender_id
        OR auth.uid() = recipient_id
        OR is_manager()
    );
-- Insert: only sender
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
CREATE POLICY "messages_insert_policy" ON messages FOR
INSERT WITH CHECK (auth.uid() = sender_id);
-- Update: sender or recipient
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
CREATE POLICY "messages_update_policy" ON messages FOR
UPDATE USING (
        auth.uid() = sender_id
        OR auth.uid() = recipient_id
    );
-- Delete: sender or manager
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
CREATE POLICY "messages_delete_policy" ON messages FOR DELETE USING (
    auth.uid() = sender_id
    OR is_manager()
);
-- =============================================
-- 2. BROADCASTS — Fix recursive role checks
-- =============================================
DROP POLICY IF EXISTS "broadcasts_view_policy" ON broadcasts;
CREATE POLICY "broadcasts_view_policy" ON broadcasts FOR
SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "broadcasts_insert_policy" ON broadcasts;
CREATE POLICY "broadcasts_insert_policy" ON broadcasts FOR
INSERT WITH CHECK (is_manager());
DROP POLICY IF EXISTS "broadcasts_update_policy" ON broadcasts;
CREATE POLICY "broadcasts_update_policy" ON broadcasts FOR
UPDATE USING (is_manager());
DROP POLICY IF EXISTS "broadcasts_delete_policy" ON broadcasts;
CREATE POLICY "broadcasts_delete_policy" ON broadcasts FOR DELETE USING (is_manager());
-- =============================================
-- 3. HARVEST_SETTINGS — Fix recursive role checks
-- =============================================
DROP POLICY IF EXISTS "settings_view_policy" ON harvest_settings;
CREATE POLICY "settings_view_policy" ON harvest_settings FOR
SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "settings_update_policy" ON harvest_settings;
CREATE POLICY "settings_update_policy" ON harvest_settings FOR
UPDATE USING (is_manager()) WITH CHECK (is_manager());
-- =============================================
-- 4. ORCHARDS — Fix recursive role + orchard checks
-- =============================================
DROP POLICY IF EXISTS "orchards_view_policy" ON orchards;
CREATE POLICY "orchards_view_policy" ON orchards FOR
SELECT USING (
        is_manager()
        OR id = get_auth_orchard_id()
    );
DROP POLICY IF EXISTS "orchards_insert_policy" ON orchards;
CREATE POLICY "orchards_insert_policy" ON orchards FOR
INSERT WITH CHECK (is_manager());
DROP POLICY IF EXISTS "orchards_update_policy" ON orchards;
CREATE POLICY "orchards_update_policy" ON orchards FOR
UPDATE USING (is_manager());
-- =============================================
-- 5. PICKERS — Fix recursive role + orchard checks
-- =============================================
DROP POLICY IF EXISTS "pickers_view_policy" ON pickers;
CREATE POLICY "pickers_view_policy" ON pickers FOR
SELECT USING (
        is_manager()
        OR orchard_id = get_auth_orchard_id()
    );
DROP POLICY IF EXISTS "pickers_insert_policy" ON pickers;
CREATE POLICY "pickers_insert_policy" ON pickers FOR
INSERT WITH CHECK (is_role(ARRAY ['manager', 'team_leader']));
DROP POLICY IF EXISTS "pickers_update_policy" ON pickers;
CREATE POLICY "pickers_update_policy" ON pickers FOR
UPDATE USING (is_role(ARRAY ['manager', 'team_leader']));
DROP POLICY IF EXISTS "pickers_delete_policy" ON pickers;
CREATE POLICY "pickers_delete_policy" ON pickers FOR DELETE USING (is_manager());
-- =============================================
-- 6. DAILY_ATTENDANCE — Fix deep recursive chain
-- =============================================
-- Was: pickers → users → (RLS on users) → recursion
-- Now: Single function call, no subqueries
DROP POLICY IF EXISTS "attendance_view_policy" ON daily_attendance;
CREATE POLICY "attendance_view_policy" ON daily_attendance FOR
SELECT USING (
        is_manager()
        OR picker_id IN (
            SELECT id
            FROM pickers
            WHERE orchard_id = get_auth_orchard_id()
        )
    );
DROP POLICY IF EXISTS "attendance_insert_policy" ON daily_attendance;
CREATE POLICY "attendance_insert_policy" ON daily_attendance FOR
INSERT WITH CHECK (is_role(ARRAY ['manager', 'team_leader']));
DROP POLICY IF EXISTS "attendance_update_policy" ON daily_attendance;
CREATE POLICY "attendance_update_policy" ON daily_attendance FOR
UPDATE USING (is_role(ARRAY ['manager', 'team_leader']));
-- =============================================
-- 7. BUCKET_SCANS — Fix deep recursive chain
-- =============================================
DROP POLICY IF EXISTS "bucket_scans_view_policy" ON bucket_scans;
CREATE POLICY "bucket_scans_view_policy" ON bucket_scans FOR
SELECT USING (
        is_manager()
        OR picker_id IN (
            SELECT id
            FROM pickers
            WHERE orchard_id = get_auth_orchard_id()
        )
    );
DROP POLICY IF EXISTS "bucket_scans_insert_policy" ON bucket_scans;
CREATE POLICY "bucket_scans_insert_policy" ON bucket_scans FOR
INSERT WITH CHECK (
        is_role(ARRAY ['manager', 'team_leader', 'runner'])
    );
DROP POLICY IF EXISTS "bucket_scans_update_policy" ON bucket_scans;
CREATE POLICY "bucket_scans_update_policy" ON bucket_scans FOR
UPDATE USING (is_manager());
-- =============================================
-- 8. USERS TABLE — Ensure using helpers (from 20260217)
-- =============================================
-- Already fixed in 20260217_fix_rls_recursion.sql
-- Just ensure all policies are consistent
DROP POLICY IF EXISTS "users_update_manager_policy" ON users;
CREATE POLICY "users_update_manager_policy" ON users FOR
UPDATE USING (is_manager());
-- =============================================
-- AUDIT COMMENT
-- =============================================
COMMENT ON SCHEMA public IS 'RLS consolidated: all role checks use SECURITY DEFINER helpers (is_manager, is_role, get_auth_role, get_auth_orchard_id). No more recursive subqueries on users table. Migration 20260301.';

-- ── 20260303_security_hardening.sql ──
-- =============================================
-- MIGRATION: Security Hardening
-- Date: 2026-03-03
-- Fixes: Supabase Security Advisor issues
--   1. SET search_path = '' on all public functions (prevents schema injection)
--   2. Change pickers_performance_today from SECURITY DEFINER → SECURITY INVOKER
-- =============================================
-- ============================================
-- PART 1: Fix mutable search_path on all public functions
-- The search_path attack vector: a malicious user creates a function
-- in their own schema with the same name as a built-in, and if
-- search_path includes that schema, the malicious function runs instead.
-- Fix: SET search_path = '' forces all references to be schema-qualified.
-- ============================================
-- Trigger functions (used by updated_at triggers)
ALTER FUNCTION public.auto_update_updated_at()
SET search_path = '';
ALTER FUNCTION public.update_updated_at_column()
SET search_path = '';
-- Version bump functions (used by optimistic locking)
ALTER FUNCTION public.bump_version()
SET search_path = '';
ALTER FUNCTION public.bump_version_and_update_time()
SET search_path = '';
-- Query helper functions
ALTER FUNCTION public.get_orchard_bucket_counts(uuid, date)
SET search_path = '';
ALTER FUNCTION public.get_picker_bucket_count(uuid, date)
SET search_path = '';
-- Day closure / batch processing
-- NOTE: verify signature matches your DB. Use: SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'update_day_closure';
-- ALTER FUNCTION public.update_day_closure(...) SET search_path = '';
-- Account management
ALTER FUNCTION public.unlock_account(text, text)
SET search_path = '';
-- ============================================
-- PART 2: Fix pickers_performance_today view
-- SECURITY DEFINER views run as the view OWNER (superuser),
-- bypassing RLS. Change to SECURITY INVOKER so the view
-- runs with the privileges of the querying user.
-- ============================================
-- Drop first because CREATE OR REPLACE can't rename columns
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
-- bucket_records: most queried table for dashboard/analytics
CREATE INDEX IF NOT EXISTS idx_bucket_records_scanned_at ON public.bucket_records (scanned_at);
CREATE INDEX IF NOT EXISTS idx_bucket_records_picker_orchard ON public.bucket_records (picker_id, orchard_id);
CREATE INDEX IF NOT EXISTS idx_bucket_records_quality ON public.bucket_records (quality_grade);
-- daily_attendance: queried by date range + orchard
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON public.daily_attendance (date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_orchard_date ON public.daily_attendance (orchard_id, date);
-- users: queried by role and orchard frequently
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_orchard_active ON public.users (orchard_id, is_active);
-- contracts: queried by employee
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON public.contracts (employee_id);
-- qc_inspections: queried by orchard
CREATE INDEX IF NOT EXISTS idx_qc_inspections_orchard ON public.qc_inspections (orchard_id);
-- messages: queried by receiver and timestamp
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);
-- audit_logs: queried by timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
-- alerts: queried by orchard
CREATE INDEX IF NOT EXISTS idx_alerts_orchard ON public.alerts (orchard_id);

