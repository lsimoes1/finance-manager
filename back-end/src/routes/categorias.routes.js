/**
 * categorias.routes.js
 * Rotas CRUD para categorias de transação.
 * Prefixo: /categorias
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /categorias?tipo_categoria=1
router.get('/', async (req, res) => {
  try {
    const { tipo_categoria } = req.query;
    let sql = 'SELECT id, nome, direcao, icone FROM categorias';
    const params = [];

    if (tipo_categoria) {
      // Mapeia 1 -> receita, 2 -> gasto (compatibilidade com front antigo)
      const direcao = Number(tipo_categoria) === 1 ? 'receita' : 'gasto';
      sql += ' WHERE direcao = $1';
      params.push(direcao);
    }
    sql += ' ORDER BY nome ASC';

    const result = await db.query(sql, params);
    
    // Converte de volta para tipo_categoria numérico para o frontend não quebrar agora
    const rows = result.rows.map(r => ({
      ...r,
      tipo_categoria: r.direcao === 'receita' ? 1 : 2
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /categorias
router.post('/', async (req, res) => {
  try {
    const { nome, tipo_categoria, icone } = req.body;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    // Mapeia entrada numérica para Enum
    const direcao = Number(tipo_categoria) === 1 ? 'receita' : 'gasto';
    
    const sql = 'INSERT INTO categorias (nome, direcao, icone) VALUES ($1, $2, $3) RETURNING id';
    const result = await db.query(sql, [nome, direcao, icone || '🏷️']);
    
    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /categorias/:id
router.put('/:id', async (req, res) => {
  try {
    const { nome, tipo_categoria, icone } = req.body;
    const { id } = req.params;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    const direcao = Number(tipo_categoria) === 1 ? 'receita' : 'gasto';
    
    const sql = 'UPDATE categorias SET nome = $1, direcao = $2, icone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4';
    await db.query(sql, [nome, direcao, icone || '🏷️', id]);
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /categorias/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM categorias WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
