-- =============================================
-- HARVESTPRO NZ - FIX MESSAGING SCHEMA
-- Purpose: Ensure messaging tables match simple-messaging.service.ts expectations
-- =============================================

-- 1. CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT, -- Nullable for direct chats
    participant_ids TEXT[] NOT NULL, -- Array of User IDs
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHAT MESSAGES TABLE
-- Ensure table name is 'chat_messages' NOT 'messages' to avoid conflicts
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations USING GIN(participant_ids);

-- 4. RLS POLICIES (Simple)
-- =============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to see conversations they are part of
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT USING (auth.uid()::text = ANY(participant_ids));

-- Allow users to insert if they are part of participants (simplified)
CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid()::text = ANY(participant_ids));

-- Allow users to view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id 
            AND auth.uid()::text = ANY(c.participant_ids)
        )
    );

-- Allow users to send messages to their conversations
CREATE POLICY "Users can insert messages in their conversations" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id 
            AND auth.uid()::text = ANY(c.participant_ids)
        )
    );

SELECT 'Messaging schema fixed successfully' as result;
