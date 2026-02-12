-- =============================================
-- SEED: Demo Accounts for HR Admin & Logistics
-- Run in Supabase SQL Editor
-- =============================================
-- These create auth users + public.users row for
-- hr@harvestpro.nz (HR Admin) and logistics@harvestpro.nz (Logistics)
-- Password for both: demo1234
-- 1) Create HR Admin auth user
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'hr@harvestpro.nz',
        crypt('demo1234', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Maria González"}',
        false
    ) ON CONFLICT (email) DO NOTHING;
-- Insert HR Admin identity
INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
SELECT gen_random_uuid(),
    id,
    json_build_object('sub', id::text, 'email', email)::jsonb,
    'email',
    id::text,
    NOW(),
    NOW(),
    NOW()
FROM auth.users
WHERE email = 'hr@harvestpro.nz' ON CONFLICT DO NOTHING;
-- Insert HR Admin public profile
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id,
    email,
    'Maria González',
    'hr_admin',
    true
FROM auth.users
WHERE email = 'hr@harvestpro.nz' ON CONFLICT (id) DO
UPDATE
SET role = 'hr_admin',
    is_active = true;
-- ─────────────────────────────────────────────────
-- 2) Create Logistics auth user
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'logistics@harvestpro.nz',
        crypt('demo1234', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Carlos Muñoz"}',
        false
    ) ON CONFLICT (email) DO NOTHING;
-- Insert Logistics identity
INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
SELECT gen_random_uuid(),
    id,
    json_build_object('sub', id::text, 'email', email)::jsonb,
    'email',
    id::text,
    NOW(),
    NOW(),
    NOW()
FROM auth.users
WHERE email = 'logistics@harvestpro.nz' ON CONFLICT DO NOTHING;
-- Insert Logistics public profile
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT id,
    email,
    'Carlos Muñoz',
    'logistics',
    true
FROM auth.users
WHERE email = 'logistics@harvestpro.nz' ON CONFLICT (id) DO
UPDATE
SET role = 'logistics',
    is_active = true;
-- ─────────────────────────────────────────────────
-- VERIFICATION: Check all demo accounts exist
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