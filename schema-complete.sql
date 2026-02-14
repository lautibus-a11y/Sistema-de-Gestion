-- ==============================================================
-- ARGENBIZ SAAS - ESQUEMA COMPLETO CON RLS PROFESIONAL
-- ==============================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- ==============================================================

-- 1. EXTENSIONES REQUERIDAS
-- ==============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS (ENUMS)
-- ==============================================================
DO $$ BEGIN
    -- Condiciones fiscales argentinas
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_condition') THEN
        CREATE TYPE tax_condition AS ENUM (
            'Monotributo', 
            'Responsable Inscripto', 
            'Exento', 
            'Consumidor Final'
        );
    END IF;
    
    -- Tipos de transacción
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('SALE', 'EXPENSE');
    END IF;
    
    -- Roles de usuario
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('Admin', 'Empleado', 'Contador');
    END IF;
    
    -- Estados de reserva
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLAS PRINCIPALES
-- ==============================================================

-- 3.1 TENANTS (Empresas/Organizaciones)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cuit VARCHAR(11) UNIQUE NOT NULL,
    tax_condition tax_condition DEFAULT 'Responsable Inscripto',
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 PROFILES (Usuarios vinculados a Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'Empleado',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.3 CONTACTS (Clientes y Proveedores)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    cuit VARCHAR(11),
    tax_condition tax_condition DEFAULT 'Consumidor Final',
    email TEXT,
    phone TEXT,
    address TEXT,
    is_client BOOLEAN DEFAULT TRUE,
    is_provider BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4 PRODUCTS (Inventario)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price_sell_net NUMERIC(15,2) DEFAULT 0,
    iva_rate NUMERIC(5,2) DEFAULT 0.21,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5 TRANSACTIONS (Ventas y Gastos)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    type transaction_type NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    amount_net NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'PAID',
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.6 BOOKINGS (Sistema de Reservas/Turnos)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status booking_status DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.7 SITE_CONTENT (Contenido del Sitio Web - Multi-tenant)
CREATE TABLE IF NOT EXISTS site_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, key)
);

-- 4. ÍNDICES PARA PERFORMANCE
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(tenant_id, key);

-- 5. TRIGGERS PARA UPDATED_AT AUTOMÁTICO
-- ==============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_content_updated_at ON site_content;
CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. ROW LEVEL SECURITY (RLS)
-- ==============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- 7. FUNCIÓN HELPER PARA OBTENER TENANT_ID DEL USUARIO
-- ==============================================================
CREATE OR REPLACE FUNCTION get_tenant_id() 
RETURNS UUID AS $$
    SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8. POLÍTICAS RLS - TENANTS
-- ==============================================================
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (id = get_tenant_id());

DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;
CREATE POLICY "Users can update their own tenant" ON tenants
    FOR UPDATE USING (id = get_tenant_id());

-- 9. POLÍTICAS RLS - PROFILES
-- ==============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid() OR tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- 10. POLÍTICAS RLS - CONTACTS (Aislamiento por Tenant)
-- ==============================================================
DROP POLICY IF EXISTS "Tenant isolation for contacts" ON contacts;
CREATE POLICY "Tenant isolation for contacts" ON contacts
    FOR ALL USING (tenant_id = get_tenant_id());

-- 11. POLÍTICAS RLS - PRODUCTS (Aislamiento por Tenant)
-- ==============================================================
DROP POLICY IF EXISTS "Tenant isolation for products" ON products;
CREATE POLICY "Tenant isolation for products" ON products
    FOR ALL USING (tenant_id = get_tenant_id());

-- 12. POLÍTICAS RLS - TRANSACTIONS (Aislamiento por Tenant)
-- ==============================================================
DROP POLICY IF EXISTS "Tenant isolation for transactions" ON transactions;
CREATE POLICY "Tenant isolation for transactions" ON transactions
    FOR ALL USING (tenant_id = get_tenant_id());

-- 13. POLÍTICAS RLS - BOOKINGS (Aislamiento por Tenant)
-- ==============================================================
DROP POLICY IF EXISTS "Tenant isolation for bookings" ON bookings;
CREATE POLICY "Tenant isolation for bookings" ON bookings
    FOR ALL USING (tenant_id = get_tenant_id());

-- 14. POLÍTICAS RLS - SITE_CONTENT (Lectura Pública + Escritura por Tenant)
-- ==============================================================
DROP POLICY IF EXISTS "Public read access for site content" ON site_content;
CREATE POLICY "Public read access for site content" ON site_content
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tenant can manage their site content" ON site_content;
CREATE POLICY "Tenant can manage their site content" ON site_content
    FOR ALL USING (tenant_id = get_tenant_id() OR tenant_id IS NULL);

-- ==============================================================
-- ✅ ESQUEMA COMPLETO - LISTO PARA PRODUCCIÓN
-- ==============================================================
-- Próximo paso: Ejecutar el script de seeding para datos iniciales
-- ==============================================================
