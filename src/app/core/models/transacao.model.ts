export type DirecaoTransacao = 'gasto' | 'receita' | 'transferencia_saida' | 'transferencia_entrada';
export type TipoTransacao = 'avulsa' | 'fixa' | 'parcelada';

export interface Transacao {
  id: number;
  descricao: string;
  valor: number; // Decimal from DB is parsed to number in service
  data: string;
  categoria_id: number;
  metodo_pagamento_id: number;
  parcela_atual: number | null;
  recorrencia_id: number | null;
  tipo_id: number;   // 1: avulsa, 2: fixa, 3: parcelada (legacy support)
  direcao_id: number; // 1: gasto, 2: receita (legacy support)
  created_at?: string;
  // campos joinados via backend
  categoria: string;
  categoria_icone?: string;
  metodoPagamento: string;
  metodo_icone?: string;
  metodo_tipo?: string; // 'carteira' | 'credito' | 'investimento'
  tipo: TipoTransacao;
  tipo_name?: string;   
  direcao: DirecaoTransacao;
  direcao_name: DirecaoTransacao;
  recorrencia_total_parcelas: number | null;
  recorrencia_valor: number | null;
}

export interface TransacaoPayload {
  descricao: string;
  valor: number;
  data: string;
  categoria_id: number | null;
  metodo_pagamento_id: number | null;
  direcao: DirecaoTransacao;
  tipo?: TipoTransacao;
  total_parcelas?: number;
  dia_vencimento?: number;
}

export interface TransacaoEditPayload {
  descricao: string;
  valor: number;
  data: string;
  categoria_id: number | null;
  metodo_pagamento_id: number | null;
  parcela_atual?: number | null;
  tipo?: TipoTransacao;
  total_parcelas?: number;
}

export interface TransferenciaPayload {
  valor: number;
  data: string;
  conta_origem_id: number;
  conta_destino_id: number;
  descricao?: string;
}
