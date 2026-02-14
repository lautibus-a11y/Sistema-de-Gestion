/**
 * ============================================================
 * DATABASE CONTROLLER - ACCESO DIRECTO A POSTGRESQL
 * ============================================================
 * Cliente directo a PostgreSQL para migraciones automáticas
 * y gestión de estructura de base de datos.
 * ============================================================
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// Configuración de conexión directa a PostgreSQL
const DATABASE_URL = 'postgresql://postgres:RKk2OkdUTYQyIiNU@db.yabxdsbieqandlslekpk.supabase.co:5432/postgres';

// Pool de conexiones para mejor performance
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para Supabase
    },
    max: 10, // Máximo de conexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * 🔧 EJECUTAR QUERY SQL
 */
async function query(text, params = []) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('✅ Query ejecutado:', { text: text.substring(0, 100), duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Error en query:', error.message);
        throw error;
    }
}

/**
 * 🔧 EJECUTAR TRANSACCIÓN
 */
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        console.log('✅ Transacción completada');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Transacción revertida:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * 📊 VERIFICAR SI UNA TABLA EXISTE
 */
async function tableExists(tableName) {
    const result = await query(
        `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
        [tableName]
    );
    return result.rows[0].exists;
}

/**
 * 📊 OBTENER COLUMNAS DE UNA TABLA
 */
async function getTableColumns(tableName) {
    const result = await query(
        `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
        [tableName]
    );
    return result.rows;
}

/**
 * 📊 LISTAR TODAS LAS TABLAS
 */
async function listTables() {
    const result = await query(
        `SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
     ORDER BY table_name`
    );
    return result.rows.map(row => row.table_name);
}

/**
 * 🛡️ VERIFICAR POLÍTICAS RLS DE UNA TABLA
 */
async function getRLSPolicies(tableName) {
    const result = await query(
        `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = $1`,
        [tableName]
    );
    return result.rows;
}

/**
 * 🔧 CREAR TABLA CON RLS AUTOMÁTICO
 */
async function createTableWithRLS(tableName, columns, rlsPolicies = []) {
    return await transaction(async (client) => {
        // 1. Crear tabla
        const columnDefs = columns.map(col =>
            `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`
        ).join(',\n    ');

        await client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnDefs}
      )
    `);
        console.log(`✅ Tabla ${tableName} creada`);

        // 2. Habilitar RLS
        await client.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
        console.log(`✅ RLS habilitado en ${tableName}`);

        // 3. Crear políticas RLS
        for (const policy of rlsPolicies) {
            await client.query(`DROP POLICY IF EXISTS "${policy.name}" ON ${tableName}`);
            await client.query(`
        CREATE POLICY "${policy.name}" ON ${tableName}
        FOR ${policy.command || 'ALL'}
        USING (${policy.using || 'true'})
        ${policy.withCheck ? `WITH CHECK (${policy.withCheck})` : ''}
      `);
            console.log(`✅ Política "${policy.name}" creada en ${tableName}`);
        }

        return true;
    });
}

/**
 * 🔧 AGREGAR COLUMNA A TABLA EXISTENTE
 */
async function addColumn(tableName, columnName, columnType, constraints = '') {
    await query(`
    ALTER TABLE ${tableName} 
    ADD COLUMN IF NOT EXISTS ${columnName} ${columnType} ${constraints}
  `);
    console.log(`✅ Columna ${columnName} agregada a ${tableName}`);
}

/**
 * 🔧 CREAR ÍNDICE
 */
async function createIndex(tableName, columnName, indexName = null) {
    const idxName = indexName || `idx_${tableName}_${columnName}`;
    await query(`
    CREATE INDEX IF NOT EXISTS ${idxName} ON ${tableName}(${columnName})
  `);
    console.log(`✅ Índice ${idxName} creado`);
}

/**
 * 🧪 VERIFICAR CONEXIÓN
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW() as current_time, version()');
        console.log('✅ Conexión exitosa a PostgreSQL');
        console.log('   Hora del servidor:', result.rows[0].current_time);
        console.log('   Versión:', result.rows[0].version.split(' ')[0]);
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        return false;
    }
}

/**
 * 🔧 CERRAR POOL DE CONEXIONES
 */
async function closePool() {
    await pool.end();
    console.log('✅ Pool de conexiones cerrado');
}

// Exportar funciones
module.exports = {
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
    closePool,
    pool
};
