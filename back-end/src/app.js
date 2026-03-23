/**
 * app.js
 * Configuração central do Express:
 * - Middlewares (JSON, CORS)
 * - Montagem de todos os routers
 */

import express from 'express';
import cors from 'cors';
import path from 'path';

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

// Servir arquivos estáticos (ícones)
app.use('/icons', express.static(path.join(process.cwd(), 'public', 'icons')));

// Rotas
app.use('/categorias',       categoriasRouter);
app.use('/metodos-pagamento', metodosPagRouter);
app.use('/transacoes',       transacoesRouter);
app.use('/configuracoes',    configuracoesRouter);
app.use('/investimentos',    investimentosRouter);
app.use('/saldo-acumulado',  saldoRouter);

export default app;
