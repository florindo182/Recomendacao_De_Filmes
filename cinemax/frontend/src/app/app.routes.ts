// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const routes: Routes = [
  { path: '',           redirectTo: 'catalogo', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'registo',
    loadComponent: () => import('./pages/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: 'forgot',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalogo/catalogo.component').then(m => m.CatalogoComponent),
  },
  {
    path: 'filme/:id',
    loadComponent: () => import('./pages/filme-detalhe/filme-detalhe.component').then(m => m.FilmeDetalheComponent),
    canActivate: [authGuard],
  },
  {
    path: 'favoritos',
    loadComponent: () => import('./pages/favoritos/favoritos.component').then(m => m.FavoritosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'recomendacoes',
    loadComponent: () => import('./pages/recomendacoes/recomendacoes.component').then(m => m.RecomendacoesComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'catalogo' },
];
