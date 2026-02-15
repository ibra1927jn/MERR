-- =============================================
-- HARVESTPRO NZ — CONSOLIDATED DATABASE SCHEMA V2
-- Created: 2026-02-14
-- =============================================
-- This file merges schema_v1_consolidated.sql + all 23 migrations
-- from supabase/migrations/ into a SINGLE source of truth.
--
-- Tables (19 total):
--   Core:       orchards, users, pickers, day_setups, bucket_records, bins
--   Quality:    quality_inspections, qc_inspections
--   Messaging:  conversations, chat_messages
--   Attendance: daily_attendance
--   Logistics:  fleet_vehicles, transport_requests, day_closures
--   HR:         contracts
--   Security:   login_attempts, account_locks, audit_logs, sync_conflicts
-- =============================================
-- =============================================
-- 0. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =============================================
-- 1. BASE TABLES
-- =============================================
-- 1.1 ORCHARDS
CREATE TABLE IF NOT EXISTS public.orchards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    location TEXT,
    total_blocks INTEGER DEFAULT 0,
    total_rows INTEGER DEFAULT 20,
    -- Added: 20260214_schema_alignment
    created_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO public.orchards (id, code, name, location)
SELECT 'a0000000-0000-0000-0000-000000000001'::UUID,
    'DEMO001',
    'Default Orchard',
    'Central Otago, NZ'
WHERE NOT EXISTS (
        SELECT 1
        FROM public.orchards
        LIMIT 1
    );
-- 1.2 USERS (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'team_leader' CHECK (
        role IN (
            'manager',
            'team_leader',
            'runner',
            'qc_inspector'
        )
    ),
    orchard_id UUID REFERENCES public.orchards(id),
    team_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Added: 20260215_add_updated_at (optimistic locking)
    updated_at TIMESTAMPTZ(3) DEFAULT now()
);
-- 1.3 PICKERS (Seasonal Workers)
CREATE TABLE IF NOT EXISTS public.pickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picker_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    orchard_id UUID REFERENCES public.orchards(id),
    team_leader_id UUID REFERENCES public.users(id),
    safety_verified BOOLEAN DEFAULT false,
    total_buckets_today INTEGER DEFAULT 0,
    current_row INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    archived_at TIMESTAMPTZ,
    -- Added: 20260211_add_archived_at
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Added: 20260215_add_updated_at (optimistic locking)
    updated_at TIMESTAMPTZ(3) DEFAULT now()
);
-- 1.4 DAY SETUPS
CREATE TABLE IF NOT EXISTS public.day_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id),
    date DATE DEFAULT CURRENT_DATE,
    variety TEXT,
    target_tons DECIMAL(10, 2),
    piece_rate DECIMAL(10, 2) DEFAULT 6.50,
    min_wage_rate DECIMAL(10, 2) DEFAULT 23.50,
    start_time TIME,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.5 BUCKET RECORDS (Core Transaction)
CREATE TABLE IF NOT EXISTS public.bucket_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id),
    picker_id UUID REFERENCES public.pickers(id),
    bin_id UUID,
    scanned_by UUID REFERENCES public.users(id),
    scanned_at TIMESTAMPTZ DEFAULT now(),
    coords JSONB,
    quality_grade TEXT,
    -- Added: 20260214_schema_alignment
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ(3) DEFAULT now()
);
-- 1.6 BINS (Logistics)
CREATE TABLE IF NOT EXISTS public.bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id),
    bin_code TEXT,
    status TEXT DEFAULT 'empty' CHECK (
        status IN ('empty', 'partial', 'full', 'collected')
    ),
    variety TEXT,
    location JSONB,
    movement_history JSONB [] DEFAULT '{}',
    filled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.7 QUALITY INSPECTIONS (Legacy — V1)
