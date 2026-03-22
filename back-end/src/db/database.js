/**
 * database.js
 * Singleton de conexão com o banco de dados SQLite.
 * Exporta a instância `db` para uso em toda a aplicação.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante que o diretório de dados existe
const dbDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'financeiro.db');
const db = new Database(dbPath);

// Habilita integridade referencial no SQLite
db.pragma('foreign_keys = ON');

export default db;
