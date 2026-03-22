import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';

describe('Rotas de Métodos de Pagamento', () => {
  
  beforeAll(() => {
    runMigrations();
  });

  afterAll((done) => {
    db.close();
    done();
  });

  const clearTable = () => {
    db.prepare('DELETE FROM transacoes').run();
    db.prepare('DELETE FROM recorrencias').run();
    db.prepare('DELETE FROM metodos_pagamento').run();
  };

  test('Deve criar um novo método de pagamento (POST /metodos-pagamento)', async () => {
    clearTable();
    const res = await request(app)
      .post('/metodos-pagamento')
      .send({
        nome: 'Cartão de Crédito',
        icone: '💳',
        tipo: 'credito'
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBeDefined();

    const row = db.prepare('SELECT * FROM metodos_pagamento WHERE id = ?').get(res.body.id);
    expect(row.nome).toBe('Cartão de Crédito');
    expect(row.icone).toBe('💳');
    expect(row.tipo).toBe('credito');
  });

  test('Deve listar métodos de pagamento (GET /metodos-pagamento)', async () => {
    db.prepare('INSERT INTO metodos_pagamento (nome, icone) VALUES (?, ?)').run('Dinheiro', '💵');
    db.prepare('INSERT INTO metodos_pagamento (nome, icone) VALUES (?, ?)').run('Pix', '📱');

    const res = await request(app).get('/metodos-pagamento');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Deve estar ordenado por nome ASC
    const names = res.body.map(m => m.nome);
    expect(names.includes('Pix')).toBe(true);
  });

  test('Deve atualizar um método (PUT /metodos-pagamento/:id)', async () => {
    const insert = db.prepare('INSERT INTO metodos_pagamento (nome, icone) VALUES (?, ?)').run('Antigo', '🪙');
    const id = insert.lastInsertRowid;

    const res = await request(app)
      .put(`/metodos-pagamento/${id}`)
      .send({
        nome: 'Novo Nome',
        icone: '💰',
        tipo: 'poupanca'
      });

    expect(res.status).toBe(200);
    const row = db.prepare('SELECT * FROM metodos_pagamento WHERE id = ?').get(id);
    expect(row.nome).toBe('Novo Nome');
    expect(row.icone).toBe('💰');
  });

  test('Deve deletar um método (DELETE /metodos-pagamento/:id)', async () => {
    const insert = db.prepare('INSERT INTO metodos_pagamento (nome, icone) VALUES (?, ?)').run('Deletar', '❌');
    const id = insert.lastInsertRowid;

    const res = await request(app).delete(`/metodos-pagamento/${id}`);
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT * FROM metodos_pagamento WHERE id = ?').get(id);
    expect(row).toBeUndefined();
  });
});
