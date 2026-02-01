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

-- Migración: Añadir constantes dinámicas a day_setups
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'day_setups' AND column_name = 'min_wage_rate') THEN
        ALTER TABLE public.day_setups ADD COLUMN min_wage_rate DECIMAL(10,2) DEFAULT 23.50;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'day_setups' AND column_name = 'piece_rate') THEN
        ALTER TABLE public.day_setups ADD COLUMN piece_rate DECIMAL(10,2) DEFAULT 6.50;
    END IF;
END $$;

-- Tabla de Inspecciones de Calidad Formal (QC)
CREATE TABLE IF NOT EXISTS public.quality_inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id UUID, -- Referencia opcional a una cubeta específica
    picker_id UUID REFERENCES public.users(id),
    inspector_id UUID REFERENCES public.users(id),
    quality_grade TEXT CHECK (quality_grade IN ('good', 'warning', 'bad', 'A', 'B', 'C', 'reject')),
    notes TEXT,
    photo_url TEXT,
    coords JSONB, -- {lat: number, lng: number}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir coordenadas a bucket_records para mapas de calor
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bucket_records' AND column_name = 'coords') THEN
        ALTER TABLE public.bucket_records ADD COLUMN coords JSONB;
    END IF;
END $$;

-- Añadir historial de movimientos a bins
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bins' AND column_name = 'movement_history') THEN
        ALTER TABLE public.bins ADD COLUMN movement_history JSONB[] DEFAULT '{}';
    END IF;
END $$;

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

-- Políticas RLS Granulares (Refined)
-- =============================================

-- Users: Acceso basado en pertenencia al mismo orchard
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read members of same orchard" ON public.users
    FOR SELECT USING (
        orchard_id = (SELECT orchard_id FROM public.users WHERE id = auth.uid())
    );

-- Day Setups: Solo managers/team_leaders pueden crear, todos leen
DROP POLICY IF EXISTS "Users can manage day_setups" ON public.day_setups;
CREATE POLICY "Managers can manage day_setups" ON public.day_setups
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'team_leader'))
    );
CREATE POLICY "All members can read active day_setups" ON public.day_setups
    FOR SELECT USING (true);

-- Pickers: Pickers solo ven su perfil, leaders ven su equipo
DROP POLICY IF EXISTS "Users can manage pickers" ON public.pickers;
CREATE POLICY "Pickers see self" ON public.pickers
    FOR SELECT USING (auth.uid()::text = employeeId OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'team_leader')));

-- Bucket Records: Pickers solo ven los suyos, leaders ven todos
DROP POLICY IF EXISTS "Users can manage bucket_records" ON public.bucket_records; -- Asumiendo bucket_records
CREATE POLICY "Pickers manage own records" ON public.bucket_records
    FOR ALL USING (
        picker_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'team_leader'))
    );

-- Quality Inspections: Solo inspectors/managers ven/crean
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inspectors can manage inspections" ON public.quality_inspections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('manager', 'qc_inspector', 'team_leader'))
    );

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
