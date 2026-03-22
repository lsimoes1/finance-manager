import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FinanceService } from '../../../core/services/finance.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FinanceService]
    });
    service = TestBed.inject(FinanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar categorias com filtro opcional', () => {
    service.getCategorias(1).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/categorias?tipo_categoria=1');
    expect(req.request.method).toBe('GET');
  });

  it('deve criar uma categoria', () => {
    const payload = { nome: 'Nova', tipo_categoria: 1 };
    service.criarCategoria(payload).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/categorias');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
  });

  it('deve buscar saldo acumulado com dateTo', () => {
    service.getSaldoAcumulado('2026-03-01').subscribe();
    const req = httpMock.expectOne('http://localhost:3000/saldo-acumulado?dateTo=2026-03-01');
    expect(req.request.method).toBe('GET');
  });

  it('deve chamar excluirTransacao com deleteAll=true', () => {
    service.excluirTransacao(123, true).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/transacoes/123?deleteAll=true');
    expect(req.request.method).toBe('DELETE');
  });

  it('deve chamar excluirTransacao com excluirFuturas=true', () => {
    service.excluirTransacao(123, false, true).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/transacoes/123?excluirFuturas=true');
    expect(req.request.method).toBe('DELETE');
  });

  it('deve criar transação com payload complexo', () => {
    const payload = {
      descricao: 'Teste',
      valor: 100,
      data: '2026-03-22',
      categoria_id: 1,
      metodo_pagamento_id: 1,
      tipo: 'parcelada' as any,
      total_parcelas: 3,
      direcao: 'gasto' as any
    };
    service.criarTransacao(payload).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/transacoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
  });
});
