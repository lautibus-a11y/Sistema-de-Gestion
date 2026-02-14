-- ==============================================================================
-- 🚨 SCRIPT DE EMERGENCIA: REPARAR PERMISOS DE CREACIÓN DE TENANT 🚨
-- ==============================================================================
-- Ejecuta este script COMPLETO en el SQL Editor de Supabase
-- para solucionar el error "new row violates row-level security policy"
-- ==============================================================================

-- 1. Eliminar políticas antiguas que puedan estar bloqueando (limpieza)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."tenants";
DROP POLICY IF EXISTS "Users can create tenants" ON "public"."tenants";
DROP POLICY IF EXISTS "Users can view their own tenant" ON "public"."tenants";
DROP POLICY IF EXISTS "Users can update their own tenant" ON "public"."tenants";

-- 2. Crear Política para PERMITIR CREAR EMPRESAS (Tenants)
-- Esto es lo que falta y causa el error principal
CREATE POLICY "Users can create tenants" 
ON "public"."tenants"
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Crear Políticas de Lectura y Actualización para Tenants
-- Permitir ver y editar SOLO el tenant que te pertenece (según tu perfil)
CREATE POLICY "Users can view their own tenant" 
ON "public"."tenants"
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE tenant_id = tenants.id
  )
);

CREATE POLICY "Users can update their own tenant" 
ON "public"."tenants"
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE tenant_id = tenants.id
  )
);

-- 4. Arreglar Políticas de Perfiles (PROFILES)
DROP POLICY IF EXISTS "Users can create their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."profiles";


-- Permitir crear tu propio perfil (Vinculación Usuario -> Tenant)
CREATE POLICY "Users can create their own profile" 
ON "public"."profiles"
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Permitir ver tu propio perfil
CREATE POLICY "Users can view own profile" 
ON "public"."profiles"
FOR SELECT 
USING (auth.uid() = id);

-- Permitir editar tu propio perfil
CREATE POLICY "Users can update own profile" 
ON "public"."profiles"
FOR UPDATE
USING (auth.uid() = id);

-- ==============================================================================
-- ✅ FIN DEL SCRIPT - Dale click a "RUN"
-- ==============================================================================
