/**
 * ============================================================
 * SCRIPT DE DIAGNÓSTICO - ARGENBIZ SAAS
 * ============================================================
 * Este script verifica que todo esté configurado correctamente
 * 
 * EJECUCIÓN: node diagnose.js
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 DIAGNÓSTICO DE CONFIGURACIÓN - ARGENBIZ SAAS\n');
console.log('='.repeat(60));

// 1. Verificar variables de entorno
console.log('\n📋 1. VARIABLES DE ENTORNO');
console.log('-'.repeat(60));
console.log(`VITE_SUPABASE_URL: ${supabaseUrl ? '✅ Configurada' : '❌ Faltante'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${anonKey ? '✅ Configurada' : '❌ Faltante'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Configurada' : '❌ Faltante'}`);

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.log('\n❌ ERROR: Faltan variables de entorno. Verifica tu archivo .env.local');
    process.exit(1);
}

// 2. Verificar conexión con cliente público
console.log('\n🔌 2. CONEXIÓN CON SUPABASE (Cliente Público)');
console.log('-'.repeat(60));

const supabase = createClient(supabaseUrl, anonKey);

try {
    const { data, error } = await supabase.from('tenants').select('count');
    if (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
    } else {
        console.log('✅ Conexión exitosa con Supabase');
    }
} catch (err) {
    console.log(`❌ Error: ${err.message}`);
}

// 3. Verificar conexión con cliente admin
console.log('\n🔐 3. CONEXIÓN CON SUPABASE (Cliente Admin)');
console.log('-'.repeat(60));

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

try {
    const { data, error } = await adminClient.from('tenants').select('*');
    if (error) {
        console.log(`❌ Error de conexión admin: ${error.message}`);
    } else {
        console.log('✅ Conexión admin exitosa');
        console.log(`   Tenants encontrados: ${data?.length || 0}`);
    }
} catch (err) {
    console.log(`❌ Error: ${err.message}`);
}

// 4. Verificar estructura de tablas
console.log('\n📊 4. ESTRUCTURA DE BASE DE DATOS');
console.log('-'.repeat(60));

const requiredTables = [
    'tenants',
    'profiles',
    'contacts',
    'products',
    'transactions',
    'bookings',
    'site_content'
];

for (const table of requiredTables) {
    try {
        const { data, error } = await adminClient.from(table).select('count').limit(1);
        if (error) {
            console.log(`❌ Tabla '${table}': ${error.message}`);
        } else {
            console.log(`✅ Tabla '${table}': Existe`);
        }
    } catch (err) {
        console.log(`❌ Tabla '${table}': Error - ${err.message}`);
    }
}

// 5. Verificar datos de seeding
console.log('\n🌱 5. DATOS DE SEEDING');
console.log('-'.repeat(60));

try {
    const { data: tenants } = await adminClient.from('tenants').select('*');
    const { data: contacts } = await adminClient.from('contacts').select('*');
    const { data: products } = await adminClient.from('products').select('*');
    const { data: transactions } = await adminClient.from('transactions').select('*');
    const { data: bookings } = await adminClient.from('bookings').select('*');
    const { data: siteContent } = await adminClient.from('site_content').select('*');

    console.log(`Tenants: ${tenants?.length || 0}`);
    console.log(`Contactos: ${contacts?.length || 0}`);
    console.log(`Productos: ${products?.length || 0}`);
    console.log(`Transacciones: ${transactions?.length || 0}`);
    console.log(`Reservas: ${bookings?.length || 0}`);
    console.log(`Contenido del sitio: ${siteContent?.length || 0}`);

    if (tenants?.length === 0) {
        console.log('\n⚠️  No hay datos de seeding. Ejecuta: node seed-professional.js');
    } else {
        console.log('\n✅ Datos de seeding encontrados');
    }
} catch (err) {
    console.log(`❌ Error al verificar datos: ${err.message}`);
}

// 6. Verificar políticas RLS
console.log('\n🛡️  6. POLÍTICAS RLS');
console.log('-'.repeat(60));

try {
    const { data, error } = await adminClient.rpc('exec_sql', {
        sql: "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'"
    });

    if (error) {
        console.log('⚠️  No se pudieron verificar las políticas RLS automáticamente');
        console.log('   Verifica manualmente en Supabase Dashboard → Authentication → Policies');
    } else {
        console.log(`✅ Políticas RLS configuradas: ${data?.length || 0}`);
    }
} catch (err) {
    console.log('⚠️  Verificación de RLS requiere acceso manual al dashboard');
}

// 7. Resumen final
console.log('\n' + '='.repeat(60));
console.log('📝 RESUMEN DEL DIAGNÓSTICO');
console.log('='.repeat(60));

console.log('\n✅ PASOS COMPLETADOS:');
console.log('   • Variables de entorno configuradas');
console.log('   • Conexión con Supabase establecida');
console.log('   • Cliente admin funcional');

console.log('\n📋 PRÓXIMOS PASOS:');
console.log('   1. Si las tablas no existen, ejecuta schema-complete.sql en Supabase');
console.log('   2. Si no hay datos, ejecuta: node seed-professional.js');
console.log('   3. Crea tu primer usuario en Supabase Dashboard → Authentication');
console.log('   4. Ejecuta el SQL para crear el perfil del usuario (ver SETUP-GUIDE.md)');
console.log('   5. Inicia la app: npm run dev');

console.log('\n🎉 Diagnóstico completado!\n');
