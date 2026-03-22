export interface Gasto {
  descricao: string;
  valor: number;
  data: string;
  isFixo: boolean;
  metodoPagamento: string;
  categoria: string;
  categoria_id?: number | null;
  metodo_pagamento_id?: number | null;
  tipo?: 'avulsa' | 'fixa' | 'parcelada';
  total_parcelas?: number;
  dia_vencimento?: number;
}
