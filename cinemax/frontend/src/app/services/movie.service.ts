import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Filme {
  id: number;
  tmdb_id?: number;
  titulo: string;
  titulo_original?: string;
  sinopse?: string;
  ano: number;
  duracao_min?: number;
  poster_url?: string;
  backdrop_url?: string;
  classificacao?: number;
  genero_id: number;
  genero_nome?: string;
  media_notas?: number;
  total_avaliacoes?: number;
  trailer_url?: string;
  origem?: 'local' | 'api' | 'tmdb';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface FilmesListData {
  filmes: Filme[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly API = `${environment.apiUrl}/filmes.php`;
  private readonly opts = { withCredentials: true };

  constructor(private http: HttpClient) {}

  list(params: {
    page?: number; limit?: number; search?: string;
    genero?: number | string; order?: string; source?: 'local' | 'tmdb';
  } = {}): Observable<ApiResponse<FilmesListData>> {
    let p = new HttpParams().set('action', 'list');
    if (params.page)   p = p.set('page',   params.page);
    if (params.limit)  p = p.set('limit',  params.limit);
    if (params.search) p = p.set('search', params.search);
    if (params.genero) p = p.set('genero', params.genero);
    if (params.order)  p = p.set('order',  params.order);
    if (params.source) p = p.set('source', params.source);
    return this.http.get<ApiResponse<FilmesListData>>(this.API, { params: p, ...this.opts });
  }

  get(id: number): Observable<ApiResponse<{ filme: Filme; avaliacoes: any[] }>> {
    return this.http.get<any>(`${this.API}?action=get&id=${id}`, this.opts);
  }

  create(data: Partial<Filme>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}?action=create`, data, this.opts);
  }

  update(id: number, data: Partial<Filme>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.API}?action=update&id=${id}`, data, this.opts);
  }

  delete(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}?action=delete&id=${id}`, this.opts);
  }

  tmdbSearch(q: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.API}?action=tmdb-search&q=${encodeURIComponent(q)}&lang=${this.tmdbLang()}`, this.opts
    );
  }

  tmdbImport(tmdbId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}?action=tmdb-import&lang=${this.tmdbLang()}`, { tmdb_id: tmdbId }, this.opts);
  }

  avaliar(filmeId: number, nota: number, comentario?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.API}?action=avaliar`, { filme_id: filmeId, nota, comentario }, this.opts
    );
  }

  getFavoritos(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}?action=favoritos`, this.opts);
  }

  toggleFavorito(filme: number | Filme): Observable<ApiResponse<{ favorito: boolean }>> {
    const body = typeof filme === 'number'
      ? { filme_id: filme }
      : { filme_id: filme.id, tmdb_id: filme.tmdb_id };

    return this.http.post<ApiResponse<{ favorito: boolean }>>(
      `${this.API}?action=toggle-fav`, body, this.opts
    );
  }

  exportFavoritosCSV(): void {
    window.open(`${this.API}?action=favoritos&export=csv`, '_blank');
  }

  exportFavoritosReport(): void {
    window.open(`${this.API}?action=favoritos&export=report`, '_blank');
  }

  exportFavoritosPDF(): void {
    window.open(`${this.API}?action=favoritos&export=pdf`, '_blank');
  }

  getRecomendacoes(params: { search?: string; limit?: number } = {}): Observable<ApiResponse<Filme[]>> {
    let p = new HttpParams().set('action', 'recomendar');
    if (params.search) p = p.set('search', params.search);
    if (params.limit) p = p.set('limit', params.limit);
    return this.http.get<ApiResponse<Filme[]>>(this.API, { params: p, ...this.opts });
  }

  getPosterUrl(url?: string): string {
    if (!url) return 'assets/no-poster.svg';
    if (url.startsWith('http')) return url;
    return `${environment.tmdbImageBase}${url}`;
  }

  private tmdbLang(): string {
    return localStorage.getItem('lang') === 'en' ? 'en-US' : 'pt-PT';
  }
}
