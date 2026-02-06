-- =============================================
-- SCRIPT: PROMOVER USUARIO A MANAGER
-- =============================================

-- Este script busca tu usuario (el que está ejecutando el script)
-- y lo convierte forzosamente en MANAGER.

UPDATE public.users
SET role = 'manager'
WHERE id = auth.uid();

-- Verificación
SELECT id, full_name, role FROM public.users WHERE id = auth.uid();
