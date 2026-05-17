import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminService, AdminStats, AdminUser } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <section class="admin-page">
      <header class="admin-header">
        <div>
          <p class="eyebrow">{{ 'ADMIN.EYEBROW' | translate }}</p>
          <h1>{{ 'ADMIN.TITLE' | translate }}</h1>
        </div>
        <button class="btn-outline" type="button" (click)="refresh()">{{ 'ADMIN.REFRESH' | translate }}</button>
      </header>

      <div class="stats-grid" *ngIf="stats">
        <article class="stat-card">
          <span>{{ 'ADMIN.USERS' | translate }}</span>
          <strong>{{ stats.summary.users }}</strong>
          <small>{{ stats.summary.activeUsers }} {{ 'ADMIN.ACTIVE' | translate }}</small>
        </article>
        <article class="stat-card">
          <span>{{ 'ADMIN.ADMINS' | translate }}</span>
          <strong>{{ stats.summary.admins }}</strong>
          <small>{{ 'ADMIN.ACCESS_CONTROL' | translate }}</small>
        </article>
        <article class="stat-card">
          <span>{{ 'ADMIN.MOVIES' | translate }}</span>
          <strong>{{ stats.summary.movies }}</strong>
          <small>{{ stats.summary.favorites }} {{ 'ADMIN.FAVORITES' | translate }}</small>
        </article>
        <article class="stat-card">
          <span>{{ 'ADMIN.RATINGS' | translate }}</span>
          <strong>{{ stats.summary.ratings }}</strong>
          <small>{{ stats.summary.averageRating }}/10 {{ 'ADMIN.AVERAGE' | translate }}</small>
        </article>
      </div>

      <div class="admin-grid">
        <section class="panel">
          <div class="panel-heading">
            <h2>{{ 'ADMIN.USERS' | translate }}</h2>
            <input
              class="search-input compact"
              type="text"
              [placeholder]="'ADMIN.SEARCH_USERS' | translate"
              [(ngModel)]="search"
              (ngModelChange)="search$.next($event)"
            />
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ 'AUTH.NAME' | translate }}</th>
                  <th>{{ 'AUTH.EMAIL' | translate }}</th>
                  <th>{{ 'ADMIN.ROLE' | translate }}</th>
                  <th>{{ 'ADMIN.STATUS' | translate }}</th>
                  <th>{{ 'ADMIN.ACTIVITY' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of users">
                  <td class="strong">{{ user.nome }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <select class="cell-select" [ngModel]="user.role" (ngModelChange)="setRole(user, $event)" [disabled]="isSelf(user)">
                      <option value="user">{{ 'ADMIN.USER' | translate }}</option>
                      <option value="admin">{{ 'ADMIN.ADMIN' | translate }}</option>
                    </select>
                  </td>
                  <td>
                    <button class="status-toggle" type="button" [class.active]="user.ativo" (click)="toggleActive(user)" [disabled]="isSelf(user)">
                      {{ (user.ativo ? 'ADMIN.ACTIVE' : 'ADMIN.INACTIVE') | translate }}
                    </button>
                  </td>
                  <td>{{ user.favoritos }} {{ 'ADMIN.FAVORITES_SHORT' | translate }} · {{ user.avaliacoes }} {{ 'ADMIN.RATINGS_SHORT' | translate }}</td>
                  <td>
                    <button class="danger-link" type="button" (click)="deleteUser(user)" [disabled]="isSelf(user)">
                      {{ 'GENERAL.DELETE' | translate }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="panel side-panel" *ngIf="stats">
          <h2>{{ 'ADMIN.TOP_GENRES' | translate }}</h2>
          <div class="genre-row" *ngFor="let genre of stats.topGenres">
            <span>{{ genre.nome }}</span>
            <strong>{{ genre.total }}</strong>
          </div>

          <h2 class="spaced">{{ 'ADMIN.RECENT_USERS' | translate }}</h2>
          <div class="recent-user" *ngFor="let user of stats.recentUsers">
            <span>{{ user.nome }}</span>
            <small>{{ user.email }}</small>
          </div>
        </aside>
      </div>

      <p class="alert alert-error" *ngIf="error">{{ error }}</p>
      <p class="alert alert-success" *ngIf="success">{{ success }}</p>
    </section>
  `,
  styles: [`
    .admin-page { display: grid; gap: 1.5rem; }
    .admin-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .eyebrow { color: var(--accent); font-size: .78rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 .25rem; }
    h1 { margin: 0; color: var(--text-primary); font-size: 2rem; }
    h2 { margin: 0; color: var(--text-primary); font-size: 1rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
    .stat-card, .panel {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 1.1rem;
    }
    .stat-card { display: grid; gap: .25rem; }
    .stat-card span, .stat-card small { color: var(--text-muted); font-size: .82rem; }
    .stat-card strong { color: var(--text-primary); font-size: 2rem; line-height: 1; }
    .admin-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1rem; align-items: start; }
    .panel-heading { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; }
    .compact { max-width: 280px; padding-left: 1rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th { text-align: left; color: var(--text-muted); font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; padding: .7rem; border-bottom: 1px solid var(--border); }
    td { color: var(--text-secondary); padding: .75rem .7rem; border-bottom: 1px solid var(--border); font-size: .88rem; }
    .strong { color: var(--text-primary); font-weight: 800; }
    .cell-select, .status-toggle {
      background: var(--surface2); color: var(--text-primary);
      border: 1px solid var(--border); border-radius: 8px;
      padding: .45rem .6rem; font: inherit; font-weight: 800;
    }
    .status-toggle { cursor: pointer; color: var(--text-muted); }
    .status-toggle.active { color: #22c55e; border-color: rgba(34,197,94,.35); }
    .danger-link { background: none; border: 0; color: var(--accent); font-weight: 900; cursor: pointer; }
    button:disabled, select:disabled { opacity: .45; cursor: not-allowed; }
    .side-panel { display: grid; gap: .75rem; }
    .genre-row, .recent-user {
      display: flex; justify-content: space-between; gap: 1rem;
      padding-bottom: .65rem; border-bottom: 1px solid var(--border);
      color: var(--text-secondary);
    }
    .recent-user { display: grid; gap: .1rem; justify-content: stretch; }
    .recent-user span { color: var(--text-primary); font-weight: 800; }
    .recent-user small { color: var(--text-muted); }
    .spaced { margin-top: 1rem; }
    .alert { padding: .75rem 1rem; border-radius: 8px; font-size: .875rem; }
    .alert-error { background: rgba(220,38,38,.15); color: #ef4444; border: 1px solid rgba(220,38,38,.3); }
    .alert-success { background: rgba(34,197,94,.15); color: #22c55e; border: 1px solid rgba(34,197,94,.3); }
    @media (max-width: 980px) {
      .stats-grid, .admin-grid { grid-template-columns: 1fr; }
      .panel-heading, .admin-header { align-items: flex-start; flex-direction: column; }
      .compact { max-width: none; }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  stats?: AdminStats;
  users: AdminUser[] = [];
  search = '';
  error = '';
  success = '';
  search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private admin: AdminService,
    private auth: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadUsers());

    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.error = '';
    this.admin.stats().subscribe({
      next: res => this.stats = res.data,
      error: err => this.error = err.error?.message || this.translate.instant('GENERAL.ERROR')
    });
    this.loadUsers();
  }

  loadUsers(): void {
    this.admin.users(this.search).subscribe({
      next: res => this.users = res.data,
      error: err => this.error = err.error?.message || this.translate.instant('GENERAL.ERROR')
    });
  }

  isSelf(user: AdminUser): boolean {
    return user.id === this.auth.currentUser()?.id;
  }

  toggleActive(user: AdminUser): void {
    this.admin.updateUser(user.id, { ativo: !user.ativo }).subscribe({
      next: res => { this.success = res.message; this.refresh(); },
      error: err => this.error = err.error?.message || this.translate.instant('GENERAL.ERROR')
    });
  }

  setRole(user: AdminUser, role: 'user' | 'admin'): void {
    this.admin.updateUser(user.id, { role }).subscribe({
      next: res => { this.success = res.message; this.refresh(); },
      error: err => this.error = err.error?.message || this.translate.instant('GENERAL.ERROR')
    });
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(this.translate.instant('ADMIN.DELETE_CONFIRM', { name: user.nome, email: user.email }))) return;
    this.admin.deleteUser(user.id).subscribe({
      next: res => { this.success = res.message; this.refresh(); },
      error: err => this.error = err.error?.message || this.translate.instant('GENERAL.ERROR')
    });
  }
}
