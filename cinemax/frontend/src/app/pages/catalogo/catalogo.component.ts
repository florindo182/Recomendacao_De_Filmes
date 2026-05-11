// src/app/pages/catalogo/catalogo.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MovieService, Filme } from '../../services/movie.service';
import { AuthService } from '../../services/auth.service';
import { MovieCardComponent } from '../../components/movie-card/movie-card.component';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MovieCardComponent],
  template: `
    <section class="page-header">
      <h1>{{ 'MOVIES.TITLE' | translate }}</h1>
      <div class="filters-bar">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            class="search-input"
            type="text"
            [placeholder]="'MOVIES.SEARCH_PLACEHOLDER' | translate"
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch($event)"
          />
        </div>

        <select class="filter-select" [(ngModel)]="selectedGenero" (change)="load()">
          <option value="">{{ 'MOVIES.ALL_GENRES' | translate }}</option>
          <option *ngFor="let g of generos" [value]="g.id">{{ g.key | translate }}</option>
        </select>

        <select class="filter-select" [(ngModel)]="orderBy" (change)="load()">
          <option value="classificacao">{{ 'MOVIES.RATING' | translate }}</option>
          <option value="ano">{{ 'MOVIES.YEAR' | translate }}</option>
          <option value="titulo">{{ 'MOVIES.TITLE_LABEL' | translate }}</option>
        </select>
      </div>
    </section>

    <div *ngIf="loading" class="loading-grid">
      <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5,6,7,8]"></div>
    </div>

    <div *ngIf="!loading && filmes.length === 0" class="empty-state">
      <span class="empty-icon">🎬</span>
      <p>{{ 'MOVIES.NO_RESULTS' | translate }}</p>
    </div>

    <div class="movies-grid" *ngIf="!loading && filmes.length > 0">
      <app-movie-card
        *ngFor="let filme of filmes"
        [filme]="filme"
        [showFav]="auth.isLoggedIn()"
        (favToggled)="onFavToggle($event)"
      ></app-movie-card>
    </div>

    <!-- Paginação -->
    <div class="pagination" *ngIf="totalPages > 1">
      <button class="page-btn" [disabled]="page <= 1"      (click)="goPage(page - 1)">‹</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" [disabled]="page >= totalPages" (click)="goPage(page + 1)">›</button>
    </div>
  `,
  styleUrls: ['./catalogo.component.scss']
})
export class CatalogoComponent implements OnInit, OnDestroy {
  filmes: Filme[]     = [];
  loading             = false;
  searchTerm          = '';
  selectedGenero      = '';
  orderBy             = 'classificacao';
  page                = 1;
  totalPages          = 1;
  private destroy$    = new Subject<void>();
  private search$     = new Subject<string>();

  generos = [
    { id: 1,  key: 'GENRES.ACTION' },    { id: 2, key: 'GENRES.ADVENTURE' },
    { id: 3,  key: 'GENRES.ANIMATION' }, { id: 4, key: 'GENRES.COMEDY' },
    { id: 5,  key: 'GENRES.CRIME' },     { id: 7, key: 'GENRES.DRAMA' },
    { id: 9,  key: 'GENRES.HORROR' },    { id: 12, key: 'GENRES.SCI_FI' },
    { id: 13, key: 'GENRES.THRILLER' },
  ];

  constructor(
    public movies: MovieService,
    public auth: AuthService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => { this.page = 1; this.load(); });

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.page = 1; this.load(); });

    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  onSearch(val: string): void { this.search$.next(val); }

  load(): void {
    this.loading = true;
    this.movies.list({
      page: this.page,
      limit: 20,
      search: this.searchTerm,
      genero: this.selectedGenero,
      order: this.orderBy,
      source: 'tmdb',
    }).subscribe({
      next: res => {
        this.filmes     = res.data.filmes;
        this.totalPages = res.data.totalPages;
        this.loading    = false;
      },
      error: () => { this.loading = false; }
    });
  }

  goPage(p: number): void { this.page = p; this.load(); window.scrollTo(0, 0); }

  onFavToggle(filme: Filme): void {
    this.movies.toggleFavorito(filme).subscribe();
  }
}
