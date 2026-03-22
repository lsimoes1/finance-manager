/**
 * investimentos.routes.js
 * Rotas CRUD para investimentos.
 * Prefixo: /investimentos
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /investimentos
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM investimentos ORDER BY data DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /investimentos
router.post('/', (req, res) => {
  try {
    const { tipo, nome, valor, data } = req.body;
    if (!tipo || !nome || !valor || !data) {
      return res.status(400).json({ ok: false, error: 'campos mínimos inválidos' });
    }
    const result = db.prepare('INSERT INTO investimentos (tipo, nome, valor, data) VALUES (?, ?, ?, ?)').run(tipo, nome, valor, data);
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /investimentos/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM investimentos WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
