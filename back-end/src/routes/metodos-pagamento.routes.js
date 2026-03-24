/**
 * metodos-pagamento.routes.js (Agora usando tabela 'contas')
 * Rotas CRUD para métodos de pagamento (Contas).
 * Prefixo: /metodos-pagamento
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /metodos-pagamento
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome, icone, tipo FROM contas ORDER BY nome ASC');
    
    // Converte de volta 'carteira' -> 'padrao' para compatibilidade com o front
    const rows = result.rows.map(r => ({
      ...r,
      tipo: r.tipo === 'carteira' ? 'padrao' : r.tipo
    }));
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /metodos-pagamento
router.post('/', async (req, res) => {
  try {
    const { nome, icone, tipo } = req.body;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    // Mapeia 'padrao' -> 'carteira'
    const tipoVal = (tipo === 'padrao' || !tipo) ? 'carteira' : tipo;
    
    const sql = 'INSERT INTO contas (nome, icone, tipo) VALUES ($1, $2, $3) RETURNING id';
    const result = await db.query(sql, [nome, icone || '🪙', tipoVal]);
    
    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /metodos-pagamento/:id
router.put('/:id', async (req, res) => {
  try {
    const { nome, icone, tipo } = req.body;
    const { id } = req.params;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome is required' });

    const tipoVal = (tipo === 'padrao' || !tipo) ? 'carteira' : tipo;
    
    const sql = 'UPDATE contas SET nome = $1, icone = $2, tipo = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4';
    await db.query(sql, [nome, icone || '🪙', tipoVal, id]);
    
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /metodos-pagamento/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM contas WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
