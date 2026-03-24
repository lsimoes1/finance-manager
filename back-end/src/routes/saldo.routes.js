/**
 * saldo.routes.js
 * Rota para cálculo do saldo acumulado por conta.
 * Prefixo: /saldo-acumulado
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /saldo-acumulado?dateTo=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { dateTo } = req.query;
    if (!dateTo) return res.status(400).json({ ok: false, error: 'dateTo is required' });

    const sql = `
      SELECT
        c.nome as conta,
        c.tipo as tipo,
        SUM(CASE WHEN t.direcao = 'receita' THEN t.valor ELSE 0 END) as receitas,
        SUM(CASE WHEN t.direcao = 'gasto' THEN t.valor ELSE 0 END) as gastos
      FROM transacoes t
      LEFT JOIN contas c ON t.conta_id = c.id
      WHERE t.data < $1
      GROUP BY c.nome, c.tipo
    `;

    const result = await db.query(sql, [dateTo]);
    const rows = result.rows;

    let saldoLiquido = 0; // Apenas contas do tipo 'carteira'
    const saldosContas = {};
    
    for (const row of rows) {
      const rec = Number(row.receitas) || 0;
      const gas = Number(row.gastos) || 0;
      const saldo_conta = Number((rec - gas).toFixed(2));
      
      // Armazena saldo individual por conta
      saldosContas[row.conta || 'Outros'] = saldo_conta;
      
      // Soma ao total principal apenas se for tipo 'carteira' (liquidez)
      if (row.tipo === 'carteira' || !row.tipo) {
        saldoLiquido += saldo_conta;
      }
    }

    res.json({
      saldo_acumulado: Number(saldoLiquido.toFixed(2)),
      saldos_metodos: saldosContas,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
