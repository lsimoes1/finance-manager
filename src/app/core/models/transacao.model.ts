export interface Transacao {
  id: number;
  descricao: string;
  valor: number;
  data: string;
  categoria_id: number;
  metodo_pagamento_id: number;
  parcela_atual: number | null;
  recorrencia_id: number | null;
  tipo_id: number;
  direcao_id: number;
  created_at?: string;
  // campos joinados via backend
  categoria: string;
  categoria_icone?: string;
  metodoPagamento: string;
  metodo_icone?: string;
  metodo_tipo?: string; // 'padrao' | 'credito' | 'investimento'
  tipo_name?: string;   // 'avulsa', 'fixa', 'parcelada'
  direcao_name: 'gasto' | 'receita';
  recorrencia_total_parcelas: number | null;
  recorrencia_valor: number | null;
}

export interface TransacaoPayload {
  descricao: string;
  valor: number;
  data: string;
  categoria_id: number | null;
  metodo_pagamento_id: number | null;
  direcao: 'gasto' | 'receita';
  tipo?: 'fixa' | 'parcelada';
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
  tipo?: 'fixa' | 'parcelada';
  total_parcelas?: number;
}
