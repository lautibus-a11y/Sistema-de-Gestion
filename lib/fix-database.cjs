/**
 * ============================================================
 * FIX DATABASE - SOLUCIÓN AUTOMÁTICA DE PROBLEMAS
 * ============================================================
 * Este script diagnostica y soluciona automáticamente los
 * problemas de inicialización de usuarios y tenants.
 * ============================================================
 */

const {
    query,
    transaction,
    testConnection,
    closePool
} = require('./database.cjs');

/**
 * 🔧 VERIFICAR Y CREAR TENANT POR DEFECTO
 */
async function ensureDefaultTenant() {
    console.log('\n🏢 Verificando tenant por defecto...');

    // Verificar si existe algún tenant
    const { rows: tenants } = await query('SELECT * FROM tenants LIMIT 1');

    if (tenants.length === 0) {
        console.log('   ⚠️  No hay tenants en el sistema, creando uno por defecto...');

        const { rows: [newTenant] } = await query(`
      INSERT INTO tenants (name, cuit, tax_condition, address)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
            'Mi Negocio',
            '30' + Math.floor(Math.random() * 90000000 + 10000000) + '9',
            'Responsable Inscripto',
            'Dirección Principal'
        ]);

        console.log('   ✅ Tenant creado:', newTenant.name, '(ID:', newTenant.id + ')');
        return newTenant;
    } else {
        console.log('   ✅ Tenant existente:', tenants[0].name, '(ID:', tenants[0].id + ')');
        return tenants[0];
    }
}

/**
 * 🔧 VERIFICAR Y CREAR PERFILES PARA USUARIOS SIN PERFIL
 */
async function fixUserProfiles(defaultTenant) {
    console.log('\n👤 Verificando perfiles de usuarios...');

    // Obtener todos los usuarios de auth
    const { rows: authUsers } = await query(`
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    ORDER BY created_at DESC
  `);

    console.log(`   📊 Usuarios en auth.users: ${authUsers.length}`);

    if (authUsers.length === 0) {
        console.log('   ℹ️  No hay usuarios registrados aún');
        return;
    }

    // Verificar cada usuario
    for (const user of authUsers) {
        const { rows: profiles } = await query(
            'SELECT * FROM profiles WHERE id = $1',
            [user.id]
        );

        if (profiles.length === 0) {
            console.log(`   ⚠️  Usuario sin perfil: ${user.email}`);
            console.log('      Creando perfil automáticamente...');

            const fullName = user.raw_user_meta_data?.full_name ||
                user.email?.split('@')[0] ||
                'Usuario';

            await query(`
        INSERT INTO profiles (id, tenant_id, full_name, role)
        VALUES ($1, $2, $3, $4)
      `, [user.id, defaultTenant.id, fullName, 'Admin']);

            console.log(`      ✅ Perfil creado para ${user.email}`);
        } else {
            console.log(`   ✅ Perfil OK: ${user.email} (${profiles[0].full_name})`);
        }
    }
}

/**
 * 🔧 VERIFICAR FUNCIÓN get_tenant_id()
 */
async function ensureGetTenantFunction() {
    console.log('\n🔧 Verificando función get_tenant_id()...');

    await query(`
    CREATE OR REPLACE FUNCTION get_tenant_id() 
    RETURNS UUID AS $$
      SELECT tenant_id FROM profiles WHERE id = auth.uid();
    $$ LANGUAGE sql STABLE SECURITY DEFINER;
  `);

    console.log('   ✅ Función get_tenant_id() verificada/creada');
}

/**
 * 🔧 VERIFICAR POLÍTICAS RLS
 */
async function verifyRLSPolicies() {
    console.log('\n🛡️  Verificando políticas RLS...');

    const tables = ['contacts', 'products', 'transactions', 'bookings'];

    for (const table of tables) {
        const { rows: policies } = await query(`
      SELECT policyname FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = $1
    `, [table]);

        if (policies.length === 0) {
            console.log(`   ⚠️  Tabla ${table} sin políticas RLS, creando...`);

            await query(`
        DROP POLICY IF EXISTS "Tenant isolation for ${table}" ON ${table};
        CREATE POLICY "Tenant isolation for ${table}" ON ${table}
        FOR ALL USING (tenant_id = get_tenant_id());
      `);

            console.log(`   ✅ Política creada para ${table}`);
        } else {
            console.log(`   ✅ ${table}: ${policies.length} política(s)`);
        }
    }
}

/**
 * 🔧 CARGAR DATOS DEMO
 */
async function loadDemoData(tenantId) {
    console.log('\n🌱 Cargando datos de demostración...');

    // Verificar si ya hay datos
    const { rows: existingContacts } = await query(
        'SELECT COUNT(*) as count FROM contacts WHERE tenant_id = $1',
        [tenantId]
    );

    if (parseInt(existingContacts[0].count) > 0) {
        console.log('   ℹ️  Ya hay datos en el sistema, omitiendo carga demo');
        return;
    }

    console.log('   📦 Insertando clientes demo...');
    const { rows: clients } = await query(`
    INSERT INTO contacts (tenant_id, name, cuit, tax_condition, email, phone, is_client, is_provider)
    VALUES 
      ($1, 'Logística San Telmo SA', '30712233441', 'Responsable Inscripto', 'contacto@santelmo.com.ar', '+54 11 4567-8901', true, false),
      ($1, 'Estudio Jurídico Gomez', '33554422119', 'Responsable Inscripto', 'info@estudiogomez.com', '+54 11 4234-5678', true, false),
      ($1, 'Marta Rodriguez', '27254433221', 'Monotributo', 'marta.rodriguez@gmail.com', '+54 9 11 5678-9012', true, false),
      ($1, 'Tech Solutions Corp', '30998877662', 'Exento', 'ventas@techsolutions.com', '+54 11 6789-0123', true, false),
      ($1, 'Juan Carlos Perez', '20123456789', 'Consumidor Final', 'jcperez@hotmail.com', '+54 9 11 3456-7890', true, false)
    RETURNING *
  `, [tenantId]);
    console.log(`   ✅ ${clients.length} clientes creados`);

    console.log('   📦 Insertando productos demo...');
    const { rows: products } = await query(`
    INSERT INTO products (tenant_id, name, sku, description, price_sell_net, iva_rate, stock, min_stock)
    VALUES 
      ($1, 'Notebook Lenovo ThinkPad L14', 'LAP-001', 'Laptop profesional Intel Core i5, 16GB RAM, 512GB SSD', 950000, 0.21, 8, 3),
      ($1, 'Monitor LG 24" IPS Full HD', 'MON-024', 'Monitor profesional 24 pulgadas, resolución 1920x1080', 245000, 0.21, 12, 5),
      ($1, 'Teclado Mecánico Keychron K2', 'KB-K2', 'Teclado mecánico inalámbrico, switches Gateron Brown', 125000, 0.21, 2, 5),
      ($1, 'Mouse Logitech MX Master 3S', 'MSE-MX', 'Mouse ergonómico inalámbrico de alta precisión', 98000, 0.21, 15, 4),
      ($1, 'Webcam Logitech C920 HD Pro', 'CAM-920', 'Cámara web Full HD 1080p con micrófono estéreo', 85000, 0.21, 6, 3)
    RETURNING *
  `, [tenantId]);
    console.log(`   ✅ ${products.length} productos creados`);

    console.log('   📦 Insertando transacciones demo...');
    const transactions = [];
    for (let i = 0; i < 25; i++) {
        const randomClient = clients[Math.floor(Math.random() * clients.length)];
        const net = 20000 + Math.random() * 180000;
        const iva = net * 0.21;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 15));

        transactions.push([
            tenantId,
            'SALE',
            randomClient.id,
            Math.round(net * 100) / 100,
            Math.round(iva * 100) / 100,
            Math.round((net + iva) * 100) / 100,
            'PAID',
            date.toISOString()
        ]);
    }

    for (const t of transactions) {
        await query(`
      INSERT INTO transactions (tenant_id, type, contact_id, amount_net, amount_iva, amount_total, status, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, t);
    }
    console.log(`   ✅ ${transactions.length} transacciones creadas`);

    console.log('   📦 Insertando reservas demo...');
    const services = ['Consultoría Empresarial', 'Asesoramiento Contable', 'Auditoría Fiscal', 'Planificación Estratégica', 'Capacitación de Personal'];
    const bookings = [];

    for (let i = 0; i < 10; i++) {
        const randomClient = clients[Math.floor(Math.random() * clients.length)];
        const randomService = services[Math.floor(Math.random() * services.length)];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7));
        startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1);

        bookings.push([
            tenantId,
            randomClient.id,
            randomService,
            startDate.toISOString(),
            endDate.toISOString(),
            Math.random() > 0.3 ? 'CONFIRMED' : 'PENDING',
            'Reserva automática de demostración'
        ]);
    }

    for (const b of bookings) {
        await query(`
      INSERT INTO bookings (tenant_id, contact_id, service_name, start_time, end_time, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, b);
    }
    console.log(`   ✅ ${bookings.length} reservas creadas`);
}

/**
 * 🚀 EJECUTAR TODAS LAS CORRECCIONES
 */
async function fixAllProblems() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🔧 SOLUCIÓN AUTOMÁTICA DE PROBLEMAS               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    try {
        // 1. Verificar conexión
        console.log('\n🔌 Verificando conexión...');
        const connected = await testConnection();
        if (!connected) {
            throw new Error('No se pudo conectar a la base de datos');
        }

        // 2. Asegurar tenant por defecto
        const defaultTenant = await ensureDefaultTenant();

        // 3. Verificar función get_tenant_id
        await ensureGetTenantFunction();

        // 4. Arreglar perfiles de usuarios
        await fixUserProfiles(defaultTenant);

        // 5. Verificar políticas RLS
        await verifyRLSPolicies();

        // 6. Cargar datos demo
        await loadDemoData(defaultTenant.id);

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              ✅ PROBLEMAS SOLUCIONADOS                       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');

        console.log('\n📊 RESUMEN:');
        console.log(`   ✅ Tenant configurado: ${defaultTenant.name}`);
        console.log(`   ✅ Perfiles de usuarios verificados/creados`);
        console.log(`   ✅ Función get_tenant_id() activa`);
        console.log(`   ✅ Políticas RLS configuradas`);
        console.log(`   ✅ Datos de demostración cargados`);

        console.log('\n🎉 El sistema está listo para usar!');
        console.log('   Recarga la aplicación (Ctrl+R) para ver los cambios\n');

        await closePool();
        return true;
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        await closePool();
        return false;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    fixAllProblems()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { fixAllProblems };
