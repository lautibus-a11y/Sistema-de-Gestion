
-- ==============================================================
-- ARGENBIZ SAAS - INFRAESTRUCTURA DE CONTROL TOTAL
-- ==============================================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_condition') THEN
        CREATE TYPE tax_condition AS ENUM ('Monotributo', 'Responsable Inscripto', 'Exento', 'Consumidor Final');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('SALE', 'EXPENSE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('Admin', 'Empleado', 'Contador');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tablas Base
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cuit VARCHAR(11) UNIQUE NOT NULL,
    tax_condition tax_condition DEFAULT 'Responsable Inscripto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id),
    full_name TEXT,
    role user_role DEFAULT 'Empleado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    cuit VARCHAR(11),
    tax_condition tax_condition DEFAULT 'Consumidor Final',
    email TEXT,
    phone TEXT,
    is_client BOOLEAN DEFAULT TRUE,
    is_provider BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    sku TEXT,
    name TEXT NOT NULL,
    price_sell_net NUMERIC(15,2) DEFAULT 0,
    iva_rate NUMERIC(5,2) DEFAULT 0.21,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    type transaction_type NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    amount_net NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'PAID',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    service_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status booking_status DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Seguridad (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Helper para políticas
CREATE OR REPLACE FUNCTION get_tenant() RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE POLICY "Tenant Isolation" ON contacts FOR ALL USING (tenant_id = get_tenant());
CREATE POLICY "Tenant Isolation" ON products FOR ALL USING (tenant_id = get_tenant());
CREATE POLICY "Tenant Isolation" ON transactions FOR ALL USING (tenant_id = get_tenant());
CREATE POLICY "Tenant Isolation" ON bookings FOR ALL USING (tenant_id = get_tenant());
CREATE POLICY "Tenant Isolation" ON profiles FOR ALL USING (id = auth.uid() OR tenant_id = get_tenant());
CREATE POLICY "Site Content Public" ON site_content FOR SELECT USING (true);
