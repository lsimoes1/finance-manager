/**
 * Utility to map API responses to Frontend models.
 * Specifically handles PostgreSQL DECIMAL string to JavaScript number conversion.
 */

export class TypeMapper {
  /**
   * Safe conversion of a value to number.
   * PostgreSQL DECIMAL types are returned as strings by the 'pg' driver.
   */
  static toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Maps a raw transaction from API to the Transacao model.
   */
  static mapTransacao(raw: any): any {
    return {
      ...raw,
      valor: this.toNumber(raw.valor),
      recorrencia_valor: raw.recorrencia_valor ? this.toNumber(raw.recorrencia_valor) : null,
      // Ensure strings that should be numbers are indeed numbers
      id: Number(raw.id),
      categoria_id: raw.categoria_id ? Number(raw.categoria_id) : null,
      conta_id: raw.conta_id ? Number(raw.conta_id) : null,
      metodo_pagamento_id: raw.metodo_pagamento_id ? Number(raw.metodo_pagamento_id) : null,
      recorrencia_id: raw.recorrencia_id ? Number(raw.recorrencia_id) : null,
      parcela_atual: raw.parcela_atual ? Number(raw.parcela_atual) : null,
      recorrencia_total_parcelas: raw.recorrencia_total_parcelas ? Number(raw.recorrencia_total_parcelas) : null,
      // Direcao and Tipo are already strings ('gasto'/'receita', etc)
      direcao: raw.direcao || (raw.direcao_id === 2 ? 'receita' : 'gasto'),
      tipo: raw.tipo || (raw.tipo_id === 2 ? 'fixa' : (raw.tipo_id === 3 ? 'parcelada' : 'avulsa')),
    };
  }
}
