// src/app/pages/auth/auth.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">🎬 CINEMAX</div>

        <h2>{{ (isRegister ? 'AUTH.REGISTER_TITLE' : 'AUTH.LOGIN_TITLE') | translate }}</h2>

        <div class="alert alert-error" *ngIf="error">{{ error }}</div>
        <div class="alert alert-success" *ngIf="success">{{ success }}</div>

        <form (ngSubmit)="submit()">
          <div class="field" *ngIf="isRegister">
            <label>{{ 'AUTH.NAME' | translate }}</label>
            <input type="text" [(ngModel)]="nome" name="nome" required autocomplete="name" />
          </div>

          <div class="field">
            <label>{{ 'AUTH.EMAIL' | translate }}</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" />
          </div>

          <div class="field">
            <label>{{ 'AUTH.PASSWORD' | translate }}</label>
            <div class="pass-wrap">
              <input [type]="showPass ? 'text' : 'password'" [(ngModel)]="password" name="password" required autocomplete="current-password" />
              <button type="button" class="eye-btn" (click)="showPass = !showPass">{{ showPass ? '🙈' : '👁️' }}</button>
            </div>
          </div>

          <a *ngIf="!isRegister" routerLink="/forgot" class="forgot-link">{{ 'AUTH.FORGOT' | translate }}</a>

          <button type="submit" class="btn-submit" [disabled]="loading">
            <span *ngIf="loading" class="spinner"></span>
            {{ (isRegister ? 'AUTH.SUBMIT_REGISTER' : 'AUTH.SUBMIT_LOGIN') | translate }}
          </button>
        </form>

        <p class="switch-mode">
          {{ (isRegister ? 'AUTH.HAS_ACCOUNT' : 'AUTH.NO_ACCOUNT') | translate }}
          <a [routerLink]="isRegister ? '/login' : '/registo'">
            {{ (isRegister ? 'AUTH.SUBMIT_LOGIN' : 'AUTH.SUBMIT_REGISTER') | translate }}
          </a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg-primary);
      background-image: radial-gradient(ellipse at 30% 20%, var(--accent-alpha) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 50%);
    }
    .auth-card {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 420px;
      box-shadow: 0 30px 60px var(--shadow-card);
    }
    .auth-logo { font-size: 1.5rem; font-weight: 800; color: var(--accent); letter-spacing: .1em; margin-bottom: 1.5rem; }
    h2 { font-size: 1.6rem; font-weight: 700; margin: 0 0 1.5rem; color: var(--text-primary); }
    .alert { padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: .875rem; }
    .alert-error   { background: rgba(220,38,38,.15); color: #ef4444; border: 1px solid rgba(220,38,38,.3); }
    .alert-success { background: rgba(34,197,94,.15);  color: #22c55e; border: 1px solid rgba(34,197,94,.3); }
    .field { margin-bottom: 1.1rem; }
    label { display: block; font-size: .8rem; font-weight: 600; color: var(--text-muted); margin-bottom: .4rem; text-transform: uppercase; letter-spacing: .05em; }
    input {
      width: 100%; padding: .7rem 1rem; border-radius: 10px;
      border: 1.5px solid var(--border); background: var(--input-bg); color: var(--text-primary);
      font-size: .95rem; transition: border-color .2s; box-sizing: border-box;
    }
    input:focus { outline: none; border-color: var(--accent); }
    .pass-wrap { position: relative; }
    .pass-wrap input { padding-right: 2.5rem; }
    .eye-btn { position: absolute; right: .5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; }
    .forgot-link { display: block; text-align: right; font-size: .8rem; color: var(--accent); margin-bottom: 1.2rem; text-decoration: none; }
    .btn-submit {
      width: 100%; padding: .85rem; background: var(--accent); color: #fff;
      border: none; border-radius: 12px; font-size: 1rem; font-weight: 700;
      cursor: pointer; transition: opacity .2s, transform .1s; display: flex; align-items: center; justify-content: center; gap: .5rem;
    }
    .btn-submit:hover:not(:disabled) { opacity: .9; }
    .btn-submit:active { transform: scale(.98); }
    .btn-submit:disabled { opacity: .6; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .switch-mode { text-align: center; margin-top: 1.2rem; font-size: .875rem; color: var(--text-muted); }
    .switch-mode a { color: var(--accent); font-weight: 600; text-decoration: none; margin-left: .25rem; }
  `]
})
export class AuthComponent implements OnInit {
  nome = ''; email = ''; password = '';
  showPass = false; loading = false;
  error = ''; success = '';
  isRegister = false;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.isRegister = this.route.snapshot.url[0]?.path === 'registo';
    if (this.auth.isLoggedIn()) this.router.navigate(['/catalogo']);
  }

  submit(): void {
    this.error = ''; this.loading = true;

    const obs = this.isRegister
      ? this.auth.register(this.nome, this.email, this.password)
      : this.auth.login(this.email, this.password);

    obs.subscribe({
      next: res => {
        this.loading = false;
        if (res.success) this.router.navigate(['/catalogo']);
        else this.error = res.message;
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || 'Erro de ligação ao servidor.';
      }
    });
  }
}
