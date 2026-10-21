import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onClose()">
        <div class="modal-card delete-warning-modal-card" (click)="$event.stopPropagation()">
          <div class="delete-warning-header">
            <div class="delete-warning-icon-wrapper">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                ></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div>
              <span class="delete-warning-sub">Security &amp; Integrity Validation</span>
              <h3 class="delete-warning-title">
                {{
                  type === 'page'
                    ? 'Confirm Permanent Page Deletion'
                    : 'Confirm Permanent Section Deletion'
                }}
              </h3>
            </div>
            <button type="button" class="btn-close" (click)="onClose()">&times;</button>
          </div>

          <div class="delete-warning-body">
            <div class="delete-warning-banner">
              <strong style="color: #991b1b; display: block; margin-bottom: 0.3rem;">
                ⚠️ Caution: This action cannot be undone!
              </strong>
              @if (type === 'page') {
                <span>
                  You are about to permanently delete page
                  <strong>"{{ targetTitle }}"</strong> from the database. It will be removed
                  immediately from the manual curriculum, search index, and cached table of
                  contents.
                </span>
              } @else {
                <span>
                  You are about to permanently delete section
                  <strong>"{{ targetTitle }}"</strong>.
                  @if (itemCount > 0) {
                    <span style="display: block; margin-top: 0.4rem; font-weight: 700; color: #b91c1c;">
                      This section currently contains {{ itemCount }}
                      {{ itemCount === 1 ? 'page' : 'pages' }}. Deleting this section will
                      permanently erase all pages inside it!
                    </span>
                  }
                </span>
              }
            </div>

            @if (errorMsg) {
              <div class="form-error" style="margin-top: 1rem;">{{ errorMsg }}</div>
            }
          </div>

          <div class="delete-warning-actions">
            <button
              type="button"
              class="btn-cancel"
              [disabled]="executing"
              (click)="onClose()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn-delete"
              [disabled]="executing"
              (click)="onConfirm()"
            >
              {{ executing ? 'Deleting...' : 'Yes, Delete Permanently' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2200;
        background: rgba(0, 20, 60, 0.55);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
      }

      .modal-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.22);
        width: 100%;
        max-width: 520px;
        overflow: hidden;
      }

      .delete-warning-modal-card {
        border-top: 5px solid #dc2626;
      }

      .delete-warning-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.4rem 1.6rem 1.1rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .delete-warning-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        background: #fee2e2;
        color: #dc2626;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .delete-warning-sub {
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #dc2626;
        display: block;
        margin-bottom: 0.15rem;
      }

      .delete-warning-title {
        margin: 0;
        font-size: 1.18rem;
        font-weight: 800;
        color: #0f172a;
      }

      .btn-close {
        margin-left: auto;
        background: none;
        border: none;
        font-size: 1.6rem;
        color: #94a3b8;
        cursor: pointer;
        padding: 0 0.4rem;
        line-height: 1;
      }

      .btn-close:hover {
        color: #1e293b;
      }

      .delete-warning-body {
        padding: 1.4rem 1.6rem;
      }

      .delete-warning-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 1rem 1.1rem;
        font-size: 0.92rem;
        line-height: 1.55;
        color: #7f1d1d;
      }

      .form-error {
        background: #fee2e2;
        border: 1px solid #ef4444;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-size: 0.88rem;
        font-weight: 600;
      }

      .delete-warning-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.8rem;
        padding: 1.1rem 1.6rem 1.4rem;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .btn-cancel {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
        font-weight: 700;
        font-size: 0.92rem;
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .btn-cancel:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
      }

      .btn-delete {
        background: #dc2626;
        border: 1px solid #b91c1c;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.92rem;
        padding: 0.6rem 1.4rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .btn-delete:hover:not(:disabled) {
        background: #b91c1c;
      }

      .btn-delete:disabled,
      .btn-cancel:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class DeleteConfirmModalComponent {
  @Input() open = false;
  @Input() type: 'page' | 'module' = 'page';
  @Input() targetTitle = '';
  @Input() itemCount = 0;
  @Input() executing = false;
  @Input() errorMsg = '';

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onClose() {
    if (this.executing) return;
    this.close.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }
}
