export interface Receita {
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  categoria_id?: number | null;
  metodo_pagamento_id?: number | null;
}
