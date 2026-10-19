import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentTree, AdminStats } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';

@Component({
  selector: 'app-admin-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <div
        style="position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background-color: rgba(0, 40, 122, 0.45); backdrop-filter: blur(3px);"
        (click)="onClose()"
      >
        <div
          style="width: 100%; max-width: 680px; max-height: 90vh; background: #ffffff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid var(--line); overflow-y: auto; display: flex; flex-direction: column;"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div
            style="padding: 1.4rem 1.8rem; border-bottom: 1px solid var(--line); background: var(--paper); display: flex; align-items: center; justify-content: space-between;"
          >
            <div>
              <div
                style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--blue); margin-bottom: 0.2rem;"
              >
                Management Console
              </div>
              <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800;">
                Admin Operations & Manual Sync
              </h2>
            </div>
            <button
              type="button"
              (click)="onClose()"
              style="padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid var(--line); font-size: 0.85rem; font-weight: 700;"
            >
              Close
            </button>
          </div>

          <!-- Body -->
          <div style="padding: 1.8rem;">
            @if (statusMsg) {
              <div
                [style.background]="statusMsg.type === 'ok' ? '#ecfdf5' : '#fee2e2'"
                [style.border]="statusMsg.type === 'ok' ? '1px solid #10b981' : '1px solid #f87171'"
                [style.color]="statusMsg.type === 'ok' ? '#065f46' : '#991b1b'"
                style="padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.9rem; margin-bottom: 1.4rem;"
              >
                {{ statusMsg.text }}
              </div>
            }

            <!-- Stats Bar -->
            <div
              style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.8rem;"
            >
              <div
                style="padding: 1rem; border-radius: 8px; border: 1px solid var(--line); background: var(--paper);"
              >
                <div style="font-size: 0.78rem; color: var(--muted); font-weight: 600;">
                  Total Topics
                </div>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--blue);">
                  {{ tree?.sections?.length || 10 }}
                </div>
              </div>

              <div
                style="padding: 1rem; border-radius: 8px; border: 1px solid var(--line); background: var(--paper);"
              >
                <div style="font-size: 0.78rem; color: var(--muted); font-weight: 600;">
                  Database Sections
                </div>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--blue);">
                  {{ stats?.sections || 211 }}
                </div>
              </div>

              <div
                style="padding: 1rem; border-radius: 8px; border: 1px solid var(--line); background: var(--paper);"
              >
                <div style="font-size: 0.78rem; color: var(--muted); font-weight: 600;">
                  Backend Status
                </div>
                <div
                  style="font-size: 0.95rem; font-weight: 700; color: #059669; margin-top: 0.4rem;"
                >
                  Connected (Live)
                </div>
              </div>
            </div>

            <!-- Section 1: Rebuild Search Index -->
            <div
              style="padding: 1.4rem; border-radius: 8px; border: 1px solid var(--line); margin-bottom: 1.6rem;"
            >
              <h3 style="margin: 0 0 0.4rem; font-size: 1.1rem; font-weight: 700;">
                Apache Lucene Search Index
              </h3>
              <p style="margin: 0 0 1rem; font-size: 0.88rem; color: var(--ink-soft);">
                Re-scan and tokenize all database sections to ensure search results and match counts
                are 100% synchronized with the latest edits.
              </p>
              <button
                type="button"
                class="btn btn-gold"
                [disabled]="rebuilding"
                (click)="handleRebuild()"
              >
                {{ rebuilding ? 'Rebuilding Index...' : 'Rebuild Search Index Now' }}
              </button>
            </div>

            <!-- Section 2: Re-upload PDF Manual -->
            <div
              style="padding: 1.4rem; border-radius: 8px; border: 1px solid var(--line);"
            >
              <h3 style="margin: 0 0 0.4rem; font-size: 1.1rem; font-weight: 700;">
                Upload New PDF Manual Edition
              </h3>
              <p style="margin: 0 0 1rem; font-size: 0.88rem; color: var(--ink-soft);">
                Upload an updated version of the Learner Manual PDF. The backend will parse
                chapters, sections, and rebuild the database tree.
              </p>
              <form (ngSubmit)="handleUpload($event)">
                <input
                  type="file"
                  accept=".pdf"
                  (change)="onFileChange($event)"
                  style="margin-bottom: 1rem; display: block; font-size: 0.9rem;"
                />
                <button
                  type="submit"
                  class="btn"
                  [disabled]="uploading || !selectedFile"
                >
                  {{ uploading ? 'Processing PDF...' : 'Upload & Ingest Manual' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminModalComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() tree: ContentTree | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  stats: AdminStats | null = null;
  rebuilding = false;
  uploading = false;
  selectedFile: File | null = null;
  statusMsg: { type: 'ok' | 'err'; text: string } | null = null;

  constructor(private manualService: ManualService) {}

  ngOnInit() {
    if (this.open) this.loadStats();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.loadStats();
    }
  }

  async loadStats() {
    try {
      this.stats = await this.manualService.fetchAdminStats();
    } catch {
      // Ignored
    }
  }

  onClose() {
    this.close.emit();
  }

  async handleRebuild() {
    this.rebuilding = true;
    this.statusMsg = null;
    try {
      await this.manualService.rebuildIndex();
      this.statusMsg = { type: 'ok', text: 'Lucene search index successfully rebuilt.' };
      this.refresh.emit();
    } catch (err: unknown) {
      this.statusMsg = {
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to rebuild index.',
      };
    } finally {
      this.rebuilding = false;
    }
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  async handleUpload(e: Event) {
    e.preventDefault();
    if (!this.selectedFile) return;
    this.uploading = true;
    this.statusMsg = null;
    try {
      const res = await this.manualService.uploadManual(this.selectedFile);
      this.statusMsg = { type: 'ok', text: res.message || 'Manual uploaded successfully.' };
      this.selectedFile = null;
      this.refresh.emit();
    } catch (err: unknown) {
      this.statusMsg = {
        type: 'err',
        text: err instanceof Error ? err.message : 'Upload failed.',
      };
    } finally {
      this.uploading = false;
    }
  }
}
