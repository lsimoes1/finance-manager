/**
 * app.js
 * Configuração central do Express:
 * - Middlewares (JSON, CORS)
 * - Montagem de todos os routers
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import categoriasRouter      from './routes/categorias.routes.js';
import metodosPagRouter      from './routes/metodos-pagamento.routes.js';
import transacoesRouter      from './routes/transacoes.routes.js';
import configuracoesRouter   from './routes/configuracoes.routes.js';
import investimentosRouter   from './routes/investimentos.routes.js';
import saldoRouter           from './routes/saldo.routes.js';

const app = express();

// Middlewares globais
app.use(express.json());
app.use(cors());

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta encontrar a pasta de ícones de forma robusta
const getIconsDir = () => {
  const rootPublic = path.resolve(__dirname, '../../public/icons');
  const localPublic = path.resolve(process.cwd(), 'public', 'icons');
  if (fs.existsSync(rootPublic)) return rootPublic;
  return localPublic;
};

// Servir arquivos estáticos (ícones)
app.use('/icons', express.static(getIconsDir()));

// Rotas
app.use('/categorias',       categoriasRouter);
app.use('/metodos-pagamento', metodosPagRouter);
app.use('/transacoes',       transacoesRouter);
app.use('/configuracoes',    configuracoesRouter);
app.use('/investimentos',    investimentosRouter);
app.use('/saldo-acumulado',  saldoRouter);

export default app;
