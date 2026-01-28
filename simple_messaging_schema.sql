-- =============================================
-- SIMPLE MESSAGING SYSTEM - DATABASE SCHEMA
-- Ejecuta este script en Supabase SQL Editor
-- =============================================

-- 1. TABLA: conversations (chats/grupos)
-- =============================================
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT, -- Solo para grupos
    participant_ids TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: chat_messages (mensajes)
-- =============================================
CREATE TABLE public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
-- =============================================
CREATE INDEX idx_conversations_participants ON public.conversations USING gin(participant_ids);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- 4. Deshabilitar RLS (para desarrollo)
-- =============================================
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;

-- 5. Habilitar Realtime
-- =============================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Crear conversación de prueba con todos los usuarios
-- =============================================
INSERT INTO public.conversations (type, name, participant_ids, created_by)
SELECT 
    'group',
    'Equipo General',
    ARRAY_AGG(id::text),
    (SELECT id FROM public.users LIMIT 1)
FROM public.users;

-- 7. Verificar
-- =============================================
SELECT 'Tablas creadas:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('conversations', 'chat_messages');

SELECT 'Conversación de prueba:' as info;
SELECT * FROM public.conversations;

SELECT '¡LISTO! Ahora crea el servicio y componente.' as resultado;
