/**
 * configuracoes.routes.js
 * Rotas para configurações da aplicação.
 * Prefixo: /configuracoes
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /configuracoes/periodo
router.get('/periodo', (req, res) => {
  try {
    const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'dia_inicio_periodo'").get();
    res.json({ dia_inicio: row ? parseInt(row.valor, 10) : 1 });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /configuracoes/periodo
router.put('/periodo', (req, res) => {
  try {
    const { dia_inicio } = req.body;
    const dia = parseInt(dia_inicio, 10);

    if (!dia || dia < 1 || dia > 28) {
      return res.status(400).json({ ok: false, error: 'dia_inicio deve ser entre 1 e 28' });
    }

    db.prepare("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('dia_inicio_periodo', ?)").run(String(dia));
    res.json({ ok: true, dia_inicio: dia });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
