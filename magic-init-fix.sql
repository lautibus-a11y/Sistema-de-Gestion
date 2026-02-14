-- ==============================================================================
-- 🚀 SOLUCIÓN DEFINITIVA: FUNCIÓN DE AUTO-INICIALIZACIÓN (RPC)
-- ==============================================================================
-- Esta función crea la empresa y el perfil en un solo paso seguro,
-- BYPASSEANDO completamente los problemas de permisos RLS desde el frontend.
-- ==============================================================================

CREATE OR REPLACE FUNCTION initialize_tenant_for_user(
    p_tenant_name TEXT,
    p_full_name TEXT
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- ⚠️ IMPORTANTE: Esto ejecuta la función con permisos de superusuario
SET search_path = public -- Seguridad por defecto
AS $$
DECLARE
    v_new_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Obtenemos el ID del usuario actual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- 1. Crear el Tenant (Empresa)
    INSERT INTO tenants (name, cuit, tax_condition)
    VALUES (
        p_tenant_name, 
        '20' || floor(random() * 90000000 + 10000000)::text || '9', -- CUIT Generado
        'Responsable Inscripto'
    )
    RETURNING id INTO v_new_tenant_id;

    -- 2. Crear o Actualizar el Perfil del Usuario
    INSERT INTO profiles (id, tenant_id, full_name, role)
    VALUES (v_user_id, v_new_tenant_id, p_full_name, 'Admin')
    ON CONFLICT (id) DO UPDATE
    SET 
        tenant_id = EXCLUDED.tenant_id,
        full_name = EXCLUDED.full_name,
        role = 'Admin';

    -- 3. Retornar los datos para el frontend
    RETURN jsonb_build_object(
        'success', true,
        'tenant_id', v_new_tenant_id,
        'profile_id', v_user_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Captura cualquier error y lo devuelve limipamente
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Asegurar permisos de ejecución
GRANT EXECUTE ON FUNCTION initialize_tenant_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_tenant_for_user TO service_role;
