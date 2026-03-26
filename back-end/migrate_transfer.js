import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Migrating direcao_transacao enum...');
    // Postgres doesn't allow ALTER TYPE ... ADD VALUE inside a transaction
    await pool.query("ALTER TYPE direcao_transacao ADD VALUE IF NOT EXISTS 'transferencia_saida'");
    await pool.query("ALTER TYPE direcao_transacao ADD VALUE IF NOT EXISTS 'transferencia_entrada'");
    console.log('✅ Migration successful');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
