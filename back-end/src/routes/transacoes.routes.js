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
router.get('/periodos', (req, res) => {
  try {
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const rows = db.prepare(`
      SELECT DISTINCT strftime('%Y', data) as year, strftime('%m', data) as month
      FROM transacoes
      WHERE strftime('%Y-%m', data) <= ?
      ORDER BY year DESC, month DESC
    `).all(currentYearMonth);

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
router.get('/', (req, res) => {
  try {
    const { tipo, period, dateFrom, dateTo } = req.query;

    let baseSql = `
      SELECT
        t.*,
        c.nome  as categoria,
        c.icone as categoria_icone,
        m.nome  as metodoPagamento,
        m.icone as metodo_icone,
        m.tipo  as metodo_tipo,
        tt.nome as tipo_name,
        td.nome as direcao_name,
        rec.total_parcelas as recorrencia_total_parcelas,
        rec.valor          as recorrencia_valor
      FROM transacoes t
      LEFT JOIN categorias          c   ON t.categoria_id        = c.id
      LEFT JOIN metodos_pagamento   m   ON t.metodo_pagamento_id = m.id
      LEFT JOIN transacao_tipos     tt  ON t.tipo_id             = tt.id
      LEFT JOIN transacao_direcoes  td  ON t.direcao_id          = td.id
      LEFT JOIN recorrencias        rec ON t.recorrencia_id      = rec.id
    `;

    const whereClauses = [];
    const params = [];

    if (tipo) {
      whereClauses.push('tt.nome = ?');
      params.push(tipo);
    }

    // Filtro por intervalo exato de datas (calculado pelo front com base no dia de início configurado)
    if (dateFrom && dateTo) {
      whereClauses.push('t.data >= ? AND t.data <= ?');
      params.push(dateFrom, dateTo);
    } else if (period) {
      // Fallback: filtro por mês/ano simples (retrocompatibilidade)
      const [y, m] = String(period).split('-');
      whereClauses.push("strftime('%Y', t.data) = ? AND strftime('%m', t.data) = ?");
      params.push(y, m);
    }

    const whereSql = whereClauses.length ? ' WHERE ' + whereClauses.join(' AND ') : '';
    const sql = baseSql + whereSql + ' ORDER BY t.data DESC';
    const rows = db.prepare(sql).all(...params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /transacoes
router.post('/', (req, res) => {
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

    // -------------------------------------------------
    // Transação recorrente (fixa ou parcelada)
    // -------------------------------------------------
    if (tipo === 'fixa' || tipo === 'parcelada') {
      const tipoId = tipo === 'parcelada' ? 3 : 2;
      const dv = dia_vencimento ?? new Date(data).getDate();
      const parcelas_restantes = tipo === 'parcelada' ? (total_parcelas ?? 1) : null;
      const dirId = direcao_id ?? (direcao === 'receita' ? 2 : 1);

      const recResult = db.prepare(`
        INSERT INTO recorrencias
          (descricao, valor, categoria_id, metodo_pagamento_id, dia_vencimento, tipo_id, direcao_id, total_parcelas, parcelas_restantes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(descricao, valor, categoria_id, metodo_pagamento_id, dv, tipoId, dirId, total_parcelas ?? null, parcelas_restantes);

      const newRecId = recResult.lastInsertRowid;

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

          const r = db.prepare(`
            INSERT INTO transacoes
              (descricao, valor, data, categoria_id, metodo_pagamento_id, parcela_atual, recorrencia_id, tipo_id, direcao_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(descricao, valor, dateStr, categoria_id, metodo_pagamento_id, null, newRecId, tipoId, dirId);

          createdIds.push(r.lastInsertRowid);
        }

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

        const r = db.prepare(`
          INSERT INTO transacoes
            (descricao, valor, data, categoria_id, metodo_pagamento_id, parcela_atual, recorrencia_id, tipo_id, direcao_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(descricao, parcVal, dateStr, categoria_id, metodo_pagamento_id, i, newRecId, tipoId, dirId);

        createdIds.push(r.lastInsertRowid);
      }

      return res.status(201).json({ ok: true, recorrencia_id: newRecId, parcelas: total, transacao_ids: createdIds });
    }

    // -------------------------------------------------
    // Transação avulsa (tipo_id = 1)
    // -------------------------------------------------
    const result = db.prepare(`
      INSERT INTO transacoes
        (descricao, valor, data, categoria_id, metodo_pagamento_id, parcela_atual, recorrencia_id, tipo_id, direcao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      descricao, valor, data, categoria_id, metodo_pagamento_id,
      parcela_atual, recorrencia_id, 1,
      direcao_id ?? (direcao === 'receita' ? 2 : 1)
    );

    res.status(201).json({ ok: true, id: result.lastInsertRowid, transacao_ids: [result.lastInsertRowid] });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /transacoes/:id
router.put('/:id', (req, res) => {
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

    // Busca a transação atual para saber se ela tem recorrência
    const currentTrans = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    if (!currentTrans) {
      return res.status(404).json({ ok: false, error: 'transacao not found' });
    }

    // Se o tipo foi enviado e há uma recorrência vinculada, verificamos se houve mudança de tipo
    if (tipo && currentTrans.recorrencia_id) {
      const currentTipoId = currentTrans.tipo_id; // 1=avulsa, 2=fixa, 3=parcelada
      const newTipoId = tipo === 'parcelada' ? 3 : (tipo === 'fixa' ? 2 : currentTipoId);

      if (newTipoId !== currentTipoId && newTipoId !== 1) {
        // --- MIGRAÇÃO DE TIPO DE RECORRÊNCIA ---
        const recId = currentTrans.recorrencia_id;

        // 1. Atualiza a tabela de recorrências
        const tp = newTipoId === 3 ? (total_parcelas || 1) : null;
        const pr = newTipoId === 3 ? tp : null;
        db.prepare(`
          UPDATE recorrencias
          SET tipo_id = ?, total_parcelas = ?, parcelas_restantes = ?
          WHERE id = ?
        `).run(newTipoId, tp, pr, recId);

        // 2. Atualiza todas as transações dessa recorrência
        if (newTipoId === 3) {
          // MUDANDO PARA PARCELADA
          // Carrega todas em ordem de data
          const allTrans = db.prepare('SELECT id FROM transacoes WHERE recorrencia_id = ? ORDER BY data ASC, id ASC').all(recId);
          
          let i = 1;
          for (const t of allTrans) {
            if (i <= tp) {
              db.prepare('UPDATE transacoes SET tipo_id = 3, parcela_atual = ? WHERE id = ?').run(i, t.id);
            } else {
              // Deleta excedentes
              db.prepare('DELETE FROM transacoes WHERE id = ?').run(t.id);
            }
            i++;
          }

          // Se faltarem parcelas, poderíamos gerar aqui, mas vamos manter simples por enquanto:
          // O usuário provavelmente quer converter o que já existe.
        } else if (newTipoId === 2) {
          // MUDANDO PARA FIXA
          db.prepare('UPDATE transacoes SET tipo_id = 2, parcela_atual = NULL WHERE recorrencia_id = ?').run(recId);
          
          // Reutiliza a lógica de "migrateFixasAntigas" se necessário para completar 120 parcelas
          // Por simplicidade, vamos apenas marcar as existentes como fixas. 
          // O Job de migração ou futuras manutenções podem completar se necessário.
        }
      }
    }

    // Atualização padrão dos campos da transação individual
    let finalParcela = (tipo === 'fixa') ? null : (parcela_atual ?? currentTrans.parcela_atual);

    // Se houve migração para parcelada, precisamos pegar o NOVO parcela_atual gerado no loop
    if (tipo === 'parcelada' && currentTrans.recorrencia_id) {
      const updated = db.prepare('SELECT parcela_atual FROM transacoes WHERE id = ?').get(id);
      if (updated) finalParcela = updated.parcela_atual;
    }

    db.prepare(`
      UPDATE transacoes
      SET descricao = ?, valor = ?, data = ?, categoria_id = ?, metodo_pagamento_id = ?, parcela_atual = ?
      WHERE id = ?
    `).run(descricao, valor, data, categoria_id, metodo_pagamento_id, finalParcela, id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /transacoes/:id?deleteAll=true
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { deleteAll, excluirFuturas } = req.query;

    if (deleteAll === 'true' || deleteAll === '1') {
      const t = db.prepare('SELECT recorrencia_id FROM transacoes WHERE id = ?').get(id);
      if (t && t.recorrencia_id) {
        db.prepare('DELETE FROM transacoes WHERE recorrencia_id = ?').run(t.recorrencia_id);
        db.prepare('DELETE FROM recorrencias WHERE id = ?').run(t.recorrencia_id);
        return res.json({ ok: true, deletedAll: true });
      }
    }

    if (excluirFuturas === 'true' || excluirFuturas === '1') {
      const t = db.prepare('SELECT recorrencia_id, data FROM transacoes WHERE id = ?').get(id);
      if (t && t.recorrencia_id) {
        db.prepare('DELETE FROM transacoes WHERE recorrencia_id = ? AND data >= ?').run(t.recorrencia_id, t.data);
        return res.json({ ok: true, deletedFuturas: true });
      }
    }

    db.prepare('DELETE FROM transacoes WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
