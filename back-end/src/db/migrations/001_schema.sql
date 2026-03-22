-- ============================================================
-- 001_schema.sql
-- Criação de todas as tabelas do Finance Manager
-- ============================================================

-- Categorias de transação
CREATE TABLE IF NOT EXISTS categorias (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT    NOT NULL,
  tipo_categoria INTEGER NOT NULL DEFAULT 2, -- 1=Receita, 2=Gasto
  icone          TEXT    DEFAULT '🏷️'
);

-- Métodos de pagamento (carteira, conta, crédito, investimento...)
CREATE TABLE IF NOT EXISTS metodos_pagamento (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  nome  TEXT NOT NULL,
  icone TEXT DEFAULT '🪙',
  tipo  TEXT NOT NULL DEFAULT 'padrao'  -- 'padrao' | 'credito' | 'investimento'
);

-- Domínio: tipos de transação
CREATE TABLE IF NOT EXISTS transacao_tipos (
  id   INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE  -- 'avulsa' | 'fixa' | 'parcelada'
);

-- Domínio: direção da transação
CREATE TABLE IF NOT EXISTS transacao_direcoes (
  id   INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE  -- 'gasto' | 'receita'
);

-- Grupos de transações recorrentes (fixas ou parceladas)
CREATE TABLE IF NOT EXISTS recorrencias (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao           TEXT    NOT NULL,
  valor               REAL    NOT NULL,
  categoria_id        INTEGER NOT NULL,
  metodo_pagamento_id INTEGER NOT NULL,
  dia_vencimento      INTEGER NOT NULL,
  tipo_id             INTEGER NOT NULL,
  direcao_id          INTEGER NOT NULL DEFAULT 1,
  total_parcelas      INTEGER DEFAULT NULL,
  parcelas_restantes  INTEGER DEFAULT NULL,
  FOREIGN KEY (categoria_id)        REFERENCES categorias(id),
  FOREIGN KEY (metodo_pagamento_id) REFERENCES metodos_pagamento(id),
  FOREIGN KEY (tipo_id)             REFERENCES transacao_tipos(id)
);

-- Transações individuais
CREATE TABLE IF NOT EXISTS transacoes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao           TEXT    NOT NULL,
  valor               REAL    NOT NULL,
  data                TEXT    NOT NULL,
  categoria_id        INTEGER NOT NULL,
  metodo_pagamento_id INTEGER NOT NULL,
  parcela_atual       INTEGER DEFAULT NULL,
  recorrencia_id      INTEGER DEFAULT NULL,
  tipo_id             INTEGER NOT NULL DEFAULT 1,
  direcao_id          INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (categoria_id)        REFERENCES categorias(id),
  FOREIGN KEY (metodo_pagamento_id) REFERENCES metodos_pagamento(id),
  FOREIGN KEY (recorrencia_id)      REFERENCES recorrencias(id),
  FOREIGN KEY (tipo_id)             REFERENCES transacao_tipos(id)
);

-- Investimentos
CREATE TABLE IF NOT EXISTS investimentos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo       TEXT NOT NULL,
  nome       TEXT NOT NULL,
  valor      REAL NOT NULL,
  data       TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configurações genéricas (chave-valor)
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
