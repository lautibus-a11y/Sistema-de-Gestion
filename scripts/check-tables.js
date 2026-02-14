
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:RKk2OkdUTYQyIiNU@db.yabxdsbieqandlslekpk.supabase.co:5432/postgres';

const client = new Client({ connectionString });

async function run() {
    try {
        await client.connect();
        console.log('--- Checking Tables ---');
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        for (let row of res.rows) {
            console.log(`Table: ${row.table_name}`);
            const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${row.table_name}'
      `);
            console.log('  Columns:', cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
