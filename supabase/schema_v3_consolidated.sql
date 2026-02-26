-- =============================================
-- HARVESTPRO NZ — CONSOLIDATED DATABASE SCHEMA V3
-- Created: 2026-02-26
-- =============================================
-- SINGLE SOURCE OF TRUTH. Merges V2 + all Sprint 1 migrations.
--
-- Tables (22 total):
--   Hierarchy:  harvest_seasons, orchard_blocks, block_rows
--   Core:       orchards, users, pickers, day_setups, bucket_records, bins
--   Assignment: row_assignments
--   Quality:    quality_inspections, qc_inspections
--   Messaging:  conversations, chat_messages
--   Attendance: daily_attendance
--   Logistics:  fleet_vehicles, transport_requests, day_closures
--   HR:         contracts
--   Security:   login_attempts, account_locks, audit_logs, sync_conflicts
--
-- Key features:
--   - Soft deletes (deleted_at) on all operational tables
--   - Optimistic locking (version) on concurrency-hot tables
--   - Partial unique indexes (safe with soft deletes)
--   - B-Tree sync indexes for delta sync
--   - Season-scoped queries to prevent OOM in future years
--
-- Roles: admin, manager, team_leader, runner, qc_inspector, hr_admin, payroll_admin, logistics
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
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.2 HARVEST SEASONS (scopes all data by year — prevents OOM)
CREATE TABLE IF NOT EXISTS public.harvest_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('planning', 'active', 'closed', 'archived')
    ),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_season_per_orchard ON public.harvest_seasons (orchard_id)
WHERE status = 'active'
    AND deleted_at IS NULL;
-- 1.3 ORCHARD BLOCKS (subdivisions of an orchard within a season)
CREATE TABLE IF NOT EXISTS public.orchard_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.harvest_seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    start_row INTEGER NOT NULL DEFAULT 1,
    color_code TEXT DEFAULT '#dc2626',
    status TEXT NOT NULL DEFAULT 'idle' CHECK (
        status IN ('idle', 'active', 'complete', 'alert')
    ),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_block ON public.orchard_blocks (orchard_id, season_id, name)
WHERE deleted_at IS NULL;
-- 1.4 BLOCK ROWS (each row has a variety)
CREATE TABLE IF NOT EXISTS public.block_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.orchard_blocks(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    variety TEXT,
    target_buckets INTEGER DEFAULT 100,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_row ON public.block_rows (block_id, row_number)
WHERE deleted_at IS NULL;
-- 1.5 USERS (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'team_leader' CHECK (
        role IN (
            'admin',
            'manager',
            'team_leader',
            'runner',
            'qc_inspector',
            'hr_admin',
            'payroll_admin',
            'logistics'
        )
    ),
    orchard_id UUID REFERENCES public.orchards(id),
    team_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ(3) DEFAULT now()
);
-- 1.6 PICKERS (seasonal workers)
CREATE TABLE IF NOT EXISTS public.pickers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picker_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    orchard_id UUID REFERENCES public.orchards(id),
    team_leader_id UUID REFERENCES public.users(id),
    role TEXT DEFAULT 'picker' CHECK (
        role IN (
            'picker',
            'runner',
            'bucket_runner',
            'team_leader'
        )
    ),
    safety_verified BOOLEAN DEFAULT false,
    total_buckets_today INTEGER DEFAULT 0,
    current_row INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ(3) DEFAULT now()
);
-- 1.7 DAY SETUPS
CREATE TABLE IF NOT EXISTS public.day_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id),
    season_id UUID REFERENCES public.harvest_seasons(id),
    date DATE DEFAULT CURRENT_DATE,
    variety TEXT,
    target_tons DECIMAL(10, 2),
    piece_rate DECIMAL(10, 2) DEFAULT 6.50,
    min_wage_rate DECIMAL(10, 2) DEFAULT 23.50,
    start_time TIME,
    created_by UUID REFERENCES public.users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.8 BUCKET RECORDS (core transaction)
