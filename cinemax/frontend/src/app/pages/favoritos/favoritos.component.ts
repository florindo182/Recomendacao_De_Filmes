// src/app/pages/favoritos/favoritos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section class="page-header">
      <h1>{{ 'NAV.FAVORITES' | translate }}</h1>
      <div class="export-actions" *ngIf="filmes.length > 0">
        <button class="btn-export btn-secondary" (click)="exportCSV()">Exportar CSV</button>
        <button class="btn-export" (click)="exportPDF()">Exportar PDF</button>
      </div>
    </section>

    <div *ngIf="loading" class="loading-state">
      <div class="spinner-lg"></div>
    </div>

    <div *ngIf="!loading && filmes.length === 0" class="empty-state">
      <span class="empty-icon">🎬</span>
      <p>Ainda não adicionou favoritos.</p>
    </div>

    <div class="favorites-table" *ngIf="!loading && filmes.length > 0">
      <table>
        <thead>
          <tr>
            <th>{{ 'MOVIES.TITLE_LABEL' | translate }}</th>
            <th *ngIf="hasValue('ano')">{{ 'MOVIES.YEAR' | translate }}</th>
            <th *ngIf="hasValue('genero')">Género</th>
            <th *ngIf="hasValue('classificacao')">TMDB ★</th>
            <th *ngIf="hasValue('minha_nota')">Minha ★</th>
            <th *ngIf="hasValue('comentario')">Comentário</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let f of filmes">
            <td class="title-cell">{{ f.titulo }}</td>
            <td *ngIf="hasValue('ano')">{{ f.ano }}</td>
            <td *ngIf="hasValue('genero')"><span class="genre-badge">{{ f.genero }}</span></td>
            <td *ngIf="hasValue('classificacao')">{{ f.classificacao }}</td>
            <td *ngIf="hasValue('minha_nota')">{{ f.minha_nota }}</td>
            <td *ngIf="hasValue('comentario')" class="comment-cell">{{ f.comentario }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; }
    h1 { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .export-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
    .btn-export { background: var(--accent); color: #fff; border: none; padding: .6rem 1.2rem; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: .875rem; }
    .btn-secondary { background: var(--card-bg); color: var(--text-primary); border: 1px solid var(--border); }
    .favorites-table { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: .75rem 1rem; text-align: left; font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: .85rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-secondary); font-size: .9rem; }
    .title-cell { font-weight: 600; color: var(--text-primary); }
    .genre-badge { background: var(--accent-alpha); color: var(--accent); padding: .2rem .6rem; border-radius: 6px; font-size: .75rem; }
    .comment-cell { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .spinner-lg { width: 48px; height: 48px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; margin: 4rem auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 4rem; color: var(--text-muted); }
    .empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
    @media (max-width: 640px) {
      .page-header { align-items: flex-start; flex-direction: column; }
    }
  `]
})
export class FavoritosComponent implements OnInit {
  filmes: any[] = [];
  loading = true;

  constructor(private movies: MovieService) {}

  ngOnInit(): void {
    this.movies.getFavoritos().subscribe({
      next: res => { this.filmes = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  hasValue(field: string): boolean {
    return this.filmes.some(f => {
      const value = f[field];
      return value !== null && value !== undefined && String(value).trim() !== '';
    });
  }

  exportCSV(): void { this.movies.exportFavoritosCSV(); }
  exportPDF(): void { this.movies.exportFavoritosPDF(); }
}
