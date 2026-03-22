import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { FinanceService } from '../../core/services/finance.service';
import { Categoria } from '../../core/models/categoria.model';
import { MetodoPagamento } from '../../core/models/metodo-pagamento.model';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
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
    ])
  ]
})
export class ConfiguracoesComponent implements OnInit {
  private readonly financeService = inject(FinanceService);

  categorias: Categoria[] = [];
  metodos: MetodoPagamento[] = [];

  isLoading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  // --- Período Financeiro ---
  diaInicioPeriodo: number = 1;
  diaInicioPeriodoInput: number = 1;
  isLoadingPeriodo = false;

  // --- UI State Variáveis --- //
  novaCategoriaNome = '';
  novaCategoriaTipo = 2; // 1=Receita, 2=Gasto
  novaCategoriaIcone = '🏷️';
  
  showEmojiPickerCat = false;
  showEmojiPickerEditCat = false;
  emojiSearchCat = '';
  emojiSearchEditCat = '';
  emojiSearchMet = '';
  emojiSearchEditMet = '';

  EMOJI_DB = [
    { e: '🏷️', n: 'etiqueta padrao geral' },
    { e: '😀', n: 'feliz sorriso rosto' },{ e: '😂', n: 'rindo risada' },{ e: '😎', n: 'oculos legal' },{ e: '🤡', n: 'palhaco' },{ e: '👻', n: 'fantasma' },{ e: '👽', n: 'alien ET' },{ e: '🤖', n: 'robo tecnologia' },
    { e: '👶', n: 'bebe crianca filho' },{ e: '🐶', n: 'cachorro pet animal' },{ e: '🐱', n: 'gato pet animal' },{ e: '🐾', n: 'patas pet animal' },
    { e: '🏠', n: 'casa moradia aluguel lar financiamento' },{ e: '🏡', n: 'casa arvore jardim' },{ e: '🏢', n: 'predio apartamento condominio' },{ e: '🏥', n: 'hospital saude medico plano' },
    { e: '🛒', n: 'mercado supermercado compras' },{ e: '🍔', n: 'lanche comida ifood hamburguer restaurante' },{ e: '🍕', n: 'pizza comida' },{ e: '🥗', n: 'salada dieta saudavel' },{ e: '🍿', n: 'pipoca cinema diversao' },{ e: '☕', n: 'cafe padaria' },{ e: '🍻', n: 'cerveja bar bebida happy hour' },{ e: '🥩', n: 'carne acougue churrasco' },
    { e: '🚗', n: 'carro uber 99 veiculo' },{ e: '🏍️', n: 'moto motocicleta gasolina automovel' },{ e: '🛵', n: 'scooter moto biz' },{ e: '🚲', n: 'bicicleta bike' },{ e: '🚌', n: 'onibus transporte passagem' },{ e: '✈️', n: 'aviao viagem ferias' },{ e: '⛽', n: 'posto gasolina combustivel' },
    { e: '👕', n: 'roupa camisa vestuario shopping' },{ e: '👗', n: 'vestido roupa' },{ e: '👟', n: 'tenis sapato' },
    { e: '📱', n: 'celular telefone internet plano' },{ e: '💻', n: 'computador notebook eletronico' },{ e: '📺', n: 'tv televisao streaming' },{ e: '🎮', n: 'videogame jogo diversao' },{ e: '🎵', n: 'musica spotify show' },
    { e: '🎓', n: 'escola faculdade educacao curso formatura' },{ e: '🎒', n: 'mochila material escolar' },
    { e: '🎁', n: 'presente festa doacao aniversario' },{ e: '🎉', n: 'festa comemoracao balada' },
    { e: '⚡', n: 'energia luz eletricidade conta' },{ e: '💧', n: 'agua conta saneamento' },{ e: '🔥', n: 'gas fogo' },{ e: '🌐', n: 'internet site web' },{ e: '🧹', n: 'limpeza faxina diarista' },
    { e: '💊', n: 'remedio farmacia saude' },{ e: '🦷', n: 'dente dentista' },{ e: '💇', n: 'cabelo salao cabeleireiro estetica' },
    { e: '💼', n: 'trabalho salario emprego empresa' },{ e: '💰', n: 'dinheiro investimento renda' },{ e: '🪙', n: 'moeda troco' },{ e: '💸', n: 'pagamento pix despesa' },{ e: '💳', n: 'cartao credito debito' },{ e: '🧾', n: 'boleto conta imposto' },{ e: '📈', n: 'lucro investimento acoes' },{ e: '🏦', n: 'banco investimento taxa' },
    { e: 'Gym', n: 'academia' },{ e: '✝️', n: 'igreja dizimo oferta' },{ e: '⚽', n: 'futebol esporte quadra' }
  ];

