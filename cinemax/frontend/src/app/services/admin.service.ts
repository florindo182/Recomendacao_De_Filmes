import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './movie.service';

export interface AdminSummary {
  users: number;
  activeUsers: number;
  admins: number;
  movies: number;
  favorites: number;
  ratings: number;
  averageRating: number;
}

export interface AdminUser {
  id: number;
  nome: string;
  email: string;
  role: 'user' | 'admin';
  ativo: number;
  criado_em: string;
  favoritos: number;
  avaliacoes: number;
}

export interface AdminStats {
  summary: AdminSummary;
  recentUsers: AdminUser[];
  topGenres: Array<{ nome: string; total: number }>;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API = `${environment.apiUrl}/admin.php`;
  private readonly opts = { withCredentials: true };

  constructor(private http: HttpClient) {}

  stats(): Observable<ApiResponse<AdminStats>> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.API}?action=stats`, this.opts);
  }

  users(search = ''): Observable<ApiResponse<AdminUser[]>> {
    let params = new HttpParams().set('action', 'users');
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<AdminUser[]>>(this.API, { params, ...this.opts });
  }

  updateUser(id: number, data: { ativo?: boolean; role?: 'user' | 'admin' }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}?action=update-user`, { id, ...data }, this.opts);
  }

  deleteUser(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}?action=delete-user&id=${id}`, this.opts);
  }
}
