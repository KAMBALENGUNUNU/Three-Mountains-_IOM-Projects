import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--paper); padding: 2rem 1.5rem;"
    >
      <div
        style="width: 100%; maxWidth: 480px; background: var(--card); border-radius: 12px; border: 1px solid var(--line); box-shadow: 0 12px 32px rgba(0, 53, 160, 0.08); overflow: hidden;"
      >
        <!-- Institutional Header -->
        <div
          style="padding: 2rem 2.2rem 1.4rem; border-bottom: 1px solid var(--line); background: var(--card);"
        >
          <h1
            style="font-size: 1.85rem; line-height: 1.2; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.02em;"
          >
            OSBP Field Guide
          </h1>
          <p style="margin: 0; font-size: 0.92rem; color: var(--ink-soft); line-height: 1.45;">
            Please sign in with your authorized border agency or administrative account to access
            the field manual.
          </p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="handleSubmit()" style="padding: 1.8rem 2.2rem 2.2rem;">
          @if (error) {
            <div
              style="padding: 0.8rem 1rem; border-radius: 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; font-size: 0.9rem; margin-bottom: 1.4rem;"
            >
              {{ error }}
            </div>
          }

          <div style="margin-bottom: 1.2rem;">
            <label
              for="login-email"
              style="display: block; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.4rem;"
            >
              Official Email:
            </label>
            <input
              id="login-email"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="officer@osbp.com"
              required
              style="width: 100%; height: 3rem; padding: 0 1rem; border-radius: 8px; border: 1px solid var(--line); font-size: 1rem; font-family: inherit; color: var(--ink);"
            />
          </div>

          <div style="margin-bottom: 1.6rem;">
            <label
              for="login-password"
              style="display: block; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.4rem;"
            >
              Password:
            </label>
            <input
              id="login-password"
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="••••••••"
              required
              style="width: 100%; height: 3rem; padding: 0 1rem; border-radius: 8px; border: 1px solid var(--line); font-size: 1rem; font-family: inherit; color: var(--ink);"
            />
          </div>

          <!-- Explanatory note before buttons -->
          <p
            style="margin: 0 0 0.8rem; font-size: 0.88rem; color: var(--ink-soft); line-height: 1.45;"
          >
            Each button will complete the credentials needed for you to log in as:
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
            <button
              type="button"
              (click)="handleQuickLogin('officer')"
              class="btn"
              [disabled]="loading"
              style="width: 100%; height: 3.1rem; justify-content: center; font-size: 0.95rem; font-weight: 700; background: var(--blue); color: #ffffff; border: 1px solid var(--blue); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 53, 160, 0.2); cursor: pointer;"
            >
              {{ loading && activeRole === 'officer' ? 'Logging in...' : 'Officer Fill' }}
            </button>
            <button
              type="button"
              (click)="handleQuickLogin('admin')"
              class="btn"
              [disabled]="loading"
              style="width: 100%; height: 3.1rem; justify-content: center; font-size: 0.95rem; font-weight: 700; background: var(--blue); color: #ffffff; border: 1px solid var(--blue); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 53, 160, 0.2); cursor: pointer;"
            >
              {{ loading && activeRole === 'admin' ? 'Logging in...' : 'Admin Fill' }}
            </button>
          </div>
        </form>

        <!-- Institutional Footer Note -->
        <div
          style="padding: 1rem 2.2rem; background: var(--paper); border-top: 1px solid var(--line); text-align: center; font-size: 0.82rem; color: var(--muted);"
        >
          East African Community (EAC) • One-Stop Border Post Program
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  activeRole: 'admin' | 'officer' | null = null;

  constructor(private authService: AuthService) {}

  async handleSubmit() {
    this.error = '';
    this.loading = true;
    try {
      await this.authService.login({ email: this.email.trim(), password: this.password });
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify credentials and backend connection.';
    } finally {
      this.loading = false;
      this.activeRole = null;
    }
  }

  async handleQuickLogin(role: 'admin' | 'officer') {
    this.activeRole = role;
    if (role === 'admin') {
      this.email = 'admin@osbp.com';
      this.password = 'Admin@1234';
    } else {
      this.email = 'officer@osbp.com';
      this.password = 'Officer@1234';
    }
    await this.handleSubmit();
  }
}