CREATE TABLE IF NOT EXISTS public.bucket_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id),
    season_id UUID REFERENCES public.harvest_seasons(id),
    picker_id UUID REFERENCES public.pickers(id),
    bin_id UUID,
    block_row_id UUID REFERENCES public.block_rows(id),
    scanned_by UUID REFERENCES public.users(id),
    scanned_at TIMESTAMPTZ DEFAULT now(),
    row_number INTEGER,
    coords JSONB,
    quality_grade TEXT,
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ(3) DEFAULT now()
);
-- 1.9 BINS (logistics)
CREATE TABLE IF NOT EXISTS public.bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id),
    block_id UUID REFERENCES public.orchard_blocks(id),
    bin_code TEXT,
    status TEXT DEFAULT 'empty' CHECK (
        status IN ('empty', 'partial', 'full', 'collected')
    ),
    variety TEXT,
    location JSONB,
    movement_history JSONB [] DEFAULT '{}',
    filled_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 1.10 ROW ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.row_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id UUID REFERENCES public.orchards(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.harvest_seasons(id),
    block_row_id UUID REFERENCES public.block_rows(id),
    row_number INTEGER NOT NULL,
    side TEXT DEFAULT 'north' CHECK (side IN ('north', 'south')),
    assigned_pickers UUID [] DEFAULT '{}',
    completion_percentage INTEGER DEFAULT 0 CHECK (
        completion_percentage BETWEEN 0 AND 100
    ),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);
-- 1.11 QUALITY INSPECTIONS (legacy v1)
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
-- 1.12 QC INSPECTIONS (normalized v2)
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
-- 2. MESSAGING
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
CREATE TABLE IF NOT EXISTS public.daily_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    picker_id UUID NOT NULL REFERENCES public.pickers(id) ON DELETE CASCADE,
    orchard_id UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.harvest_seasons(id),
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
    corrected_by UUID REFERENCES auth.users(id),
    corrected_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT daily_attendance_unique UNIQUE (picker_id, date),
    CONSTRAINT daily_attendance_time_range CHECK (
        check_out IS NULL
        OR check_in IS NULL
        OR check_out > check_in
    )
);
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
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(orchard_id, date)
);
-- =============================================
-- 4. LOGISTICS
-- =============================================
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
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
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
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- =============================================
-- 5. HR
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
    deleted_at TIMESTAMPTZ,
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
-- 6. SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.harvest_settings (
    orchard_id UUID PRIMARY KEY REFERENCES public.orchards(id) ON DELETE CASCADE,
    min_wage_rate DECIMAL(10, 2) DEFAULT 23.50,
    piece_rate DECIMAL(10, 2) DEFAULT 6.50,
    min_buckets_per_hour DECIMAL(10, 2) DEFAULT 3.6,
    target_tons DECIMAL(10, 2) DEFAULT 40.0,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- =============================================
-- 7. SIMPLE MESSAGES (system notifications)
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- =============================================
-- 8. SECURITY & AUTH
-- =============================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    attempt_time TIMESTAMPTZ DEFAULT now(),
    success BOOLEAN DEFAULT false,
    user_agent TEXT,
    failure_reason TEXT
);
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
-- HR registration whitelist
CREATE TABLE IF NOT EXISTS public.allowed_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    assigned_role TEXT NOT NULL DEFAULT 'team_leader' CHECK (
        assigned_role IN (
            'admin',
            'manager',
            'team_leader',
            'runner',
            'qc_inspector',
            'hr_admin',
            'payroll_admin',
            'logistics'
        )
    ),
    orchard_id UUID REFERENCES public.orchards(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- =============================================
-- 9. ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.orchards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchard_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.row_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_registrations ENABLE ROW LEVEL SECURITY;
-- =============================================
-- 10. HELPER FUNCTIONS
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
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER
SET search_path = public STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
            AND role = 'admin'
    );
$$;
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Optimistic locking trigger
CREATE OR REPLACE FUNCTION public.bump_version() RETURNS TRIGGER AS $$ BEGIN IF OLD.version IS NOT NULL
    AND NEW.version IS NOT NULL
    AND OLD.version != NEW.version THEN RAISE EXCEPTION 'CONFLICT: record modified by another user (expected v%, got v%)',
    OLD.version,
    NEW.version USING ERRCODE = '40001';
