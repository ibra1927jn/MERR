-- =============================================
-- HARVESTPRO NZ - Script de configuración CORREGIDO
-- Ejecuta este script en: Supabase > SQL Editor > New Query
-- =============================================

-- 1. Verificar si hay un orchard existente, si no crear uno con code
-- =============================================
INSERT INTO public.orchards (code, name, location, total_blocks)
SELECT 'DEMO001', 'Demo Orchard', 'Central Otago, NZ', 5
WHERE NOT EXISTS (SELECT 1 FROM public.orchards LIMIT 1);

-- 2. CREAR TABLA: chat_groups (esta ES la que falta)
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orchard_id UUID REFERENCES public.orchards(id),
    name TEXT NOT NULL,
    members TEXT[] DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Verificar/crear tabla messages si no existe
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orchard_id UUID,
    sender_id UUID NOT NULL,
    recipient_id UUID,
    group_id UUID,
    type TEXT CHECK (type IN ('direct', 'group', 'broadcast')),
    content TEXT NOT NULL,
    read_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONFIGURAR RLS (Row Level Security)
-- =============================================

-- Habilitar RLS en las tablas
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Si users no tiene RLS habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS - Permitir acceso a usuarios autenticados
-- =============================================

-- Chat Groups: CRUD para usuarios autenticados
DROP POLICY IF EXISTS "Users can manage chat_groups" ON public.chat_groups;
CREATE POLICY "Users can manage chat_groups" ON public.chat_groups
    FOR ALL USING (auth.role() = 'authenticated');

-- Messages: CRUD para usuarios autenticados
DROP POLICY IF EXISTS "Users can manage messages" ON public.messages;
CREATE POLICY "Users can manage messages" ON public.messages
    FOR ALL USING (auth.role() = 'authenticated');

-- Users: Los usuarios pueden leer todos
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para tablas existentes (por si les falta)
DROP POLICY IF EXISTS "Users can read orchards" ON public.orchards;
CREATE POLICY "Users can read orchards" ON public.orchards
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can read blocks" ON public.blocks;
CREATE POLICY "Users can read blocks" ON public.blocks
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage pickers" ON public.pickers;
CREATE POLICY "Users can manage pickers" ON public.pickers
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage broadcasts" ON public.broadcasts;
CREATE POLICY "Users can manage broadcasts" ON public.broadcasts
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage alerts" ON public.alerts;
CREATE POLICY "Users can manage alerts" ON public.alerts
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage day_setups" ON public.day_setups;
CREATE POLICY "Users can manage day_setups" ON public.day_setups
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage row_assignments" ON public.row_assignments;
CREATE POLICY "Users can manage row_assignments" ON public.row_assignments
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- HABILITAR REALTIME (ignorar si da error)
-- =============================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN
    -- Tabla ya está en la publicación, continuar
    NULL;
END $$;

-- =============================================
-- ASIGNAR HUERTO AL USUARIO EXISTENTE
-- =============================================
UPDATE public.users 
SET orchard_id = (SELECT id FROM public.orchards LIMIT 1)
WHERE orchard_id IS NULL;

-- =============================================
-- ¡LISTO! Ahora recarga la app
-- =============================================
SELECT 'Script ejecutado correctamente!' as resultado;
