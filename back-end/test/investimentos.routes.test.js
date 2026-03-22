import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';

describe('Rotas de Investimentos', () => {
  beforeAll(() => {
    runMigrations();
  });

  afterAll((done) => {
    db.close();
    done();
  });

  test('Deve criar um investimento (POST /investimentos)', async () => {
    const res = await request(app)
      .post('/investimentos')
      .send({
        tipo: 'Renda Fixa',
        nome: 'CDB 110% CDI',
        valor: 5000,
        data: '2026-03-20'
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('Deve listar investimentos (GET /investimentos)', async () => {
    const res = await request(app).get('/investimentos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Deve deletar um investimento (DELETE /investimentos/:id)', async () => {
    const insert = db.prepare('INSERT INTO investimentos (tipo, nome, valor, data) VALUES (?, ?, ?, ?)').run('Ação', 'PETR4', 100, '2026-03-21');
    const id = insert.lastInsertRowid;

    const res = await request(app).delete(`/investimentos/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
