import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';

describe('Rotas de Transações (Fluxos Completos)', () => {
  
  beforeAll(async () => {
    // Setup de domínios obrigatórios no PostgreSQL
    await db.query("INSERT INTO categorias (id, nome, direcao) VALUES (1, 'Aluguel', 'gasto') ON CONFLICT (id) DO NOTHING");
    await db.query("INSERT INTO contas (id, nome, tipo) VALUES (1, 'Banco', 'carteira') ON CONFLICT (id) DO NOTHING");
  });

  const clearTables = async () => {
    await db.query('DELETE FROM transacoes');
    await db.query('DELETE FROM recorrencias');
  };

  test('Deve listar os períodos (meses/anos) disponíveis (GET /transacoes/periodos)', async () => {
    await clearTables();
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
      ['T1', 10, '2026-01-10', 1, 1, 'avulsa', 'gasto']);
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
      ['T2', 20, '2026-02-15', 1, 1, 'avulsa', 'gasto']);
    
    const res = await request(app).get('/transacoes/periodos');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('year');
    expect(res.body[0]).toHaveProperty('month');
  });

  test('Deve filtrar transações por tipo (GET /transacoes?tipo=avulsa)', async () => {
    await clearTables();
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
      ['Avulsa', 10, '2026-03-10', 1, 1, 'avulsa', 'gasto']);
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
      ['Fixa', 20, '2026-03-11', 1, 1, 'fixa', 'gasto']);

    const res = await request(app).get('/transacoes?tipo=avulsa');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].descricao).toBe('Avulsa');
  });

  test('Deve filtrar transações por intervalo de datas (GET /transacoes?dateFrom=...&dateTo=...)', async () => {
    await clearTables();
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", ['T1', 10, '2026-03-01', 1, 1, 'avulsa', 'gasto']);
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", ['T2', 20, '2026-03-15', 1, 1, 'avulsa', 'gasto']);
    await db.query("INSERT INTO transacoes (descricao, valor, data, categoria_id, conta_id, tipo, direcao) VALUES ($1, $2, $3, $4, $5, $6, $7)", ['T3', 30, '2026-04-01', 1, 1, 'avulsa', 'gasto']);

    const res = await request(app).get('/transacoes?dateFrom=2026-03-01&dateTo=2026-03-31');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('Deve criar uma transação AVULSA (POST /transacoes)', async () => {
    await clearTables();
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
    
    const countRes = await db.query('SELECT COUNT(*) as c FROM transacoes');
    expect(Number(countRes.rows[0].c)).toBe(1);
    
    const transRes = await db.query('SELECT * FROM transacoes LIMIT 1');
    const trans = transRes.rows[0];
    expect(trans.recorrencia_id).toBeNull();
    expect(trans.tipo).toBe('avulsa');
  });

  test('Deve criar uma transação FIXA (120 meses)', async () => {
    await clearTables();
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
    const countRes = await db.query('SELECT COUNT(*) as c FROM transacoes');
    expect(Number(countRes.rows[0].c)).toBe(120);

    const recRes = await db.query('SELECT * FROM recorrencias WHERE id = $1', [res.body.recorrencia_id]);
    expect(recRes.rows[0].tipo).toBe('fixa');
  });

  test('Deve criar uma transação PARCELADA (5 vezes)', async () => {
    await clearTables();
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
    const countRes = await db.query('SELECT COUNT(*) as c FROM transacoes');
    expect(Number(countRes.rows[0].c)).toBe(5);

    const transRes = await db.query('SELECT * FROM transacoes ORDER BY data ASC');
    const trans = transRes.rows;
    expect(trans[0].parcela_atual).toBe(1);
    expect(trans[4].parcela_atual).toBe(5);
    expect(Number(trans[0].valor)).toBe(200); // 1000 / 5
  });

  test('Deve excluir transação individual', async () => {
    await clearTables();
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
    const res = await db.query('SELECT * FROM transacoes WHERE id = $1', [id]);
    expect(res.rows.length).toBe(0);
  });

  test('Deve excluir transação e todas as futuras da recorrência (excluirFuturas=true)', async () => {
    await clearTables();
    await request(app)
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
    
    const midTransRes = await db.query('SELECT id FROM transacoes WHERE data = $1', ['2026-03-01']);
    const midTrans = midTransRes.rows[0];
    
    const countBefore = (await db.query('SELECT COUNT(*) as c FROM transacoes')).rows[0].c;
    expect(Number(countBefore)).toBe(120);

    await request(app).delete(`/transacoes/${midTrans.id}?excluirFuturas=true`);
    
    const countAfter = (await db.query('SELECT COUNT(*) as c FROM transacoes')).rows[0].c;
    // Tinha 120. Março é a 3ª parcela. Exclui Março e todas as 117 seguintes. Sobram 2 (Janeiro e Fevereiro).
    expect(Number(countAfter)).toBe(2);
  });

  test('Deve atualizar uma transação (PUT /transacoes/:id)', async () => {
    await clearTables();
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
    const transRes = await db.query('SELECT * FROM transacoes WHERE id = $1', [id]);
    const trans = transRes.rows[0];
    expect(trans.descricao).toBe('Atualizada');
    expect(Number(trans.valor)).toBe(150);
  });

  test('Deve retornar 400 se faltar campos obrigatórios no POST', async () => {
    const res = await request(app)
      .post('/transacoes')
      .send({ descricao: 'Incompleto' });
    expect(res.status).toBe(400);
  });

});
