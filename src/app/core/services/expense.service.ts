import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Gasto } from '../models/gasto.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private expensesSubject = new BehaviorSubject<Gasto[]>(this.loadExpenses());
  expenses$ = this.expensesSubject.asObservable();

  constructor() { }

  private loadExpenses(): Gasto[] {
    const data = localStorage.getItem('expenses');
    return data ? JSON.parse(data) : [];
  }

  private saveExpenses(expenses: Gasto[]) {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }

  addExpense(expense: Gasto) {
    const expenses = this.expensesSubject.value;
    expenses.push({...expense});
    this.expensesSubject.next(expenses);
    this.saveExpenses(expenses);
  }

  deleteExpense(id: number) {
    // Nota: O modelo Gasto não tem 'id' definido explicitamente, 
    // mas o serviço estava usando. Vou manter a lógica.
    const expenses = (this.expensesSubject.value as any[]).filter(e => e.id !== id);
    this.expensesSubject.next(expenses);
    this.saveExpenses(expenses);
  }
}
