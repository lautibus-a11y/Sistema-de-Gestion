
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://yabxdsbieqandlslekpk.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runFullSeeding() {
  console.log('🚀 Iniciando Seeding Masivo de ArgenBiz...');

  try {
    // 1. Tenant y Usuario (Igual que antes pero asegurando ID)
    const { data: tenant } = await supabase.from('tenants').upsert({
      name: 'ArgenBiz Corporate',
      cuit: '20123456789',
      tax_condition: 'Responsable Inscripto'
    }, { onConflict: 'cuit' }).select().single();

    const { data: authUser } = await supabase.auth.admin.createUser({
      email: 'admin@admin.com',
      password: 'pan',
      email_confirm: true,
      user_metadata: { full_name: 'Admin Demo' }
    });

    const userId = authUser?.user?.id;
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        tenant_id: tenant.id,
        full_name: 'Admin Demo',
        role: 'Admin'
      });
    }

    // 2. Clientes de Prueba
    const clientsData = [
      { tenant_id: tenant.id, name: 'Distribuidora Alvear', cuit: '30708090101', tax_condition: 'Responsable Inscripto', email: 'ventas@alvear.com', is_client: true },
      { tenant_id: tenant.id, name: 'Marta Rodriguez', cuit: '27254433221', tax_condition: 'Monotributo', email: 'marta.r@gmail.com', is_client: true },
      { tenant_id: tenant.id, name: 'Sistemas Globales SA', cuit: '33554433229', tax_condition: 'Responsable Inscripto', email: 'it@globales.com', is_client: true }
    ];
    const { data: createdClients } = await supabase.from('contacts').upsert(clientsData, { onConflict: 'cuit' }).select();
    console.log('✅ Clientes creados');

    // 3. Productos de Prueba
    const productsData = [
      { tenant_id: tenant.id, name: 'Notebook Pro X1', sku: 'LAP-001', price_sell_net: 1200000, stock: 15, min_stock: 3 },
      { tenant_id: tenant.id, name: 'Monitor UltraWide 34', sku: 'MON-34', price_sell_net: 450000, stock: 8, min_stock: 2 },
      { tenant_id: tenant.id, name: 'Teclado Mecánico RGB', sku: 'KB-RGB', price_sell_net: 85000, stock: 2, min_stock: 5 }, // Stock bajo a propósito
      { tenant_id: tenant.id, name: 'Mouse Inalámbrico', sku: 'MSE-WL', price_sell_net: 45000, stock: 50, min_stock: 10 }
    ];
    await supabase.from('products').upsert(productsData, { onConflict: 'sku' });
    console.log('✅ Inventario poblado');

    // 4. Ventas (Transacciones)
    const transactionsData = createdClients.map((client, i) => ({
      tenant_id: tenant.id,
      type: 'SALE',
      contact_id: client.id,
      amount_net: 100000 * (i + 1),
      amount_iva: 21000 * (i + 1),
      amount_total: 121000 * (i + 1),
      status: 'PAID',
      date: new Date(Date.now() - (i * 86400000)).toISOString() // Una por día hacia atrás
    }));
    await supabase.from('transactions').insert(transactionsData);
    console.log('✅ Historial de ventas generado');

    // 5. Turnos / Agenda
    const bookingsData = createdClients.slice(0, 2).map((client, i) => ({
      tenant_id: tenant.id,
      contact_id: client.id,
      service_name: i === 0 ? 'Consultoría IT' : 'Mantenimiento preventivo',
      start_time: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
      end_time: new Date(Date.now() + (i + 2) * 3600000).toISOString(),
      status: 'CONFIRMED'
    }));
    await supabase.from('bookings').insert(bookingsData);
    console.log('✅ Agenda inicializada');

    console.log('✨ PROCESO COMPLETADO. Datos listos para usar.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runFullSeeding();
