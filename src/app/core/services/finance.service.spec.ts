import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FinanceService } from './finance.service';

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

  it('deve buscar categorias', () => {
    service.getCategorias(1).subscribe(res => {
      expect(res.length).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:3000/categorias?tipo_categoria=1');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nome: 'Teste', tipo_categoria: 1 }]);
  });

  it('deve criar categoria', () => {
    service.criarCategoria({ nome: 'C1', tipo_categoria: 1 }).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/categorias');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('deve buscar metodos de pagamento', () => {
    service.getMetodosPagamento().subscribe();
    const req = httpMock.expectOne('http://localhost:3000/metodos-pagamento');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deve buscar transacoes com datas', () => {
    service.getTransacoes('2026-01-01', '2026-01-31').subscribe();
    const req = httpMock.expectOne('http://localhost:3000/transacoes?dateFrom=2026-01-01&dateTo=2026-01-31');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('deve buscar saldo acumulado', () => {
    service.getSaldoAcumulado('2026-01-31').subscribe();
    const req = httpMock.expectOne('http://localhost:3000/saldo-acumulado?dateTo=2026-01-31');
    expect(req.request.method).toBe('GET');
    req.flush({ saldo_acumulado: 100, saldos_metodos: {} });
  });

  it('deve excluir transacao com query params', () => {
    service.excluirTransacao(1, true, true).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/transacoes/1?deleteAll=true&excluirFuturas=true');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });

  it('deve criar metodo de pagamento', () => {
    service.criarMetodoPagamento({ nome: 'PIX' }).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/metodos-pagamento');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('deve editar metodo de pagamento', () => {
    service.editarMetodoPagamento(1, { nome: 'PIX Edit' }).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/metodos-pagamento/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });

  it('deve excluir metodo de pagamento', () => {
    service.excluirMetodoPagamento(1).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/metodos-pagamento/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });

  it('deve buscar configuracao de periodo', () => {
    service.getPeriodoConfig().subscribe(res => expect(res.dia_inicio).toBe(5));
    const req = httpMock.expectOne('http://localhost:3000/configuracoes/periodo');
    req.flush({ dia_inicio: 5 });
  });

  it('deve salvar configuracao de periodo', () => {
    service.salvarPeriodoConfig(10).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/configuracoes/periodo');
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });

  it('deve editar categoria', () => {
    service.editarCategoria(1, { nome: 'C1', tipo_categoria: 1 }).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/categorias/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });

  it('deve excluir categoria', () => {
    service.excluirCategoria(1).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/categorias/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });

  it('deve editar transacao', () => {
    service.editarTransacao(1, { descricao: 'E' } as any).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/transacoes/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ ok: true });
  });
});
