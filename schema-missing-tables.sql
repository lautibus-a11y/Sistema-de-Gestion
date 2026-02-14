-- ==============================================================
-- TABLAS FALTANTES - BOOKINGS Y SITE_CONTENT
-- ==============================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- ==============================================================

-- 1. CREAR ENUM PARA BOOKING_STATUS (si no existe)
-- ==============================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREAR TABLA BOOKINGS
-- ==============================================================
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

-- 3. CREAR TABLA SITE_CONTENT
-- ==============================================================
CREATE TABLE IF NOT EXISTS site_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, key)
);

-- 4. CREAR ÍNDICES
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(tenant_id, key);

-- 5. CREAR TRIGGERS PARA UPDATED_AT
-- ==============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_content_updated_at ON site_content;
CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. HABILITAR RLS
-- ==============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- 7. CREAR FUNCIÓN HELPER (si no existe)
-- ==============================================================
CREATE OR REPLACE FUNCTION get_tenant_id() 
RETURNS UUID AS $$
    SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 8. POLÍTICAS RLS - BOOKINGS
-- ==============================================================
DROP POLICY IF EXISTS "Tenant isolation for bookings" ON bookings;
CREATE POLICY "Tenant isolation for bookings" ON bookings
    FOR ALL USING (tenant_id = get_tenant_id());

-- 9. POLÍTICAS RLS - SITE_CONTENT
-- ==============================================================
DROP POLICY IF EXISTS "Public read access for site content" ON site_content;
CREATE POLICY "Public read access for site content" ON site_content
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tenant can manage their site content" ON site_content;
CREATE POLICY "Tenant can manage their site content" ON site_content
    FOR ALL USING (tenant_id = get_tenant_id() OR tenant_id IS NULL);

-- ==============================================================
-- ✅ TABLAS FALTANTES CREADAS
-- ==============================================================
