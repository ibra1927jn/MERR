-- =============================================
-- SOLUCIÓN DEFINITIVA A LA RECURSIÓN RLS (ERROR 500)
-- Y ACCESO A ORCHARDS (ERROR 406)
-- =============================================

-- 1. Función Helper Segura (SECURITY DEFINER)
-- Esta función se ejecuta con permisos de administrador (bypassea RLS)
-- para obtener el orchard_id del usuario actual sin causar bucles.
CREATE OR REPLACE FUNCTION get_my_orchard_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT orchard_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Limpiar Políticas Antiguas en USERS
DROP POLICY IF EXISTS "Users can read members of same orchard" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can read self" ON public.users;
DROP POLICY IF EXISTS "Users can read team members" ON public.users;
DROP POLICY IF EXISTS "Users can map members" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;

-- 3. Nuevas Políticas USERS (Usando la función segura)

-- A. Leerse a sí mismo
CREATE POLICY "Read self" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- B. Leer compañeros (Usando la función que no dispara RLS)
CREATE POLICY "Read members from my orchard" ON public.users
    FOR SELECT USING (
        orchard_id = get_my_orchard_id()
    );

-- C. Insertarse a sí mismo (Registro)
CREATE POLICY "Register self" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- D. Actualizarse a sí mismo
CREATE POLICY "Update self" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- 4. Arreglar Tabla ORCHARDS (Error 406)
-- Aseguramos que RLS esté activo pero con política de lectura pública para autenticados
ALTER TABLE public.orchards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read orchards" ON public.orchards;

CREATE POLICY "Authenticated users can read orchards" ON public.orchards
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. Verificación
SELECT 'RLS recursion fixed and Orchards opened.' as status;
