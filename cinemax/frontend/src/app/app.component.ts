// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
      <a class="nav-brand" routerLink="/catalogo" [attr.aria-label]="'NAV.HOME' | translate">
        <span class="logo-icon">🎬</span>
        <span class="logo-text">CINEMAX</span>
      </a>

      <div class="nav-links" *ngIf="auth.isLoggedIn()">
        <a routerLink="/catalogo" routerLinkActive="active">{{ 'NAV.CATALOG' | translate }}</a>
        <a routerLink="/favoritos" routerLinkActive="active">{{ 'NAV.FAVORITES' | translate }}</a>
        <a routerLink="/recomendacoes" routerLinkActive="active">{{ 'NAV.RECOMMENDATIONS' | translate }}</a>
      </div>

      <div class="nav-actions">
        <div class="lang-switch" [attr.aria-label]="'LANGUAGE.SELECT' | translate">
          <button type="button" [class.active]="currentLang === 'pt'" (click)="changeLang('pt')">PT</button>
          <span>|</span>
          <button type="button" [class.active]="currentLang === 'en'" (click)="changeLang('en')">EN</button>
        </div>

        <button class="theme-btn" (click)="theme.toggle()" [title]="(theme.isDark() ? 'THEME.LIGHT' : 'THEME.DARK') | translate">
          {{ theme.isDark() ? '☀️' : '🌙' }}
        </button>

        <ng-container *ngIf="auth.isLoggedIn(); else guestActions">
          <button type="button" class="profile-avatar" [title]="auth.currentUser()?.nome || ('PROFILE.EYEBROW' | translate)" (click)="goProfile()">
            {{ userInitial() }}
          </button>
          <button class="btn-outline" (click)="logout()">{{ 'NAV.LOGOUT' | translate }}</button>
        </ng-container>

        <ng-template #guestActions>
          <a routerLink="/login" class="btn-outline">{{ 'NAV.LOGIN' | translate }}</a>
          <a routerLink="/registo" class="btn-primary">{{ 'NAV.REGISTER' | translate }}</a>
        </ng-template>
      </div>
    </nav>

    <main class="main-content">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <div class="footer-brand">
        <span class="logo-text">CINEMAX</span>
      </div>
      <p>{{ 'FOOTER.DESCRIPTION' | translate }}</p>
      <nav class="footer-links" [attr.aria-label]="'FOOTER.NAV_LABEL' | translate">
        <a routerLink="/catalogo">{{ 'NAV.CATALOG' | translate }}</a>
        <a routerLink="/favoritos" *ngIf="auth.isLoggedIn()">{{ 'NAV.FAVORITES' | translate }}</a>
        <a routerLink="/recomendacoes" *ngIf="auth.isLoggedIn()">{{ 'NAV.RECOMMENDATIONS' | translate }}</a>
      </nav>
      <small>{{ 'FOOTER.RIGHTS' | translate:{ year: currentYear } }}</small>
    </footer>
  `
})
export class AppComponent implements OnInit {
  currentLang: 'pt' | 'en' = (localStorage.getItem('lang') as 'pt' | 'en') || 'pt';
  currentYear = new Date().getFullYear();

  constructor(
    public theme: ThemeService,
    public auth: AuthService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.translate.setDefaultLang('pt');
    this.translate.use(this.currentLang);
  }

  changeLang(lang: 'pt' | 'en'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
  }

  userInitial(): string {
    return (this.auth.currentUser()?.nome || 'U').trim().charAt(0).toUpperCase();
  }

  goProfile(): void {
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}
