-- MESSAGING SCHEMA FOR SIMPLE MESSAGING SERVICE
-- Creates tables and policies to match simple-messaging.service.ts

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

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_by UUID[] DEFAULT '{}'
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);

-- 4. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Conversations: Users can see conversations they are part of
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (auth.uid() = ANY(participant_ids));

-- Conversations: Users can create conversations if they are participants
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = ANY(participant_ids) AND auth.uid() = created_by);

-- Messages: Users can see messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations"
ON chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = chat_messages.conversation_id 
        AND auth.uid() = ANY(participant_ids)
    )
);

-- Messages: Users can send messages to conversations they belong to
CREATE POLICY "Users can send messages to their conversations"
ON chat_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = chat_messages.conversation_id 
        AND auth.uid() = ANY(participant_ids)
    )
);

-- 6. Realtime
ALTER publication supabase_realtime ADD TABLE chat_messages;
ALTER publication supabase_realtime ADD TABLE conversations;