CREATE TABLE IF NOT EXISTS public.quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID REFERENCES public.bucket_records(id),
    picker_id UUID REFERENCES public.pickers(id),
    inspector_id UUID REFERENCES public.users(id),
    quality_grade TEXT CHECK (
        quality_grade IN (
            'good',
            'warning',
            'bad',
            'A',
            'B',
            'C',
            'reject'
        )
    ),
    notes TEXT,
    photo_url TEXT,
    coords JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.8 QC INSPECTIONS (Normalized — Phase 2)
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
-- =============================================
-- 2. MESSAGING SYSTEM
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'broadcast')),
    name TEXT,
    participant_ids TEXT [] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    read_by TEXT [] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- 3. ATTENDANCE & CLOSURES
-- =============================================
-- 3.1 DAILY ATTENDANCE
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
    correction_reason TEXT,
    -- Added: 20260213_timesheet_corrections
    corrected_by UUID REFERENCES auth.users(id),
    corrected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT daily_attendance_unique UNIQUE (picker_id, date),
    CONSTRAINT daily_attendance_time_range CHECK (
        check_out IS NULL
        OR check_in IS NULL
        OR check_out > check_in
    )
);
-- 3.2 DAY CLOSURES
CREATE TABLE IF NOT EXISTS public.day_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    closed_by UUID REFERENCES public.users(id),
    closed_at TIMESTAMPTZ,
    total_buckets INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_hours DECIMAL(8, 2),
    wage_violations INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(orchard_id, date)
);
-- =============================================
-- 4. LOGISTICS (Phase 2)
-- =============================================
-- 4.1 FLEET VEHICLES
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration TEXT,
    zone TEXT,
    driver_id UUID REFERENCES public.users(id) ON DELETE
    SET NULL,
        driver_name TEXT,
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
        cof_expiry DATE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- 4.2 TRANSPORT REQUESTS
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
-- 5. HR (Phase 2)
-- =============================================
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
    CONSTRAINT contracts_date_range CHECK (
        end_date IS NULL
        OR end_date >= start_date
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_one_active_per_employee ON public.contracts (employee_id)
WHERE status = 'active';
-- =============================================
-- 6. SECURITY & AUTH HARDENING
-- =============================================
-- 6.1 LOGIN ATTEMPTS
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    attempt_time TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT false,
    user_agent TEXT,
    failure_reason TEXT
);
-- 6.2 ACCOUNT LOCKS
CREATE TABLE IF NOT EXISTS public.account_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT now(),
    locked_until TIMESTAMPTZ NOT NULL,
    locked_by_system BOOLEAN DEFAULT true,
    unlock_reason TEXT,
    unlocked_by UUID REFERENCES auth.users(id),
    unlocked_at TIMESTAMPTZ,
    CONSTRAINT unique_active_lock UNIQUE (user_id, locked_at)
);
-- 6.3 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
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
-- 6.4 SYNC CONFLICTS
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Ensure user_id column exists (may be missing on older DBs)
ALTER TABLE public.sync_conflicts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- =============================================
-- 7. ROW LEVEL SECURITY
-- =============================================
-- Enable RLS on ALL tables
ALTER TABLE public.orchards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
-- =============================================
-- 8. HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_orchard_id() RETURNS UUID LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT orchard_id
FROM public.users
WHERE id = auth.uid()
LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.is_manager_or_leader() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role IN ('manager', 'team_leader')
    );
$$;
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
CREATE OR REPLACE FUNCTION public.is_account_locked(check_email TEXT) RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE active_lock RECORD;
BEGIN
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
CREATE OR REPLACE FUNCTION public.get_failed_login_count(check_email TEXT) RETURNS INTEGER SECURITY DEFINER
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
CREATE OR REPLACE FUNCTION public.unlock_account(
        target_email TEXT,
        unlock_reason_text TEXT DEFAULT 'Unlocked by manager'
    ) RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE manager_role TEXT;
lock_record RECORD;
BEGIN
SELECT role INTO manager_role
FROM users
WHERE id = auth.uid();
IF manager_role != 'manager' THEN RAISE EXCEPTION 'Only managers can unlock accounts';
END IF;
SELECT * INTO lock_record
FROM account_locks
WHERE email = target_email
    AND locked_until > now()
    AND unlocked_at IS NULL
ORDER BY locked_at DESC
LIMIT 1;
IF NOT FOUND THEN RETURN false;
END IF;
UPDATE account_locks
SET unlocked_at = now(),
    unlocked_by = auth.uid(),
    unlock_reason = unlock_reason_text
