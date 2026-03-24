/**
 * server.js
 * Ponto de entrada da API.
 * Responsabilidades: executar migrations e iniciar o servidor HTTP.
 */

import app from './src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ API rodando na porta ${PORT}`);
});