import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';

describe('Rotas de Categoria', () => {
  
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
    db.prepare('DELETE FROM categorias').run();
  };

  test('Deve criar uma nova categoria (POST /categorias)', async () => {
    clearTable();
    const res = await request(app)
      .post('/categorias')
      .send({
        nome: 'Alimentação',
        tipo_categoria: 1,
        icone: '🍱'
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBeDefined();

    const row = db.prepare('SELECT * FROM categorias WHERE id = ?').get(res.body.id);
    expect(row.nome).toBe('Alimentação');
    expect(row.icone).toBe('🍱');
  });

  test('Deve listar categorias (GET /categorias)', async () => {
    // Adiciona algumas categorias
    db.prepare('INSERT INTO categorias (nome, tipo_categoria) VALUES (?, ?)').run('Zé', 1);
    db.prepare('INSERT INTO categorias (nome, tipo_categoria) VALUES (?, ?)').run('Abba', 2);

    const res = await request(app).get('/categorias');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Verifica ordenação por nome ASC (Abba vem antes de Zé)
    const names = res.body.map(c => c.nome);
    expect(names.indexOf('Abba')).toBeLessThan(names.indexOf('Zé'));
  });

  test('Deve filtrar categorias por tipo (GET /categorias?tipo_categoria=2)', async () => {
    const res = await request(app).get('/categorias?tipo_categoria=2');
    expect(res.status).toBe(200);
    res.body.forEach(c => {
      expect(c.tipo_categoria).toBe(2);
    });
  });

  test('Deve atualizar uma categoria (PUT /categorias/:id)', async () => {
    const insert = db.prepare('INSERT INTO categorias (nome, tipo_categoria) VALUES (?, ?)').run('Antiga', 1);
    const id = insert.lastInsertRowid;

    const res = await request(app)
      .put(`/categorias/${id}`)
      .send({
        nome: 'Nova',
        tipo_categoria: 2,
        icone: '🚀'
      });

    expect(res.status).toBe(200);
    const row = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
    expect(row.nome).toBe('Nova');
    expect(row.tipo_categoria).toBe(2);
    expect(row.icone).toBe('🚀');
  });

  test('Deve deletar uma categoria (DELETE /categorias/:id)', async () => {
    const insert = db.prepare('INSERT INTO categorias (nome, tipo_categoria) VALUES (?, ?)').run('Para Deletar', 1);
    const id = insert.lastInsertRowid;

    const res = await request(app).delete(`/categorias/${id}`);
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
    expect(row).toBeUndefined();
  });

  test('Deve retornar erro 400 se nome estiver ausente no POST', async () => {
    const res = await request(app)
      .post('/categorias')
      .send({ tipo_categoria: 1 });
    expect(res.status).toBe(400);
  });

});
