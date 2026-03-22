/**
 * saldo.routes.js
 * Rota para cálculo do saldo acumulado por método de pagamento.
 * Prefixo: /saldo-acumulado
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /saldo-acumulado?dateTo=YYYY-MM-DD
router.get('/', (req, res) => {
  try {
    const { dateTo } = req.query;
    if (!dateTo) return res.status(400).json({ ok: false, error: 'dateTo is required' });

    const sql = `
      SELECT
        m.nome as metodo,
        SUM(CASE WHEN t.direcao_id = 2 THEN t.valor ELSE 0 END) as receitas,
        SUM(CASE WHEN t.direcao_id = 1 THEN t.valor ELSE 0 END) as gastos
      FROM transacoes t
      LEFT JOIN metodos_pagamento m ON t.metodo_pagamento_id = m.id
      WHERE t.data < ?
      GROUP BY m.nome
    `;

    const rows = db.prepare(sql).all(dateTo);

    let saldoTotal = 0;
    const saldosMetodos = {};
    for (const row of rows) {
      const rec = row.receitas || 0;
      const gas = row.gastos || 0;
      const saldo_metodo = Number((rec - gas).toFixed(2));
      saldoTotal += saldo_metodo;
      saldosMetodos[row.metodo || 'Outros'] = saldo_metodo;
    }

    res.json({
      saldo_acumulado: Number(saldoTotal.toFixed(2)),
      saldos_metodos: saldosMetodos,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
