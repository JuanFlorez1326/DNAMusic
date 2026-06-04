import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  nombre: string;
  email: string;
  role: 'ADMIN' | 'OPERADOR';
  sedeId: string | null;
}

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'dna_token';
  private readonly USER_KEY = 'dna_user';

  private _user = signal<User | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this._user.set(res.user);
        }),
      );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
