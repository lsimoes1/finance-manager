import { Routes } from '@angular/router';
import { MensalComponent } from './features/mensal/mensal.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'controle', pathMatch: 'full' },
  { path: 'controle', component: MensalComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'configuracoes', loadComponent: () => import('./features/configuracoes/configuracoes.component').then(m => m.ConfiguracoesComponent) },
  { path: '**', redirectTo: '/controle' }
];
