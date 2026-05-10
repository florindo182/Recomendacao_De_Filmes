// src/app/pages/filme-detalhe/filme-detalhe.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MovieService, Filme } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-filme-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div *ngIf="loading" class="loading-state">
      <div class="spinner-lg"></div>
    </div>

    <div *ngIf="!loading && filme" class="detalhe-page">

      <!-- Backdrop -->
      <div class="backdrop" [style.backgroundImage]="'url(' + movies.getPosterUrl(filme.backdrop_url) + ')'">
        <div class="backdrop-overlay"></div>
      </div>

      <div class="detalhe-content">
        <!-- Poster + Info -->
        <div class="detalhe-hero">
          <img class="hero-poster" [src]="movies.getPosterUrl(filme.poster_url)" [alt]="filme.titulo" (error)="onImgError($event)" />

          <div class="hero-info">
            <h1 class="hero-title">{{ filme.titulo }}</h1>
            <p class="hero-original" *ngIf="filme.titulo_original && filme.titulo_original !== filme.titulo">
              {{ filme.titulo_original }}
            </p>

            <div class="hero-badges">
              <span class="badge genre">{{ filme.genero_nome }}</span>
              <span class="badge year">{{ filme.ano }}</span>
              <span class="badge duration" *ngIf="filme.duracao_min">{{ filme.duracao_min }} {{ 'MOVIES.MIN' | translate }}</span>
            </div>

            <div class="hero-rating" *ngIf="filme.classificacao">
              <span class="star-big">★</span>
              <span class="rating-num">{{ filme.classificacao | number:'1.1-1' }}</span>
              <span class="rating-sub">/ 10 TMDB</span>
            </div>

            <p class="hero-synopsis">{{ filme.sinopse }}</p>

            <div class="hero-actions">
              <button class="btn-fav-big" (click)="toggleFav()" [class.active]="isFav">
                {{ isFav ? '❤️ Remover favorito' : '🤍 Adicionar favorito' }}
              </button>
              <a *ngIf="filme.trailer_url" [href]="filme.trailer_url" target="_blank" class="btn-trailer">
                ▶ {{ 'MOVIES.TRAILER' | translate }}
              </a>
            </div>
          </div>
        </div>

        <!-- Avaliação -->
        <div class="section-card" *ngIf="auth.isLoggedIn() && filme.origem !== 'tmdb'">
          <h2 class="section-heading">{{ 'MOVIES.MY_RATING' | translate }}</h2>
          <div class="stars-input">
            <button *ngFor="let s of [1,2,3,4,5,6,7,8,9,10]"
              class="star-btn"
              [class.selected]="s <= myNota"
              (click)="myNota = s">{{ s <= myNota ? '★' : '☆' }}</button>
            <span class="nota-label" *ngIf="myNota">{{ myNota }}/10</span>
          </div>
          <textarea class="comment-input" [(ngModel)]="myComment" rows="3"
            [placeholder]="'MOVIES.COMMENT' | translate"></textarea>
          <button class="btn-save" (click)="salvarAvaliacao()" [disabled]="!myNota">
            {{ 'MOVIES.SAVE_RATING' | translate }}
          </button>
          <p class="save-msg" *ngIf="saveMsg">{{ saveMsg }}</p>
        </div>

        <!-- Avaliações de outros -->
        <div class="section-card" *ngIf="avaliacoes.length > 0">
          <h2 class="section-heading">Avaliações ({{ avaliacoes.length }})</h2>
          <div class="review-list">
            <div class="review-item" *ngFor="let a of avaliacoes">
              <div class="review-header">
                <span class="review-user">{{ a.utilizador_nome }}</span>
                <span class="review-nota">★ {{ a.nota }}/10</span>
                <span class="review-date">{{ a.criado_em | date:'dd/MM/yyyy' }}</span>
              </div>
              <p class="review-comment" *ngIf="a.comentario">{{ a.comentario }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .loading-state { display:flex; justify-content:center; padding:4rem; }
    .spinner-lg { width:48px;height:48px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .detalhe-page { position:relative; }
    .backdrop { position:fixed;top:0;left:0;right:0;height:400px;background-size:cover;background-position:center;z-index:-1; }
    .backdrop-overlay { position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,.4) 0%, var(--bg-primary) 100%); }

    .detalhe-content { padding-top: 120px; }
    .detalhe-hero { display:flex;gap:2rem;align-items:flex-start;margin-bottom:2rem; }
    .hero-poster { width:200px;flex-shrink:0;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,.5); }
    .hero-info { flex:1; }
    .hero-title { font-size:2rem;font-weight:800;color:var(--text-primary);margin-bottom:.25rem; }
    .hero-original { color:var(--text-muted);font-size:.9rem;margin-bottom:.75rem; }
    .hero-badges { display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem; }
    .badge { font-size:.75rem;padding:.25rem .6rem;border-radius:5px;font-weight:600; }
    .badge.genre { background:var(--accent-alpha);color:var(--accent); }
    .badge.year, .badge.duration { background:var(--surface2);color:var(--text-muted); }
    .hero-rating { display:flex;align-items:baseline;gap:.4rem;margin-bottom:1rem; }
    .star-big { color:#f5c518;font-size:1.5rem; }
    .rating-num { font-size:1.8rem;font-weight:800;color:var(--text-primary); }
    .rating-sub { color:var(--text-muted);font-size:.8rem; }
    .hero-synopsis { color:var(--text-secondary);line-height:1.7;margin-bottom:1.25rem;max-width:600px; }
    .hero-actions { display:flex;gap:.75rem; }
    .btn-fav-big,.btn-trailer { padding:.6rem 1.2rem;border-radius:10px;font-size:.875rem;font-weight:700;cursor:pointer;border:1.5px solid var(--border);background:var(--card-bg);color:var(--text-primary);text-decoration:none;transition:all .2s; }
    .btn-fav-big.active { border-color:var(--accent);color:var(--accent); }
    .btn-trailer { background:var(--accent);color:#fff;border-color:var(--accent); }

    .section-card { background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:1.5rem;margin-bottom:1.5rem; }
    .section-heading { font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:var(--text-primary); }

    .stars-input { display:flex;gap:.25rem;align-items:center;margin-bottom:.75rem;flex-wrap:wrap; }
    .star-btn { background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--text-muted);transition:transform .15s; }
    .star-btn.selected { color:#f5c518; }
    .star-btn:hover { transform:scale(1.2); }
    .nota-label { font-size:.875rem;font-weight:700;color:var(--accent);margin-left:.5rem; }
    .comment-input { width:100%;padding:.7rem 1rem;background:var(--input-bg);border:1.5px solid var(--border);border-radius:10px;color:var(--text-primary);font-family:inherit;font-size:.9rem;resize:vertical;margin-bottom:.75rem; }
    .comment-input:focus { outline:none;border-color:var(--accent); }
    .btn-save { background:var(--accent);color:#fff;border:none;padding:.65rem 1.5rem;border-radius:10px;font-weight:700;cursor:pointer; }
    .btn-save:disabled { opacity:.5;cursor:not-allowed; }
    .save-msg { margin-top:.5rem;font-size:.875rem;color:#22c55e; }

    .review-list { display:flex;flex-direction:column;gap:1rem; }
    .review-item { border-bottom:1px solid var(--border);padding-bottom:1rem; }
    .review-item:last-child { border-bottom:none;padding-bottom:0; }
    .review-header { display:flex;gap:1rem;align-items:center;margin-bottom:.3rem; }
    .review-user { font-weight:700;color:var(--text-primary);font-size:.9rem; }
    .review-nota { color:#f5c518;font-size:.875rem;font-weight:600; }
    .review-date { color:var(--text-muted);font-size:.75rem;margin-left:auto; }
    .review-comment { color:var(--text-secondary);font-size:.875rem;line-height:1.6; }

    @media (max-width:640px) {
      .detalhe-hero { flex-direction:column; }
      .hero-poster { width:140px; }
      .detalhe-content { padding-top:80px; }
    }
  `]
})
export class FilmeDetalheComponent implements OnInit {
  filme?: Filme;
  avaliacoes: any[] = [];
  loading = true;
  isFav = false;
  myNota = 0;
  myComment = '';
  saveMsg = '';

  constructor(
    private route: ActivatedRoute,
    public movies: MovieService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.movies.get(id).subscribe({
      next: res => {
        this.filme     = res.data.filme;
        this.avaliacoes = res.data.avaliacoes;
        this.loading   = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleFav(): void {
    if (!this.filme) return;
    this.movies.toggleFavorito(this.filme).subscribe(res => {
      this.isFav = res.data.favorito;
    });
  }

  salvarAvaliacao(): void {
    if (!this.filme || !this.myNota) return;
    this.movies.avaliar(this.filme.id, this.myNota, this.myComment).subscribe(res => {
      this.saveMsg = res.message;
      setTimeout(() => this.saveMsg = '', 3000);
    });
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = 'assets/no-poster.svg';
  }
}
