// src/app/pages/recomendacoes/recomendacoes.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MovieService, Filme } from '../../services/movie.service';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';

@Component({
  selector: 'app-recomendacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MovieCardComponent],
  template: `
    <section class="page-header">
      <h1>{{ 'MOVIES.RECOMMENDATIONS_TITLE' | translate }}</h1>
      <p class="subtitle">{{ subtitleKey | translate }}</p>

      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          type="text"
          [placeholder]="'RECOMMENDATIONS.SEARCH_PLACEHOLDER' | translate"
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearch($event)"
        />
      </div>
    </section>

    <div *ngIf="loading" class="loading-grid">
      <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5,6,7,8]"></div>
    </div>

    <div *ngIf="!loading && filmes.length === 0" class="empty-state">
      <span class="empty-icon">🎬</span>
      <p>{{ 'RECOMMENDATIONS.EMPTY' | translate }}</p>
    </div>

    <div class="movies-grid" *ngIf="!loading && filmes.length > 0">
      <app-movie-card
        *ngFor="let filme of filmes"
        [filme]="filme"
        [showFav]="true"
        (favToggled)="toggleFav($event)"
      ></app-movie-card>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 2rem; }
    h1 { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin: 0 0 .3rem; }
    .subtitle { color: var(--text-muted); font-size: .9rem; margin: 0 0 1rem; }
    .search-wrap { position: relative; max-width: 520px; }
    .search-icon {
      position: absolute; left: .85rem; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); font-size: .9rem; pointer-events: none;
    }
    .search-input {
      width: 100%; padding: .65rem 1rem .65rem 2.5rem;
      background: var(--card-bg); border: 1.5px solid var(--border);
      border-radius: 12px; color: var(--text-primary); font-size: .9rem;
      font-family: inherit;
    }
    .search-input:focus { outline: none; border-color: var(--accent); }
    .movies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.5rem; }
    .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.5rem; }
    .skeleton-card { background: var(--surface2); border-radius: 12px; aspect-ratio: 2/3; animation: shimmer 1.5s infinite; }
    .empty-state { text-align: center; padding: 4rem; color: var(--text-muted); }
    .empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    @keyframes shimmer { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
  `]
})
export class RecomendacoesComponent implements OnInit, OnDestroy {
  filmes: Filme[] = [];
  loading = true;
  searchTerm = '';
  subtitleKey = 'RECOMMENDATIONS.SUBTITLE_DEFAULT';
  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  constructor(
    private movies: MovieService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.load());

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load());

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  load(): void {
    this.loading = true;
    this.movies.getRecomendacoes({ search: this.searchTerm.trim(), limit: 12 }).subscribe({
      next: res => {
        this.filmes = res.data;
        this.subtitleKey = this.subtitleFor(res.message);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleFav(filme: Filme): void { this.movies.toggleFavorito(filme).subscribe(); }

  private subtitleFor(message: string): string {
    if (message.includes('pesquisa')) return 'RECOMMENDATIONS.SUBTITLE_SEARCH';
    if (message.includes('termo')) return 'RECOMMENDATIONS.SUBTITLE_SEARCH_FALLBACK';
    if (message.includes('comecar')) return 'RECOMMENDATIONS.SUBTITLE_START';
    if (message.includes('preferencias')) return 'RECOMMENDATIONS.SUBTITLE_PREFERENCES';
    return 'RECOMMENDATIONS.SUBTITLE_DEFAULT';
  }
}
