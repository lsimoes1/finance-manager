import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria } from '../models/categoria.model';
import { MetodoPagamento } from '../models/metodo-pagamento.model';
import { Periodo } from '../models/periodo.model';
import { Transacao, TransacaoPayload, TransacaoEditPayload } from '../models/transacao.model';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  getCategorias(tipo_categoria?: number): Observable<Categoria[]> {
    const params = tipo_categoria ? `?tipo_categoria=${tipo_categoria}` : '';
    return this.http.get<Categoria[]>(`${this.baseUrl}/categorias${params}`);
  }

  criarCategoria(payload: { nome: string; tipo_categoria: number; icone?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/categorias`, payload);
  }

  editarCategoria(id: number, payload: { nome: string; tipo_categoria: number; icone?: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/categorias/${id}`, payload);
  }

  excluirCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/categorias/${id}`);
  }

  getMetodosPagamento(): Observable<MetodoPagamento[]> {
    return this.http.get<MetodoPagamento[]>(`${this.baseUrl}/metodos-pagamento`);
  }

  criarMetodoPagamento(payload: { nome: string; icone?: string; tipo?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/metodos-pagamento`, payload);
  }

  editarMetodoPagamento(id: number, payload: { nome: string; icone?: string; tipo?: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/metodos-pagamento/${id}`, payload);
  }

  excluirMetodoPagamento(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/metodos-pagamento/${id}`);
  }

  getPeriodos(): Observable<Periodo[]> {
    return this.http.get<Periodo[]>(`${this.baseUrl}/transacoes/periodos`);
  }

  // Período financeiro configurável
  getPeriodoConfig(): Observable<{ dia_inicio: number }> {
    return this.http.get<{ dia_inicio: number }>(`${this.baseUrl}/configuracoes/periodo`);
  }

  salvarPeriodoConfig(dia_inicio: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/configuracoes/periodo`, { dia_inicio });
  }

  getCustomIcons(): Observable<{ nome: string; path: string; filename: string }[]> {
    return this.http.get<{ nome: string; path: string; filename: string }[]>(`${this.baseUrl}/configuracoes/icones`);
  }

  uploadIcon(file: File): Observable<{ ok: boolean, icon: { nome: string, path: string } }> {
    const formData = new FormData();
    formData.append('icon', file);
    return this.http.post<{ ok: boolean, icon: { nome: string, path: string } }>(`${this.baseUrl}/configuracoes/icones/upload`, formData);
  }

  deleteCustomIcon(filename: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/configuracoes/icones/${filename}`);
  }

  getTransacoes(dateFrom?: string, dateTo?: string): Observable<Transacao[]> {
    const params = (dateFrom && dateTo) ? `?dateFrom=${dateFrom}&dateTo=${dateTo}` : '';
    return this.http.get<Transacao[]>(`${this.baseUrl}/transacoes${params}`);
  }

  getSaldoAcumulado(dateTo: string): Observable<{ saldo_acumulado: number; saldos_metodos: { [key: string]: number } }> {
    return this.http.get<{ saldo_acumulado: number; saldos_metodos: { [key: string]: number } }>(`${this.baseUrl}/saldo-acumulado?dateTo=${dateTo}`);
  }

  criarTransacao(payload: TransacaoPayload): Observable<{ ok: boolean; id?: number; recorrencia_id?: number }> {
    return this.http.post<{ ok: boolean; id?: number; recorrencia_id?: number }>(
      `${this.baseUrl}/transacoes`,
      payload
    );
  }

  editarTransacao(id: number, payload: TransacaoEditPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/transacoes/${id}`, payload);
  }

  excluirTransacao(id: number, deleteAll: boolean = false, excluirFuturas: boolean = false): Observable<any> {
    const queryParams = [];
    if (deleteAll) queryParams.push('deleteAll=true');
    if (excluirFuturas) queryParams.push('excluirFuturas=true');
    const queryStr = queryParams.length ? '?' + queryParams.join('&') : '';
    return this.http.delete(`${this.baseUrl}/transacoes/${id}${queryStr}`);
  }
}
