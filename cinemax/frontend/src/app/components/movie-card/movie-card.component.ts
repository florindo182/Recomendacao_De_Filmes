// src/app/components/movie-card/movie-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Filme, MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="movie-card" [class.favorited]="isFav">
      <div class="card-poster">
        <img
          [src]="movies.getPosterUrl(filme.poster_url)"
          [alt]="filme.titulo"
          loading="lazy"
          (error)="onImgError($event)"
        />
        <div class="card-overlay">
          <a [routerLink]="['/filme', filme.id]" class="btn-watch">▶ {{ 'MOVIES.DETAILS' | translate }}</a>
          <button
            *ngIf="showFav"
            class="btn-fav"
            [class.active]="isFav"
            (click)="toggleFav()"
            [title]="(isFav ? 'MOVIES.REMOVE_FAVORITE' : 'MOVIES.ADD_FAVORITE') | translate"
          >{{ isFav ? '❤️' : '🤍' }}</button>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title">{{ filme.titulo }}</h3>
        <div class="card-meta">
          <span class="badge genre">{{ filme.genero_nome }}</span>
          <span class="badge year">{{ filme.ano }}</span>
        </div>
        <div class="card-rating" *ngIf="filme.classificacao">
          <span class="star">★</span>
          <span>{{ filme.classificacao | number:'1.1-1' }}</span>
          <span class="reviews" *ngIf="filme.total_avaliacoes">({{ filme.total_avaliacoes }})</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .movie-card {
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      transition: transform .25s ease, box-shadow .25s ease;
      cursor: pointer;
      border: 1px solid var(--border);
    }
    .movie-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px var(--shadow-card); }
    .card-poster { position: relative; aspect-ratio: 2/3; overflow: hidden; background: var(--surface2); }
    .card-poster img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease; }
    .movie-card:hover .card-poster img { transform: scale(1.05); }
    .card-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 60%);
      display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
      padding: 1rem; gap: .5rem;
      opacity: 0; transition: opacity .25s ease;
    }
    .movie-card:hover .card-overlay { opacity: 1; }
    .btn-watch {
      background: var(--accent); color: #fff; border: none;
      padding: .5rem 1.2rem; border-radius: 20px; font-size: .85rem;
      text-decoration: none; font-weight: 600; letter-spacing: .02em;
    }
    .btn-fav { background: none; border: none; font-size: 1.4rem; cursor: pointer; transition: transform .2s; }
    .btn-fav:hover { transform: scale(1.3); }
    .card-info { padding: .85rem 1rem 1rem; }
    .card-title { font-size: .95rem; font-weight: 600; margin: 0 0 .4rem; line-height: 1.3; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-meta { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: .4rem; }
    .badge { font-size: .7rem; padding: .2rem .5rem; border-radius: 4px; font-weight: 500; }
    .badge.genre { background: var(--accent-alpha); color: var(--accent); }
    .badge.year  { background: var(--surface2); color: var(--text-muted); }
    .card-rating { display: flex; align-items: center; gap: .3rem; font-size: .85rem; color: var(--text-secondary); }
    .star { color: #f5c518; }
    .reviews { color: var(--text-muted); font-size: .75rem; }
  `]
})
export class MovieCardComponent {
  @Input() filme!: Filme;
  @Input() showFav = false;
  @Output() favToggled = new EventEmitter<Filme>();

  isFav = false;

  constructor(public movies: MovieService) {}

  toggleFav(): void {
    this.isFav = !this.isFav;
    this.favToggled.emit(this.filme);
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).src = 'assets/no-poster.svg';
  }
}
