import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Section } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';

@Component({
  selector: 'app-edit-section-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: '../modal-editor.css',
  template: `
    @if (open && section) {
      <div class="modal-backdrop" (click)="onClose()">
        <div class="modal-card edit-modal-card" style="max-width: 600px;" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div>
              <span class="modal-sub">Section Settings</span>
              <h3 class="modal-title">Edit Section</h3>
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
              <label for="edit-module-title">Section Title:</label>
              <input
                id="edit-module-title"
                type="text"
                [(ngModel)]="editTitle"
                class="form-input"
                placeholder="e.g. Section 1: MIGRATION MANAGEMENT"
              />
            </div>

            <!-- Section Image Management -->
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
                    [(ngModel)]="editImageUrl"
                    placeholder="Paste Image URL (https://... or data:image...)"
                    class="form-input"
                    style="flex: 1; min-width: 220px;"
                  />
                  @if (editImageUrl) {
                    <button
                      type="button"
                      class="btn-remove-img"
                      (click)="editImageUrl = ''"
                      title="Remove section image"
                    >
                      Remove
                    </button>
                  }
                </div>

                @if (editImageUrl) {
                  <div class="img-preview-box">
                    <img
                      [src]="editImageUrl"
                      alt="Section Image Preview"
                      class="img-thumb"
                      style="width: 140px; height: 95px; object-fit: cover; border-radius: 6px;"
                    />
                    <div class="img-preview-meta">
                      <span class="badge-success">Image Attached</span>
                      <span class="img-preview-hint">
                        This image will display on the section card replacing the placeholder.
                      </span>
                    </div>
                  </div>
                } @else {
                  <div class="img-empty-box">
                    <span>No custom image selected (default section illustration placeholder will be used)</span>
                  </div>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions" style="justify-content: space-between; margin-top: 1.5rem;">
              <button
                type="button"
                class="btn-delete"
                [disabled]="saving() || deleting"
                (click)="onDeleteRequest()"
                title="Delete this section and all its pages"
              >
                Delete Section
              </button>
              <div style="display: flex; gap: 0.8rem;">
                <button
                  type="button"
                  class="btn-cancel"
                  [disabled]="saving() || deleting"
                  (click)="onClose()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-save"
                  [disabled]="saving() || !editTitle.trim() || deleting"
                  (click)="handleSave()"
                >
                  {{ saving() ? 'Saving...' : 'Save Section Changes' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class EditSectionModalComponent implements OnChanges {
  @Input() open = false;
  @Input() section: Section | null = null;
  @Input() deleting = false;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() deleteRequest = new EventEmitter<Section>();

  editTitle = '';
  editImageUrl = '';
  saving = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  constructor(private manualService: ManualService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['section'] && this.section) {
      this.editTitle = this.section.title;
      this.editImageUrl = this.section.imageUrl || '';
      this.successMsg.set('');
      this.errorMsg.set('');
    }
  }

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
      this.editImageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onClose() {
    this.close.emit();
  }

  onDeleteRequest() {
    if (this.section) {
      this.deleteRequest.emit(this.section);
    }
  }

  async handleSave() {
    if (!this.section || !this.editTitle.trim()) return;

    if (!this.section.rawId) {
      this.errorMsg.set('Cannot find the topic ID for this section.');
      return;
    }

    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    try {
      await this.manualService.updateTopic(this.section.rawId, {
        title: this.editTitle.trim(),
        imageUrl: this.editImageUrl ? this.editImageUrl.trim() : '',
        topicNumber: this.section.order,
      });

      this.successMsg.set('Section updated successfully!');
      this.saved.emit();
      setTimeout(() => {
        this.onClose();
      }, 700);
    } catch (err: any) {
      this.errorMsg.set(
        err?.message || 'Failed to save section. Ensure you are logged in as admin.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
