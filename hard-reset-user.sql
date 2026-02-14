-- ==============================================================================
-- 🧨 RESET COMPLETO DE TU USUARIO (HARD RESET)
-- ==============================================================================
-- Ejecuta esto SOLO si sigues trabado. borrará tu perfil para que el sistema
-- lo vuelva a crear limpio desde cero la próxima vez que recargues la página.
-- ==============================================================================

-- 1. Borra tu perfil actual (que probablemente quedó incompleto)
DELETE FROM public.profiles 
WHERE id = auth.uid();

-- 2. Limpia cualquier empresa que se haya creado a medias
-- (Opcional, pero bueno para mantener limpia la DB)
DELETE FROM public.tenants 
WHERE id NOT IN (SELECT tenant_id FROM public.profiles);
