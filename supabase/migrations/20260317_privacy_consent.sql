-- =============================================
-- MIGRATION: Add privacy_consent_at columns
-- Required by: NZ Privacy Act 2020 (Information Privacy Principles)
-- Date: 2026-03-17
--
-- Adds a TIMESTAMPTZ column to track when each user/picker
-- explicitly accepted the privacy consent. NULL = not yet accepted.
-- The PrivacyConsentModal component blocks access until consent is given.
-- =============================================

-- 1. Add to public.users (all system users)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add to public.pickers (seasonal workers who may not have user accounts)
ALTER TABLE public.pickers 
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.users.privacy_consent_at IS 
  'Timestamp when user accepted NZ Privacy Act 2020 consent. NULL = pending.';
COMMENT ON COLUMN public.pickers.privacy_consent_at IS 
  'Timestamp when picker accepted NZ Privacy Act 2020 consent. NULL = pending.';

-- 4. Backfill existing test/demo accounts as already consented
-- (only for development environments — production users must consent explicitly)
-- DO NOT run this UPDATE in production.
-- UPDATE public.users SET privacy_consent_at = NOW() WHERE email LIKE '%@harvestpro.nz';
