/**
 * migrations.js
 * Executa as migrations do banco de dados:
 *   1. Lê e aplica os arquivos SQL da pasta migrations/
 *   2. Aplica alterações incrementais de schema (ALTER TABLE)
 *   3. Aplica migration especial: geração de 120 meses para contas fixas antigas
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

/**
 * Lê um arquivo .sql e executa cada statement separado por ponto-e-vírgula.
 */
function runSqlFile(filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');
  // Remove comentários de linha e divide por ";"
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      db.prepare(statement).run();
    } catch (err) {
      // INSERT OR IGNORE pode gerar warnings em alguns drivers — apenas loga
      if (!err.message.includes('UNIQUE constraint failed')) {
        console.warn(`[migrations] Aviso ao executar statement: ${err.message}`);
      }
    }
  }
}

/**
 * Aplica ALTER TABLE incrementais de forma segura,
 * verificando via PRAGMA se a coluna já existe.
 */
function runIncrementalAlters() {
  const alters = [
    { table: 'transacoes', column: 'direcao_id', sql: 'ALTER TABLE transacoes ADD COLUMN direcao_id INTEGER NOT NULL DEFAULT 1' },
    { table: 'recorrencias', column: 'direcao_id', sql: 'ALTER TABLE recorrencias ADD COLUMN direcao_id INTEGER NOT NULL DEFAULT 1' },
    { table: 'categorias', column: 'tipo_categoria', sql: 'ALTER TABLE categorias ADD COLUMN tipo_categoria INTEGER NOT NULL DEFAULT 2' },
    { table: 'categorias', column: 'icone', sql: "ALTER TABLE categorias ADD COLUMN icone TEXT DEFAULT '🏷️'" },
    { table: 'metodos_pagamento', column: 'icone', sql: "ALTER TABLE metodos_pagamento ADD COLUMN icone TEXT DEFAULT '🪙'" },
    { table: 'metodos_pagamento', column: 'tipo', sql: "ALTER TABLE metodos_pagamento ADD COLUMN tipo TEXT NOT NULL DEFAULT 'padrao'" },
  ];

  for (const { table, column, sql } of alters) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!cols.includes(column)) {
        db.prepare(sql).run();
        console.log(`[migrations] Coluna '${column}' adicionada em '${table}'.`);
      }
    } catch (err) {
      console.error(`[migrations] Erro ao aplicar ALTER em ${table}.${column}:`, err.message);
    }
  }

  // Seed automático de tipo para métodos de pagamento existentes (crédito/investimento por nome)
  try {
    const metCols = db.prepare('PRAGMA table_info(metodos_pagamento)').all().map(c => c.name);
    if (metCols.includes('tipo')) {
      db.prepare("UPDATE metodos_pagamento SET tipo = 'credito' WHERE (nome LIKE '%Cr%dito%' OR nome LIKE '%credito%') AND tipo = 'padrao'").run();
      db.prepare("UPDATE metodos_pagamento SET tipo = 'investimento' WHERE (nome LIKE '%Investimento%' OR nome LIKE '%investimento%') AND tipo = 'padrao'").run();
    }
  } catch (err) {
    console.error('[migrations] Erro ao seed tipo metodos_pagamento:', err.message);
  }
}

/**
 * Migração especial: garante que contas fixas antigas tenham 120 meses gerados.
 */
function migrateFixasAntigas() {
  try {
    const fixasAntigas = db.prepare('SELECT * FROM recorrencias WHERE tipo_id = 2').all();
    for (const rec of fixasAntigas) {
      const qtd = db.prepare('SELECT COUNT(*) as c FROM transacoes WHERE recorrencia_id = ?').get(rec.id).c;
      if (qtd >= 60) continue;

      const lastTrans = db.prepare('SELECT data FROM transacoes WHERE recorrencia_id = ? ORDER BY data DESC LIMIT 1').get(rec.id);
      if (!lastTrans) continue;

      const [y, m] = lastTrans.data.split('-');
      const dv = rec.dia_vencimento;
      const insertStmt = db.prepare(`
        INSERT INTO transacoes
        (descricao, valor, data, categoria_id, metodo_pagamento_id, parcela_atual, recorrencia_id, tipo_id, direcao_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let i = 1;
      while (true) {
        const currentCount = db.prepare('SELECT COUNT(*) as c FROM transacoes WHERE recorrencia_id = ?').get(rec.id).c;
        if (currentCount >= 120) break;

        const targetMonth = (Number(m) - 1) + i;
        const targetYear = Number(y) + Math.floor(targetMonth / 12);
        const monthIndex = targetMonth % 12;
        const daysInTargetMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
        const actualDay = Math.min(dv, daysInTargetMonth);

        const dateStr = `${targetYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
        insertStmt.run(rec.descricao, rec.valor, dateStr, rec.categoria_id, rec.metodo_pagamento_id, null, rec.id, rec.tipo_id, rec.direcao_id);
        i++;
      }
    }
  } catch (err) {
    console.error('[migrations] Erro ao migrar fixas antigas:', err.message);
  }
}

/**
 * Ponto de entrada: executa todas as migrations em ordem.
 */
export function runMigrations() {
  console.log('[migrations] Iniciando migrations...');
  runSqlFile('001_schema.sql');
  runSqlFile('002_seed.sql');
  runIncrementalAlters();
  migrateFixasAntigas();
  console.log('[migrations] Migrations concluídas.');
}