  novoMetodoNome = '';
  novoMetodoIcone = '🪙';
  novoMetodoTipo = 'padrao';

  editCategoria: Categoria | null = null;
  editMetodo: MetodoPagamento | null = null;
  
  showEmojiPickerMet = false;
  showEmojiPickerEditMet = false;

  // Variáveis do Modal de Exclusão
  itemToDelete: any = null;
  deleteType: 'categoria' | 'metodo' | null = null;

  ngOnInit(): void {
    this.loadData();
    this.loadPeriodoConfig();
  }

  loadPeriodoConfig(): void {
    this.financeService.getPeriodoConfig().subscribe({
      next: (config) => {
        this.diaInicioPeriodo = config.dia_inicio;
        this.diaInicioPeriodoInput = config.dia_inicio;
      },
      error: () => { /* usa default = 1 */ }
    });
  }

  salvarPeriodo(): void {
    const dia = Number(this.diaInicioPeriodoInput);
    if (!dia || dia < 1 || dia > 28) {
      this.showError('O dia de início deve ser entre 1 e 28.');
      return;
    }
    this.isLoadingPeriodo = true;
    this.financeService.salvarPeriodoConfig(dia).subscribe({
      next: () => {
        this.diaInicioPeriodo = dia;
        this.isLoadingPeriodo = false;
        this.showSuccess(`Período atualizado! Agora o ciclo inicia no dia ${dia} de cada mês.`);
      },
      error: () => {
        this.isLoadingPeriodo = false;
        this.showError('Erro ao salvar a configuração de período.');
      }
    });
  }

