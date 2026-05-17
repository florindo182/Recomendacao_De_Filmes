// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return auth.checkSession().pipe(
    map(isLoggedIn => isLoggedIn ? true : router.createUrlTree(['/login'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

const adminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  return auth.checkSession().pipe(
    map(isLoggedIn => isLoggedIn && auth.isAdmin() ? true : router.createUrlTree(['/catalogo'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
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
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: 'catalogo' },
];
