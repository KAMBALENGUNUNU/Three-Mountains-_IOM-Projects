import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notification-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Sticky Down Bar Container: Single Orange/Gold Color matching placeholder -->
    @if (notificationService.activeNotification(); as notif) {
      <aside
        class="down-bar"
        role="region"
        aria-label="Operational Notifications"
      >
        <div class="down-bar-content">
          <!-- Pulse Icon & Label -->
          <div class="notif-badge">
            <span class="pulse-dot"></span>
            <span class="badge-label">NOTICE</span>
          </div>

          <!-- Notification Message -->
          <div class="notif-body">
            @if (notif.title && notif.title !== 'Notice' && notif.title !== 'Operational Bulletin') {
              <strong class="notif-title">{{ notif.title }}:</strong>
            }
            <span class="notif-text">{{ notif.message }}</span>
          </div>

          <!-- Actions: Admin Add & Dismiss -->
          <div class="notif-actions">
            @if (authService.isAdmin()) {
              <button
                type="button"
                class="btn-admin-add"
                (click)="notificationService.openAddModal.set(true)"
                title="Send notification to all users"
              >
                + Add Notification
              </button>
            }

            <button
              type="button"
              class="btn-dismiss"
              (click)="dismiss(notif.id)"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>
    } @else if (authService.isAdmin()) {
      <!-- Minimal bar for admin when no active notification is shown -->
      <aside class="down-bar down-bar-quiet" role="region" aria-label="Admin Notification Bar">
        <div class="down-bar-content">
          <span class="notif-text" style="font-size: 0.88rem; color: #1a1a1a; opacity: 0.9;">
            No active notification. Click to send an announcement to all users.
          </span>
          <div class="notif-actions">
            <button
              type="button"
              class="btn-admin-add"
              (click)="notificationService.openAddModal.set(true)"
            >
              + Add Notification
            </button>
          </div>
        </div>
      </aside>
    }

    <!-- Simplified Admin Compose Notification Modal (One-click, single message box) -->
    @if (notificationService.openAddModal()) {
      <div class="modal-backdrop" (click)="notificationService.openAddModal.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div>
              <span class="modal-sub">Border Operations</span>
              <h3 class="modal-title">Broadcast Notification</h3>
            </div>
            <button type="button" class="btn-close" (click)="notificationService.openAddModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="sendNotification()" class="modal-form">
            <div class="form-group">
              <label for="notif-text-input">Write message for all users:</label>
              <textarea
                id="notif-text-input"
                rows="4"
                [(ngModel)]="newMessage"
                name="newMessage"
                placeholder="Type your message here... (e.g. All officers: new clearance protocol is now active at Namanga OSBP)"
                required
                autofocus
              ></textarea>
            </div>

            @if (errorMsg()) {
              <div class="form-error">{{ errorMsg() }}</div>
            }

            <div class="modal-actions">
              <button
                type="button"
                class="btn-cancel"
                (click)="notificationService.openAddModal.set(false)"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn-submit"
                [disabled]="sending() || !newMessage.trim()"
              >
                {{ sending() ? 'Sending...' : 'Send Notification' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [
    `
      /* Single Orange/Gold Color: matches .t0 placeholder (--gold: #FFB81C) */
      .down-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background: #FFB81C;
        color: #1a1a1a;
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
        border-top: 3px solid #e5a414;
        padding: 0.65rem 1.5rem;
        font-family: inherit;
        transition: all 0.25s ease;
      }
      .down-bar-quiet {
        padding: 0.45rem 1.5rem;
      }
      .down-bar-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1.2rem;
        justify-content: space-between;
      }
      .notif-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(0, 0, 0, 0.12);
        color: #1a1a1a;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #1a1a1a;
        display: inline-block;
        animation: pulse 1.8s infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.35;
          transform: scale(1.3);
        }
      }
      .notif-body {
        flex: 1;
        min-width: 0;
        font-size: 0.92rem;
        line-height: 1.35;
        font-weight: 500;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .notif-title {
        font-weight: 800;
        margin-right: 0.35rem;
      }
      .notif-text {
        font-weight: 500;
      }
      .notif-actions {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-shrink: 0;
      }
      .btn-admin-add {
        background: #1a1a1a;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.82rem;
        padding: 0.38rem 0.85rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }
      .btn-admin-add:hover {
        background: #333333;
      }
      .btn-dismiss {
        background: rgba(0, 0, 0, 0.12);
        color: #1a1a1a;
        border: none;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 700;
        transition: background 0.15s;
      }
      .btn-dismiss:hover {
        background: rgba(0, 0, 0, 0.22);
      }

      /* Modal */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: rgba(0, 20, 60, 0.5);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
      }
      .modal-card {
        width: 100%;
        max-width: 500px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        overflow: hidden;
      }
      .modal-head {
        padding: 1.2rem 1.5rem;
        background: #FFF4DD; /* soft gold */
        border-bottom: 2px solid #FFB81C;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .modal-sub {
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #b45309;
        letter-spacing: 0.05em;
      }
      .modal-title {
        margin: 0.15rem 0 0;
        font-size: 1.2rem;
        color: #1a1a1a;
      }
      .btn-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        color: #64748b;
        cursor: pointer;
      }
      .modal-form {
        padding: 1.5rem;
      }
      .form-group {
        margin-bottom: 1.2rem;
      }
      .form-group label {
        display: block;
        font-size: 0.88rem;
        font-weight: 700;
        margin-bottom: 0.4rem;
        color: #1a1a1a;
      }
      .form-group textarea {
        width: 100%;
        padding: 0.7rem 0.85rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font: inherit;
        font-size: 0.95rem;
        resize: vertical;
        box-sizing: border-box;
      }
      .form-group textarea:focus {
        outline: none;
        border-color: #FFB81C;
        box-shadow: 0 0 0 3px rgba(255, 184, 28, 0.25);
      }
      .form-error {
        color: #dc2626;
        font-size: 0.85rem;
        margin-bottom: 1rem;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.8rem;
        margin-top: 1rem;
      }
      .btn-cancel {
        padding: 0.55rem 1.1rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-submit {
        padding: 0.55rem 1.4rem;
        border: none;
        border-radius: 6px;
        background: #FFB81C;
        color: #1a1a1a;
        font-weight: 800;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-submit:hover {
        background: #e5a414;
      }
      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      @media (max-width: 768px) {
        .down-bar-content {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .notif-actions {
          width: 100%;
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class NotificationBarComponent {
  newMessage = '';
  sending = signal(false);
  errorMsg = signal('');

  constructor(
    public notificationService: NotificationService,
    public authService: AuthService,
  ) {}

  async sendNotification() {
    const msg = this.newMessage.trim();
    if (!msg) return;
    this.sending.set(true);
    this.errorMsg.set('');
    try {
      await this.notificationService.broadcastNotification('Notice', msg, 'INFO');
      this.newMessage = '';
      this.notificationService.openAddModal.set(false);
    } catch (err: any) {
      this.errorMsg.set(
        err?.error?.message || 'Failed to send notification. Please make sure you are logged in.',
      );
    } finally {
      this.sending.set(false);
    }
  }

  dismiss(id: number) {
    if (this.authService.isAdmin()) {
      this.notificationService.deactivate(id);
    } else {
      this.notificationService.dismissLocally();
    }
  }
}