  // Exemplo de período resultante (para preview na tela)
  get exemploPeriodo(): string {
    const dia = Number(this.diaInicioPeriodoInput) || 1;
    if (dia === 1) return 'Ex: 01/mar – 31/mar (mês completo)';
    const hoje = new Date();
    const mes = hoje.getMonth(); // 0-based
    const ano = hoje.getFullYear();
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mesNome = meses[mes];
    const mesAnteriorNome = meses[(mes - 1 + 12) % 12];
    const diaFim = dia - 1;
    return `Ex: ${String(dia).padStart(2,'0')}/${mesAnteriorNome} – ${String(diaFim).padStart(2,'0')}/${mesNome}`;
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      cat: this.financeService.getCategorias(),
      met: this.financeService.getMetodosPagamento()
    }).subscribe({
      next: ({ cat, met }) => {
        this.categorias = cat;
        this.metodos = met;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = 'Erro ao carregar dados do servidor.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // --- EMOJI PICKER --- //
  getFilteredEmojis(term: string) {
    if (!term) return this.EMOJI_DB;
    const t = term.toLowerCase();
    return this.EMOJI_DB.filter(x => x.n.includes(t));
  }

  toggleEmojiPicker(type: 'new'|'edit') {
    if (type === 'new') this.showEmojiPickerCat = !this.showEmojiPickerCat;
    else this.showEmojiPickerEditCat = !this.showEmojiPickerEditCat;
  }

  selectEmoji(emoji: string, type: 'new'|'edit') {
    if (type === 'new') {
      this.novaCategoriaIcone = emoji;
      this.showEmojiPickerCat = false;
    } else if (this.editCategoria) {
      this.editCategoria.icone = emoji;
      this.showEmojiPickerEditCat = false;
    }
  }

  toggleEmojiPickerMet(type: 'new'|'edit') {
    if (type === 'new') this.showEmojiPickerMet = !this.showEmojiPickerMet;
    else this.showEmojiPickerEditMet = !this.showEmojiPickerEditMet;
  }

  selectEmojiMet(emoji: string, type: 'new'|'edit') {
    if (type === 'new') {
      this.novoMetodoIcone = emoji;
      this.showEmojiPickerMet = false;
    } else if (this.editMetodo) {
      this.editMetodo.icone = emoji;
      this.showEmojiPickerEditMet = false;
    }
  }

  // --- CATEGORIAS --- //
  adicionarCategoria(): void {
    if (!this.novaCategoriaNome.trim()) return;
    this.financeService.criarCategoria({ 
       nome: this.novaCategoriaNome, 
       tipo_categoria: this.novaCategoriaTipo,
       icone: this.novaCategoriaIcone
    }).subscribe({
      next: () => {
        this.novaCategoriaNome = '';
        this.novaCategoriaIcone = '🏷️';
        this.showSuccess('Categoria salva com sucesso!');
        this.loadData();
      },
      error: () => this.showError('Não foi possível criar a categoria.')
    });
  }

  iniciarEdicaoCategoria(c: Categoria): void {
    this.editCategoria = { ...c };
  }

  salvarEdicaoCategoria(): void {
    if (!this.editCategoria || !this.editCategoria.nome.trim()) return;
    this.financeService.editarCategoria(this.editCategoria.id, { 
       nome: this.editCategoria.nome, 
       tipo_categoria: this.editCategoria.tipo_categoria,
       icone: this.editCategoria.icone
    }).subscribe({
      next: () => {
        this.editCategoria = null;
        this.showSuccess('Categoria atualizada!');
        this.loadData();
      },
      error: () => this.showError('Erro ao atualizar categoria.')
    });
  }

  cancelarEdicaoCategoria(): void {
    this.editCategoria = null;
  }

  // --- DELEÇÃO VIA MODAL --- //
  abrirModalDeletar(tipo: 'categoria' | 'metodo', item: any): void {
    this.deleteType = tipo;
    this.itemToDelete = item;
    const modalElement = document.getElementById('deleteConfigModal');
    if (modalElement) {
       // @ts-ignore
       const modal = new bootstrap.Modal(modalElement);
       modal.show();
    }
  }

  fecharModalDeletar(): void {
    const modalElement = document.getElementById('deleteConfigModal');
    if (modalElement) {
       // @ts-ignore
       const modal = bootstrap.Modal.getInstance(modalElement);
       if(modal) modal.hide();
    }
    this.deleteType = null;
    this.itemToDelete = null;
  }

  confirmDelete(): void {
    if (!this.itemToDelete) return;
    
    if (this.deleteType === 'categoria') {
       this.financeService.excluirCategoria(this.itemToDelete.id).subscribe({
         next: () => {
           this.fecharModalDeletar();
           this.showSuccess('Categoria removida.');
           this.loadData();
         },
         error: () => {
           this.fecharModalDeletar();
           this.showError('Erro ao apagar. Ela pode estar em uso em transações.');
         }
       });
    } else if (this.deleteType === 'metodo') {
       this.financeService.excluirMetodoPagamento(this.itemToDelete.id).subscribe({
         next: () => {
           this.fecharModalDeletar();
           this.showSuccess('Método removido.');
           this.loadData();
         },
         error: () => {
           this.fecharModalDeletar();
           this.showError('Erro ao apagar. Ele pode estar em uso em transações.');
         }
       });
    }
  }

  // --- HELPERS --- //

  // --- MÉTODOS DE PAGAMENTO --- //
  adicionarMetodo(): void {
    if (!this.novoMetodoNome.trim()) return;
    this.financeService.criarMetodoPagamento({ nome: this.novoMetodoNome, icone: this.novoMetodoIcone, tipo: this.novoMetodoTipo }).subscribe({
      next: () => {
        this.novoMetodoNome = '';
        this.novoMetodoIcone = '🪙';
        this.novoMetodoTipo = 'padrao';
        this.showSuccess('Método adicionado com sucesso!');
        this.loadData();
      },
      error: () => this.showError('Não foi possível criar o método de pagamento.')
    });
  }

  iniciarEdicaoMetodo(m: MetodoPagamento): void {
    this.editMetodo = { ...m };
  }

  salvarEdicaoMetodo(): void {
    if (!this.editMetodo || !this.editMetodo.nome.trim()) return;
    this.financeService.editarMetodoPagamento(this.editMetodo.id, { nome: this.editMetodo.nome, icone: this.editMetodo.icone, tipo: this.editMetodo.tipo }).subscribe({
      next: () => {
        this.editMetodo = null;
        this.showSuccess('Método de pagamento atualizado!');
        this.loadData();
      },
      error: () => this.showError('Erro ao atualizar o método.')
    });
  }

  cancelarEdicaoMetodo(): void {
    this.editMetodo = null;
  }

  // (Substituído por modal)

  // --- HELPERS --- //
  private showSuccess(msg: string) {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = null, 4000);
  }

  private showError(msg: string) {
    this.errorMsg = msg;
    setTimeout(() => this.errorMsg = null, 5000);
  }
}
