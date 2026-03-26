/**
 * configuracoes.routes.js
 * Rotas para configurações da aplicação.
 * Prefixo: /configuracoes
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import db from '../db/database.js';

const router = Router();
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta encontrar a pasta de ícones de forma robusta
const getIconsDir = () => {
  const rootPublic = path.resolve(__dirname, '../../../public/icons');
  const localPublic = path.resolve(process.cwd(), 'public', 'icons');
  const backendPublic = path.resolve(__dirname, '../../public/icons');
  
  if (fs.existsSync(rootPublic)) return rootPublic;
  if (fs.existsSync(backendPublic)) return backendPublic;
  return localPublic;
};

const iconsDir = getIconsDir();

// Configuração do Multer para salvar ícones
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    cb(null, iconsDir);
  },
  filename: (req, file, cb) => {
    const original = file.originalname.toLowerCase();
    const ext = path.extname(original);
    const base = path.basename(original, ext).replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    cb(null, `${base}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fn = file.originalname.toLowerCase();
    if (fn.endsWith('.svg') || fn.endsWith('.icon') || fn.endsWith('.png') || fn.endsWith('.ico')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .svg, .png, .ico ou .icon são permitidos'), false);
    }
  }
});

// GET /configuracoes/periodo
router.get('/periodo', async (req, res) => {
  try {
    const result = await db.query("SELECT valor FROM configuracoes WHERE chave = 'dia_inicio_periodo'");
    const row = result.rows[0];
    res.json({ dia_inicio: row ? parseInt(row.valor, 10) : 1 });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PUT /configuracoes/periodo
router.put('/periodo', async (req, res) => {
  try {
    const { dia_inicio } = req.body;
    const dia = parseInt(dia_inicio, 10);

    if (!dia || dia < 1 || dia > 28) {
      return res.status(400).json({ ok: false, error: 'dia_inicio deve ser entre 1 e 28' });
    }

    const sql = `
      INSERT INTO configuracoes (chave, valor) 
      VALUES ('dia_inicio_periodo', $1) 
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = CURRENT_TIMESTAMP
    `;
    await db.query(sql, [String(dia)]);
    
    res.json({ ok: true, dia_inicio: dia });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /configuracoes/icones
router.get('/icones', (req, res) => {
  try {
    if (!fs.existsSync(iconsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(iconsDir);
    const icons = files
      .filter(f => {
        const fn = f.toLowerCase();
        return fn.endsWith('.svg') || fn.endsWith('.icon') || fn.endsWith('.png') || fn.endsWith('.ico');
      })
      .map(f => {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        return {
          nome: f.replace(/\.(svg|icon|png|ico)$/i, '').toLowerCase(),
          path: `${baseUrl}/icons/${f}`,
          filename: f
        };
      });

    res.json(icons);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /configuracoes/icones/upload
router.post('/icones/upload', upload.single('icon'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado' });
    }

    const iconData = {
      nome: req.file.filename.replace(/\.(svg|icon|png|ico)$/i, '').toLowerCase(),
      path: `/icons/${req.file.filename}`
    };

    res.status(201).json({ ok: true, icon: iconData });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /configuracoes/icones/:filename
router.delete('/icones/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(iconsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Arquivo não encontrado' });
    }

    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
