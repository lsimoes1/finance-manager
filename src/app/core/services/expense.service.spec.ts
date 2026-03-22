import { TestBed } from '@angular/core/testing';
import { ExpenseService } from './expense.service';
import { Gasto } from '../models/gasto.model';

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(() => {
    // Mock localStorage
    const store: any = {};
    spyOn(localStorage, 'getItem').and.callFake((key) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key, value) => store[key] = value + '');

    TestBed.configureTestingModule({
      providers: [ExpenseService]
    });
    service = TestBed.inject(ExpenseService);
  });

  it('deve adicionar despesa e atualizar o observable', (done) => {
    const newExpense: any = { id: 1, descricao: 'Teste', valor: 10 };
    service.addExpense(newExpense);
    
    service.expenses$.subscribe(expenses => {
      if (expenses.length > 0) {
        expect(expenses.length).toBe(1);
        expect(expenses[0].descricao).toBe('Teste');
        done();
      }
    });
  });

  it('deve deletar despesa', (done) => {
    const expense: any = { id: 1, descricao: 'Teste', valor: 10 };
    service.addExpense(expense);
    service.deleteExpense(1);
    
    service.expenses$.subscribe(expenses => {
      if (expenses.length === 0) {
        expect(expenses.length).toBe(0);
        done();
      }
    });
  });
});
