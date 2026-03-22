import { Injectable } from '@angular/core';
import { Gasto } from '../models/gasto.model';
import { Receita } from '../models/receita.model';

@Injectable({
  providedIn: 'root'
})

export class ReceitasService{
  private receita: Receita[] = [];

  adicionarReceita(receita: Receita) {
    this.receita.push(receita);
    this.receita.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    this.salvarLocalStorageReceita();
  }

  getReceita(): Receita[] {
    return this.receita.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  removerReceita(index: number) {
    this.receita.splice(index, 1);
    this.salvarLocalStorageReceita();
  }

  private salvarLocalStorageReceita() {
    localStorage.setItem('receitaList', JSON.stringify(this.receita));
  }
}

@Injectable({
  providedIn: 'root'
})
export class GastosService {
  private gastosFixos: Gasto[] = [];
  private gastosDiarios: Gasto[] = [];

  constructor() {
    this.carregarLocalStorage();
  }

  getGastosFixos(): Gasto[] {
    return this.gastosFixos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  getGastosDiarios(): Gasto[] {
    return this.gastosDiarios.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  adicionarGasto(gasto: Gasto) {
    if (gasto.isFixo) {
      this.gastosFixos.push(gasto);
      this.gastosFixos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    } else {
      this.gastosDiarios.push(gasto);
      this.gastosDiarios.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }
    this.salvarLocalStorage();
  }

  removerGasto(index: number, isFixo: boolean) {
    if (isFixo) {
      this.gastosFixos.splice(index, 1);
    } else {
      this.gastosDiarios.splice(index, 1);
    }
    this.salvarLocalStorage();
  }

  private salvarLocalStorage() {
    localStorage.setItem('gastosFixos', JSON.stringify(this.gastosFixos));
    localStorage.setItem('gastosDiarios', JSON.stringify(this.gastosDiarios));
  }

  private carregarLocalStorage() {
    const fixos = localStorage.getItem('gastosFixos');
    const diarios = localStorage.getItem('gastosDiarios');

    if (fixos) this.gastosFixos = JSON.parse(fixos);
    if (diarios) this.gastosDiarios = JSON.parse(diarios);
  }
}
