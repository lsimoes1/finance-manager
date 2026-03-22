import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger
} from '@angular/animations';

import { FinanceService } from '../../core/services/finance.service';
import { Transacao, TransacaoPayload, TransacaoEditPayload } from '../../core/models/transacao.model';
import { Categoria } from '../../core/models/categoria.model';
import { MetodoPagamento } from '../../core/models/metodo-pagamento.model';
import { Periodo } from '../../core/models/periodo.model';

@Component({
  selector: 'app-mensal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, NgbDropdownModule],
  templateUrl: './mensal.component.html',
  styleUrl: './mensal.component.scss',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('400ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-10px)' }),
          stagger(30, [
            animate('350ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('cardStagger', [
      transition(':enter', [
        query('.summary-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(80, [
            animate('500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class MensalComponent implements OnInit {
  private readonly financeService = inject(FinanceService);

  // --- Seletor de período ---
  selectedMonth: string = '';
  selectedYear: string = '';
  availableYears: string[] = [];
  periods: Periodo[] = [];

  readonly months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  // --- Dados da API ---
  categorias: Categoria[] = [];
  metodos: MetodoPagamento[] = [];
  transacoes: Transacao[] = [];

  // --- UI state ---
  isLoadingTransacoes = false;
  isLoadingDependents = false;
  errorMsg: string | null = null;
  todayDateStr: string = '';

  // --- Filtros e Ordenação ---
  searchTerm: string = '';
  filterCategoriaFixos: string = '';
  filterCategoriaGerais: string = '';
  sortColumn: 'data' | 'valor' | 'descricao' | 'categoria' = 'data';
  sortDirection: 'asc' | 'desc' = 'desc';

  // --- Período Financeiro Configurável ---
  diaInicioPeriodo: number = 1; // carregado da API
  saldoAnterior: number = 0;
  saldoAnteriorMetodos: { [key: string]: number } = {};

  // --- Formulário de Gasto ---
  novoGasto: TransacaoPayload = this.emptyGasto();
  gastoTipo: 'avulsa' | 'fixa' | 'parcelada' = 'avulsa';

  // --- Formulário de Receita ---
  novaReceita: TransacaoPayload = this.emptyReceita();

  // --- Modal de Edição ---
  selectedTransaction: Transacao | null = null;
  editPayload: TransacaoEditPayload = this.emptyEdit();

  // --- Modal Detalhes Card ---
  detailsModalTitle: string = '';
  detailsModalTransactions: Transacao[] = [];
  detailsModalValue: number = 0;

  // Importação TXT
  importedTransactions: any[] = [];
  isImporting = false;

  constructor() {}
  // ────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const today = new Date();
    // Ajuste fuso local para evitar problemas de dias cortados
    this.todayDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    this.selectedMonth = String(today.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(today.getFullYear());

    // Carrega config de período e dados em paralelo
    this.financeService.getPeriodoConfig().subscribe({
      next: (config) => {
        this.diaInicioPeriodo = config.dia_inicio;
        this.loadTransacoes();
      },
      error: () => {
        // usa padrão = 1 (mês cheio) e carrega assim mesmo
        this.loadTransacoes();
      }
    });

    this.isLoadingDependents = true;
    forkJoin({
      categorias: this.financeService.getCategorias(),
      metodos: this.financeService.getMetodosPagamento(),
      periodos: this.financeService.getPeriodos(),
    }).subscribe({
      next: ({ categorias, metodos, periodos }) => {
        this.categorias = categorias;
        this.metodos = metodos;
        this.periods = periodos;

        const currentYear = String(new Date().getFullYear());
        const years = [...new Set(periodos.map(p => p.year))]
          .filter(y => Number(y) <= Number(currentYear))
          .sort((a, b) => Number(b) - Number(a));
        if (!years.includes(this.selectedYear)) years.unshift(this.selectedYear);
        this.availableYears = years;
        this.isLoadingDependents = false;
      },
      error: (err) => {
        this.errorMsg = 'Erro ao conectar com a base de dados de combos. Verifique o servidor.';
        this.isLoadingDependents = false;
        console.error(err);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // CARREGAMENTO DE TRANSAÇÕES
  // ────────────────────────────────────────────────────────────

  get selectedPeriod(): string {
    return `${this.selectedYear}-${this.selectedMonth}`;
  }

  // Calcula o intervalo de datas conforme o dia de início configurado
  get periodoDateRange(): { from: string; to: string } {
    const month = parseInt(this.selectedMonth, 10);
    const year = parseInt(this.selectedYear, 10);
    const dia = this.diaInicioPeriodo;

    if (dia === 1) {
      // Período padrão: 1º dia ao último dia do mês selecionado
      const lastDay = new Date(year, month, 0).getDate();
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }

    // Período personalizado: dia_inicio do mês anterior até dia_inicio-1 do mês selecionado
    // dateFrom: dia_inicio no mês anterior
    const prevDate = new Date(year, month - 2, dia); // month-2 porque month é 1-based e Date é 0-based
    const fromY = prevDate.getFullYear();
    const fromM = String(prevDate.getMonth() + 1).padStart(2, '0');
    const fromD = String(prevDate.getDate()).padStart(2, '0');

    // dateTo: dia_inicio - 1 do mês selecionado
    const toDate = new Date(year, month - 1, dia - 1);
    const toY = toDate.getFullYear();
    const toM = String(toDate.getMonth() + 1).padStart(2, '0');
    const toD = String(toDate.getDate()).padStart(2, '0');

    return {
      from: `${fromY}-${fromM}-${fromD}`,
      to:   `${toY}-${toM}-${toD}`
    };
  }

  // Label legível do período para exibir abaixo do seletor
  get periodoLabel(): string {
    const { from, to } = this.periodoDateRange;
    const fmt = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return `${d}/${meses[parseInt(m, 10) - 1]}/${y}`;
    };
    return `${fmt(from)} – ${fmt(to)}`;
  }

  getSelectedMonthLabel(): string {
    const m = this.months.find(x => x.value === this.selectedMonth);
    return m ? m.label : 'Mês';
  }

  setPeriodToToday(): void {
    const today = new Date();
    this.selectedMonth = String(today.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(today.getFullYear());
    this.onPeriodChange();
  }

  onPeriodChange(): void {
    this.filterCategoriaFixos = '';
    this.filterCategoriaGerais = '';
    this.loadTransacoes();
  }

  loadTransacoes(): void {
    this.isLoadingTransacoes = true;
    this.errorMsg = null;
    const { from, to } = this.periodoDateRange;
    
    forkJoin({
      saldo: this.financeService.getSaldoAcumulado(from),
      linhas: this.financeService.getTransacoes(from, to)
    }).subscribe({
      next: (result) => {
        this.saldoAnterior = result.saldo.saldo_acumulado;
        this.saldoAnteriorMetodos = result.saldo.saldos_metodos || {};
        this.transacoes = result.linhas;
        this.isLoadingTransacoes = false;
      },
      error: (err) => {
        this.errorMsg = 'Erro ao carregar transações ou saldo.';
        this.isLoadingTransacoes = false;
        console.error(err);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // GETTERS / FILTROS
  // ────────────────────────────────────────────────────────────

  get categoriasReceita(): Categoria[] {
    return this.categorias.filter(c => c.tipo_categoria === 1);
  }

  get categoriasGasto(): Categoria[] {
    return this.categorias.filter(c => c.tipo_categoria === 2);
  }

  get recorrentes(): Transacao[] {
    return this.transacoes.filter(t =>
      (t.tipo_name === 'fixa' || t.tipo_name === 'parcelada') &&
      t.direcao_name === 'gasto'
    );
  }

  get recorrentesFiltrados(): Transacao[] {
    if (!this.filterCategoriaFixos) return this.recorrentes;
    return this.recorrentes.filter(t => t.categoria === this.filterCategoriaFixos);
  }

  get categoriasUnicasFixos(): {nome: string, icone: string}[] {
    const catsMap = new Map<string, string>();
    this.recorrentes.forEach(t => {
      if (t.categoria) catsMap.set(t.categoria, t.categoria_icone || '🏷️');
    });
    return Array.from(catsMap.entries())
      .map(([nome, icone]) => ({ nome, icone }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  get avulsas(): Transacao[] {
    return this.transacoes.filter(t =>
      t.tipo_name === 'avulsa' &&
      t.direcao_name === 'gasto'
    );
  }

  // Aportes / Transferências para investimento
  get aportesInvestimento(): Transacao[] {
    return this.transacoes.filter(t =>
      t.direcao_name === 'gasto' &&
      t.metodo_tipo === 'investimento'
    );
  }

  get resgatesInvestimento(): Transacao[] {
    return this.transacoes.filter(t =>
      t.direcao_name === 'receita' &&
      t.metodo_tipo === 'investimento'
    );
  }

  get totalInvestimentos(): number {
    const aportes = this.aportesInvestimento.reduce((acc, t) => acc + Number(t.valor), 0);
    const resgates = this.resgatesInvestimento.reduce((acc, t) => acc + Number(t.valor), 0);
    return aportes - resgates;
  }

  get receitas(): Transacao[] {
    return this.transacoes.filter(t => t.direcao_name === 'receita');
  }

  get categoriasUnicasGerais(): {nome: string, icone: string}[] {
    const list = [...this.avulsas, ...this.receitas];
    const catsMap = new Map<string, string>();
    list.forEach(t => {
      if (t.categoria) catsMap.set(t.categoria, t.categoria_icone || '🏷️');
    });
    return Array.from(catsMap.entries())
      .map(([nome, icone]) => ({ nome, icone }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  get transacoesGeraisFiltradas(): Transacao[] {
    // Junta avulsas (gastos) e receitas
    let list = [...this.avulsas, ...this.receitas];

    // Aplica o filtro de categoria
    if (this.filterCategoriaGerais) {
      list = list.filter(t => t.categoria === this.filterCategoriaGerais);
    }

    // Aplica o filtro de texto
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(t => 
        t.descricao.toLowerCase().includes(term) ||
        t.categoria.toLowerCase().includes(term) ||
        t.metodoPagamento.toLowerCase().includes(term)
      );
    }

    // Aplica a ordenação
    list.sort((a, b) => {
      let valA: any = a[this.sortColumn];
      let valB: any = b[this.sortColumn];

      if (this.sortColumn === 'valor') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (this.sortColumn === 'data') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  toggleSort(column: 'data' | 'valor' | 'descricao' | 'categoria'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc'; // Padrão ao trocar coluna
    }
  }

  get totalReceitas(): number {
    return this.receitas
      .filter(t => t.metodo_tipo !== 'investimento')
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }

  get totalGastosAvulsos(): number {
    return this.avulsas
      .filter(t => t.metodo_tipo === 'padrao')
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }

  get totalFixos(): number {
    return this.recorrentes
      .filter(t => t.metodo_tipo === 'padrao')
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }

  get totalCartaoCredito(): number {
    return this.transacoes
      .filter(t => t.metodo_tipo === 'credito' && t.direcao_name === 'gasto')
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }

  get totalGastos(): number {
    return this.totalGastosAvulsos + this.totalFixos;
  }

  // Saldo real: receitas realizadas − gastos realizados excluindo crédito e investimento
  get saldoAtual(): number {
    const realizadasRec = this.receitas
      .filter(t => t.data <= this.todayDateStr && t.metodo_tipo !== 'investimento')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const resgatesRealizados = this.resgatesInvestimento
      .filter(t => t.data <= this.todayDateStr)
      .reduce((acc, t) => acc + Number(t.valor), 0);

    // Gastos que já saíram do caixa: só métodos "padrao" (nem crédito, nem investimento)
    const realizadasGas =
      this.avulsas
        .filter(t => t.data <= this.todayDateStr && t.metodo_tipo === 'padrao')
        .reduce((acc, t) => acc + Number(t.valor), 0) +
      this.recorrentes
        .filter(t => t.data <= this.todayDateStr && t.metodo_tipo === 'padrao')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    // Aportes de investimento realizados também saem do caixa
    const aportesRealizados = this.aportesInvestimento
      .filter(t => t.data <= this.todayDateStr)
      .reduce((acc, t) => acc + Number(t.valor), 0);

    return Number((this.saldoAnterior + realizadasRec + resgatesRealizados - realizadasGas - aportesRealizados).toFixed(2));
  }

  get saldoContaCorrente(): number {
    return Number((this.saldoAtual - this.saldoCarteira).toFixed(2));
  }

  get saldoCarteira(): number {
    const prev = this.saldoAnteriorMetodos['Carteira'] || 0;
    
    const realizadasRec = this.receitas
      .filter(t => t.data <= this.todayDateStr && t.metodoPagamento === 'Carteira')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const realizadasGas = this.avulsas
      .filter(t => t.data <= this.todayDateStr && t.metodoPagamento === 'Carteira')
      .reduce((acc, t) => acc + Number(t.valor), 0) +
      this.recorrentes
        .filter(t => t.data <= this.todayDateStr && t.metodoPagamento === 'Carteira')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    return Number((prev + realizadasRec - realizadasGas).toFixed(2));
  }

  // Projeção: considera todos os gastos (incluindo crédito) e aportes de investimento
  get projecaoSaldo(): number {
    return Number((this.saldoAnterior + this.totalReceitas - this.totalGastos - this.totalInvestimentos).toFixed(2));
  }

  // ────────────────────────────────────────────────────────────
  // SALVAR GASTO
  // ────────────────────────────────────────────────────────────

  onGastoTipoChange(): void {
    this.novoGasto.tipo = this.gastoTipo === 'avulsa' ? undefined : this.gastoTipo;
    if (this.gastoTipo !== 'parcelada') {
      this.novoGasto.total_parcelas = undefined;
    }
  }

  salvarGasto(): void {
    const payload: TransacaoPayload = {
      ...this.novoGasto,
      direcao: 'gasto',
      tipo: this.gastoTipo !== 'avulsa' ? this.gastoTipo : undefined,
    };

    this.financeService.criarTransacao(payload).subscribe({
      next: () => {
        this.novoGasto = this.emptyGasto();
        this.gastoTipo = 'avulsa';
        this.loadTransacoes();
        this.closeModal('gastoModal');
      },
      error: (err) => {
        this.errorMsg = 'Erro ao salvar gasto.';
        console.error(err);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // IMPORTAÇÃO TXT
  // ────────────────────────────────────────────────────────────
  triggerFileInput(): void {
    const fileInput = document.getElementById('importFile') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const contents = e.target.result;
      this.parseTXT(contents);
      event.target.value = ''; // reseta o input
    };
    reader.readAsText(file, 'UTF-8');
  }

  private parseTXT(contents: string): void {
    const lines = contents.split('\n');
    this.importedTransactions = [];
    
    for (let line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(';');
      if (parts.length >= 3) {
        // Ex: "27/02/2026", "COR DIVIDENDOS KLBN1", "6,83"
        const dataOriginal = parts[0].trim();
        const desc = parts[1].trim();
        const valStr = parts[2].trim().replace(',', '.'); // ajusta virgula para ponto se houver
        const valFloat = parseFloat(valStr);

        if (isNaN(valFloat)) continue;

        // Converter DD/MM/YYYY para YYYY-MM-DD
        let dataIso = '';
        const dateParts = dataOriginal.split('/');
        if (dateParts.length === 3) {
           dataIso = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        } else {
           dataIso = new Date().toISOString().split('T')[0];
        }

        const direcao = valFloat >= 0 ? 'receita' : 'gasto';
        const valorReal = Math.abs(valFloat);

        this.importedTransactions.push({
           data: dataIso,
           descricao: desc,
           valor: valorReal,
           direcao: direcao,
           categoria_id: null,
           metodo_pagamento_id: null
        });
      }
    }

    if (this.importedTransactions.length > 0) {
      this.openModal('importModal');
    } else {
      this.errorMsg = 'Nenhuma transação válida encontrada no arquivoTXT.';
    }
  }

  saveImportedTransactions(): void {
    const invalidItem = this.importedTransactions.find(t => !t.categoria_id || !t.metodo_pagamento_id || !t.descricao);
    if (invalidItem) {
       alert('Preencha a Categoria e Forma de Pagamento para todas as linhas antes de salvar!');
       return;
    }

    this.isImporting = true;
    const requests = this.importedTransactions.map(item => {
      const payload: TransacaoPayload = {
        descricao: item.descricao,
        valor: item.valor,
        data: item.data,
        categoria_id: item.categoria_id,
        metodo_pagamento_id: item.metodo_pagamento_id,
        direcao: item.direcao,
      };
      return this.financeService.criarTransacao(payload);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.isImporting = false;
        this.closeModal('importModal');
        this.importedTransactions = [];
        this.loadTransacoes();
      },
      error: (err) => {
        this.isImporting = false;
        this.errorMsg = 'Erro ao salvar algumas transações do lote.';
        console.error(err);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // SALVAR RECEITA
  // ────────────────────────────────────────────────────────────

  salvarReceita(): void {
    const payload: TransacaoPayload = {
      ...this.novaReceita,
      direcao: 'receita',
    };

    this.financeService.criarTransacao(payload).subscribe({
      next: () => {
        this.novaReceita = this.emptyReceita();
        this.loadTransacoes();
        this.closeModal('receitaModal');
      },
      error: (err) => {
        this.errorMsg = 'Erro ao salvar receita.';
        console.error(err);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // EDITAR / EXCLUIR
  // ────────────────────────────────────────────────────────────

  openEditModal(item: Transacao): void {
    this.selectedTransaction = { ...item };
    this.editPayload = {
      descricao: item.descricao,
      valor: item.valor,
      data: item.data,
      categoria_id: item.categoria_id,
      metodo_pagamento_id: item.metodo_pagamento_id,
      parcela_atual: item.parcela_atual,
      tipo: item.tipo_name as 'fixa' | 'parcelada',
      total_parcelas: item.recorrencia_total_parcelas || undefined,
    };
    this.openModal('editModal');
  }

  saveEdit(): void {
    if (!this.selectedTransaction) return;
    this.financeService.editarTransacao(this.selectedTransaction.id, this.editPayload).subscribe({
      next: () => {
        this.closeModal('editModal');
        this.loadTransacoes();
      },
      error: (err) => {
        this.errorMsg = 'Erro ao editar transação.';
        console.error(err);
      }
    });
  }

  confirmDeleteModal(): void {
    this.closeModal('editModal');
    this.openModal('deleteModal');
  }

  deleteTransactionConfirmed(deleteAll: boolean = false): void {
    if (!this.selectedTransaction) return;
    this.financeService.excluirTransacao(this.selectedTransaction.id, deleteAll).subscribe({
      next: () => {
        this.closeModal('deleteModal');
        this.loadTransacoes();
        this.selectedTransaction = null;
      },
      error: (err) => {
        this.errorMsg = 'Erro ao excluir transação.';
        console.error(err);
      }
    });
  }

  // ────────────────────────────────────────────────────────────
  // HELPERS MODAIS
  // ────────────────────────────────────────────────────────────

  openCardDetails(type: string): void {
    if (this.isLoadingTransacoes) return;

    this.detailsModalTransactions = [];
    
    switch (type) {
      case 'receitas':
        this.detailsModalTitle = 'Detalhes: Receitas do Mês';
        this.detailsModalTransactions = this.receitas.filter(t => t.metodo_tipo !== 'investimento');
        this.detailsModalValue = this.totalReceitas;
        break;
      case 'avulsas':
        this.detailsModalTitle = 'Detalhes: Gastos Avulsos';
        this.detailsModalTransactions = this.avulsas.filter(t => t.metodo_tipo !== 'investimento');
        this.detailsModalValue = this.totalGastosAvulsos * -1;
        break;
      case 'fixos':
        this.detailsModalTitle = 'Detalhes: Gastos Fixos e Parcelas';
        this.detailsModalTransactions = this.recorrentes.filter(t => t.metodo_tipo !== 'investimento');
        this.detailsModalValue = this.totalFixos * -1;
        break;
      case 'credito':
        this.detailsModalTitle = 'Detalhes: Fatura de Cartões de Crédito';
        this.detailsModalTransactions = this.transacoes.filter(t => t.metodo_tipo === 'credito' && t.direcao_name === 'gasto');
        this.detailsModalValue = this.totalCartaoCredito * -1;
        break;
      case 'investimentos':
        this.detailsModalTitle = 'Detalhes: Extrato de Investimento';
        this.detailsModalTransactions = [...this.aportesInvestimento, ...this.resgatesInvestimento].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        this.detailsModalValue = this.totalInvestimentos * -1;
        break;
      case 'projecao':
        this.detailsModalTitle = 'Detalhes: Composição da Projeção';
        this.detailsModalTransactions = this.transacoes;
        this.detailsModalValue = this.totalReceitas - this.totalGastos - this.totalInvestimentos;
        break;
      case 'saldo':
        this.detailsModalTitle = 'Detalhes: Composição do Saldo Atual';
        this.detailsModalTransactions = this.transacoes.filter(t => t.data <= this.todayDateStr);
        this.detailsModalValue = this.saldoAtual - this.saldoAnterior;
        break;
    }

    this.openModal('cardDetailsModal');
  }

  openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap?.Modal?.getOrCreateInstance(el)?.show();
  }

  closeModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap?.Modal?.getInstance(el)?.hide();
  }

  // ────────────────────────────────────────────────────────────
  // MÁSCARA DE MOEDA (Inputs)
  // ────────────────────────────────────────────────────────────

  onCurrencyInput(event: any, obj: any, field: string): void {
    let rawValue = event.target.value.replace(/\D/g, '');
    if (!rawValue) {
      obj[field] = null;
      event.target.value = '';
      return;
    }
    let numValue = parseInt(rawValue, 10) / 100;
    obj[field] = numValue;
    event.target.value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numValue);
  }

  getFormattedValue(val: number | null | undefined): string {
    if (val === null || val === undefined) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }

  // ────────────────────────────────────────────────────────────
  // FACTORIES
  // ────────────────────────────────────────────────────────────

  private emptyGasto(): TransacaoPayload {
    return {
      descricao: '',
      valor: 0,
      data: '',
      categoria_id: null,
      metodo_pagamento_id: null,
      direcao: 'gasto',
    };
  }

  private emptyReceita(): TransacaoPayload {
    return {
      descricao: '',
      valor: 0,
      data: '',
      categoria_id: null,
      metodo_pagamento_id: null,
      direcao: 'receita',
    };
  }

  private emptyEdit(): TransacaoEditPayload {
    return {
      descricao: '',
      valor: 0,
      data: '',
      categoria_id: null,
      metodo_pagamento_id: null,
      parcela_atual: null,
      tipo: undefined,
      total_parcelas: undefined,
    };
  }
}
