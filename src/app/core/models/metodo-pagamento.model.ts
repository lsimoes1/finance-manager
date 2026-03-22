export interface MetodoPagamento {
  id: number;
  nome: string;
  icone: string;
  tipo?: string; // 'padrao' | 'credito' | 'investimento'
}
