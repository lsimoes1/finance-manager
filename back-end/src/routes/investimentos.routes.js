/**
 * investimentos.routes.js
 * Rotas CRUD para investimentos.
 * Prefixo: /investimentos
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /investimentos
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM investimentos ORDER BY data DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /investimentos
router.post('/', async (req, res) => {
  try {
    const { tipo, nome, valor, data, conta_id } = req.body;
    if (!tipo || !nome || !valor || !data) {
      return res.status(400).json({ ok: false, error: 'campos mínimos inválidos' });
    }
    
    const sql = 'INSERT INTO investimentos (tipo, nome, valor, data, conta_id) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const result = await db.query(sql, [tipo, nome, valor, data, conta_id || null]);
    
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /investimentos/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM investimentos WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
