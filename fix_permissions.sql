-- =============================================
-- WORKAROUND URGENTE: ARREGLAR PERMISOS DE USUARIOS (RLS)
-- Ejecutar en Supabase > SQL Editor
-- =============================================

-- 1. Eliminar la política recursiva que causa el error 406 (Infinite Loop)
DROP POLICY IF EXISTS "Users can read members of same orchard" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
-- Elimina otras posibles políticas conflictivas antiguas
DROP POLICY IF EXISTS "Users can read self" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;

-- =============================================
-- 2. POLÍTICAS DE LECTURA (SELECT)
-- =============================================

-- A. Permitir SIEMPRE leer tu propio usuario (Rompe el ciclo recursivo)
CREATE POLICY "Users can read self" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- B. Leer compañeros del mismo huerto (Solo si ya tienes orchard_id)
-- Esta política usa los datos que la política A permite leer
CREATE POLICY "Users can read team members" ON public.users
    FOR SELECT USING (
        orchard_id IS NOT NULL AND
        orchard_id = (
            SELECT orchard_id FROM public.users WHERE id = auth.uid()
        )
    );

-- =============================================
-- 3. POLÍTICAS DE ESCRITURA (INSERT / UPDATE)
-- =============================================

-- A. Permitir crear tu propio perfil (Arregla el error 403 Forbidden al loguearse por primera vez)
-- Esto es necesario porque AuthContext intenta hacer un INSERT si no encuentra al usuario
CREATE POLICY "Users can insert self" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- B. Permitir actualizar tu propio perfil
CREATE POLICY "Users can update self" ON public.users
    FOR UPDATE USING (auth.uid() = id);
    
-- =============================================
-- 4. CONFIRMACIÓN
-- =============================================
SELECT 'Permisos RLS corregidos exitosamente.' as status;
