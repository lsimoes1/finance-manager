/**
 * server.js
 * Ponto de entrada da API.
 * Responsabilidades: executar migrations e iniciar o servidor HTTP.
 */

import { runMigrations } from './src/db/migrations.js';
import app from './src/app.js';

const PORT = process.env.PORT || 3000;

// Aplica todas as migrations antes de abrir o servidor
runMigrations();

app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
});