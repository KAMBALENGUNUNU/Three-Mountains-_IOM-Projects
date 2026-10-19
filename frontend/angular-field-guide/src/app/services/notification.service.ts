import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'URGENT' | 'SUCCESS';
  createdAt: string;
  active: boolean;
  createdBy?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const API_BASE_URL =
  typeof window !== 'undefined' && (window.location.port === '4200' || window.location.port === '5176')
    ? 'http://localhost:8080/api'
    : '/api';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications = signal<AppNotification[]>([]);
  activeNotification = signal<AppNotification | null>(null);
  loading = signal(false);
  openAddModal = signal(false);

  private pollInterval: any;

  constructor(private http: HttpClient) {
    this.loadNotifications();
    // Poll every 30 seconds for real-time broadcasts only when tab is visible
    if (typeof window !== 'undefined') {
      this.pollInterval = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          this.loadNotifications();
        }
      }, 30000);
    }
  }

  async loadNotifications(): Promise<void> {
    try {
      this.loading.set(true);
      const res = await firstValueFrom(
        this.http.get<ApiResponse<AppNotification[]> | AppNotification[]>(
          `${API_BASE_URL}/notifications`,
        ),
      );
      const list = res && 'data' in res ? (res.data as AppNotification[]) : (res as AppNotification[]);
      if (Array.isArray(list)) {
        this.notifications.set(list);
        // Set the latest active notification
        const active = list.find((n) => n.active) || null;
        this.activeNotification.set(active);
      }
    } catch (err) {
      console.warn('Could not load notifications:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async broadcastNotification(
    title: string,
    message: string,
    type: string = 'INFO',
  ): Promise<AppNotification | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<AppNotification>>(`${API_BASE_URL}/notifications`, {
          title,
          message,
          type,
        }),
      );
      const created = res.data;
      await this.loadNotifications();
      return created;
    } catch (err) {
      console.error('Failed to broadcast notification:', err);
      throw err;
    }
  }

  async deactivate(id: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put(`${API_BASE_URL}/notifications/${id}/deactivate`, {}),
      );
      await this.loadNotifications();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  }

  dismissLocally(): void {
    this.activeNotification.set(null);
  }
}
