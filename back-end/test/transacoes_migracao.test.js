import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';
import fs from 'fs';
import path from 'path';

describe('Migração de Transação (Fixa <-> Parcelada)', () => {
  
  beforeAll(() => {
    // Garante que as migrations rodaram no banco de teste antes de começar
    runMigrations();
    // Garante que existam IDs validos para FKs
    db.prepare("INSERT OR IGNORE INTO categorias (id, nome, tipo_categoria) VALUES (1, 'Teste', 2)").run();
    db.prepare("INSERT OR IGNORE INTO metodos_pagamento (id, nome, tipo) VALUES (1, 'Teste', 'padrao')").run();
  });

  afterAll((done) => {
    db.close();
    // Remove o banco de teste após os testes se desejar, mas vamos manter por enquanto
    done();
  });

  // Helper para limpar tabelas entre testes
  const clearTables = () => {
    db.prepare('DELETE FROM transacoes').run();
    db.prepare('DELETE FROM recorrencias').run();
    // Re-seed básico se necessário (categorias etc já devem estar lá pelo runMigrations)
  };

  test('Deve migrar uma transação FIXA para PARCELADA (3 parcelas)', async () => {
    clearTables();

    // 1. Criar uma transação fixa (gera 120 meses no backend atual)
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Gasto Fixo Teste',
        valor: 100,
        data: '2026-03-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa',
        dia_vencimento: 1
      });

    expect(resCreate.status).toBe(201);
    const recId = resCreate.body.recorrencia_id;
    const transId = resCreate.body.transacao_ids[0];

    // Verifica se criou 120
    const countBefore = db.prepare('SELECT COUNT(*) as c FROM transacoes WHERE recorrencia_id = ?').get(recId).c;
    expect(countBefore).toBe(120);

    // 2. Editar para PARCELADA em 3 vezes
    const resEdit = await request(app)
      .put(`/transacoes/${transId}`)
      .send({
        descricao: 'Gasto Agora Parcelado',
        valor: 100,
        data: '2026-03-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'parcelada',
        total_parcelas: 3
      });

    expect(resEdit.status).toBe(200);

    // 3. Verificações no banco
    const countAfter = db.prepare('SELECT COUNT(*) as c FROM transacoes WHERE recorrencia_id = ?').get(recId).c;
    expect(countAfter).toBe(3);

    const recorrencia = db.prepare('SELECT * FROM recorrencias WHERE id = ?').get(recId);
    expect(recorrencia.tipo_id).toBe(3); // parcelada
    expect(recorrencia.total_parcelas).toBe(3);

    const transacoes = db.prepare('SELECT * FROM transacoes WHERE recorrencia_id = ? ORDER BY data ASC').all(recId);
    expect(transacoes[0].parcela_atual).toBe(1);
    expect(transacoes[1].parcela_atual).toBe(2);
    expect(transacoes[2].parcela_atual).toBe(3);
    expect(transacoes[0].tipo_id).toBe(3);
  });

  test('Deve migrar uma transação PARCELADA para FIXA', async () => {
    clearTables();

    // 1. Criar uma transação parcelada (3 parcelas)
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Gasto Parcelado Teste',
        valor: 300,
        data: '2026-03-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'parcelada',
        total_parcelas: 3,
        dia_vencimento: 1
      });

    const recId = resCreate.body.recorrencia_id;
    const transId = resCreate.body.transacao_ids[0];

    // 2. Editar para FIXA
    const resEdit = await request(app)
      .put(`/transacoes/${transId}`)
      .send({
        descricao: 'Gasto Agora Fixo',
        valor: 100,
        data: '2026-03-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa'
      });

    expect(resEdit.status).toBe(200);

    // 3. Verificações no banco
    const recorrencia = db.prepare('SELECT * FROM recorrencias WHERE id = ?').get(recId);
    expect(recorrencia.tipo_id).toBe(2); // fixa
    expect(recorrencia.total_parcelas).toBeNull();

    const transacoes = db.prepare('SELECT * FROM transacoes WHERE recorrencia_id = ?').all(recId);
    for (const t of transacoes) {
      expect(t.tipo_id).toBe(2);
      expect(t.parcela_atual).toBeNull();
    }
  });

});
