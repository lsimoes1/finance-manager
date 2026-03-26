import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante que o .env seja carregado independentemente de onde o processo foi iniciado
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ ERRO: A variável de ambiente DATABASE_URL não está definida!');
  console.error('Verifique se o arquivo .env existe na pasta back-end/');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Inicialização Automática (Executa init.sql se as tabelas não existirem)
const initDb = async () => {
    try {
        const checkTable = await pool.query("SELECT to_regclass('public.transacoes')");
        if (!checkTable.rows[0].to_regclass) {
            console.log('[db] Tabelas não encontradas. Inicializando banco...');
            const sqlPath = path.join(process.cwd(), 'src', 'db', 'init.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await pool.query(sql);
            console.log('✅ Banco de dados inicializado com sucesso.');
        }
    } catch (err) {
        console.error('[db] Erro na inicialização automática:', err);
    }
};

initDb();

const db = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('[db] Error executing query:', text, err);
      throw err;
    }
  },
  pool: pool
};

export default db;
