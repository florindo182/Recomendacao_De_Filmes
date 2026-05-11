import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <a class="auth-logo" routerLink="/catalogo">CINEMAX</a>

        <h2>{{ 'FORGOT.TITLE' | translate }}</h2>
        <p class="help-text">
          {{ 'FORGOT.HELP' | translate }}
        </p>

        <div class="alert alert-error" *ngIf="error">{{ error }}</div>
        <div class="alert alert-success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="submitEmail()" *ngIf="!token">
          <div class="field">
            <label>{{ 'AUTH.EMAIL' | translate }}</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              autocomplete="email"
              (blur)="validateEmail()"
            />
            <small class="field-error" *ngIf="emailError">{{ emailError }}</small>
          </div>

          <button type="submit" class="btn-submit" [disabled]="loading || !!emailError">
            <span *ngIf="loading" class="spinner"></span>
            {{ 'FORGOT.SEND' | translate }}
          </button>
        </form>

        <form (ngSubmit)="submitReset()" *ngIf="token">
          <div class="field">
            <label>{{ 'FORGOT.TOKEN' | translate }}</label>
            <input type="text" [(ngModel)]="token" name="token" required autocomplete="one-time-code" />
          </div>

          <div class="field">
            <label>{{ 'FORGOT.NEW_PASSWORD' | translate }}</label>
            <input type="password" [(ngModel)]="password" name="password" required autocomplete="new-password" />
            <small class="field-error" *ngIf="password && password.length < 8">
              {{ 'FORGOT.PASSWORD_MIN' | translate }}
            </small>
          </div>

          <button type="submit" class="btn-submit" [disabled]="loading || password.length < 8">
            <span *ngIf="loading" class="spinner"></span>
            {{ 'FORGOT.CHANGE_PASSWORD' | translate }}
          </button>
        </form>

        <p class="switch-mode">
          <a routerLink="/login">{{ 'FORGOT.BACK_LOGIN' | translate }}</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 64px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
    }
    .auth-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.25rem;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 30px 60px var(--shadow-card);
    }
    .auth-logo {
      display: inline-flex;
      margin-bottom: 1.25rem;
      color: var(--accent);
      font-weight: 800;
      letter-spacing: .12em;
      text-decoration: none;
    }
    h2 {
      margin: 0 0 .5rem;
      color: var(--text-primary);
      font-size: 1.55rem;
    }
    .help-text {
      margin: 0 0 1.25rem;
      color: var(--text-secondary);
      font-size: .92rem;
      line-height: 1.55;
    }
    .alert {
      padding: .75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: .875rem;
    }
    .alert-error { background: rgba(220,38,38,.15); color: #ef4444; border: 1px solid rgba(220,38,38,.3); }
    .alert-success { background: rgba(34,197,94,.15); color: #22c55e; border: 1px solid rgba(34,197,94,.3); }
    .field { margin-bottom: 1rem; }
    label {
      display: block;
      margin-bottom: .4rem;
      color: var(--text-muted);
      font-size: .8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    input {
      width: 100%;
      padding: .72rem 1rem;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: .95rem;
    }
    input:focus { outline: none; border-color: var(--accent); }
    .field-error {
      display: block;
      margin-top: .35rem;
      color: #ef4444;
      font-size: .8rem;
    }
    .btn-submit {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      padding: .85rem;
      border: none;
      border-radius: 10px;
      background: var(--accent);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }
    .btn-submit:disabled { opacity: .6; cursor: not-allowed; }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .switch-mode {
      margin-top: 1.2rem;
      text-align: center;
      font-size: .875rem;
    }
    .switch-mode a { color: var(--accent); font-weight: 700; text-decoration: none; }
  `]
})
export class ForgotPasswordComponent implements OnInit {
  email = '';
  token = '';
  password = '';
  emailError = '';
  error = '';
  success = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  validateEmail(): boolean {
    const value = this.email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    this.emailError = valid || !value ? '' : this.translate.instant('FORGOT.INVALID_EMAIL');
    return valid;
  }

  submitEmail(): void {
    this.error = '';
    this.success = '';

    if (!this.validateEmail()) {
      this.emailError = this.translate.instant('FORGOT.INVALID_EMAIL');
      return;
    }

    this.loading = true;
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: res => {
        this.loading = false;
        this.success = res.message;
        const devToken = (res.data as any)?.token_dev;
        if (devToken) this.token = devToken;
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || this.translate.instant('FORGOT.CONNECTION_ERROR');
      }
    });
  }

  submitReset(): void {
    this.error = '';
    this.success = '';

    if (!this.token || this.password.length < 8) {
      this.error = this.translate.instant('FORGOT.RESET_REQUIREMENTS');
      return;
    }

    this.loading = true;
    this.auth.resetPassword(this.token.trim(), this.password).subscribe({
      next: res => {
        this.loading = false;
        this.success = res.message;
        this.password = '';
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || this.translate.instant('FORGOT.RESET_ERROR');
      }
    });
  }
}
