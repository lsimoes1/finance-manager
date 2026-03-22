import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/database.js';
import { runMigrations } from '../src/db/migrations.js';

describe('Rota de Saldo (Cálculo Acumulado)', () => {
  
  beforeAll(() => {
    runMigrations();
    // Setup de domínios
    db.prepare("INSERT OR IGNORE INTO categorias (id, nome, tipo_categoria) VALUES (1, 'Teste', 2)").run();
    db.prepare("INSERT OR IGNORE INTO metodos_pagamento (id, nome, tipo) VALUES (1, 'Nubank', 'padrao')").run();
    db.prepare("INSERT OR IGNORE INTO metodos_pagamento (id, nome, tipo) VALUES (2, 'Inter', 'padrao')").run();
  });

  afterAll((done) => {
    db.close();
    done();
  });

  const clearTransactions = () => {
    db.prepare('DELETE FROM transacoes').run();
    db.prepare('DELETE FROM recorrencias').run();
    db.prepare('DELETE FROM categorias').run();
    db.prepare('DELETE FROM metodos_pagamento').run();
  };

  test('Deve calcular o saldo acumulado corretamente', async () => {
    clearTransactions();

    // Re-setup dos domínios após limpeza
    db.prepare("INSERT INTO categorias (id, nome, tipo_categoria) VALUES (1, 'Teste', 2)").run();
    db.prepare("INSERT INTO metodos_pagamento (id, nome, tipo) VALUES (1, 'Nubank', 'padrao')").run();
    db.prepare("INSERT INTO metodos_pagamento (id, nome, tipo) VALUES (2, 'Inter', 'padrao')").run();

    // 1. Receita no Nubank (+1000)
    db.prepare(`
      INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Salário', 1000, '2026-03-01', 1, 1, 1, 2);

    // 2. Gasto no Nubank (-200)
    db.prepare(`
      INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Mercado', 200, '2026-03-02', 1, 1, 1, 1);

    // 3. Receita no Inter (+500)
    db.prepare(`
      INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Freelance', 500, '2026-03-03', 1, 2, 1, 2);

    // 4. Gasto no Inter (-50)
    db.prepare(`
      INSERT INTO transacoes (descricao, valor, data, categoria_id, metodo_pagamento_id, tipo_id, direcao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Lanche', 50, '2026-03-04', 1, 2, 1, 1);

    // Saldo esperado até 2026-03-05: 
    // Nubank: 1000 - 200 = 800
    // Inter: 500 - 50 = 450
    // Total: 1250

    const res = await request(app).get('/saldo-acumulado?dateTo=2026-03-05');
    
    expect(res.status).toBe(200);
    expect(res.body.saldo_acumulado).toBe(1250);
    expect(res.body.saldos_metodos.Nubank).toBe(800);
    expect(res.body.saldos_metodos.Inter).toBe(450);
  });

  test('Deve retornar erro 400 se dateTo estiver ausente', async () => {
    const res = await request(app).get('/saldo-acumulado');
    expect(res.status).toBe(400);
  });

});
