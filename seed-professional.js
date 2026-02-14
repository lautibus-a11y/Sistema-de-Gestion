/**
 * ============================================================
 * AUTO-SEEDING SCRIPT - ARGENBIZ SAAS
 * ============================================================
 * Este script carga datos iniciales en la base de datos usando
 * la Service Role Key para bypasear RLS.
 * 
 * EJECUCIÓN: node seed-professional.js
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ ERROR: Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Cliente administrativo (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * 🎯 FUNCIÓN PRINCIPAL DE SEEDING
 */
async function seedDatabase() {
    console.log('🚀 Iniciando Auto-Seeding de ArgenBiz...\n');

    try {
        // ============================================================
        // 1. CREAR TENANT DE DEMOSTRACIÓN
        // ============================================================
        console.log('📦 Paso 1: Creando Tenant de demostración...');

        const { data: existingTenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('cuit', '30712345678')
            .single();

        let tenantId;

        if (existingTenant) {
            console.log('   ℹ️  Tenant ya existe, usando el existente');
            tenantId = existingTenant.id;
        } else {
            const { data: newTenant, error: tenantError } = await supabase
                .from('tenants')
                .insert([{
                    name: 'ArgenBiz Demo SRL',
                    cuit: '30712345678',
                    tax_condition: 'Responsable Inscripto',
                    address: 'Av. Corrientes 1234, CABA, Argentina'
                }])
                .select()
                .single();

            if (tenantError) throw tenantError;
            tenantId = newTenant.id;
            console.log('   ✅ Tenant creado:', newTenant.name);
        }

        // ============================================================
        // 2. CREAR CONTACTOS (CLIENTES)
        // ============================================================
        console.log('\n👥 Paso 2: Creando contactos de demostración...');

        const { data: clients, error: clientsError } = await supabase
            .from('contacts')
            .insert([
                {
                    tenant_id: tenantId,
                    name: 'Logística San Telmo SA',
                    cuit: '30712233441',
                    tax_condition: 'Responsable Inscripto',
                    email: 'contacto@santelmo.com.ar',
                    phone: '+54 11 4567-8901',
                    is_client: true,
                    is_provider: false
                },
                {
                    tenant_id: tenantId,
                    name: 'Estudio Jurídico Gomez',
                    cuit: '33554422119',
                    tax_condition: 'Responsable Inscripto',
                    email: 'info@estudiogomez.com',
                    phone: '+54 11 4234-5678',
                    is_client: true,
                    is_provider: false
                },
                {
                    tenant_id: tenantId,
                    name: 'Marta Rodriguez',
                    cuit: '27254433221',
                    tax_condition: 'Monotributo',
                    email: 'marta.rodriguez@gmail.com',
                    phone: '+54 9 11 5678-9012',
                    is_client: true,
                    is_provider: false
                },
                {
                    tenant_id: tenantId,
                    name: 'Tech Solutions Corp',
                    cuit: '30998877662',
                    tax_condition: 'Exento',
                    email: 'ventas@techsolutions.com',
                    phone: '+54 11 6789-0123',
                    is_client: true,
                    is_provider: false
                },
                {
                    tenant_id: tenantId,
                    name: 'Juan Carlos Perez',
                    cuit: '20123456789',
                    tax_condition: 'Consumidor Final',
                    email: 'jcperez@hotmail.com',
                    phone: '+54 9 11 3456-7890',
                    is_client: true,
                    is_provider: false
                }
            ])
            .select();

        if (clientsError) throw clientsError;
        console.log(`   ✅ ${clients.length} clientes creados`);

        // ============================================================
        // 3. CREAR PRODUCTOS
        // ============================================================
        console.log('\n📦 Paso 3: Creando productos de demostración...');

        const { data: products, error: productsError } = await supabase
            .from('products')
            .insert([
                {
                    tenant_id: tenantId,
                    name: 'Notebook Lenovo ThinkPad L14',
                    sku: 'LAP-001',
                    description: 'Laptop profesional Intel Core i5, 16GB RAM, 512GB SSD',
                    price_sell_net: 950000,
                    iva_rate: 0.21,
                    stock: 8,
                    min_stock: 3
                },
                {
                    tenant_id: tenantId,
                    name: 'Monitor LG 24" IPS Full HD',
                    sku: 'MON-024',
                    description: 'Monitor profesional 24 pulgadas, resolución 1920x1080',
                    price_sell_net: 245000,
                    iva_rate: 0.21,
                    stock: 12,
                    min_stock: 5
                },
                {
                    tenant_id: tenantId,
                    name: 'Teclado Mecánico Keychron K2',
                    sku: 'KB-K2',
                    description: 'Teclado mecánico inalámbrico, switches Gateron Brown',
                    price_sell_net: 125000,
                    iva_rate: 0.21,
                    stock: 2,
                    min_stock: 5
                },
                {
                    tenant_id: tenantId,
                    name: 'Mouse Logitech MX Master 3S',
                    sku: 'MSE-MX',
                    description: 'Mouse ergonómico inalámbrico de alta precisión',
                    price_sell_net: 98000,
                    iva_rate: 0.21,
                    stock: 15,
                    min_stock: 4
                },
                {
                    tenant_id: tenantId,
                    name: 'Webcam Logitech C920 HD Pro',
                    sku: 'CAM-920',
                    description: 'Cámara web Full HD 1080p con micrófono estéreo',
                    price_sell_net: 85000,
                    iva_rate: 0.21,
                    stock: 6,
                    min_stock: 3
                }
            ])
            .select();

        if (productsError) throw productsError;
        console.log(`   ✅ ${products.length} productos creados`);

        // ============================================================
        // 4. CREAR TRANSACCIONES (VENTAS)
        // ============================================================
        console.log('\n💰 Paso 4: Creando transacciones de demostración...');

        const transactions = [];
        const today = new Date();

        // Generar 25 ventas en los últimos 15 días
        for (let i = 0; i < 25; i++) {
            const randomClient = clients[Math.floor(Math.random() * clients.length)];
            const net = 20000 + Math.random() * 180000;
            const iva = net * 0.21;
            const date = new Date(today);
            date.setDate(date.getDate() - Math.floor(Math.random() * 15));

            transactions.push({
                tenant_id: tenantId,
                type: 'SALE',
                contact_id: randomClient.id,
                amount_net: Math.round(net * 100) / 100,
                amount_iva: Math.round(iva * 100) / 100,
                amount_total: Math.round((net + iva) * 100) / 100,
                status: 'PAID',
                date: date.toISOString()
            });
        }

        const { error: transError } = await supabase
            .from('transactions')
            .insert(transactions);

        if (transError) throw transError;
        console.log(`   ✅ ${transactions.length} transacciones creadas`);

        // ============================================================
        // 5. CREAR BOOKINGS (RESERVAS)
        // ============================================================
        console.log('\n📅 Paso 5: Creando reservas de demostración...');

        const bookings = [];
        const services = [
            'Consultoría Empresarial',
            'Asesoramiento Contable',
            'Auditoría Fiscal',
            'Planificación Estratégica',
            'Capacitación de Personal'
        ];

        // Generar 10 reservas en los próximos 7 días
        for (let i = 0; i < 10; i++) {
            const randomClient = clients[Math.floor(Math.random() * clients.length)];
            const randomService = services[Math.floor(Math.random() * services.length)];
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7));
            startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1);

            bookings.push({
                tenant_id: tenantId,
                contact_id: randomClient.id,
                service_name: randomService,
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status: Math.random() > 0.3 ? 'CONFIRMED' : 'PENDING',
                notes: `Reserva automática de demostración`
            });
        }

        const { error: bookingsError } = await supabase
            .from('bookings')
            .insert(bookings);

        if (bookingsError) throw bookingsError;
        console.log(`   ✅ ${bookings.length} reservas creadas`);

        // ============================================================
        // 6. CREAR CONTENIDO DEL SITIO
        // ============================================================
        console.log('\n🌐 Paso 6: Creando contenido del sitio...');

        const siteContent = [
            {
                tenant_id: tenantId,
                key: 'hero',
                content: {
                    title: 'Soluciones Empresariales Integrales',
                    subtitle: 'Transformamos tu negocio con tecnología de vanguardia',
                    cta_text: 'Comenzar Ahora',
                    background_image: '/images/hero-bg.jpg'
                }
            },
            {
                tenant_id: tenantId,
                key: 'services',
                content: {
                    title: 'Nuestros Servicios',
                    items: [
                        {
                            name: 'Consultoría Empresarial',
                            description: 'Asesoramiento estratégico para el crecimiento de tu empresa',
                            icon: 'briefcase',
                            price: 50000
                        },
                        {
                            name: 'Gestión Contable',
                            description: 'Administración completa de tus finanzas y obligaciones fiscales',
                            icon: 'calculator',
                            price: 35000
                        },
                        {
                            name: 'Auditoría',
                            description: 'Revisión exhaustiva de procesos y cumplimiento normativo',
                            icon: 'shield',
                            price: 75000
                        }
                    ]
                }
            },
            {
                tenant_id: tenantId,
                key: 'contact',
                content: {
                    email: 'contacto@argenbiz.com.ar',
                    phone: '+54 11 1234-5678',
                    address: 'Av. Corrientes 1234, CABA, Argentina',
                    social: {
                        facebook: 'https://facebook.com/argenbiz',
                        instagram: 'https://instagram.com/argenbiz',
                        linkedin: 'https://linkedin.com/company/argenbiz'
                    }
                }
            }
        ];

        const { error: contentError } = await supabase
            .from('site_content')
            .insert(siteContent);

        if (contentError) throw contentError;
        console.log(`   ✅ ${siteContent.length} secciones de contenido creadas`);

        // ============================================================
        // ✅ SEEDING COMPLETADO
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ AUTO-SEEDING COMPLETADO EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log(`\n📊 Resumen:`);
        console.log(`   • Tenant ID: ${tenantId}`);
        console.log(`   • Clientes: ${clients.length}`);
        console.log(`   • Productos: ${products.length}`);
        console.log(`   • Transacciones: ${transactions.length}`);
        console.log(`   • Reservas: ${bookings.length}`);
        console.log(`   • Contenido: ${siteContent.length} secciones`);
        console.log('\n🎉 La base de datos está lista para recibir la primera reserva!\n');

    } catch (error) {
        console.error('\n❌ ERROR EN SEEDING:', error.message);
        console.error('Detalles:', error);
        process.exit(1);
    }
}

// Ejecutar seeding
seedDatabase();
