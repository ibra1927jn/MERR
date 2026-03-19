-- =============================================
-- Privacy Consent Audit Log (Immutable)
-- =============================================
-- Audit fix H-4: Creates an append-only log of privacy consent events.
-- NZ Privacy Act 2020 requires provable records of when consent was given,
-- by whom, and what version of the policy text was accepted.
-- =============================================

-- Table: immutable consent log
CREATE TABLE IF NOT EXISTS public.privacy_consent_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type text NOT NULL DEFAULT 'privacy_policy',
    policy_version text NOT NULL DEFAULT '1.0',
    consent_given boolean NOT NULL DEFAULT true,
    ip_address inet,
    user_agent text,
    consented_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_consent_log ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own consent records
CREATE POLICY "Users can view own consent records"
    ON public.privacy_consent_log FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: authenticated users can insert their own consent
CREATE POLICY "Users can insert own consent"
    ON public.privacy_consent_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: managers/owners can view all consent records (audit purposes)
CREATE POLICY "Managers can view all consent records"
    ON public.privacy_consent_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('owner', 'manager')
        )
    );

-- NO UPDATE OR DELETE policies — this table is append-only (immutable)
-- This ensures compliance with NZ Privacy Act record-keeping requirements

-- Trigger: prevent any UPDATE or DELETE operations
CREATE OR REPLACE FUNCTION prevent_consent_log_modification()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Privacy consent log is immutable. UPDATE and DELETE operations are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_consent_log_update
    BEFORE UPDATE ON public.privacy_consent_log
    FOR EACH ROW EXECUTE FUNCTION prevent_consent_log_modification();

CREATE TRIGGER trg_prevent_consent_log_delete
    BEFORE DELETE ON public.privacy_consent_log
    FOR EACH ROW EXECUTE FUNCTION prevent_consent_log_modification();

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.privacy_consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_consented_at ON public.privacy_consent_log(consented_at);

-- Comment
COMMENT ON TABLE public.privacy_consent_log IS 'Immutable audit trail for privacy consent events. No UPDATE/DELETE allowed.';
