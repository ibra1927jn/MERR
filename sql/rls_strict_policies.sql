-- =============================================
-- STRICT RLS POLICIES FOR HARVESTPRO NZ
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.row_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS
-- =============================================
DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;
CREATE POLICY "Users can read all profiles" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- PICKERS
-- =============================================
DROP POLICY IF EXISTS "Orchard restricted picker management" ON public.pickers;
CREATE POLICY "Orchard restricted picker management" ON public.pickers
    FOR ALL USING (
        orchard_id IN (
            SELECT orchard_id FROM public.users WHERE id = auth.uid()
        )
    );

-- =============================================
-- BUCKET RECORDS
-- =============================================
DROP POLICY IF EXISTS "Access bucket records" ON public.bucket_records;
CREATE POLICY "Access bucket records" ON public.bucket_records
    FOR SELECT USING (
        (EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('manager', 'team_leader')
            AND orchard_id = bucket_records.orchard_id
        ))
        OR
        (EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('manager', 'team_leader', 'bucket_runner')
            AND orchard_id = bucket_records.orchard_id
        ))
    );

DROP POLICY IF EXISTS "Insert bucket records" ON public.bucket_records;
CREATE POLICY "Insert bucket records" ON public.bucket_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('bucket_runner', 'team_leader', 'manager')
            AND orchard_id = bucket_records.orchard_id
        )
    );

-- =============================================
-- MESSAGING (conversations & chat_messages)
-- =============================================
DROP POLICY IF EXISTS "View conversations" ON public.conversations;
CREATE POLICY "View conversations" ON public.conversations
    FOR SELECT USING (
        auth.uid()::text = ANY(participant_ids)
    );

DROP POLICY IF EXISTS "Insert conversations" ON public.conversations;
CREATE POLICY "Insert conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        auth.uid()::text = ANY(participant_ids)
    );

DROP POLICY IF EXISTS "View messages" ON public.chat_messages;
CREATE POLICY "View messages" ON public.chat_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE auth.uid()::text = ANY(participant_ids)
        )
    );

DROP POLICY IF EXISTS "Send messages" ON public.chat_messages;
CREATE POLICY "Send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE auth.uid()::text = ANY(participant_ids)
        )
    );

-- =============================================
-- DAY SETUP & OPERATIONS
-- =============================================
DROP POLICY IF EXISTS "Manage day setup" ON public.day_setups;
CREATE POLICY "Manage day setup" ON public.day_setups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('manager', 'team_leader')
            AND orchard_id = day_setups.orchard_id
        )
    );

DROP POLICY IF EXISTS "View day setup" ON public.day_setups;
CREATE POLICY "View day setup" ON public.day_setups
    FOR SELECT USING (
        EXISTS (
             SELECT 1 FROM public.users
             WHERE id = auth.uid()
             AND orchard_id = day_setups.orchard_id
        )
    );
