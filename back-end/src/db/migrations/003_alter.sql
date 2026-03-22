-- ============================================================
-- 003_alter.sql
-- Documentação das migrações incrementais (ALTER TABLE)
-- Nota: a execução real é feita programaticamente no migrations.js
--       com verificação via PRAGMA table_info para evitar duplicidade.
-- ============================================================

-- transacoes: adiciona coluna direcao_id (se não existir)
-- ALTER TABLE transacoes ADD COLUMN direcao_id INTEGER NOT NULL DEFAULT 1;

-- recorrencias: adiciona coluna direcao_id (se não existir)
-- ALTER TABLE recorrencias ADD COLUMN direcao_id INTEGER NOT NULL DEFAULT 1;

-- categorias: adiciona tipo_categoria (se não existir)
-- ALTER TABLE categorias ADD COLUMN tipo_categoria INTEGER NOT NULL DEFAULT 2;

-- categorias: adiciona icone (se não existir)
-- ALTER TABLE categorias ADD COLUMN icone TEXT DEFAULT '🏷️';

-- metodos_pagamento: adiciona icone (se não existir)
-- ALTER TABLE metodos_pagamento ADD COLUMN icone TEXT DEFAULT '🪙';

-- metodos_pagamento: adiciona tipo (se não existir)
-- ALTER TABLE metodos_pagamento ADD COLUMN tipo TEXT NOT NULL DEFAULT 'padrao';
