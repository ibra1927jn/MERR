-- ============================================================================
-- Migration: 20260321_rls_hardening.sql
-- Multi-tenancy RLS Hardening — Extra guard layer
--
-- Problem: RLS policies on individual tables are the last line of defence.
-- A misconfigured policy or a new table without RLS could expose cross-orchard data.
--
-- Solution: Helper function get_user_orchard_ids() + mandatory membership check
-- on all sensitive tables. Defense-in-depth approach.
-- ============================================================================

-- ── Helper: get_user_orchard_ids ────────────────────────────────────────────
-- Returns all orchard IDs the current JWT user is authorised to access.
-- Used in every RLS policy as an additional guard layer.

CREATE OR REPLACE FUNCTION public.get_user_orchard_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT orchard_id
    FROM orchard_members
    WHERE user_id = auth.uid()
      AND is_active = TRUE
  );
$$;

COMMENT ON FUNCTION public.get_user_orchard_ids() IS
  'Returns all orchard IDs accessible to the authenticated user. Used by RLS policies.';

-- ── Orchard Members Table ───────────────────────────────────────────────────
-- Explicit membership table: every user→orchard relationship is recorded here.
-- This is the authoritative source for cross-tenancy access control.

CREATE TABLE IF NOT EXISTS public.orchard_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchard_id   UUID NOT NULL REFERENCES orchards(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'manager',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by   UUID REFERENCES auth.users(id),
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orchard_members_role_check CHECK (
    role IN ('admin', 'hr_admin', 'manager', 'team_leader', 'viewer')
  ),
  UNIQUE(orchard_id, user_id)
);

-- Index for fast membership lookup (hot path in every RLS check)
CREATE INDEX IF NOT EXISTS idx_orchard_members_user_id
  ON orchard_members(user_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_orchard_members_orchard_id
  ON orchard_members(orchard_id)
  WHERE is_active = TRUE;

-- ── RLS on orchard_members ──────────────────────────────────────────────────
ALTER TABLE public.orchard_members ENABLE ROW LEVEL SECURITY;

-- Users can see members of orchards they belong to
CREATE POLICY "orchard_members_select" ON public.orchard_members
  FOR SELECT USING (
    orchard_id = ANY(get_user_orchard_ids())
  );

-- Only admins can invite/modify members
CREATE POLICY "orchard_members_insert" ON public.orchard_members
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'hr_admin')
    AND orchard_id = ANY(get_user_orchard_ids())
  );

CREATE POLICY "orchard_members_update" ON public.orchard_members
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
    AND orchard_id = ANY(get_user_orchard_ids())
  );

-- ── Additional Guard: pickers table ────────────────────────────────────────
-- Ensure the existing pickers RLS also checks orchard membership
-- (not just the orchard_id field match)

DROP POLICY IF EXISTS "pickers_select_guard" ON public.pickers;
CREATE POLICY "pickers_select_guard" ON public.pickers
  FOR SELECT USING (
    orchard_id = ANY(get_user_orchard_ids())
  );

-- ── Additional Guard: daily_attendance ─────────────────────────────────────

DROP POLICY IF EXISTS "attendance_select_guard" ON public.daily_attendance;
CREATE POLICY "attendance_select_guard" ON public.daily_attendance
  FOR SELECT USING (
    orchard_id = ANY(get_user_orchard_ids())
  );

-- ── Additional Guard: bucket_records ───────────────────────────────────────

DROP POLICY IF EXISTS "buckets_select_guard" ON public.bucket_records;
CREATE POLICY "buckets_select_guard" ON public.bucket_records
  FOR SELECT USING (
    orchard_id = ANY(get_user_orchard_ids())
  );

-- ── Additional Guard: wage_rates ───────────────────────────────────────────

DROP POLICY IF EXISTS "wage_rates_select_guard" ON public.wage_rates;
CREATE POLICY "wage_rates_select_guard" ON public.wage_rates
  FOR SELECT USING (
    orchard_id = ANY(get_user_orchard_ids())
  );

-- ── Seed membership for existing users ─────────────────────────────────────
-- Ensure existing admin users are linked to all orchards they manage.
-- Adjust role as needed after migration.

INSERT INTO public.orchard_members (orchard_id, user_id, role, joined_at)
SELECT
  o.id AS orchard_id,
  au.id AS user_id,
  'admin' AS role,
  NOW() AS joined_at
FROM orchards o
CROSS JOIN auth.users au
WHERE au.raw_user_meta_data ->> 'role' IN ('admin', 'manager')
ON CONFLICT (orchard_id, user_id) DO NOTHING;

-- ── Security function: verify orchard access (for Edge Functions) ───────────
-- Call this from Edge Functions instead of trusting JWT role claim alone.

CREATE OR REPLACE FUNCTION public.verify_orchard_access(
  p_orchard_id UUID,
  p_required_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_role_rank INT;
  v_required_rank INT;
BEGIN
  SELECT role INTO v_role
  FROM orchard_members
  WHERE user_id = auth.uid()
    AND orchard_id = p_orchard_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Role hierarchy: admin > hr_admin > manager > team_leader > viewer
  v_role_rank := CASE v_role
    WHEN 'admin' THEN 5
    WHEN 'hr_admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'team_leader' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  v_required_rank := CASE p_required_role
    WHEN 'admin' THEN 5
    WHEN 'hr_admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'team_leader' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN v_role_rank >= v_required_rank;
END;
$$;

COMMENT ON FUNCTION public.verify_orchard_access IS
  'Check if current user has at least the specified role for an orchard. Use in Edge Functions.';
