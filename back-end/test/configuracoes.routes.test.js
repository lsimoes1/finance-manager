import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';

describe('Rotas de Configurações', () => {
  beforeAll(() => {
    runMigrations();
  });

  afterAll((done) => {
    db.close();
    done();
  });

  test('Deve buscar configuração de período (GET /configuracoes/periodo)', async () => {
    const res = await request(app).get('/configuracoes/periodo');
    expect(res.status).toBe(200);
    expect(res.body.dia_inicio).toBeDefined();
  });

  test('Deve atualizar configuração de período (PUT /configuracoes/periodo)', async () => {
    const res = await request(app)
      .put('/configuracoes/periodo')
      .send({ dia_inicio: 15 });
    
    expect(res.status).toBe(200);
    expect(res.body.dia_inicio).toBe(15);

    const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'dia_inicio_periodo'").get();
    expect(row.valor).toBe('15');
  });

  test('Deve retornar erro 400 para dia_inicio inválido', async () => {
    const res = await request(app)
      .put('/configuracoes/periodo')
      .send({ dia_inicio: 35 });
    expect(res.status).toBe(400);
  });
});