WHERE id = lock_record.id;
DELETE FROM login_attempts
WHERE email = target_email
    AND success = false
    AND attempt_time > now() - INTERVAL '15 minutes';
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
-- updated_at trigger (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- day_closures updated_at trigger
CREATE OR REPLACE FUNCTION update_day_closures_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Audit trail function
CREATE OR REPLACE FUNCTION log_audit_trail() RETURNS TRIGGER SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE current_user_email TEXT;
BEGIN
SELECT email INTO current_user_email
FROM auth.users
WHERE id = auth.uid();
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
        CASE
            WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb
            ELSE NULL
        END,
        CASE
            WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb
            ELSE NULL
        END
    );
RETURN COALESCE(NEW, OLD);
EXCEPTION
WHEN OTHERS THEN RAISE WARNING 'Audit logging failed: %',
SQLERRM;
RETURN COALESCE(NEW, OLD);
END;
$$;
-- Lock account trigger function
CREATE OR REPLACE FUNCTION lock_account_on_failures() RETURNS TRIGGER SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$
DECLARE failed_count INTEGER;
user_uuid UUID;
BEGIN IF NEW.success = true THEN RETURN NEW;
END IF;
SELECT COUNT(*) INTO failed_count
FROM login_attempts
WHERE email = NEW.email
    AND success = false
    AND attempt_time > now() - INTERVAL '15 minutes';
IF failed_count >= 5 THEN
SELECT id INTO user_uuid
FROM auth.users
WHERE email = NEW.email;
INSERT INTO account_locks (user_id, email, locked_until)
VALUES (
        user_uuid,
        NEW.email,
        now() + INTERVAL '15 minutes'
    ) ON CONFLICT (user_id, locked_at) DO NOTHING;
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
-- Cleanup functions
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts() RETURNS void SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM login_attempts
WHERE attempt_time < now() - INTERVAL '30 days';
END;
$$;
CREATE OR REPLACE FUNCTION cleanup_old_account_locks() RETURNS void SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM account_locks
WHERE locked_until < now() - INTERVAL '90 days';
END;
$$;
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
-- Audit trail query helper
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
-- =============================================
-- 9. RLS POLICIES
-- =============================================
-- 9.1 ORCHARDS
DROP POLICY IF EXISTS "Authenticated read orchards" ON public.orchards;
CREATE POLICY "Authenticated read orchards" ON public.orchards FOR
SELECT TO authenticated USING (true);
-- 9.2 USERS
DROP POLICY IF EXISTS "Read self" ON public.users;
CREATE POLICY "Read self" ON public.users FOR
SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Read orchard members" ON public.users;
CREATE POLICY "Read orchard members" ON public.users FOR
SELECT USING (orchard_id = get_my_orchard_id());
DROP POLICY IF EXISTS "Update self" ON public.users;
CREATE POLICY "Update self" ON public.users FOR
UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Insert self" ON public.users;
CREATE POLICY "Insert self" ON public.users FOR
INSERT WITH CHECK (auth.uid() = id);
-- 9.3 PICKERS
DROP POLICY IF EXISTS "Manage pickers" ON public.pickers;
CREATE POLICY "Manage pickers" ON public.pickers FOR ALL USING (is_manager_or_leader());
DROP POLICY IF EXISTS "Read pickers" ON public.pickers;
CREATE POLICY "Read pickers" ON public.pickers FOR
SELECT USING (orchard_id = get_my_orchard_id());
-- 9.4 BUCKET RECORDS
DROP POLICY IF EXISTS "Runners insert records" ON public.bucket_records;
CREATE POLICY "Runners insert records" ON public.bucket_records FOR
INSERT WITH CHECK (auth.uid() = scanned_by);
DROP POLICY IF EXISTS "View orchard records" ON public.bucket_records;
CREATE POLICY "View orchard records" ON public.bucket_records FOR
SELECT USING (
        orchard_id = get_my_orchard_id()
        AND (
            is_manager_or_leader()
            OR scanned_by = auth.uid()
        )
    );
