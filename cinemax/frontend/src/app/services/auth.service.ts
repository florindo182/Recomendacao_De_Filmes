import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  nome: string;
  email: string;
  foto_perfil?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth.php`;
  private readonly opts = { withCredentials: true };

  currentUser = signal<User | null>(null);
  isLoggedIn  = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.checkSession();
  }

  private checkSession(): void {
    this.http.get<AuthResponse>(`${this.API}?action=me`, this.opts)
      .subscribe({
        next: res => {
          if (res.success && res.data?.id) {
            this.currentUser.set(res.data);
            this.isLoggedIn.set(true);
          }
        },
        error: () => {}
      });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}?action=login`, { email, password }, this.opts
    ).pipe(tap(res => {
      if (res.success) {
        this.currentUser.set(res.data);
        this.isLoggedIn.set(true);
      }
    }));
  }

  register(nome: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}?action=register`, { nome, email, password }, this.opts
    ).pipe(tap(res => {
      if (res.success) {
        this.currentUser.set(res.data);
        this.isLoggedIn.set(true);
      }
    }));
  }

  logout(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}?action=logout`, {}, this.opts
    ).pipe(tap(() => {
      this.currentUser.set(null);
      this.isLoggedIn.set(false);
    }));
  }

  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}?action=forgot-password`, { email }, this.opts
    );
  }

  resetPassword(token: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API}?action=reset-password`, { token, password }, this.opts
    );
  }
}
