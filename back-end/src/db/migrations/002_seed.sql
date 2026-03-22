-- ============================================================
-- 002_seed.sql
-- Dados padrão obrigatórios para o funcionamento da aplicação
-- Executado apenas se as tabelas de domínio estiverem vazias
-- (a lógica de guarda está no migrations.js)
-- ============================================================

-- Tipos de transação
INSERT OR IGNORE INTO transacao_tipos (id, nome) VALUES (1, 'avulsa');
INSERT OR IGNORE INTO transacao_tipos (id, nome) VALUES (2, 'fixa');
INSERT OR IGNORE INTO transacao_tipos (id, nome) VALUES (3, 'parcelada');

-- Direções
INSERT OR IGNORE INTO transacao_direcoes (id, nome) VALUES (1, 'gasto');
INSERT OR IGNORE INTO transacao_direcoes (id, nome) VALUES (2, 'receita');

-- Configuração padrão: dia de início do período financeiro = 1
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('dia_inicio_periodo', '1');
