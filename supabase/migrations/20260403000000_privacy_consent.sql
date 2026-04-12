-- =============================================
-- Migration: Add NZ Privacy Act 2020 consent tracking
-- Adds privacy_consent_at column to public.users
-- Creates privacy_consent_log immutable audit trail
-- =============================================

-- 1. Add privacy consent timestamp to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.users.privacy_consent_at IS 
  'NZ Privacy Act 2020: timestamp when user accepted privacy consent. NULL = pending';

-- 2. Create immutable consent audit log
CREATE TABLE IF NOT EXISTS public.privacy_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL DEFAULT 'privacy_policy',
  policy_version TEXT NOT NULL DEFAULT '1.0',
  consent_given BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.privacy_consent_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: users can insert their own consent and read their own history
CREATE POLICY privacy_consent_insert ON public.privacy_consent_log 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY privacy_consent_select ON public.privacy_consent_log 
  FOR SELECT USING (user_id = auth.uid());

-- 5. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_privacy_consent_log_user_id 
  ON public.privacy_consent_log(user_id);