-- 9.5 BINS
DROP POLICY IF EXISTS "Read bins" ON public.bins;
CREATE POLICY "Read bins" ON public.bins FOR
SELECT USING (orchard_id = get_my_orchard_id());
DROP POLICY IF EXISTS "Manage bins" ON public.bins;
CREATE POLICY "Manage bins" ON public.bins FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND is_manager_or_leader()
);
DROP POLICY IF EXISTS "Runners insert bins" ON public.bins;
CREATE POLICY "Runners insert bins" ON public.bins FOR
INSERT WITH CHECK (orchard_id = get_my_orchard_id());
-- 9.6 MESSAGING
DROP POLICY IF EXISTS "View conversations" ON public.conversations;
CREATE POLICY "View conversations" ON public.conversations FOR
SELECT USING (auth.uid()::text = ANY(participant_ids));
DROP POLICY IF EXISTS "Create conversations" ON public.conversations;
CREATE POLICY "Create conversations" ON public.conversations FOR
INSERT WITH CHECK (auth.uid()::text = ANY(participant_ids));
DROP POLICY IF EXISTS "Update conversations" ON public.conversations;
CREATE POLICY "Update conversations" ON public.conversations FOR
UPDATE USING (auth.uid()::text = ANY(participant_ids));
DROP POLICY IF EXISTS "View messages" ON public.chat_messages;
CREATE POLICY "View messages" ON public.chat_messages FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE c.id = conversation_id
                AND auth.uid()::text = ANY(c.participant_ids)
        )
    );
DROP POLICY IF EXISTS "Send messages" ON public.chat_messages;
CREATE POLICY "Send messages" ON public.chat_messages FOR
INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE c.id = conversation_id
                AND auth.uid()::text = ANY(c.participant_ids)
        )
    );
-- 9.7 DAILY ATTENDANCE
DROP POLICY IF EXISTS "Read attendance" ON public.daily_attendance;
CREATE POLICY "Read attendance" ON public.daily_attendance FOR
SELECT USING (orchard_id = get_my_orchard_id());
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
-- 9.8 DAY CLOSURES
DROP POLICY IF EXISTS "authenticated_select_day_closures" ON public.day_closures;
CREATE POLICY "authenticated_select_day_closures" ON public.day_closures FOR
SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "authenticated_insert_day_closures" ON public.day_closures;
CREATE POLICY "authenticated_insert_day_closures" ON public.day_closures FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
-- 9.9 FLEET VEHICLES
DROP POLICY IF EXISTS "Read fleet vehicles" ON public.fleet_vehicles;
CREATE POLICY "Read fleet vehicles" ON public.fleet_vehicles FOR
SELECT USING (orchard_id = get_my_orchard_id());
DROP POLICY IF EXISTS "Manage fleet vehicles" ON public.fleet_vehicles;
CREATE POLICY "Manage fleet vehicles" ON public.fleet_vehicles FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND is_logistics_or_manager()
);
-- 9.10 TRANSPORT REQUESTS
DROP POLICY IF EXISTS "Read transport requests" ON public.transport_requests;
CREATE POLICY "Read transport requests" ON public.transport_requests FOR
SELECT USING (orchard_id = get_my_orchard_id());
DROP POLICY IF EXISTS "Create transport requests" ON public.transport_requests;
CREATE POLICY "Create transport requests" ON public.transport_requests FOR
INSERT WITH CHECK (
        orchard_id = get_my_orchard_id()
        AND requested_by = auth.uid()
    );
DROP POLICY IF EXISTS "Manage transport requests" ON public.transport_requests;
CREATE POLICY "Manage transport requests" ON public.transport_requests FOR
UPDATE USING (
        orchard_id = get_my_orchard_id()
        AND is_logistics_or_manager()
    );
-- 9.11 CONTRACTS
DROP POLICY IF EXISTS "HR read contracts" ON public.contracts;
CREATE POLICY "HR read contracts" ON public.contracts FOR
SELECT USING (
        orchard_id = get_my_orchard_id()
        AND is_hr_manager_or_admin()
    );
