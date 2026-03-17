-- =============================================
-- SEED: Production Bootstrap — Initial Manager Account
-- 
-- PURPOSE: Pre-authorize the first manager email in allowed_registrations.
-- The user will register through the normal SignUp flow and set their
-- OWN secure password. No hardcoded credentials.
--
-- USAGE:
--   1. Replace 'your-manager@yourdomain.co.nz' with the real email
--   2. Replace the orchard_id with the actual production orchard UUID
--   3. Run in Supabase SQL Editor (production project)
--   4. The manager can then register at /login → "Create Account"
--
-- ⚠️  This file is SAFE for production. No passwords are created.
-- =============================================

DO $$
DECLARE 
  v_orchard_id UUID;
BEGIN
  -- Get the first (or only) orchard
  SELECT id INTO v_orchard_id FROM public.orchards LIMIT 1;
  
  IF v_orchard_id IS NULL THEN
    RAISE EXCEPTION 'No orchards found. Create an orchard first using the Setup Wizard.';
  END IF;

  -- Pre-authorize the initial manager email
  INSERT INTO public.allowed_registrations (
    email, 
    role, 
    orchard_id, 
    full_name
  ) VALUES (
    'your-manager@yourdomain.co.nz',  -- ← REPLACE with real email
    'manager',
    v_orchard_id,
    'Orchard Manager'                   -- ← REPLACE with real name
  ) ON CONFLICT (email) DO NOTHING;

  RAISE NOTICE '✅ Production bootstrap complete.';
  RAISE NOTICE 'The manager can now register at /login with their own password.';
  RAISE NOTICE 'Authorized email: your-manager@yourdomain.co.nz';
  RAISE NOTICE 'Orchard: %', v_orchard_id;
END $$;
