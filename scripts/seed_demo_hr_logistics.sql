-- =============================================
-- SEED: Demo accounts for HR Admin & Logistics
-- Step 1: Update the role CHECK constraint
-- Step 2: Insert the profiles
-- Run ALL of this in Supabase SQL Editor
-- =============================================
-- STEP 1: Drop the old role constraint and add a new one that includes the new roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
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
-- STEP 2: Insert profiles
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id,
    'hr@harvestpro.nz',
    'Maria González',
    'hr_admin',
    true
FROM auth.users
WHERE email = 'hr@harvestpro.nz';
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id,
    'logistics@harvestpro.nz',
    'Carlos Muñoz',
    'logistics',
    true
FROM auth.users
WHERE email = 'logistics@harvestpro.nz';
-- STEP 3: Verify
SELECT email,
    full_name,
    role,
    is_active
FROM public.users
WHERE email IN (
        'manager@harvestpro.nz',
        'lead@harvestpro.nz',
        'runner@harvestpro.nz',
        'qc@harvestpro.nz',
        'hr@harvestpro.nz',
        'logistics@harvestpro.nz'
    )
ORDER BY role;