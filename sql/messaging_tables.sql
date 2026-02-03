
-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT CHECK (type IN ('direct', 'group')) NOT NULL,
    name TEXT,
    participant_ids UUID[] NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    orchard_id UUID REFERENCES orchards(id)
);

-- Fix types if table already existed with incorrect types (e.g. TEXT instead of UUID)
-- We attempt this best-effort. If it fails due to data, we catch it.
DO $$
BEGIN
    BEGIN
        ALTER TABLE conversations ALTER COLUMN participant_ids TYPE UUID[] USING participant_ids::text::UUID[];
    EXCEPTION WHEN others THEN NULL; END;
    
    BEGIN
        ALTER TABLE conversations ALTER COLUMN created_by TYPE UUID USING created_by::text::UUID;
    EXCEPTION WHEN others THEN NULL; END;

    BEGIN
        ALTER TABLE conversations ALTER COLUMN orchard_id TYPE UUID USING orchard_id::text::UUID;
    EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_by UUID[] DEFAULT '{}'
);

-- Fix types for chat_messages
DO $$
BEGIN
    BEGIN
        ALTER TABLE chat_messages ALTER COLUMN conversation_id TYPE UUID USING conversation_id::text::UUID;
    EXCEPTION WHEN others THEN NULL; END;

    BEGIN
        ALTER TABLE chat_messages ALTER COLUMN sender_id TYPE UUID USING sender_id::text::UUID;
    EXCEPTION WHEN others THEN NULL; END;

    BEGIN
        ALTER TABLE chat_messages ALTER COLUMN read_by TYPE UUID[] USING read_by::text::UUID[];
    EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);

-- 4. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Drop existing policies to avoid conflicts or stale definitions
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON chat_messages;

-- Conversations: Users can see conversations they are part of
-- Explicitly cast participant_ids to UUID[] to handle cases where it might still be TEXT/TEXT[]
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (auth.uid() = ANY(participant_ids::uuid[]));

-- Conversations: Users can create conversations if they are participants
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (
    auth.uid() = ANY(participant_ids::uuid[]) AND 
    auth.uid() = created_by::uuid
);

-- Messages: Users can see messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations"
ON chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = chat_messages.conversation_id::uuid
        AND auth.uid() = ANY(participant_ids::uuid[])
    )
);

-- Messages: Users can send messages to conversations they belong to
CREATE POLICY "Users can send messages to their conversations"
ON chat_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id::uuid AND
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = chat_messages.conversation_id::uuid 
        AND auth.uid() = ANY(participant_ids::uuid[])
    )
);

-- 6. Realtime
-- Check if publication exists before adding
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
        ALTER publication supabase_realtime ADD TABLE chat_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
        ALTER publication supabase_realtime ADD TABLE conversations;
    END IF;
EXCEPTION
    WHEN undefined_object THEN NULL; -- Publication might not exist
END $$;
