/**
 * ============================================================
 * MIGRATION SYSTEM - SISTEMA DE MIGRACIONES AUTOMÁTICAS
 * ============================================================
 * Ejecuta migraciones automáticas para mantener la estructura
 * de la base de datos sincronizada con la aplicación.
 * ============================================================
 */

const {
    query,
    transaction,
    tableExists,
    getTableColumns,
    listTables,
    getRLSPolicies,
    createTableWithRLS,
    addColumn,
    createIndex,
    testConnection,
    closePool
} = require('./database.cjs');

/**
 * 🔧 MIGRACIÓN: Crear tabla BOOKINGS
 */
async function migrateBookings() {
    console.log('\n📅 Migrando tabla BOOKINGS...');

    const exists = await tableExists('bookings');

    if (exists) {
        console.log('   ℹ️  Tabla bookings ya existe, verificando estructura...');
        const columns = await getTableColumns('bookings');
        console.log(`   ✅ Columnas actuales: ${columns.map(c => c.column_name).join(', ')}`);
        return;
    }

    // Crear ENUM para booking_status
    await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

    // Crear tabla con RLS
    await createTableWithRLS(
        'bookings',
        [
            { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT uuid_generate_v4()' },
            { name: 'tenant_id', type: 'UUID', constraints: 'REFERENCES tenants(id) ON DELETE CASCADE NOT NULL' },
            { name: 'contact_id', type: 'UUID', constraints: 'REFERENCES contacts(id) ON DELETE SET NULL' },
            { name: 'service_name', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'start_time', type: 'TIMESTAMP WITH TIME ZONE', constraints: 'NOT NULL' },
            { name: 'end_time', type: 'TIMESTAMP WITH TIME ZONE', constraints: 'NOT NULL' },
            { name: 'status', type: 'booking_status', constraints: 'DEFAULT \'PENDING\'' },
            { name: 'notes', type: 'TEXT' },
            { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', constraints: 'DEFAULT NOW()' },
            { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', constraints: 'DEFAULT NOW()' }
        ],
        [
            {
                name: 'Tenant isolation for bookings',
                command: 'ALL',
                using: 'tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())'
            }
        ]
    );

    // Crear índices
    await createIndex('bookings', 'tenant_id');
    await createIndex('bookings', 'start_time');

    // Crear trigger para updated_at
    await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
    CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

    console.log('   ✅ Tabla bookings creada completamente');
}

/**
 * 🔧 MIGRACIÓN: Crear tabla SITE_CONTENT
 */
async function migrateSiteContent() {
    console.log('\n🌐 Migrando tabla SITE_CONTENT...');

    const exists = await tableExists('site_content');

    if (exists) {
        console.log('   ℹ️  Tabla site_content ya existe, verificando estructura...');
        const columns = await getTableColumns('site_content');
        console.log(`   ✅ Columnas actuales: ${columns.map(c => c.column_name).join(', ')}`);
        return;
    }

    // Crear tabla con RLS
    await createTableWithRLS(
        'site_content',
        [
            { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT uuid_generate_v4()' },
            { name: 'tenant_id', type: 'UUID', constraints: 'REFERENCES tenants(id) ON DELETE CASCADE' },
            { name: 'key', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'content', type: 'JSONB', constraints: 'NOT NULL DEFAULT \'{}\'::jsonb' },
            { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE', constraints: 'DEFAULT NOW()' },
            { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', constraints: 'DEFAULT NOW()' }
        ],
        [
            {
                name: 'Public read access for site content',
                command: 'SELECT',
                using: 'true'
            },
            {
                name: 'Tenant can manage their site content',
                command: 'ALL',
                using: 'tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) OR tenant_id IS NULL'
            }
        ]
    );

    // Crear constraint UNIQUE
    await query(`
    ALTER TABLE site_content 
    ADD CONSTRAINT site_content_tenant_key_unique 
    UNIQUE (tenant_id, key)
  `);

    // Crear índice
    await createIndex('site_content', 'tenant_id');
    await query(`CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(tenant_id, key)`);

    // Crear trigger para updated_at
    await query(`
    DROP TRIGGER IF EXISTS update_site_content_updated_at ON site_content;
    CREATE TRIGGER update_site_content_updated_at 
    BEFORE UPDATE ON site_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

    console.log('   ✅ Tabla site_content creada completamente');
}

/**
 * 🔧 VERIFICAR Y REPARAR ESTRUCTURA EXISTENTE
 */
async function verifyAndRepairStructure() {
    console.log('\n🔍 Verificando estructura de tablas existentes...');

    const tables = await listTables();
    console.log(`\n📊 Tablas encontradas: ${tables.length}`);

    for (const table of tables) {
        console.log(`\n   📋 ${table}:`);
        const columns = await getTableColumns(table);
        console.log(`      Columnas: ${columns.length}`);

        const policies = await getRLSPolicies(table);
        console.log(`      Políticas RLS: ${policies.length}`);

        if (policies.length === 0 && !['auth', 'storage'].some(prefix => table.startsWith(prefix))) {
            console.log(`      ⚠️  Sin políticas RLS - tabla potencialmente insegura`);
        }
    }
}

/**
 * 🚀 EJECUTAR TODAS LAS MIGRACIONES
 */
async function runMigrations() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║        🚀 SISTEMA DE MIGRACIONES AUTOMÁTICAS                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    try {
        // 1. Verificar conexión
        console.log('\n🔌 Verificando conexión a PostgreSQL...');
        const connected = await testConnection();
        if (!connected) {
            throw new Error('No se pudo establecer conexión con la base de datos');
        }

        // 2. Verificar estructura existente
        await verifyAndRepairStructure();

        // 3. Ejecutar migraciones
        console.log('\n🔧 Ejecutando migraciones pendientes...');
        await migrateBookings();
        await migrateSiteContent();

        // 4. Verificación final
        console.log('\n✅ MIGRACIONES COMPLETADAS');
        console.log('═══════════════════════════════════════════════════════════════');

        const finalTables = await listTables();
        console.log(`\n📊 Total de tablas: ${finalTables.length}`);
        console.log(`   ${finalTables.join(', ')}`);

        // Verificar tablas críticas
        const criticalTables = ['tenants', 'profiles', 'contacts', 'products', 'transactions', 'bookings', 'site_content'];
        const missing = criticalTables.filter(t => !finalTables.includes(t));

        if (missing.length > 0) {
            console.log(`\n⚠️  Tablas faltantes: ${missing.join(', ')}`);
        } else {
            console.log('\n✅ Todas las tablas críticas están presentes');
        }

        console.log('\n🎉 Sistema de base de datos listo para operar\n');

        await closePool();
        return true;
    } catch (error) {
        console.error('\n❌ ERROR EN MIGRACIONES:', error.message);
        console.error(error);
        await closePool();
        return false;
    }
}

// Si se ejecuta directamente
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runMigrations };
