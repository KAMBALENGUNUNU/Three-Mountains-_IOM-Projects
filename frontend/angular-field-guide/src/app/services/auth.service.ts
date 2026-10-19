import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, LoginCredentials, AuthResponse, UserRole } from '../models/field-guide.models';

const API_BASE_URL =
  typeof window !== 'undefined' && (window.location.port === '4200' || window.location.port === '5176')
    ? 'http://localhost:8080/api'
    : '/api';
const TOKEN_KEY = 'eac_osbp_token';
const USER_KEY = 'eac_osbp_user';

interface BackendAuthData {
  token: string;
  email: string;
  role: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSignal = signal<User | null>(null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  private restoreSession() {
    const token = this.getToken();
    if (!token) {
      this.clearSession();
      return;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        const u = JSON.parse(raw) as User;
        this.userSignal.set(u);
      } catch {
        this.clearSession();
      }
    }
  }

  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (token.startsWith('mock-') || token.split('.').length !== 3) {
      this.clearSession();
      return null;
    }
    return token;
  }

  async login(creds: LoginCredentials): Promise<AuthResponse> {
    const res = await firstValueFrom(
      this.http.post<ApiResponseEnvelope<BackendAuthData>>(`${API_BASE_URL}/auth/login`, {
        email: creds.email.trim(),
        password: creds.password,
      }),
    );

    const data = res.data;
    const roleUpper = (data.role || '').toUpperCase();
    let userRole: UserRole = 'officer';
    if (roleUpper === 'ADMIN') {
      userRole = 'admin';
    } else if (creds.email.toLowerCase().includes('trainee')) {
      userRole = 'trainee';
    }

    const fullName = data.email
      .split('@')[0]
      .split(/[._-]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');

    const user: User = {
      id: `usr-${data.email}`,
      email: data.email,
      fullName: fullName || 'OSBP Field Officer',
      role: userRole,
      facility: userRole === 'admin' ? 'EAC Regional HQ' : 'Namanga OSBP',
      country: userRole === 'officer' ? 'EAC Partner State' : undefined,
    };

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);

    return { token: data.token, user };
  }

  logout() {
    this.clearSession();
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('eac_active_subtopic');
    this.userSignal.set(null);
  }
}
