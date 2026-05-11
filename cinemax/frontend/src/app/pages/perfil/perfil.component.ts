// src/app/pages/perfil/perfil.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <section class="profile-page">
      <div class="profile-header">
        <div class="profile-avatar-lg">{{ initial }}</div>
        <div>
          <p class="eyebrow">{{ 'PROFILE.EYEBROW' | translate }}</p>
          <h1>{{ user?.nome }}</h1>
          <p class="email">{{ user?.email }}</p>
        </div>
      </div>

      <div class="profile-grid">
        <section class="profile-panel">
          <h2>{{ 'PROFILE.ACCOUNT_DATA' | translate }}</h2>
          <dl>
            <div>
              <dt>{{ 'AUTH.NAME' | translate }}</dt>
              <dd>{{ user?.nome }}</dd>
            </div>
            <div>
              <dt>{{ 'AUTH.EMAIL' | translate }}</dt>
              <dd>{{ user?.email }}</dd>
            </div>
            <div>
              <dt>{{ 'PROFILE.ACCOUNT_ID' | translate }}</dt>
              <dd>#{{ user?.id }}</dd>
            </div>
          </dl>
        </section>

        <section class="profile-panel">
          <h2>{{ 'PROFILE.SHORTCUTS' | translate }}</h2>
          <div class="quick-actions">
            <a routerLink="/favoritos">{{ 'PROFILE.VIEW_FAVORITES' | translate }}</a>
            <a routerLink="/recomendacoes">{{ 'PROFILE.VIEW_RECOMMENDATIONS' | translate }}</a>
            <a routerLink="/catalogo">{{ 'PROFILE.BACK_CATALOG' | translate }}</a>
          </div>
        </section>
      </div>

      <button class="danger-btn" (click)="logout()">{{ 'PROFILE.LOGOUT' | translate }}</button>
    </section>
  `,
  styles: [`
    .profile-page { max-width: 900px; margin: 0 auto; }
    .profile-header {
      display: flex; align-items: center; gap: 1.25rem;
      padding: 2rem 0 2.5rem; border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .profile-avatar-lg {
      width: 92px; height: 92px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--accent); color: #fff;
      font-size: 3rem; font-weight: 900;
      box-shadow: 0 24px 48px rgba(229,9,20,.22);
      flex-shrink: 0;
    }
    .eyebrow {
      margin: 0 0 .25rem; color: var(--accent);
      font-size: .78rem; font-weight: 900; letter-spacing: .12em;
      text-transform: uppercase;
    }
    h1 { margin: 0; color: var(--text-primary); font-size: 2rem; line-height: 1.15; }
    .email { margin: .35rem 0 0; color: var(--text-muted); }
    .profile-grid {
      display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(260px, .8fr);
      gap: 1.25rem; margin-bottom: 1.5rem;
    }
    .profile-panel {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 1.25rem;
    }
    h2 { margin: 0 0 1rem; color: var(--text-primary); font-size: 1.05rem; }
    dl { display: grid; gap: .9rem; margin: 0; }
    dl div {
      display: flex; justify-content: space-between; gap: 1rem;
      padding-bottom: .75rem; border-bottom: 1px solid var(--border);
    }
    dl div:last-child { border-bottom: 0; padding-bottom: 0; }
    dt { color: var(--text-muted); font-size: .85rem; }
    dd { margin: 0; color: var(--text-primary); font-weight: 700; text-align: right; }
    .quick-actions { display: grid; gap: .7rem; }
    .quick-actions a {
      text-decoration: none; color: var(--text-primary);
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 10px; padding: .8rem 1rem; font-weight: 800;
      transition: border-color .2s, color .2s;
    }
    .quick-actions a:hover { border-color: var(--accent); color: var(--accent); }
    .danger-btn {
      border: 1px solid rgba(229,9,20,.45); background: var(--accent-alpha);
      color: var(--accent); border-radius: 10px; padding: .75rem 1.2rem;
      font-weight: 900; cursor: pointer;
    }
    @media (max-width: 720px) {
      .profile-header { align-items: flex-start; flex-direction: column; }
      .profile-grid { grid-template-columns: 1fr; }
      dl div { flex-direction: column; gap: .15rem; }
      dd { text-align: left; }
    }
  `]
})
export class PerfilComponent {
  constructor(private auth: AuthService, private router: Router) {}

  get user() {
    return this.auth.currentUser();
  }

  get initial(): string {
    return (this.user?.nome || 'U').trim().charAt(0).toUpperCase();
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
