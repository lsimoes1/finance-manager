/**
 * transacoes.routes.js
 * Rotas para gerenciamento de transações (avulsas, fixas, parceladas).
 * Prefixo: /transacoes
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /transacoes/periodos
// Deve vir antes de GET /transacoes/:id para evitar conflito de rota
router.get('/periodos', async (req, res) => {
  try {
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const sql = `
      SELECT DISTINCT TO_CHAR(data, 'YYYY') as year, TO_CHAR(data, 'MM') as month
      FROM transacoes
      WHERE TO_CHAR(data, 'YYYY-MM') <= $1
      ORDER BY year DESC, month DESC
    `;
    const result = await db.query(sql, [currentYearMonth]);
    const rows = result.rows;

    const periods = rows.map(r => ({
      year: r.year,
      month: r.month,
      value: `${r.year}-${r.month}`,
      label: `${r.month}/${r.year}`,
    }));

    res.json(periods);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /transacoes?tipo=&period=&dateFrom=&dateTo=
router.get('/', async (req, res) => {
  try {
    const { tipo, period, dateFrom, dateTo } = req.query;

    let baseSql = `
      SELECT
        t.*,
        c.nome  as categoria,
        c.icone as categoria_icone,
        m.nome  as "metodoPagamento",
        m.icone as metodo_icone,
        m.tipo  as metodo_tipo,
        t.tipo::text as tipo_name,
        t.direcao::text as direcao_name,
        rec.total_parcelas as recorrencia_total_parcelas,
        rec.valor          as recorrencia_valor
      FROM transacoes t
      LEFT JOIN categorias          c   ON t.categoria_id = c.id
      LEFT JOIN contas              m   ON t.conta_id     = m.id
      LEFT JOIN recorrencias        rec ON t.recorrencia_id = rec.id
    `;

    const whereClauses = [];
    const params = [];

    if (tipo) {
      whereClauses.push('t.tipo = $' + (params.length + 1));
      params.push(tipo);
    }

    if (dateFrom && dateTo) {
      whereClauses.push('t.data >= $' + (params.length + 1) + ' AND t.data <= $' + (params.length + 2));
      params.push(dateFrom, dateTo);
    } else if (period) {
      const [y, m] = String(period).split('-');
      whereClauses.push("TO_CHAR(t.data, 'YYYY') = $" + (params.length + 1) + " AND TO_CHAR(t.data, 'MM') = $" + (params.length + 2));
      params.push(y, m);
    }

    const whereSql = whereClauses.length ? ' WHERE ' + whereClauses.join(' AND ') : '';
    const sql = baseSql + whereSql + ' ORDER BY t.data DESC';
    
    const result = await db.query(sql, params);
    
    // Mapeamento de retrocompatibilidade para o Front
    const rows = result.rows.map(r => ({
      ...r,
      metodo_pagamento_id: r.conta_id,
      tipo_id: r.tipo === 'avulsa' ? 1 : (r.tipo === 'fixa' ? 2 : 3),
      direcao_id: r.direcao === 'gasto' ? 1 : (r.direcao === 'receita' ? 2 : 3)
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /transacoes
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      descricao,
      valor,
      data,
      categoria_id,
      metodo_pagamento_id,
      parcela_atual = null,
      recorrencia_id = null,
      tipo,           // 'fixa' | 'parcelada' | undefined (avulsa)
      total_parcelas,
      dia_vencimento,
      direcao,        // 'gasto' | 'receita'
      direcao_id,
    } = req.body;

    if (!descricao || !valor || !data || !categoria_id || !metodo_pagamento_id) {
      return res.status(400).json({ ok: false, error: 'missing required fields' });
    }

    await client.query('BEGIN');

    // -------------------------------------------------
    // Transação recorrente (fixa ou parcelada)
    // -------------------------------------------------
    if (tipo === 'fixa' || tipo === 'parcelada') {
      const dv = dia_vencimento ?? new Date(data).getDate();
      const parcelas_restantes = tipo === 'parcelada' ? (total_parcelas ?? 1) : null;
      const dirVal = direcao || (Number(direcao_id) === 2 ? 'receita' : 'gasto');

      const recSql = `
        INSERT INTO recorrencias
          (descricao, valor, categoria_id, conta_id, dia_vencimento, tipo, direcao, total_parcelas, parcelas_restantes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const recResult = await client.query(recSql, [
        descricao, valor, categoria_id, metodo_pagamento_id, dv, tipo, dirVal, total_parcelas ?? null, parcelas_restantes
      ]);

      const newRecId = recResult.rows[0].id;

      // FIXA: gera 120 meses (10 anos)
      if (tipo === 'fixa') {
        const [yyyyOrig, mmOrig] = data.split('-');
        const createdIds = [];

        for (let i = 0; i < 120; i++) {
          const targetMonth = (Number(mmOrig) - 1) + i;
          const targetYear  = Number(yyyyOrig) + Math.floor(targetMonth / 12);
          const monthIndex  = targetMonth % 12;
          const daysInMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
          const actualDay   = Math.min(dv, daysInMonth);
          const dateStr     = `${targetYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

          const insSql = `
            INSERT INTO transacoes
              (descricao, valor, data, categoria_id, conta_id, parcela_atual, recorrencia_id, tipo, direcao)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
          `;
          const r = await client.query(insSql, [descricao, valor, dateStr, categoria_id, metodo_pagamento_id, null, newRecId, 'fixa', dirVal]);
          createdIds.push(r.rows[0].id);
        }

        await client.query('COMMIT');
        return res.status(201).json({ ok: true, recorrencia_id: newRecId, transacao_ids: createdIds });
      }

      // PARCELADA: distribui o valor total entre as parcelas
      const total = Number(total_parcelas) || 1;
      const parcelValueBase = Number((Number(valor) / total).toFixed(2));
      const remainder = Number((Number(valor) - parcelValueBase * total).toFixed(2));
      const [pY, pM] = data.split('-');
      const createdIds = [];

      for (let i = 1; i <= total; i++) {
        const targetMonth = (Number(pM) - 1) + (i - 1);
        const targetYear  = Number(pY) + Math.floor(targetMonth / 12);
        const monthIndex  = targetMonth % 12;
        const daysInMonth = new Date(targetYear, monthIndex + 1, 0).getDate();
        const actualDay   = Math.min(dv, daysInMonth);
        const dateStr     = `${targetYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;

        const isLast  = i === total;
        const parcVal = isLast ? Number((parcelValueBase + remainder).toFixed(2)) : parcelValueBase;

        const insSql = `
          INSERT INTO transacoes
            (descricao, valor, data, categoria_id, conta_id, parcela_atual, recorrencia_id, tipo, direcao)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `;
        const r = await client.query(insSql, [descricao, parcVal, dateStr, categoria_id, metodo_pagamento_id, i, newRecId, 'parcelada', dirVal]);
        createdIds.push(r.rows[0].id);
      }

      await client.query('COMMIT');
      return res.status(201).json({ ok: true, recorrencia_id: newRecId, parcelas: total, transacao_ids: createdIds });
    }

    // -------------------------------------------------
    // Transação avulsa
    // -------------------------------------------------
    const dirVal = direcao || (Number(direcao_id) === 2 ? 'receita' : 'gasto');
    const insSql = `
      INSERT INTO transacoes
        (descricao, valor, data, categoria_id, conta_id, parcela_atual, recorrencia_id, tipo, direcao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const result = await client.query(insSql, [
      descricao, valor, data, categoria_id, metodo_pagamento_id,
      parcela_atual, recorrencia_id, 'avulsa', dirVal
    ]);

    await client.query('COMMIT');
    res.status(201).json({ ok: true, id: result.rows[0].id, transacao_ids: [result.rows[0].id] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: String(err) });
  } finally {
    client.release();
  }
});

// POST /transacoes/transferencia
router.post('/transferencia', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      valor,
      data,
      conta_origem_id,
      conta_destino_id,
      descricao
    } = req.body;

    if (!valor || !data || !conta_origem_id || !conta_destino_id) {
      return res.status(400).json({ ok: false, error: 'missing required fields' });
    }

    await client.query('BEGIN');

    const transferId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    // 1. Saída da conta de origem
    const sqlSaida = `
      INSERT INTO transacoes
        (descricao, valor, data, conta_id, tipo, direcao, metadata)
      VALUES ($1, $2, $3, $4, 'avulsa', 'transferencia_saida', $5)
      RETURNING id
    `;
    const resSaida = await client.query(sqlSaida, [
      descricao || 'Transferência (Saída)',
      valor, data, conta_origem_id, JSON.stringify({ transfer_id: transferId, target_conta_id: conta_destino_id })
    ]);

    // 2. Entrada na conta de destino
    const sqlEntrada = `
      INSERT INTO transacoes
        (descricao, valor, data, conta_id, tipo, direcao, metadata)
      VALUES ($1, $2, $3, $4, 'avulsa', 'transferencia_entrada', $5)
      RETURNING id
    `;
    const resEntrada = await client.query(sqlEntrada, [
      descricao || 'Transferência (Entrada)',
      valor, data, conta_destino_id, JSON.stringify({ transfer_id: transferId, source_conta_id: conta_origem_id })
    ]);

    await client.query('COMMIT');
    res.status(201).json({
      ok: true,
      transacao_ids: [resSaida.rows[0].id, resEntrada.rows[0].id]
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: String(err) });
  } finally {
    client.release();
  }
});

// PUT /transacoes/:id
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const {
      descricao,
      valor,
      data,
      categoria_id,
      metodo_pagamento_id,
      parcela_atual,
      tipo,           // 'fixa' | 'parcelada' (opcional para migração)
      total_parcelas, // (opcional para migração)
    } = req.body;

    await client.query('BEGIN');

    // Busca a transação atual para saber se ela tem recorrência
    const currentRes = await client.query('SELECT * FROM transacoes WHERE id = $1', [id]);
    const currentTrans = currentRes.rows[0];
    
    if (!currentTrans) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'transacao not found' });
    }

    // Se o tipo foi enviado e há uma recorrência vinculada, verificamos se houve mudança de tipo
    if (tipo && currentTrans.recorrencia_id) {
      const currentTipo = currentTrans.tipo; // 'avulsa', 'fixa', 'parcelada'
      const newTipo = tipo; // 'parcelada' ou 'fixa'

      if (newTipo !== currentTipo && newTipo !== 'avulsa') {
        const recId = currentTrans.recorrencia_id;

        // 1. Atualiza a tabela de recorrências
        const tp = newTipo === 'parcelada' ? (total_parcelas || 1) : null;
        const pr = newTipo === 'parcelada' ? tp : null;
        await client.query(`
          UPDATE recorrencias
          SET tipo = $1, total_parcelas = $2, parcelas_restantes = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newTipo, tp, pr, recId]);

        // 2. Atualiza todas as transações dessa recorrência
        if (newTipo === 'parcelada') {
          const allTransRes = await client.query('SELECT id FROM transacoes WHERE recorrencia_id = $1 ORDER BY data ASC, id ASC', [recId]);
          const allTrans = allTransRes.rows;
          
          let i = 1;
          for (const t of allTrans) {
            if (i <= tp) {
              await client.query('UPDATE transacoes SET tipo = \'parcelada\', parcela_atual = $1 WHERE id = $2', [i, t.id]);
            } else {
              await client.query('DELETE FROM transacoes WHERE id = $1', [t.id]);
            }
            i++;
          }
        } else if (newTipo === 'fixa') {
          await client.query('UPDATE transacoes SET tipo = \'fixa\', parcela_atual = NULL WHERE recorrencia_id = $1', [recId]);
        }
      }
    }

    // Atualização padrão dos campos da transação individual
    let finalParcela = (tipo === 'fixa') ? null : (parcela_atual ?? currentTrans.parcela_atual);

    if (tipo === 'parcelada' && currentTrans.recorrencia_id) {
      const updatedRes = await client.query('SELECT parcela_atual FROM transacoes WHERE id = $1', [id]);
      if (updatedRes.rows[0]) finalParcela = updatedRes.rows[0].parcela_atual;
    }

    const updateSql = `
      UPDATE transacoes
      SET descricao = $1, valor = $2, data = $3, categoria_id = $4, conta_id = $5, parcela_atual = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `;
    await client.query(updateSql, [descricao, valor, data, categoria_id, metodo_pagamento_id, finalParcela, id]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: String(err) });
  } finally {
    client.release();
  }
});

// DELETE /transacoes/:id?deleteAll=true
router.delete('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { deleteAll, excluirFuturas } = req.query;

    await client.query('BEGIN');

    if (deleteAll === 'true' || deleteAll === '1') {
      const tRes = await client.query('SELECT recorrencia_id FROM transacoes WHERE id = $1', [id]);
      const t = tRes.rows[0];
      if (t && t.recorrencia_id) {
        await client.query('DELETE FROM transacoes WHERE recorrencia_id = $1', [t.recorrencia_id]);
        await client.query('DELETE FROM recorrencias WHERE id = $1', [t.recorrencia_id]);
        await client.query('COMMIT');
        return res.json({ ok: true, deletedAll: true });
      }
    }

    if (excluirFuturas === 'true' || excluirFuturas === '1') {
      const tRes = await client.query('SELECT recorrencia_id, data FROM transacoes WHERE id = $1', [id]);
      const t = tRes.rows[0];
      if (t && t.recorrencia_id) {
        await client.query('DELETE FROM transacoes WHERE recorrencia_id = $1 AND data >= $2', [t.recorrencia_id, t.data]);
        await client.query('COMMIT');
        return res.json({ ok: true, deletedFuturas: true });
      }
    }

    await client.query('DELETE FROM transacoes WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ ok: false, error: String(err) });
  } finally {
    client.release();
  }
});

export default router;
