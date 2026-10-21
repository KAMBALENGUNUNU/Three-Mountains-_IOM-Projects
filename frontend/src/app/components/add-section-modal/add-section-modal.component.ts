import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManualService } from '../../services/manual.service';

@Component({
  selector: 'app-add-section-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: '../modal-editor.css',
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="onClose()">
        <div class="modal-card edit-modal-card" style="max-width: 640px;" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div>
              <span class="modal-sub">Section Creator</span>
              <h3 class="modal-title">Add New Section</h3>
            </div>
            <button type="button" class="btn-close" (click)="onClose()">&times;</button>
          </div>

          <div class="modal-body">
            @if (successMsg()) {
              <div class="form-success">{{ successMsg() }}</div>
            }
            @if (errorMsg()) {
              <div class="form-error">{{ errorMsg() }}</div>
            }

            <!-- Section Title -->
            <div class="form-group">
              <label for="new-section-title">
                Section Title:
                <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">
                  (e.g., Section 9: CROSS-BORDER HEALTH PROTOCOLS)
                </span>
              </label>
              <input
                id="new-section-title"
                type="text"
                [(ngModel)]="newSectionTitle"
                class="form-input"
                placeholder="Enter section title..."
              />
            </div>

            <!-- Illustration Image -->
            <div class="form-group">
              <label>Section Illustration / Image:</label>
              <div class="image-uploader-card">
                <div class="image-uploader-controls">
                  <label class="btn-upload-file">
                    <span class="upload-sticker">📁</span>
                    <span>Choose image file</span>
                    <input
                      type="file"
                      accept="image/*"
                      (change)="onImageSelected($event)"
                      style="display: none;"
                    />
                  </label>
                  <span class="upload-or">or</span>
                  <input
                    type="text"
                    [(ngModel)]="newSectionImageUrl"
                    placeholder="Paste Image URL (https://... or data:image...)"
                    class="form-input"
                    style="flex: 1; min-width: 220px;"
                  />
                  @if (newSectionImageUrl) {
                    <button
                      type="button"
                      class="btn-remove-img"
                      (click)="newSectionImageUrl = ''"
                      title="Remove image"
                    >
                      Remove
                    </button>
                  }
                </div>

                @if (newSectionImageUrl) {
                  <div class="img-preview-box">
                    <img
                      [src]="newSectionImageUrl"
                      alt="Section Image Preview"
                      class="img-thumb"
                      style="width: 140px; height: 95px; object-fit: cover; border-radius: 6px;"
                    />
                    <div class="img-preview-meta">
                      <span class="badge-success">Image Attached</span>
                      <span class="img-preview-hint">
                        This illustration image will be displayed on the section card replacing the placeholder.
                      </span>
                    </div>
                  </div>
                } @else {
                  <div class="img-empty-box">
                    <span>No custom image selected (default section placeholder icon will be used)</span>
                  </div>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions" style="justify-content: flex-end; margin-top: 1.5rem; gap: 0.8rem;">
              <button
                type="button"
                class="btn-cancel"
                [disabled]="creating()"
                (click)="onClose()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-save"
                [disabled]="creating() || !newSectionTitle.trim()"
                (click)="handleCreate()"
              >
                {{ creating() ? 'Creating Section...' : 'Create Section' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AddSectionModalComponent {
  @Input() open = false;

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  newSectionTitle = '';
  newSectionImageUrl = '';
  creating = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  constructor(private manualService: ManualService) {}

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 15 * 1024 * 1024) {
      this.errorMsg.set('Selected image is too large. Please select an image under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.newSectionImageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onClose() {
    this.close.emit();
  }

  async handleCreate() {
    const title = this.newSectionTitle.trim();
    if (!title) {
      this.errorMsg.set('Section title is required.');
      return;
    }

    this.creating.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    try {
      await this.manualService.createNewSection({
        title,
        imageUrl: this.newSectionImageUrl ? this.newSectionImageUrl.trim() : '',
      });

      this.successMsg.set('New section created successfully!');
      this.created.emit();
      setTimeout(() => {
        this.newSectionTitle = '';
        this.newSectionImageUrl = '';
        this.onClose();
      }, 700);
    } catch (err: any) {
      this.errorMsg.set(
        err?.message || 'Failed to create section. Ensure you are logged in as admin.',
      );
    } finally {
      this.creating.set(false);
    }
  }
}
