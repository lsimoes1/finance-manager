/**
 * metodos-pagamento.routes.js
 * Rotas CRUD para métodos de pagamento.
 * Prefixo: /metodos-pagamento
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /metodos-pagamento
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM metodos_pagamento ORDER BY nome ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /metodos-pagamento
router.post('/', (req, res) => {
  try {
    const { nome, icone, tipo } = req.body;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    const tipoVal = tipo || 'padrao';
    const result = db.prepare('INSERT INTO metodos_pagamento (nome, icone, tipo) VALUES (?, ?, ?)').run(nome, icone || '🪙', tipoVal);
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /metodos-pagamento/:id
router.put('/:id', (req, res) => {
  try {
    const { nome, icone, tipo } = req.body;
    const { id } = req.params;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    const tipoVal = tipo || 'padrao';
    db.prepare('UPDATE metodos_pagamento SET nome = ?, icone = ?, tipo = ? WHERE id = ?').run(nome, icone || '🪙', tipoVal, id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /metodos-pagamento/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM metodos_pagamento WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