DROP POLICY IF EXISTS "Employee read own contracts" ON public.contracts;
CREATE POLICY "Employee read own contracts" ON public.contracts FOR
SELECT USING (employee_id = auth.uid());
DROP POLICY IF EXISTS "HR manage contracts" ON public.contracts;
CREATE POLICY "HR manage contracts" ON public.contracts FOR ALL USING (
    orchard_id = get_my_orchard_id()
    AND is_hr_manager_or_admin()
);
-- 9.12 QC INSPECTIONS
DROP POLICY IF EXISTS "Read qc inspections" ON public.qc_inspections;
CREATE POLICY "Read qc inspections" ON public.qc_inspections FOR
SELECT USING (orchard_id = get_my_orchard_id());
DROP POLICY IF EXISTS "QC inspectors create inspections" ON public.qc_inspections;
CREATE POLICY "QC inspectors create inspections" ON public.qc_inspections FOR
INSERT WITH CHECK (
        inspector_id = auth.uid()
        AND orchard_id = get_my_orchard_id()
    );
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
-- 9.13 LOGIN ATTEMPTS
DROP POLICY IF EXISTS "anyone_can_insert_login_attempts" ON public.login_attempts;
CREATE POLICY "anyone_can_insert_login_attempts" ON public.login_attempts FOR
INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "managers_view_login_attempts" ON public.login_attempts;
CREATE POLICY "managers_view_login_attempts" ON public.login_attempts FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
-- 9.14 ACCOUNT LOCKS
DROP POLICY IF EXISTS "managers_full_access_account_locks" ON public.account_locks;
CREATE POLICY "managers_full_access_account_locks" ON public.account_locks FOR ALL USING (
    auth.uid() IN (
        SELECT id
        FROM users
        WHERE role = 'manager'
    )
);
DROP POLICY IF EXISTS "system_insert_account_locks" ON public.account_locks;
CREATE POLICY "system_insert_account_locks" ON public.account_locks FOR
INSERT WITH CHECK (locked_by_system = true);
-- 9.15 AUDIT LOGS
DROP POLICY IF EXISTS "managers_view_audit_logs" ON public.audit_logs;
CREATE POLICY "managers_view_audit_logs" ON public.audit_logs FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
DROP POLICY IF EXISTS "system_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "system_insert_audit_logs" ON public.audit_logs FOR
INSERT WITH CHECK (true);
-- 9.16 SYNC CONFLICTS
DROP POLICY IF EXISTS "managers_view_sync_conflicts" ON public.sync_conflicts;
CREATE POLICY "managers_view_sync_conflicts" ON public.sync_conflicts FOR
SELECT USING (
        auth.uid() IN (
            SELECT id
            FROM users
            WHERE role = 'manager'
        )
    );
