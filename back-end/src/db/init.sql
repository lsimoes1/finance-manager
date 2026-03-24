-- Enums Profissionais (Seguros para re-execução)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'direcao_transacao') THEN
        CREATE TYPE direcao_transacao AS ENUM ('gasto', 'receita');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_conta') THEN
        CREATE TYPE tipo_conta AS ENUM ('carteira', 'credito', 'investimento');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_transacao') THEN
        CREATE TYPE tipo_transacao AS ENUM ('avulsa', 'fixa', 'parcelada');
    END IF;
END $$;

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    direcao direcao_transacao NOT NULL DEFAULT 'gasto',
    icone TEXT DEFAULT '🏷️',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Contas (Evolução de metodos_pagamento)
CREATE TABLE IF NOT EXISTS contas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo tipo_conta NOT NULL DEFAULT 'carteira',
    icone TEXT DEFAULT '🪙',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Recorrências
CREATE TABLE IF NOT EXISTS recorrencias (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    conta_id INTEGER REFERENCES contas(id) ON DELETE SET NULL,
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    tipo tipo_transacao NOT NULL,
    direcao direcao_transacao NOT NULL,
    total_parcelas INTEGER,
    parcelas_restantes INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS transacoes (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data DATE NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    conta_id INTEGER REFERENCES contas(id) ON DELETE CASCADE,
    recorrencia_id INTEGER REFERENCES recorrencias(id) ON DELETE CASCADE,
    tipo tipo_transacao NOT NULL DEFAULT 'avulsa',
    direcao direcao_transacao NOT NULL DEFAULT 'gasto',
    parcela_atual INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Investimentos
CREATE TABLE IF NOT EXISTS investimentos (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data DATE NOT NULL,
    conta_id INTEGER REFERENCES contas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para Performance
CREATE INDEX idx_transacoes_data ON transacoes(data DESC);
CREATE INDEX idx_transacoes_categoria ON transacoes(categoria_id);
CREATE INDEX idx_transacoes_conta ON transacoes(conta_id);
CREATE INDEX idx_transacoes_recorrencia ON transacoes(recorrencia_id);
CREATE INDEX idx_investimentos_data ON investimentos(data DESC);

-- Seeds Iniciais Obrigatórios
INSERT INTO configuracoes (chave, valor) VALUES ('dia_inicio_periodo', '1') ON CONFLICT (chave) DO NOTHING;

-- Função para Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at (Seguros para re-execução)
DROP TRIGGER IF EXISTS update_categorias_modtime ON categorias;
CREATE TRIGGER update_categorias_modtime BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_contas_modtime ON contas;
CREATE TRIGGER update_contas_modtime BEFORE UPDATE ON contas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_recorrencias_modtime ON recorrencias;
CREATE TRIGGER update_recorrencias_modtime BEFORE UPDATE ON recorrencias FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_transacoes_modtime ON transacoes;
CREATE TRIGGER update_transacoes_modtime BEFORE UPDATE ON transacoes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_investimentos_modtime ON investimentos;
CREATE TRIGGER update_investimentos_modtime BEFORE UPDATE ON investimentos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
