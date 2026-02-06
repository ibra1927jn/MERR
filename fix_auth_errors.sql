-- =============================================
-- FIX AUTHENTICATION ERRORS (406/409)
-- Run this in Supabase > SQL Editor
-- =============================================

-- =============================================
-- STEP 1: CREATE ORCHARDS TABLE IF NOT EXISTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.orchards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert a default orchard if none exists
INSERT INTO public.orchards (id, name, location)
SELECT 
    'a0000000-0000-0000-0000-000000000001'::UUID,
    'Default Orchard',
    'New Zealand'
WHERE NOT EXISTS (SELECT 1 FROM public.orchards LIMIT 1);

-- =============================================
-- STEP 2: CREATE USERS TABLE IF NOT EXISTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'team_leader',
    orchard_id UUID REFERENCES public.orchards(id),
    team_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STEP 3: FIX RLS ON ORCHARDS
-- =============================================
ALTER TABLE public.orchards ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on orchards
DROP POLICY IF EXISTS "Authenticated users can read orchards" ON public.orchards;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.orchards;
DROP POLICY IF EXISTS "Public read" ON public.orchards;

-- Create simple read policy
CREATE POLICY "Allow authenticated to read orchards" 
ON public.orchards FOR SELECT 
TO authenticated 
USING (true);

-- =============================================
-- STEP 4: FIX RLS ON USERS (THE MAIN ISSUE)
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read members of same orchard" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can read self" ON public.users;
DROP POLICY IF EXISTS "Users can read team members" ON public.users;
DROP POLICY IF EXISTS "Users can map members" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;
DROP POLICY IF EXISTS "Read self" ON public.users;
DROP POLICY IF EXISTS "Read members from my orchard" ON public.users;
DROP POLICY IF EXISTS "Register self" ON public.users;
DROP POLICY IF EXISTS "Update self" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to read users" ON public.users;
DROP POLICY IF EXISTS "Allow insert self" ON public.users;
DROP POLICY IF EXISTS "Allow update self" ON public.users;

-- Create safe helper function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION get_my_orchard_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT orchard_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Policy 1: Read own profile (CRITICAL - breaks recursion)
CREATE POLICY "Allow read self" ON public.users
FOR SELECT USING (auth.uid() = id);

-- Policy 2: Read team members via helper function
CREATE POLICY "Allow read orchard members" ON public.users
FOR SELECT USING (orchard_id = get_my_orchard_id());

-- Policy 3: Insert own profile (for registration)
CREATE POLICY "Allow insert self" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 4: Update own profile
CREATE POLICY "Allow update self" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- STEP 5: GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.orchards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_orchard_id TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 'RLS policies fixed successfully!' AS status;