DROP POLICY IF EXISTS "users_view_own_conflicts" ON public.sync_conflicts;
CREATE POLICY "users_view_own_conflicts" ON public.sync_conflicts FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_sync_conflicts" ON public.sync_conflicts;
CREATE POLICY "insert_sync_conflicts" ON public.sync_conflicts FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- =============================================
-- 10. PERFORMANCE INDEXES
-- =============================================
-- Core
CREATE INDEX IF NOT EXISTS idx_users_orchard ON public.users(orchard_id);
CREATE INDEX IF NOT EXISTS idx_pickers_orchard ON public.pickers(orchard_id);
CREATE INDEX IF NOT EXISTS idx_pickers_code ON public.pickers(picker_id);
CREATE INDEX IF NOT EXISTS idx_bucket_records_picker ON public.bucket_records(picker_id);
CREATE INDEX IF NOT EXISTS idx_bucket_records_scanned_by ON public.bucket_records(scanned_by);
CREATE INDEX IF NOT EXISTS idx_bucket_records_created ON public.bucket_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bucket_records_orchard ON public.bucket_records(orchard_id);
-- Messaging
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING gin(participant_ids);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_orchard_date ON public.daily_attendance(orchard_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_picker_date ON public.daily_attendance(picker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.daily_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.daily_attendance(status)
WHERE status != 'present';
-- Day closures
CREATE INDEX IF NOT EXISTS idx_day_closures_orchard_date ON public.day_closures(orchard_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_day_closures_status ON public.day_closures(status);
CREATE INDEX IF NOT EXISTS idx_day_closures_closed_at ON public.day_closures(closed_at DESC);
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
-- Transport requests
CREATE INDEX IF NOT EXISTS idx_transport_orchard ON public.transport_requests(orchard_id);
CREATE INDEX IF NOT EXISTS idx_transport_status ON public.transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_priority ON public.transport_requests(priority, created_at DESC)
WHERE status IN ('pending', 'assigned');
CREATE INDEX IF NOT EXISTS idx_transport_created ON public.transport_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_vehicle ON public.transport_requests(assigned_vehicle)
WHERE assigned_vehicle IS NOT NULL;
-- QC inspections
CREATE INDEX IF NOT EXISTS idx_qc_inspections_orchard_date ON public.qc_inspections(orchard_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_picker ON public.qc_inspections(picker_id, created_at DESC);
-- Auth
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_account_locks_user ON public.account_locks(user_id, locked_until DESC);
CREATE INDEX IF NOT EXISTS idx_account_locks_email ON public.account_locks(email, locked_until DESC);
-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
-- Sync conflicts
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user ON public.sync_conflicts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table ON public.sync_conflicts(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON public.sync_conflicts(resolution)
WHERE resolution IS NULL;
-- =============================================
-- 11. TRIGGERS
-- =============================================
-- Updated_at triggers
DROP TRIGGER IF EXISTS contracts_updated_at ON public.contracts;
CREATE TRIGGER contracts_updated_at BEFORE
UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS fleet_updated_at ON public.fleet_vehicles;
CREATE TRIGGER fleet_updated_at BEFORE
UPDATE ON public.fleet_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS transport_updated_at ON public.transport_requests;
CREATE TRIGGER transport_updated_at BEFORE
UPDATE ON public.transport_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS attendance_updated_at ON public.daily_attendance;
CREATE TRIGGER attendance_updated_at BEFORE
UPDATE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS day_closures_updated_at ON public.day_closures;
CREATE TRIGGER day_closures_updated_at BEFORE
UPDATE ON public.day_closures FOR EACH ROW EXECUTE FUNCTION update_day_closures_updated_at();
-- Added: 20260215_add_updated_at (optimistic locking)
DROP TRIGGER IF EXISTS pickers_updated_at ON public.pickers;
CREATE TRIGGER pickers_updated_at BEFORE
UPDATE ON public.pickers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE
UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Audit triggers
DROP TRIGGER IF EXISTS audit_pickers ON public.pickers;
CREATE TRIGGER audit_pickers
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.pickers FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS audit_users ON public.users;
CREATE TRIGGER audit_users
AFTER
UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS audit_daily_attendance ON public.daily_attendance;
CREATE TRIGGER audit_daily_attendance
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS audit_orchards ON public.orchards;
CREATE TRIGGER audit_orchards
AFTER
UPDATE ON public.orchards FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
-- Auth lockout trigger
DROP TRIGGER IF EXISTS trigger_lock_account ON public.login_attempts;
CREATE TRIGGER trigger_lock_account
AFTER
INSERT ON public.login_attempts FOR EACH ROW EXECUTE FUNCTION lock_account_on_failures();
-- =============================================
-- 12. REALTIME SETUP
-- =============================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime
ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.bucket_records;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.transport_requests;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.fleet_vehicles;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.daily_attendance;
EXCEPTION
WHEN OTHERS THEN NULL;
END $$;
-- =============================================
-- 13. COMMENTS
-- =============================================
COMMENT ON TABLE public.day_closures IS 'Immutable daily closure records for audit/legal compliance';
COMMENT ON TABLE public.audit_logs IS 'Complete audit trail for compliance and security';
COMMENT ON TABLE public.sync_conflicts IS 'Audit trail for offline sync conflicts (last-write-wins with logging)';
COMMENT ON TABLE public.login_attempts IS 'Login attempt tracking for rate limiting and security';
COMMENT ON TABLE public.account_locks IS 'Account lockout records for brute force prevention';
SELECT 'Schema V2 Consolidated Applied Successfully — 19 tables, all RLS, all indexes' as result;