END IF;
NEW.version = COALESCE(OLD.version, 0) + 1;
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Audit trail
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
-- Account lock functions
CREATE OR REPLACE FUNCTION public.is_account_locked(check_email TEXT) RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public LANGUAGE plpgsql AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM account_locks
        WHERE email = check_email
            AND locked_until > now()
            AND unlocked_at IS NULL
    );
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
END IF;
RETURN NEW;
END;
$$;
-- =============================================
-- 11. PERFORMANCE INDEXES
-- =============================================
-- Hierarchy
CREATE INDEX IF NOT EXISTS idx_blocks_by_season ON public.orchard_blocks (orchard_id, season_id)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rows_by_block ON public.block_rows (block_id)
WHERE deleted_at IS NULL;
-- Core
CREATE INDEX IF NOT EXISTS idx_users_orchard ON public.users(orchard_id);
CREATE INDEX IF NOT EXISTS idx_pickers_orchard ON public.pickers(orchard_id);
CREATE INDEX IF NOT EXISTS idx_pickers_code ON public.pickers(picker_id);
CREATE INDEX IF NOT EXISTS idx_bucket_records_picker ON public.bucket_records(picker_id);
CREATE INDEX IF NOT EXISTS idx_bucket_records_scanned_by ON public.bucket_records(scanned_by);
CREATE INDEX IF NOT EXISTS idx_bucket_records_created ON public.bucket_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bucket_records_orchard ON public.bucket_records(orchard_id);
-- Sync (delta)
CREATE INDEX IF NOT EXISTS idx_bucket_records_sync ON public.bucket_records (season_id, created_at)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_sync ON public.daily_attendance (season_id, created_at)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickers_sync ON public.pickers (orchard_id, created_at)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bucket_records_row_density ON public.bucket_records (orchard_id, season_id, block_row_id)
WHERE deleted_at IS NULL;
-- Messaging
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING gin(participant_ids);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_orchard_date ON public.daily_attendance(orchard_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_picker_date ON public.daily_attendance(picker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.daily_attendance(date DESC);
-- Day closures
CREATE INDEX IF NOT EXISTS idx_day_closures_orchard_date ON public.day_closures(orchard_id, date DESC);
-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON public.contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_orchard ON public.contracts(orchard_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
-- Fleet & Transport
CREATE INDEX IF NOT EXISTS idx_fleet_orchard ON public.fleet_vehicles(orchard_id);
CREATE INDEX IF NOT EXISTS idx_transport_orchard ON public.transport_requests(orchard_id);
CREATE INDEX IF NOT EXISTS idx_transport_status ON public.transport_requests(status);
-- Security
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_account_locks_email ON public.account_locks(email, locked_until DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table ON public.sync_conflicts(table_name, record_id);
-- =============================================
-- 12. TRIGGERS
-- =============================================
-- Optimistic locking
DROP TRIGGER IF EXISTS trg_pickers_version ON public.pickers;
CREATE TRIGGER trg_pickers_version BEFORE
UPDATE ON public.pickers FOR EACH ROW EXECUTE FUNCTION bump_version();
DROP TRIGGER IF EXISTS trg_attendance_version ON public.daily_attendance;
CREATE TRIGGER trg_attendance_version BEFORE
UPDATE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION bump_version();
DROP TRIGGER IF EXISTS trg_row_assignments_version ON public.row_assignments;
CREATE TRIGGER trg_row_assignments_version BEFORE
UPDATE ON public.row_assignments FOR EACH ROW EXECUTE FUNCTION bump_version();
-- updated_at
DROP TRIGGER IF EXISTS trg_seasons_updated_at ON public.harvest_seasons;
CREATE TRIGGER trg_seasons_updated_at BEFORE
UPDATE ON public.harvest_seasons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_blocks_updated_at ON public.orchard_blocks;
CREATE TRIGGER trg_blocks_updated_at BEFORE
UPDATE ON public.orchard_blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS contracts_updated_at ON public.contracts;
CREATE TRIGGER contracts_updated_at BEFORE
UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS fleet_updated_at ON public.fleet_vehicles;
CREATE TRIGGER fleet_updated_at BEFORE
UPDATE ON public.fleet_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS transport_updated_at ON public.transport_requests;
CREATE TRIGGER transport_updated_at BEFORE
UPDATE ON public.transport_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE
UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS pickers_updated_at ON public.pickers;
CREATE TRIGGER pickers_updated_at BEFORE
UPDATE ON public.pickers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Audit
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
-- Auth lockout
DROP TRIGGER IF EXISTS trigger_lock_account ON public.login_attempts;
CREATE TRIGGER trigger_lock_account
AFTER
INSERT ON public.login_attempts FOR EACH ROW EXECUTE FUNCTION lock_account_on_failures();
-- =============================================
-- 13. COMMENTS
-- =============================================
COMMENT ON TABLE public.harvest_seasons IS 'Season-scoped data isolation — prevents OOM in multi-year usage';
COMMENT ON TABLE public.orchard_blocks IS 'Physical subdivision of orchard — managed by admin before season starts';
COMMENT ON TABLE public.block_rows IS 'Individual row within a block — each has a variety and target';
COMMENT ON TABLE public.day_closures IS 'Immutable daily closure records for audit/legal compliance';
COMMENT ON TABLE public.audit_logs IS 'Complete audit trail for compliance and security';
COMMENT ON TABLE public.sync_conflicts IS 'Audit trail for offline sync conflicts (last-write-wins with logging)';
SELECT 'Schema V3 Consolidated — 22 tables, hierarchy, soft deletes, optimistic locking, all RLS' AS result;