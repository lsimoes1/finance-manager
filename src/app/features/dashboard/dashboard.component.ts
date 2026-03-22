import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { forkJoin } from 'rxjs';

import { FinanceService } from '../../core/services/finance.service';
import { Transacao } from '../../core/models/transacao.model';
import { Periodo } from '../../core/models/periodo.model';

interface ChartData {
  label: string;
  name: string;
  valor: number;
  percentual: number;
  cor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDropdownModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('400ms cubic-bezier(0.25, 1, 0.5, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('barStagger', [
      transition(':enter', [
        query('.bar-row', [
          style({ opacity: 0, width: '0%', transform: 'translateX(-10px)' }),
          stagger(100, [
            animate('600ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, width: '*', transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  private readonly financeService = inject(FinanceService);

  // --- Filtros ---
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

  transacoes: Transacao[] = [];
  isLoading = false;

  // --- Modal Detalhes ---
  detailsModalTitle: string = '';
  detailsModalTransactions: Transacao[] = [];
  detailsModalValue: number = 0;

  // --- Resumo e Gráficos ---
  totalGastos = 0;
  totalReceitas = 0;
  saldoRestante = 0;
  taxaGasto = 0; // % da receita que foi gasto
  
  gastosPorCategoria: ChartData[] = [];
  gastosPorMetodo: ChartData[] = [];

  readonly COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#14b8a6', '#f97316'];

  // --- Config de Período ---
  diaInicioPeriodo: number = 1;

  ngOnInit() {
    const today = new Date();
    this.selectedMonth = String(today.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(today.getFullYear());

    this.financeService.getPeriodoConfig().subscribe({
      next: (config) => {
        this.diaInicioPeriodo = config.dia_inicio;
        this.loadData();
      },
      error: () => {
        this.loadData();
      }
    });

    this.financeService.getPeriodos().subscribe(periodos => {
      this.periods = periodos;
      const currentYear = String(new Date().getFullYear());
      const years = [...new Set(periodos.map(p => p.year))]
        .filter(y => Number(y) <= Number(currentYear))
        .sort((a, b) => Number(b) - Number(a));
      if (!years.includes(this.selectedYear)) years.unshift(this.selectedYear);
      this.availableYears = years;
    });
  }

  get periodoDateRange(): { from: string; to: string } {
    const month = parseInt(this.selectedMonth, 10);
    const year = parseInt(this.selectedYear, 10);
    const dia = this.diaInicioPeriodo;

    if (dia === 1) {
      const lastDay = new Date(year, month, 0).getDate();
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }

    const prevDate = new Date(year, month - 2, dia);
    const fromY = prevDate.getFullYear();
    const fromM = String(prevDate.getMonth() + 1).padStart(2, '0');
    const fromD = String(prevDate.getDate()).padStart(2, '0');

    const toDate = new Date(year, month - 1, dia - 1);
    const toY = toDate.getFullYear();
    const toM = String(toDate.getMonth() + 1).padStart(2, '0');
    const toD = String(toDate.getDate()).padStart(2, '0');

    return {
      from: `${fromY}-${fromM}-${fromD}`,
      to:   `${toY}-${toM}-${toD}`
    };
  }

  getSelectedMonthLabel(): string {
    const m = this.months.find(x => x.value === this.selectedMonth);
    return m ? m.label : 'Mês';
  }

  onPeriodChange(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    const { from, to } = this.periodoDateRange;
    this.financeService.getTransacoes(from, to).subscribe({
      next: (rows) => {
        this.transacoes = rows;
        this.processDashboards();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar dados do dashboard', err);
        this.isLoading = false;
      }
    });
  }

  processDashboards(): void {
    // 1. Totais ignorando investimentos
    this.totalReceitas = this.transacoes
      .filter(t => t.direcao_name === 'receita' && t.metodo_tipo !== 'investimento')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    this.totalGastos = this.transacoes
      .filter(t => t.direcao_name === 'gasto' && t.metodo_tipo !== 'investimento')
      .reduce((acc, t) => acc + Number(t.valor), 0);

    this.saldoRestante = this.totalReceitas - this.totalGastos;
    this.taxaGasto = this.totalReceitas > 0 ? (this.totalGastos / this.totalReceitas) : 0;

    // 2. Agrupar por Categoria (apenas gastos reais)
    const mapCat = new Map<string, { label: string, valor: number }>();
    this.transacoes.filter(t => t.direcao_name === 'gasto' && t.metodo_tipo !== 'investimento').forEach(t => {
      const label = (t.categoria_icone || '🏷️') + ' ' + t.categoria;
      const current = mapCat.get(t.categoria) || { label, valor: 0 };
      mapCat.set(t.categoria, { label, valor: current.valor + Number(t.valor) });
    });

    this.gastosPorCategoria = Array.from(mapCat.entries())
      .map(([name, data], index) => ({
        label: data.label,
        name,
        valor: data.valor,
        percentual: this.totalGastos > 0 ? data.valor / this.totalGastos : 0,
        cor: this.COLORS[index % this.COLORS.length]
      }))
      .sort((a, b) => b.valor - a.valor);

    // 3. Agrupar por Método de Pagamento (apenas gastos reais)
    const mapMet = new Map<string, { label: string, valor: number }>();
    this.transacoes.filter(t => t.direcao_name === 'gasto' && t.metodo_tipo !== 'investimento').forEach(t => {
      const label = (t.metodo_icone || '🪙') + ' ' + t.metodoPagamento;
      const current = mapMet.get(t.metodoPagamento) || { label, valor: 0 };
      mapMet.set(t.metodoPagamento, { label, valor: current.valor + Number(t.valor) });
    });

    this.gastosPorMetodo = Array.from(mapMet.entries())
      .map(([name, data], index) => ({
        label: data.label,
        name,
        valor: data.valor,
        percentual: this.totalGastos > 0 ? data.valor / this.totalGastos : 0,
        cor: this.COLORS[(index + 3) % this.COLORS.length] // Pega cores diferentes do array
      }))
      .sort((a, b) => b.valor - a.valor);
  }

  get conicGradientGastos(): string {
    let currentAngle = 0;
    const segments = this.gastosPorCategoria.map((item) => {
      const angle = item.percentual * 360;
      const segment = `${item.cor} ${currentAngle}deg ${currentAngle + angle}deg`;
      currentAngle += angle;
      return segment;
    });
    return segments.length ? segments.join(', ') : '#e5e7eb 0deg 360deg';
  }

  // ────────────────────────────────────────────────────────────
  // HELPERS MODAIS
  // ────────────────────────────────────────────────────────────

  openDetails(type: 'categoria' | 'metodo', item: ChartData): void {
    if (this.isLoading) return;
    
    this.detailsModalTitle = `Gastos com ${type === 'categoria' ? 'Categoria: ' : 'Forma de Pagto: '} ${item.label}`;
    this.detailsModalValue = item.valor * -1; // showing as gasto (negative)

    let filtered = this.transacoes.filter(t => t.direcao_name === 'gasto' && t.metodo_tipo !== 'investimento');
    if (type === 'categoria') {
       filtered = filtered.filter(t => t.categoria === item.name);
    } else {
       filtered = filtered.filter(t => t.metodoPagamento === item.name);
    }
    
    this.detailsModalTransactions = filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    this.openModal('dashDetailsModal');
  }

  openModal(id: string): void {
    const el = document.getElementById(id);
    if (el) (window as any).bootstrap?.Modal?.getOrCreateInstance(el)?.show();
  }
}
