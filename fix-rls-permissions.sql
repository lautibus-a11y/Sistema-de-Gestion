-- ==============================================================================
-- CORRECCIÓN DE PERMISOS RLS (ROW LEVEL SECURITY)
-- Ejecuta este script en el SQL Editor de Supabase para arreglar el error de conexión.
-- ==============================================================================

-- 1. Permitir que cualquier usuario autenticado cree una nueva empresa (Tenant)
-- Actualmente, la seguridad impide crear la empresa inicial.
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
CREATE POLICY "Users can create tenants" ON tenants
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. Permitir que el usuario cree su propio perfil
-- Necesario para vincular el usuario con la empresa recién creada.
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
CREATE POLICY "Users can create their own profile" ON profiles
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 3. Asegurar que las políticas de lectura/escritura sean correctas
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant" ON tenants
FOR SELECT 
USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = tenants.id));

DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
CREATE POLICY "Users can update their own tenant" ON tenants
FOR UPDATE
USING (auth.uid() IN (SELECT id FROM profiles WHERE tenant_id = tenants.id));
