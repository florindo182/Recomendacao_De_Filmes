// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TranslateModule],
  template: `
    <nav class="navbar">
      <a class="nav-brand" routerLink="/catalogo" aria-label="Cinemax inicio">
        <span class="logo-icon">🎬</span>
        <span class="logo-text">CINEMAX</span>
      </a>

      <div class="nav-links" *ngIf="auth.isLoggedIn()">
        <a routerLink="/catalogo"         routerLinkActive="active">{{ 'NAV.CATALOG' | translate }}</a>
        <a routerLink="/favoritos"        routerLinkActive="active">{{ 'NAV.FAVORITES' | translate }}</a>
        <a routerLink="/recomendacoes"    routerLinkActive="active">{{ 'NAV.RECOMMENDATIONS' | translate }}</a>
      </div>

      <div class="nav-actions">
        <!-- Seletor de idioma -->
        <select class="lang-select" [value]="currentLang" (change)="changeLang($event)">
          <option value="pt">🇦🇴 PT</option>
          <option value="en">🇬🇧 EN</option>
        </select>

        <!-- Toggle tema -->
        <button class="theme-btn" (click)="theme.toggle()" [title]="(theme.isDark() ? 'THEME.LIGHT' : 'THEME.DARK') | translate">
          {{ theme.isDark() ? '☀️' : '🌙' }}
        </button>

        <ng-container *ngIf="auth.isLoggedIn(); else guestActions">
          <span class="user-name">{{ auth.currentUser()?.nome }}</span>
          <button class="btn-outline" (click)="logout()">{{ 'NAV.LOGOUT' | translate }}</button>
        </ng-container>

        <ng-template #guestActions>
          <a routerLink="/login"   class="btn-outline">{{ 'NAV.LOGIN' | translate }}</a>
          <a routerLink="/registo" class="btn-primary">{{ 'NAV.REGISTER' | translate }}</a>
        </ng-template>
      </div>
    </nav>

    <main class="main-content">
      <router-outlet />
    </main>
  `
})
export class AppComponent implements OnInit {
  currentLang = localStorage.getItem('lang') || 'pt';

  constructor(
    public theme: ThemeService,
    public auth: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.translate.setDefaultLang('pt');
    this.translate.use(this.currentLang);
  }

  changeLang(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value;
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}
