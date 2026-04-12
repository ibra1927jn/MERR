-- =============================================
-- Create broadcasts table
-- Fixes 404 on /rest/v1/broadcasts endpoint
-- Schema derived from Broadcast interface in app.types.ts
-- =============================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchard_id  UUID NOT NULL REFERENCES public.orchards(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    target_roles TEXT[] DEFAULT '{}',
    acknowledged_by UUID[] DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by orchard
CREATE INDEX IF NOT EXISTS idx_broadcasts_orchard_id ON public.broadcasts(orchard_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON public.broadcasts(created_at DESC);

-- Enable RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view broadcasts for their orchard
DROP POLICY IF EXISTS "broadcasts_view_policy" ON public.broadcasts;
CREATE POLICY "broadcasts_view_policy" ON public.broadcasts FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only managers can create broadcasts
DROP POLICY IF EXISTS "broadcasts_insert_policy" ON public.broadcasts;
CREATE POLICY "broadcasts_insert_policy" ON public.broadcasts FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Only managers can update broadcasts
DROP POLICY IF EXISTS "broadcasts_update_policy" ON public.broadcasts;
CREATE POLICY "broadcasts_update_policy" ON public.broadcasts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Only managers can delete broadcasts
DROP POLICY IF EXISTS "broadcasts_delete_policy" ON public.broadcasts;
CREATE POLICY "broadcasts_delete_policy" ON public.broadcasts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Enable realtime for broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
