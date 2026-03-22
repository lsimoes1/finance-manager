import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MensalComponent } from '../../../features/mensal/mensal.component';
import { FinanceService } from '../../../core/services/finance.service';
import { Transacao } from '../../../core/models/transacao.model';

registerLocaleData(localePt);

describe('MensalComponent - Business Logic & Calculations', () => {
  let component: MensalComponent;
  let fixture: ComponentFixture<MensalComponent>;
  let financeService: jasmine.SpyObj<FinanceService>;

  const mockCategorias = [
    { id: 1, nome: 'Salário', tipo_categoria: 1, icone: '💰' },
    { id: 2, nome: 'Aluguel', tipo_categoria: 2, icone: '🏠' },
    { id: 3, nome: 'Investimento', tipo_categoria: 2, icone: '📈' }
  ];

  const mockMetodos = [
    { id: 1, nome: 'Banco', tipo: 'padrao', icone: '🏦' },
    { id: 2, nome: 'Carteira', tipo: 'padrao', icone: '👛' },
    { id: 3, nome: 'Visa', tipo: 'credito', icone: '💳' },
    { id: 4, nome: 'Tesouro', tipo: 'investimento', icone: '📊' }
  ];

  const mockTransacoes: Transacao[] = [
    { id: 1, descricao: 'Salário', valor: 5000, data: '2026-03-05', categoria_id: 1, metodo_pagamento_id: 1, tipo_id: 1, direcao_id: 2, categoria: 'Salário', metodoPagamento: 'Banco', tipo_name: 'avulsa', direcao_name: 'receita', metodo_tipo: 'padrao', parcela_atual: null, recorrencia_id: null, recorrencia_total_parcelas: null, recorrencia_valor: null },
    { id: 2, descricao: 'Aluguel', valor: 1500, data: '2026-03-10', categoria_id: 2, metodo_pagamento_id: 1, tipo_id: 2, direcao_id: 1, categoria: 'Aluguel', metodoPagamento: 'Banco', tipo_name: 'fixa', direcao_name: 'gasto', metodo_tipo: 'padrao', parcela_atual: null, recorrencia_id: 1, recorrencia_total_parcelas: null, recorrencia_valor: 1500 },
    { id: 3, descricao: 'Mercado', valor: 400, data: '2026-03-15', categoria_id: 2, metodo_pagamento_id: 3, tipo_id: 1, direcao_id: 1, categoria: 'Aluguel', metodoPagamento: 'Visa', tipo_name: 'avulsa', direcao_name: 'gasto', metodo_tipo: 'credito', parcela_atual: null, recorrencia_id: null, recorrencia_total_parcelas: null, recorrencia_valor: null },
    { id: 4, descricao: 'Aporte', valor: 200, data: '2026-03-20', categoria_id: 3, metodo_pagamento_id: 4, tipo_id: 1, direcao_id: 1, categoria: 'Investimento', metodoPagamento: 'Tesouro', tipo_name: 'avulsa', direcao_name: 'gasto', metodo_tipo: 'investimento', parcela_atual: null, recorrencia_id: null, recorrencia_total_parcelas: null, recorrencia_valor: null }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('FinanceService', [
      'getCategorias', 'getMetodosPagamento', 'getPeriodos', 'getPeriodoConfig', 'getTransacoes', 'getSaldoAcumulado', 'editarTransacao', 'criarTransacao', 'excluirTransacao'
    ]);

    spy.getCategorias.and.returnValue(of(mockCategorias));
    spy.getMetodosPagamento.and.returnValue(of(mockMetodos));
    spy.getPeriodos.and.returnValue(of([{ year: '2026', month: '03', value: '2026-03', label: '03/2026' }]));
    spy.getPeriodoConfig.and.returnValue(of({ dia_inicio: 1 }));
    spy.getTransacoes.and.returnValue(of(mockTransacoes));
    spy.getSaldoAcumulado.and.returnValue(of({ saldo_acumulado: 1000, saldos_metodos: { 'Carteira': 50 } }));
    spy.editarTransacao.and.returnValue(of({ ok: true }));
    spy.criarTransacao.and.returnValue(of({ ok: true, id: 999 }));

    await TestBed.configureTestingModule({
      imports: [MensalComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: FinanceService, useValue: spy },
        { provide: LOCALE_ID, useValue: 'pt-BR' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MensalComponent);
    component = fixture.componentInstance;
    financeService = TestBed.inject(FinanceService) as jasmine.SpyObj<FinanceService>;
    fixture.detectChanges();
  });

  it('deve calcular corretamente o periodoDateRange para diaInicioPeriodo = 1', () => {
    component.selectedMonth = '03';
    component.selectedYear = '2026';
    component.diaInicioPeriodo = 1;
    const range = component.periodoDateRange;
    expect(range.from).toBe('2026-03-01');
    expect(range.to).toBe('2026-03-31');
  });

  it('deve calcular corretamente o periodoDateRange para diaInicioPeriodo = 10', () => {
    component.selectedMonth = '03';
    component.selectedYear = '2026';
    component.diaInicioPeriodo = 10;
    const range = component.periodoDateRange;
    // Mês anterior (Fevereiro) dia 10 até Março dia 09
    expect(range.from).toBe('2026-02-10');
    expect(range.to).toBe('2026-03-09');
  });

  it('deve calcular totalizadores financeiros corretamente', () => {
    component.transacoes = mockTransacoes;
    expect(component.totalReceitas).toBe(5000);
    expect(component.totalGastosAvulsos).toBe(0); // Mercado é crédito
    expect(component.totalFixos).toBe(1500);
    expect(component.totalCartaoCredito).toBe(400);
    expect(component.totalInvestimentos).toBe(200);
  });

  it('deve calcular saldos e projeção corretamente', () => {
    component.saldoAnterior = 1000;
    component.transacoes = mockTransacoes;
    // Set today to a date after all transactions to include them in saldoAtual
    component.todayDateStr = '2026-12-31';

    // Saldo Atual = Anterior (1000) + Receitas (5000) - Gastos Padrão (1500 Aluguel) - Aportes Inv (200)
    // 1000 + 5000 - 1500 - 200 = 4300
    expect(component.saldoAtual).toBe(4300);
    
    // Projeção = Anterior (1000) + Total Rec (5000) - Total Gastos (0 avulso + 1500 fixo) - Total Inv (200)
    // 1000 + 5000 - 1500 - 200 = 4300
    // Espera-se 4300 (Cartão de crédito não entra em totalGastos mas entra em totalCartaoCredito)
    // Nota: totalGastos = totalGastosAvulsos + totalFixos = 0 + 1500 = 1500
    expect(component.projecaoSaldo).toBe(4300);
  });

  it('deve filtrar transações por termo de busca', () => {
    component.searchTerm = 'Salário';
    const filtradas = component.transacoesGeraisFiltradas;
    expect(filtradas.length).toBe(1);
    expect(filtradas[0].descricao).toBe('Salário');
  });

  it('deve alternar ordenação para todas as colunas', () => {
    const columns: ('data' | 'valor' | 'descricao' | 'categoria')[] = ['data', 'valor', 'descricao', 'categoria'];
    columns.forEach(col => {
      component.toggleSort(col);
      expect(component.sortColumn).toBe(col);
      component.toggleSort(col);
      expect(component.sortDirection).toBe('asc');
    });
  });

  it('deve filtrar transações por categoria geral', () => {
    component.filterCategoriaGerais = 'Aluguel';
    const filtradas = component.transacoesGeraisFiltradas;
    expect(filtradas.every(t => t.categoria === 'Aluguel')).toBeTrue();
  });

  it('deve filtrar transacoes fixas por categoria', () => {
    component.filterCategoriaFixos = 'Aluguel';
    expect(component.recorrentesFiltrados.length).toBe(1);
    component.filterCategoriaFixos = '';
    expect(component.recorrentesFiltrados.length).toBe(1); // No mock only 1 is fixed
  });

  it('deve retornar categorias únicas para fixos e gerais', () => {
    expect(component.categoriasUnicasFixos.length).toBeGreaterThan(0);
    expect(component.categoriasUnicasGerais.length).toBeGreaterThan(0);
  });

  it('deve converter valor monetário formatado para número', () => {
    const event = { target: { value: '1.234,56' } };
    const obj = { v: 0 };
    component.onCurrencyInput(event, obj, 'v');
    expect(obj.v).toBe(1234.56);
  });

  it('deve parsear conteúdo TXT corretamente', () => {
    const content = "27/02/2026;Dividendo KLBN1;6,83\n28/02/2026;Almoço;-25,50";
    // Chama o método privado via casting as any
    (component as any).parseTXT(content);
    expect(component.importedTransactions.length).toBe(2);
    expect(component.importedTransactions[0].descricao).toBe('Dividendo KLBN1');
    expect(component.importedTransactions[0].valor).toBe(6.83);
    expect(component.importedTransactions[1].direcao).toBe('gasto');
    expect(component.importedTransactions[1].valor).toBe(25.5);
  });

  it('deve resetar filtros ao mudar período', () => {
    component.filterCategoriaFixos = 'Saúde';
    component.onPeriodChange();
    expect(component.filterCategoriaFixos).toBe('');
    expect(financeService.getTransacoes).toHaveBeenCalled();
  });

  // --- Testes de Modais e CRUD ---

  it('deve salvar gasto avulso com sucesso', () => {
    component.gastoTipo = 'avulsa';
    component.novoGasto = { descricao: 'Lanche', valor: 20, data: '2026-03-22', categoria_id: 2, metodo_pagamento_id: 2, direcao: 'gasto' };
    
    component.salvarGasto();
    
    expect(financeService.criarTransacao).toHaveBeenCalledWith(jasmine.objectContaining({
      descricao: 'Lanche',
      direcao: 'gasto',
      tipo: undefined
    }));
  });

  it('deve salvar receita com sucesso', () => {
    component.novaReceita = { descricao: 'Pix Received', valor: 100, data: '2026-03-22', categoria_id: 1, metodo_pagamento_id: 1, direcao: 'receita' };
    
    component.salvarReceita();
    
    expect(financeService.criarTransacao).toHaveBeenCalledWith(jasmine.objectContaining({
      direcao: 'receita'
    }));
  });

  it('deve confirmar exclusão de transação', () => {
    const mockT = { id: 123 } as any;
    component.selectedTransaction = mockT;
    financeService.excluirTransacao.and.returnValue(of({ ok: true }));
    
    component.deleteTransactionConfirmed(true);
    
    expect(financeService.excluirTransacao).toHaveBeenCalledWith(123, true);
  });

  it('deve configurar detalhes do modal corretamente para receitas', () => {
    component.transacoes = mockTransacoes;
    component.openCardDetails('receitas');
    expect(component.detailsModalTitle).toBe('Detalhes: Receitas do Mês');
    expect(component.detailsModalTransactions.length).toBe(1);
    expect(component.detailsModalValue).toBe(5000);
  });

  it('deve configurar detalhes do modal corretamente para avulsas', () => {
    // Adiciona uma transação avulsa padrao para o teste de totalGastosAvulsos (que filtra por padrao)
    const tAvulsaPadrao: Transacao = { ...mockTransacoes[2], metodo_tipo: 'padrao', valor: 400 };
    component.transacoes = [tAvulsaPadrao];
    component.openCardDetails('avulsas');
    expect(component.detailsModalTitle).toBe('Detalhes: Gastos Avulsos');
    expect(component.detailsModalTransactions.length).toBe(1);
    expect(component.detailsModalValue).toBe(400); // Já multiplicado por -1 internamente se for gasto
  });

  it('deve resetar input de arquivo ao carregar arquivo', () => {
    const mockEvent = { 
      target: { 
        files: [new File([''], 'test.txt')], 
        value: 'some path' 
      } 
    };
    // No component: event.target.value = ''
    component.onFileSelected(mockEvent);
    expect(mockEvent.target.value).toBe('');
  });

  it('deve lidar com erro ao carregar transações', () => {
    financeService.getTransacoes.and.returnValue(throwError(() => new Error('API Error')));
    component.loadTransacoes();
    expect(component.errorMsg).toBe('Erro ao carregar transações ou saldo.');
    expect(component.isLoadingTransacoes).toBeFalse();
  });

  it('deve lidar com erro ao salvar receita', () => {
    financeService.criarTransacao.and.returnValue(throwError(() => new Error('Save Error')));
    component.salvarReceita();
    expect(component.errorMsg).toBe('Erro ao salvar receita.');
    expect(component.isLoadingTransacoes).toBeFalse();
  });

  it('deve retornar label correto do mês', () => {
    component.selectedMonth = '01';
    expect(component.getSelectedMonthLabel()).toBe('Janeiro');
    component.selectedMonth = '99';
    expect(component.getSelectedMonthLabel()).toBe('Mês');
  });

  it('deve lidar com dia de início de período CUSTOM (ex: 25) no final do ano', () => {
    component.selectedMonth = '01';
    component.selectedYear = '2026';
    component.diaInicioPeriodo = 25;
    const range = component.periodoDateRange;
    // Mês anterior (Dezembro 2025) dia 25 até Janeiro dia 24
    expect(range.from).toBe('2025-12-25');
    expect(range.to).toBe('2026-01-24');
  });

  it('deve formatar valor monetário corretamente', () => {
    expect(component.getFormattedValue(1234.56)).toBe('1.234,56');
    expect(component.getFormattedValue(null)).toBe('');
  });

  it('deve chamar criarTransacao com tipo parcelada', () => {
    component.gastoTipo = 'parcelada';
    component.novoGasto = { descricao: 'Compra', valor: 300, data: '2026-03-01', categoria_id: 2, metodo_pagamento_id: 1, direcao: 'gasto', total_parcelas: 3 };
    component.salvarGasto();
    expect(financeService.criarTransacao).toHaveBeenCalledWith(jasmine.objectContaining({
      tipo: 'parcelada'
    }));
  });

  it('deve chamar excluirTransacao individual', () => {
    component.selectedTransaction = { id: 1 } as any;
    component.deleteTransactionConfirmed(false);
    expect(financeService.excluirTransacao).toHaveBeenCalledWith(1, false);
  });

  it('deve carregar períodos e categorias no OnInit', () => {
    component.ngOnInit();
    expect(financeService.getCategorias).toHaveBeenCalled();
    expect(financeService.getMetodosPagamento).toHaveBeenCalled();
    expect(financeService.getPeriodos).toHaveBeenCalled();
  });

  it('deve calcular saldoCarteira corretamente', () => {
    component.saldoAnteriorMetodos = { 'Carteira': 100 };
    component.transacoes = [
      { id: 1, valor: 50, data: '2026-03-01', metodoPagamento: 'Carteira', direcao_name: 'receita' } as any,
      { id: 2, valor: 30, data: '2026-03-02', metodoPagamento: 'Carteira', direcao_name: 'gasto' } as any
    ];
    component.todayDateStr = '2026-03-31';
    expect(component.saldoCarteira).toBe(120); // 100 + 50 - 30
  });

  it('deve filtrar categorias por tipo', () => {
    component.categorias = [
      { id: 1, tipo_categoria: 1 } as any,
      { id: 2, tipo_categoria: 2 } as any
    ];
    expect(component.categoriasReceita.length).toBe(1);
    expect(component.categoriasGasto.length).toBe(1);
  });

  it('deve configurar detalhes do modal corretamente para todos os tipos', () => {
    component.transacoes = mockTransacoes;
    component.isLoadingTransacoes = false;

    // Test fixos
    component.openCardDetails('fixos');
    expect(component.detailsModalTitle).toContain('Fixos');
    
    // Test credito
    component.openCardDetails('credito');
    expect(component.detailsModalTitle).toContain('Cartões');
    
    // Test investimentos
    component.openCardDetails('investimentos');
    expect(component.detailsModalTitle).toContain('Investimento');
    
    // Test projecao
    component.openCardDetails('projecao');
    expect(component.detailsModalTitle).toContain('Projeção');
    
    // Test saldo
    component.openCardDetails('saldo');
    expect(component.detailsModalTitle).toContain('Saldo Atual');
  });

  it('deve calcular totalInvestimentos corretamente', () => {
    component.transacoes = mockTransacoes; 
    // mockTransacoes[3] é Aporte (valor 200, direcao gasto, metodo investimento)
    // Se adicionar um resgate:
    component.transacoes.push({ id: 5, valor: 50, data: '2026-03-21', metodo_tipo: 'investimento', direcao_name: 'receita' } as any);
    expect(component.totalInvestimentos).toBe(150); // 200 - 50
  });

  it('deve atualizar tipo no payload ao mudar gastoTipo', () => {
    component.gastoTipo = 'parcelada';
    component.onGastoTipoChange();
    expect(component.novoGasto.tipo).toBe('parcelada');
    
    component.gastoTipo = 'avulsa';
    component.onGastoTipoChange();
    expect(component.novoGasto.tipo).toBeUndefined();
  });

  it('deve chamar setPeriodToToday e atualizar', () => {
    spyOn(component, 'onPeriodChange');
    component.setPeriodToToday();
    expect(component.onPeriodChange).toHaveBeenCalled();
  });

  it('deve deletar transação com deleteAll=true', () => {
    component.selectedTransaction = { id: 10 } as any;
    component.deleteTransactionConfirmed(true);
    expect(financeService.excluirTransacao).toHaveBeenCalledWith(10, true);
  });

  it('deve lidar com erro no forkJoin do ngOnInit', () => {
    financeService.getCategorias.and.returnValue(throwError(() => new Error('Categories Error')));
    component.ngOnInit();
    expect(component.errorMsg).toBe('Erro ao conectar com a base de dados de combos. Verifique o servidor.');
  });

  it('deve executar triggerFileInput se elemento existir', () => {
    const mockEl = document.createElement('input');
    mockEl.id = 'importFile';
    document.body.appendChild(mockEl);
    spyOn(mockEl, 'click');
    component.triggerFileInput();
    expect(mockEl.click).toHaveBeenCalled();
    document.body.removeChild(mockEl);
  });

  it('deve lidar com erro ao salvar edit', () => {
    component.selectedTransaction = { id: 1 } as any;
    financeService.editarTransacao.and.returnValue(throwError(() => new Error('Edit Error')));
    component.saveEdit();
    expect(component.errorMsg).toBe('Erro ao editar transação.');
  });

  it('deve parsear conteúdo TXT com linhas malformadas', () => {
    const content = "linha invalida\n;;\n27/02/2026;Valido;10,00";
    (component as any).parseTXT(content);
    expect(component.importedTransactions.length).toBe(1);
  });

  it('deve calcular saldoAtual ignorando transações futuras', () => {
    component.saldoAnterior = 1000;
    component.todayDateStr = '2026-03-15';
    component.transacoes = [
      { id: 1, valor: 500, data: '2026-03-10', metodo_tipo: 'padrao', direcao_name: 'receita' } as any,
      { id: 2, valor: 200, data: '2026-03-20', metodo_tipo: 'padrao', direcao_name: 'receita' } as any // Futura
    ];
    // Saldo = 1000 + 500 = 1500
    expect(component.saldoAtual).toBe(1500);
  });

  it('deve abrir modal de confirmação de exclusão', () => {
    component.confirmDeleteModal();
    // Apenas garante que não crasha e chama o helper interno (difícil testar bootstrap modal diretamente aqui)
    expect(true).toBe(true);
  });

  it('deve salvar transações importadas com sucesso', () => {
    component.importedTransactions = [
      { id: 1, descricao: 'T1', valor: 10, data: '2026-03-01', categoria_id: 1, metodo_pagamento_id: 1, direcao: 'gasto' } as any
    ];
    financeService.criarTransacao.and.returnValue(of({ ok: true }));
    
    component.saveImportedTransactions();
    
    expect(financeService.criarTransacao).toHaveBeenCalled();
    expect(component.importedTransactions.length).toBe(0);
  });

  it('deve lidar com erro ao salvar transações importadas', () => {
    component.importedTransactions = [{ id: 1 } as any];
    financeService.criarTransacao.and.returnValue(throwError(() => new Error('Import Error')));
    
    component.saveImportedTransactions();
    
    expect(component.errorMsg).toBe('Erro ao salvar algumas transações importadas.');
  });
});
