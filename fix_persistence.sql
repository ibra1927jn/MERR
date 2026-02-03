-- =============================================
-- FIX PERSISTENCE SCRIPT
-- Run this in Supabase > SQL Editor
-- =============================================

-- 1. Ensure team_leader_id column exists FIRST
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickers' AND column_name = 'team_leader_id') THEN
        ALTER TABLE public.pickers ADD COLUMN team_leader_id UUID REFERENCES public.users(id);
    END IF;
END $$;

-- 2. Allow pickers to exist without an orchard (orphaned pickers)
ALTER TABLE public.pickers 
ALTER COLUMN orchard_id DROP NOT NULL;

-- 3. Update RLS Policy for Pickers
-- Allow Team Leaders to manage their own pickers (orphaned or not)
DROP POLICY IF EXISTS "Users can manage pickers" ON public.pickers;
DROP POLICY IF EXISTS "Pickers see self" ON public.pickers;
DROP POLICY IF EXISTS "Team Leaders manage own pickers" ON public.pickers;

CREATE POLICY "Team Leaders manage own pickers" ON public.pickers
    FOR ALL
    USING (
        -- Can see if:
        -- 1. I am the picker (classic)
        (auth.uid()::text = picker_id) OR
        -- 2. I am the Team Leader who created them/owns them
        (team_leader_id = auth.uid()) OR
        -- 3. I am a Manager/Team Leader generally (fallback for existing logic)
        (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'team_leader')))
    )
    WITH CHECK (
        -- Can Insert/Update if:
        -- 1. I am a Manager/Team Leader
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'team_leader'))
    );

SELECT 'Persistence Fix Applied Successfully!' as result;
