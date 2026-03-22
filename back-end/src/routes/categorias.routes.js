/**
 * categorias.routes.js
 * Rotas CRUD para categorias de transação.
 * Prefixo: /categorias
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /categorias?tipo_categoria=1
router.get('/', (req, res) => {
  try {
    const { tipo_categoria } = req.query;
    let sql = 'SELECT * FROM categorias';
    const params = [];

    if (tipo_categoria) {
      sql += ' WHERE tipo_categoria = ?';
      params.push(tipo_categoria);
    }
    sql += ' ORDER BY nome ASC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /categorias
router.post('/', (req, res) => {
  try {
    const { nome, tipo_categoria, icone } = req.body;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    const tipo = tipo_categoria || 2;
    const result = db.prepare('INSERT INTO categorias (nome, tipo_categoria, icone) VALUES (?, ?, ?)').run(nome, tipo, icone || '🏷️');
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /categorias/:id
router.put('/:id', (req, res) => {
  try {
    const { nome, tipo_categoria, icone } = req.body;
    const { id } = req.params;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    const tipo = tipo_categoria || 2;
    db.prepare('UPDATE categorias SET nome = ?, tipo_categoria = ?, icone = ? WHERE id = ?').run(nome, tipo, icone || '🏷️', id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /categorias/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
