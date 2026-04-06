-- =============================================
-- SEED: Create Test Accounts for HarvestPro NZ
-- Run in Supabase SQL Editor (requires service_role access)
-- Creates 8 test accounts with password: 111111
--
-- ⚠️  PRODUCTION GUARD: These accounts use trivial passwords.
--     DO NOT run this seed in production environments.
--     Use `allowed_registrations` + user-created passwords instead.
-- =============================================

-- 🛡️ PRODUCTION GUARD: Abort if database name suggests production
DO $$
BEGIN
  IF current_database() ILIKE '%prod%' OR current_database() ILIKE '%production%' THEN
    RAISE EXCEPTION '🚫 BLOCKED: This seed contains trivial passwords (111111) and must NOT be run in a production database. Current database: %. Use seed_production_admin.sql instead.', current_database();
  END IF;
END $$;

DO $$
DECLARE v_orchard_id UUID;
v_temp_id UUID;
v_password_hash TEXT;
v_user_ids UUID [] := ARRAY [
        gen_random_uuid(), -- manager
        gen_random_uuid(), -- lead
        gen_random_uuid(), -- runner
        gen_random_uuid(), -- qc
        gen_random_uuid(), -- payroll
        gen_random_uuid(), -- admin
        gen_random_uuid(), -- hr
        gen_random_uuid()  -- logistics
    ];
v_emails TEXT [] := ARRAY [
        'manager@harvestpro.nz',
        'lead@harvestpro.nz',
        'runner@harvestpro.nz',
        'qc@harvestpro.nz',
        'payroll@harvestpro.nz',
        'admin@harvestpro.nz',
        'hr@harvestpro.nz',
        'logistics@harvestpro.nz'
    ];
v_roles TEXT [] := ARRAY [
        'manager',
        'team_leader',
        'runner',
        'qc_inspector',
        'payroll_admin',
        'admin',
        'hr_admin',
        'logistics'
    ];
v_names TEXT [] := ARRAY [
        'Manager HarvestPro',
        'Team Leader',
        'Bucket Runner',
        'QC Inspector',
        'Payroll Admin',
        'System Admin',
        'HR Admin',
        'Logistics Manager'
    ];
i INT;
BEGIN -- 1. Get the first orchard
SELECT id INTO v_orchard_id
FROM public.orchards
LIMIT 1;
IF v_orchard_id IS NULL THEN RAISE EXCEPTION 'No orchards found. Create an orchard first.';
END IF;
RAISE NOTICE 'Using orchard: %',
v_orchard_id;
-- 2. bcrypt hash for '111111' — generated with cost factor 10
-- This is the standard Supabase/GoTrue bcrypt hash for password '111111'
v_password_hash := crypt('111111', gen_salt('bf'));
-- Removed auth.users, auth.identities, and public.users manual injection
FOR i IN 1..8 LOOP
-- Insert into allowed_registrations (mark as used)
INSERT INTO public.allowed_registrations (email, assigned_role, orchard_id, used_at)
VALUES (
        v_emails [i],
        v_roles [i],
        v_orchard_id,
        now()
    ) ON CONFLICT (email) DO NOTHING;
END LOOP;
RAISE NOTICE '✅ All 8 test accounts created successfully!';
RAISE NOTICE 'Login with any of: manager@harvestpro.nz / 111111';
END $$;
-- Verify the accounts were created
SELECT u.email,
    u.email_confirmed_at IS NOT NULL AS confirmed,
    pu.role,
    pu.full_name,
    pu.orchard_id IS NOT NULL AS has_orchard
FROM auth.users u
    LEFT JOIN public.users pu ON pu.id = u.id
WHERE u.email LIKE '%@harvestpro.nz'
ORDER BY u.email;