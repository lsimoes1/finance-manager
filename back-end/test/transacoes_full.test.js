import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';

describe('Rotas de Transações (Fluxos Completos)', () => {
  
  beforeAll(() => {
    runMigrations();
    // Setup de domínios obrigatórios
    db.prepare("INSERT OR IGNORE INTO categorias (id, nome, tipo_categoria) VALUES (1, 'Aluguel', 2)").run();
    db.prepare("INSERT OR IGNORE INTO metodos_pagamento (id, nome, tipo) VALUES (1, 'Banco', 'padrao')").run();
  });

  test('Deve listar os períodos (meses/anos) disponíveis (GET /transacoes/periodos)', async () => {
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('T1', 10, '2026-01-10', 1, 1, 1, 1);
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('T2', 20, '2026-02-15', 1, 1, 1, 1);
    
    const res = await request(app).get('/transacoes/periodos');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('year');
    expect(res.body[0]).toHaveProperty('month');
  });

  test('Deve filtrar transações por tipo (GET /transacoes?tipo=avulsa)', async () => {
    clearTables();
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('Avulsa', 10, '2026-03-10', 1, 1, 1, 1);
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('Fixa', 20, '2026-03-11', 1, 1, 2, 1);

    const res = await request(app).get('/transacoes?tipo=avulsa');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].descricao).toBe('Avulsa');
  });

  test('Deve filtrar transações por intervalo de datas (GET /transacoes?dateFrom=...&dateTo=...)', async () => {
    clearTables();
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('T1', 10, '2026-03-01', 1, 1, 1, 1);
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('T2', 20, '2026-03-15', 1, 1, 1, 1);
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('T3', 30, '2026-04-01', 1, 1, 1, 1);

    const res = await request(app).get('/transacoes?dateFrom=2026-03-01&dateTo=2026-03-31');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('Deve filtrar transações por período (GET /transacoes?period=2026-03)', async () => {
    clearTables();
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('MAR', 10, '2026-03-10', 1, 1, 1, 1);
    db.prepare("INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run('ABR', 20, '2026-04-10', 1, 1, 1, 1);

    const res = await request(app).get('/transacoes?period=2026-03');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].descricao).toBe('MAR');
  });

  afterAll((done) => {
    db.close();
    done();
  });

  const clearTables = () => {
    db.prepare('DELETE FROM transacoes').run();
    db.prepare('DELETE FROM recorrencias').run();
  };

  test('Deve criar uma transação AVULSA (POST /transacoes)', async () => {
    clearTables();
    const res = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Almoço',
        valor: 50,
        data: '2026-03-10',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'avulsa'
      });

    expect(res.status).toBe(201);
    expect(res.body.transacao_ids.length).toBe(1);
    
    const count = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    expect(count).toBe(1);
    
    const trans = db.prepare('SELECT * FROM transacoes LIMIT 1').get();
    expect(trans.recorrencia_id).toBeNull();
    expect(trans.tipo_id).toBe(1);
  });

  test('Deve criar uma transação FIXA (120 meses)', async () => {
    clearTables();
    const res = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Internet',
        valor: 100,
        data: '2026-03-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa',
        dia_vencimento: 5
      });

    expect(res.status).toBe(201);
    const count = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    expect(count).toBe(120);

    const rec = db.prepare('SELECT * FROM recorrencias WHERE id = ?').get(res.body.recorrencia_id);
    expect(rec.tipo_id).toBe(2);
  });

  test('Deve criar uma transação PARCELADA (5 vezes)', async () => {
    clearTables();
    const res = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Celular',
        valor: 1000,
        data: '2026-03-15',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'parcelada',
        total_parcelas: 5,
        dia_vencimento: 15
      });

    expect(res.status).toBe(201);
    const count = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    expect(count).toBe(5);

    const trans = db.prepare('SELECT * FROM transacoes ORDER BY data ASC').all();
    expect(trans[0].parcela_atual).toBe(1);
    expect(trans[4].parcela_atual).toBe(5);
    expect(trans[0].valor).toBe(200); // 1000 / 5
  });

  test('Deve excluir transação individual', async () => {
    clearTables();
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Teste individual',
        valor: 10,
        data: '2026-03-10',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'avulsa'
      });
    const id = resCreate.body.transacao_ids[0];

    await request(app).delete(`/transacoes/${id}`);
    const row = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    expect(row).toBeUndefined();
  });

  test('Deve excluir transação e todas as futuras da recorrência (excluirFuturas=true)', async () => {
    clearTables();
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Streaming',
        valor: 30,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa',
        dia_vencimento: 1
      });
    
    // Pega uma transação do meio (ex: março)
    const midTrans = db.prepare('SELECT id FROM transacoes WHERE data = ?').get('2026-03-01');
    
    const countBefore = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    expect(countBefore).toBe(120);

    await request(app).delete(`/transacoes/${midTrans.id}?excluirFuturas=true`);
    
    const countAfter = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    // Tinha 120. Março é a 3ª parcela. Exclui Março e todas as 117 seguintes. Sobram 2 (Janeiro e Fevereiro).
    expect(countAfter).toBe(2);
  });

  test('Deve excluir todas as transações da recorrência (deleteAll=true)', async () => {
    clearTables();
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Aluguel Fixo',
        valor: 1000,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa'
      });
    const id = resCreate.body.transacao_ids[0];

    await request(app).delete(`/transacoes/${id}?deleteAll=true`);
    const count = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    expect(count).toBe(0);
    const recCount = db.prepare('SELECT COUNT(*) as c FROM recorrencias').get().c;
    expect(recCount).toBe(0);
  });

  test('Deve atualizar uma transação (PUT /transacoes/:id)', async () => {
    clearTables();
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Original',
        valor: 100,
        data: '2026-03-10',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'avulsa'
      });
    const id = resCreate.body.transacao_ids[0];

    const resUpdate = await request(app)
      .put(`/transacoes/${id}`)
      .send({
        descricao: 'Atualizada',
        valor: 150,
        data: '2026-03-11',
        categoria_id: 1,
        metodo_pagamento_id: 1
      });

    expect(resUpdate.status).toBe(200);
    const trans = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    expect(trans.descricao).toBe('Atualizada');
    expect(trans.valor).toBe(150);
  });

  test('Deve migrar transação de FIXA para PARCELADA', async () => {
    clearTables();
    // Cria fixa
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Streaming Fixa',
        valor: 30,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa'
      });
    const id = resCreate.body.transacao_ids[0];

    // Migra para parcelada em 3x
    await request(app)
      .put(`/transacoes/${id}`)
      .send({
        descricao: 'Streaming Parcelado',
        valor: 30,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'parcelada',
        total_parcelas: 3
      });
    
    const count = db.prepare('SELECT COUNT(*) as c FROM transacoes').get().c;
    expect(count).toBe(3);
    const trans = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    expect(trans.tipo_id).toBe(3);
    expect(trans.parcela_atual).toBe(1);
  });

  test('Deve migrar transação de PARCELADA para FIXA', async () => {
    clearTables();
    // Cria parcelada 3x
    const resCreate = await request(app)
      .post('/transacoes')
      .send({
        descricao: 'Suplemento Parcelado',
        valor: 300,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'parcelada',
        total_parcelas: 3
      });
    const id = resCreate.body.transacao_ids[0];

    // Migra para fixa
    await request(app)
      .put(`/transacoes/${id}`)
      .send({
        descricao: 'Suplemento Fixo',
        valor: 100,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1,
        tipo: 'fixa'
      });
    
    const trans = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    expect(trans.tipo_id).toBe(2);
    expect(trans.parcela_atual).toBeNull();
  });

  test('Deve retornar 400 se faltar campos obrigatórios no POST', async () => {
    const res = await request(app)
      .post('/transacoes')
      .send({ descricao: 'Incompleto' });
    expect(res.status).toBe(400);
  });

  test('Deve retornar 404 se transação não existir no PUT', async () => {
    const res = await request(app)
      .put('/transacoes/99999')
      .send({
        descricao: 'X',
        valor: 1,
        data: '2026-01-01',
        categoria_id: 1,
        metodo_pagamento_id: 1
      });
    expect(res.status).toBe(404);
  });

});
