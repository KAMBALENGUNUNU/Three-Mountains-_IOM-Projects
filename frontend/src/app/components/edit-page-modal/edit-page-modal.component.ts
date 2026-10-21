import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  SimpleChanges,
  OnChanges,
  HostListener,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentBlock, SectionVersion } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { ImageCropModalComponent } from '../image-crop-modal/image-crop-modal.component';

@Component({
  selector: 'app-edit-page-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RichTextEditorComponent, ImageCropModalComponent],
  styleUrl: '../modal-editor.css',
  template: `
    @if (isOpen) {
      <div class="modal-backdrop editor-backdrop-fullscreen" (click)="requestExitEditor()">
        <!-- Floating Sticky Exit Button Outside Content Area -->
        <button
          type="button"
          class="floating-exit-editor-btn"
          (click)="$event.stopPropagation(); requestExitEditor()"
          title="Exit Editor (Esc)"
        >
          <span>Exit Editor</span>
          <span class="floating-exit-cross">&times;</span>
        </button>

        <div class="modal-card edit-modal-card fullscreen-editor-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div>
              <span class="modal-sub">Curriculum Editor</span>
              <h3 class="modal-title">Edit Page Content</h3>
            </div>
          </div>

          <!-- Editor Navigation Tabs -->
          <div class="modal-tabs">
            <button
              type="button"
              class="modal-tab-btn"
              [class.active]="editTab() === 'edit'"
              (click)="editTab.set('edit')"
            >
              Edit Form
            </button>
            <button
              type="button"
              class="modal-tab-btn"
              [class.active]="editTab() === 'preview'"
              (click)="editTab.set('preview')"
            >
              Live Page Preview
            </button>
            <button
              type="button"
              class="modal-tab-btn"
              [class.active]="editTab() === 'versions'"
              (click)="switchTabToVersions()"
            >
              Version History & Drafts
            </button>
          </div>

          <div class="modal-body">
            <!-- Page Selector Dropdown -->
            <div class="form-group">
              <label for="subtopic-picker">Select Page to Edit:</label>
              <select
                id="subtopic-picker"
                [ngModel]="currentSubtopicId()"
                (ngModelChange)="onSelectSubtopicToEdit($event)"
                class="form-select"
              >
                @for (item of allSubtopics; track item.id) {
                  <option [value]="item.id">{{ item.label }}</option>
                }
              </select>
            </div>

            @if (loadingSectionEdit()) {
              <div style="padding: 2.5rem; text-align: center; color: var(--muted); font-size: 0.95rem;">
                Loading page details...
              </div>
            } @else if (editTab() === 'edit') {
              <!-- Page Title -->
              <div class="form-group">
                <label for="edit-title">Page Title:</label>
                <input
                  id="edit-title"
                  type="text"
                  [(ngModel)]="editTitle"
                  class="form-input"
                  placeholder="Page Title"
                />
              </div>

              <!-- Page Image Management -->
              <div class="form-group">
                <label>Page Illustration / Photo:</label>
                <div class="image-uploader-card">
                  <div class="image-uploader-controls">
                    <label class="btn-upload-file">
                      <span class="upload-sticker">📁</span>
                      <span>Choose image file</span>
                      <input
                        type="file"
                        accept="image/*"
                        (change)="onImageFileSelected($event)"
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
                        (click)="removeImage()"
                        title="Remove custom image"
                      >
                        Remove
                      </button>
                    }
                  </div>

                  @if (editImageUrl) {
                    <div class="img-preview-box">
                      <img [src]="editImageUrl" alt="Page Image Preview" class="img-thumb" style="max-height: 120px; object-fit: contain;" />
                      <div class="img-preview-meta">
                        <span class="badge-success">Image Attached</span>
                        <span class="img-preview-hint">
                          This image will appear on the page and in card previews.
                        </span>
                        <div style="margin-top: 0.5rem;">
                          <button
                            type="button"
                            class="btn-crop-resize"
                            (click)="openCropModalForPageImage()"
                            title="Crop and resize this page illustration manually"
                          >
                            ✂️ Crop & Resize Image
                          </button>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="img-empty-box">
                      <span>No custom image selected (default topic illustration placeholder will be used)</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Card Overview / Summary -->
              <div class="form-group">
                <label for="edit-overview">
                  Card Overview & Summary:
                  <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(Short summary shown on main page cards)</span>
                </label>
                <textarea
                  id="edit-overview"
                  rows="2"
                  [(ngModel)]="editOverview"
                  class="form-input"
                  placeholder="Enter brief preview summary..."
                ></textarea>
              </div>

              <!-- Modular Content Blocks Section -->
              <div class="form-group" style="margin-top: 1.5rem;">
                <div class="content-blocks-header">
                  <div>
                    <span class="content-blocks-title">Page Content Blocks & Illustrations</span>
                    <p style="margin: 0.15rem 0 0; font-size: 0.82rem; color: #64748b;">
                      Arrange your page paragraphs and images. For each image, you can choose left or right text alignment.
                    </p>
                  </div>
                </div>

                <!-- List of Editable Blocks -->
                @for (blk of editBlocks(); track $index; let bIdx = $index) {
                  <div class="block-card">
                    <div class="block-header">
                      <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span class="block-badge" [class.badge-media]="blk.type === 'media-text'">
                          {{ blk.type === 'media-text' ? 'Media + Text' : 'Paragraph' }}
                        </span>
                        <span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">Block #{{ bIdx + 1 }}</span>
                      </div>
                      <div class="block-controls">
                        <button
                          type="button"
                          class="btn-block-ctrl"
                          [disabled]="bIdx === 0"
                          (click)="moveEditBlock(bIdx, -1)"
                          title="Move block up"
                        >▲</button>
                        <button
                          type="button"
                          class="btn-block-ctrl"
                          [disabled]="bIdx === editBlocks().length - 1"
                          (click)="moveEditBlock(bIdx, 1)"
                          title="Move block down"
                        >▼</button>
                        <button
                          type="button"
                          class="btn-block-ctrl btn-block-delete"
                          [disabled]="editBlocks().length === 1 && blk.type === 'paragraph' && !blk.text"
                          (click)="promptRemoveEditBlock(bIdx)"
                          title="Delete this block"
                        >✕</button>
                      </div>
                    </div>

                    @if (blk.type === 'media-text') {
                      <!-- Alignment Controls -->
                      <div class="alignment-group">
                        <span class="alignment-label">Text Alignment:</span>
                        <button
                          type="button"
                          class="btn-align"
                          [class.active]="blk.alignment === 'left'"
                          (click)="setEditBlockAlignment(bIdx, 'left')"
                          title="Image on the Left, Text on the Right"
                        >
                          Image Left | Text Right
                        </button>
                        <button
                          type="button"
                          class="btn-align"
                          [class.active]="blk.alignment === 'right' || !blk.alignment"
                          (click)="setEditBlockAlignment(bIdx, 'right')"
                          title="Text on the Left, Image on the Right"
                        >
                          Text Left | Image Right
                        </button>
                        <button
                          type="button"
                          class="btn-align"
                          [class.active]="blk.alignment === 'full'"
                          (click)="setEditBlockAlignment(bIdx, 'full')"
                          title="Full width image with text below"
                        >
                          Full Width
                        </button>
                      </div>

                      <!-- Image Uploader & Text Layout -->
                      <div class="media-block-editor-grid">
                        <div class="media-block-uploader">
                          <div class="image-uploader-card" style="padding: 0.75rem;">
                            <div class="image-uploader-controls" style="flex-wrap: wrap;">
                              <label class="btn-upload-file">
                                <span class="upload-sticker">📁</span>
                                <span>Choose file</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  (change)="onBlockImageSelected($event, bIdx)"
                                  style="display: none;"
                                />
                              </label>
                              <span class="upload-or">or</span>
                              <input
                                type="text"
                                [(ngModel)]="blk.imageUrl"
                                placeholder="Image URL"
                                class="form-input"
                                style="flex: 1; min-width: 140px; font-size: 0.85rem;"
                              />
                              @if (blk.imageUrl) {
                                <button
                                  type="button"
                                  class="btn-remove-img"
                                  (click)="blk.imageUrl = ''"
                                  title="Remove this image"
                                >
                                  Remove
                                </button>
                              }
                            </div>
                            @if (blk.imageUrl) {
                              <div class="img-preview-box" style="margin-top: 0.5rem; display: flex; align-items: flex-start; gap: 0.8rem;">
                                <div
                                  style="width: 140px; max-height: 120px; border: 2px solid var(--blue); border-radius: 6px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
                                >
                                  <img
                                    [src]="blk.imageUrl"
                                    alt="Block image preview"
                                    style="width: 100%; height: 100%; object-fit: contain; display: block;"
                                  />
                                </div>
                                <div class="img-preview-meta" style="flex: 1;">
                                  <span class="badge-success">Attached</span>
                                  <div style="margin-top: 0.45rem;">
                                    <button
                                      type="button"
                                      class="btn-crop-resize"
                                      (click)="openCropModalForBlock(bIdx)"
                                      title="Crop and resize this image manually"
                                    >
                                      ✂️ Crop & Resize Image
                                    </button>
                                  </div>
                                </div>
                              </div>
                            }
                          </div>
                        </div>

                        <div class="media-block-text">
                          <app-rich-text-editor
                            [(ngModel)]="blk.text"
                            placeholder="Write or edit the formatted text that accompanies this image..."
                          ></app-rich-text-editor>
                        </div>
                      </div>
                    } @else {
                      <!-- Pure Text Block (Rich Text Editor) -->
                      <app-rich-text-editor
                        [(ngModel)]="blk.text"
                        placeholder="Enter formatted paragraph text, headings, lists, tables or links..."
                      ></app-rich-text-editor>
                    }
                  </div>
                }

                <div style="display: flex; gap: 0.6rem; margin-top: 0.8rem;">
                  <button type="button" class="btn-add-block" (click)="addEditBlock('paragraph')">
                    + Add Text Paragraph
                  </button>
                  <button type="button" class="btn-add-block" (click)="addEditBlock('media-text')">
                    + Add Image & Text Block
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-top: 1rem; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
                <label for="change-summary">Version Change Log / Summary (Optional):</label>
                <input
                  id="change-summary"
                  type="text"
                  [(ngModel)]="versionChangeSummary"
                  class="form-input"
                  placeholder="e.g. Updated border clearance steps for cross-border transit"
                  style="font-size: 0.9rem;"
                />
              </div>

              @if (editSuccessMsg()) {
                <div class="form-success">{{ editSuccessMsg() }}</div>
              }
              @if (editErrorMsg()) {
                <div class="form-error">{{ editErrorMsg() }}</div>
              }

              <div class="modal-actions" style="justify-content: space-between; flex-wrap: wrap; gap: 0.8rem;">
                <button
                  type="button"
                  class="btn-delete"
                  [disabled]="deletingSection || savingEdit() || savingDraft()"
                  (click)="requestDelete.emit({ id: currentSubtopicId(), title: editTitle })"
                  title="Delete this page"
                >
                  Delete Page
                </button>
                <div style="display: flex; gap: 0.8rem; flex-wrap: wrap;">
                  <button
                    type="button"
                    class="btn-cancel"
                    (click)="requestExitEditor()"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                    [disabled]="savingDraft() || savingEdit() || !editTitle.trim()"
                    (click)="handleSaveDraft()"
                    title="Save as Draft revision without publishing live to readers"
                  >
                    {{ savingDraft() ? 'Saving Draft...' : 'Save as Draft' }}
                  </button>
                  <button
                    type="button"
                    class="btn-preview-switch"
                    (click)="editTab.set('preview')"
                    [disabled]="!editTitle.trim()"
                    title="Preview exact page display before publishing live"
                  >
                    Preview Page
                  </button>
                  <button
                    type="button"
                    class="btn-save btn-publish-live"
                    [disabled]="savingEdit() || savingDraft() || !editTitle.trim() || deletingSection"
                    (click)="handleSaveContentEdit()"
                  >
                    {{ savingEdit() ? 'Publishing...' : 'Save & Publish Live' }}
                  </button>
                </div>
              </div>
            } @else if (editTab() === 'preview') {
              <!-- Live Page Preview Mode -->
              <div class="live-preview-container">
                <div class="preview-notice-bar">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <span class="preview-badge-live">Preview Mode</span>
                    <span style="font-size: 0.88rem; color: #334155; font-weight: 600;">
                      How this page will appear to readers before publishing:
                    </span>
                  </div>
                  <button type="button" class="btn-back-to-edit" (click)="editTab.set('edit')">
                    Back to Editing
                  </button>
                </div>

                <div class="preview-reader-mock">
                  <p style="font-size: 0.82rem; color: var(--muted); margin: 0 0 0.4rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                    Official OSBP Field Guide Page
                  </p>

                  <h1 style="font-size: 1.85rem; font-weight: 800; margin: 0 0 0.8rem; color: #00143c; line-height: 1.2;">
                    {{ editTitle || 'Untitled Page' }}
                  </h1>

                  @if (editOverview.trim()) {
                    <div class="preview-overview-box">
                      <div class="preview-overview-title">Key Operational Overview</div>
                      <p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: #1e293b; font-weight: 500;">
                        {{ editOverview }}
                      </p>
                    </div>
                  }

                  <div class="preview-content-layout">
                    @for (blk of editBlocks(); track $index) {
                      @if (blk.type === 'media-text') {
                        <div class="preview-media-box align-{{ blk.alignment || 'right' }}">
                          @if (blk.imageUrl) {
                            <div class="preview-media-img">
                              <img [src]="blk.imageUrl" alt="Preview illustration" />
                            </div>
                          }
                          <div class="preview-media-text">
                            <div class="preview-rich-content" [innerHTML]="blk.text || ''"></div>
                          </div>
                        </div>
                      } @else {
                        <div class="preview-block">
                          <div class="preview-rich-content" [innerHTML]="blk.text || ''"></div>
                        </div>
                      }
                    }
                  </div>
                </div>

                @if (editSuccessMsg()) {
                  <div class="form-success" style="margin-top: 1rem;">{{ editSuccessMsg() }}</div>
                }
                @if (editErrorMsg()) {
                  <div class="form-error" style="margin-top: 1rem;">{{ editErrorMsg() }}</div>
                }

                <div class="modal-actions" style="justify-content: space-between; margin-top: 1.2rem;">
                  <button
                    type="button"
                    class="btn-delete"
                    [disabled]="deletingSection || savingEdit() || savingDraft()"
                    (click)="requestDelete.emit({ id: currentSubtopicId(), title: editTitle })"
                    title="Delete this page"
                  >
                    Delete Page
                  </button>
                  <div style="display: flex; gap: 0.8rem;">
                    <button type="button" class="btn-cancel" (click)="editTab.set('edit')">
                      Back to Edit Form
                    </button>
                    <button
                      type="button"
                      class="btn-save btn-publish-live"
                      [disabled]="savingEdit() || savingDraft() || !editTitle.trim() || deletingSection"
                      (click)="handleSaveContentEdit()"
                    >
                      {{ savingEdit() ? 'Publishing...' : 'Save & Publish Live' }}
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Version History & Drafts Tab -->
              <div class="version-history-container">
                <div class="version-history-header">
                  <div>
                    <h4 style="margin: 0 0 0.3rem; font-size: 1.15rem; font-weight: 700; color: #0f172a;">
                      Revision History & Version Control
                    </h4>
                    <p style="margin: 0; font-size: 0.85rem; color: #64748b;">
                      Review all past versions and drafts of this page. You can restore any previous version at any time.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    style="font-size: 0.82rem; padding: 0.35rem 0.75rem;"
                    (click)="loadVersionsForSelectedPage()"
                  >
                    Refresh Versions
                  </button>
                </div>

                @if (loadingVersions()) {
                  <div style="padding: 2.5rem; text-align: center; color: #64748b; font-size: 0.95rem;">
                    Loading version history...
                  </div>
                } @else if (sectionVersions().length === 0) {
                  <div class="version-empty-state">
                    <p style="margin: 0 0 0.5rem; font-weight: 700; color: #334155;">No previous versions recorded yet.</p>
                    <p style="margin: 0; font-size: 0.85rem; color: #64748b;">
                      Whenever you save a draft or publish updates to this page, new versions will appear here automatically.
                    </p>
                  </div>
                } @else {
                  <div class="version-list">
                    @for (v of sectionVersions(); track v.id) {
                      <div class="version-item" [class.is-draft]="v.status === 'DRAFT'">
                        <div class="version-item-header">
                          <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <span class="version-badge" [class.badge-draft]="v.status === 'DRAFT'">
                              {{ v.status === 'DRAFT' ? 'DRAFT' : 'V' + v.versionNumber }}
                            </span>
                            <strong style="font-size: 0.95rem; color: #0f172a;">{{ v.title }}</strong>
                          </div>
                          <div style="font-size: 0.8rem; color: #64748b;">
                            {{ v.createdAt | date:'medium' }} by <strong>{{ v.createdBy }}</strong>
                          </div>
                        </div>

                        @if (v.changeSummary) {
                          <div class="version-summary">
                            <strong>Note:</strong> {{ v.changeSummary }}
                          </div>
                        }

                        <div class="version-actions">
                          <button
                            type="button"
                            class="btn btn-secondary"
                            style="font-size: 0.8rem; padding: 0.3rem 0.7rem;"
                            (click)="loadVersionIntoEditor(v)"
                            title="Load this version into the editor to inspect or modify"
                          >
                            Inspect in Editor
                          </button>
                          <button
                            type="button"
                            class="btn btn-gold"
                            style="font-size: 0.8rem; font-weight: 700; padding: 0.3rem 0.75rem;"
                            [disabled]="revertingVersion()"
                            (click)="handleRevertVersion(v.versionNumber)"
                            title="Restore this version as the live published content"
                          >
                            {{ revertingVersion() ? 'Reverting...' : 'Revert to this Version' }}
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <div class="modal-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                  <button type="button" class="btn-cancel" (click)="editTab.set('edit')">
                    Back to Editor
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Unsaved Changes Warning Modal -->
      @if (unsavedWarningModalOpen()) {
        <div class="modal-backdrop" (click)="unsavedWarningModalOpen.set(false)" style="z-index: 2200;">
          <div class="modal-card delete-warning-modal-card" style="border-top-color: #f59e0b;" (click)="$event.stopPropagation()">
            <div class="delete-warning-header">
              <div class="delete-warning-icon-wrapper" style="background: #fef3c7; color: #d97706;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div style="flex: 1;">
                <span class="delete-warning-sub" style="color: #b45309;">Unsaved Changes Detected</span>
                <h3 class="delete-warning-title">Save your changes before exiting?</h3>
              </div>
              <button type="button" class="btn-close" (click)="unsavedWarningModalOpen.set(false)">&times;</button>
            </div>

            <div class="delete-warning-body">
              <div class="delete-warning-banner" style="background: #fffbeb; border-color: #fde68a; color: #78350f;">
                <strong style="color: #92400e; display: block; margin-bottom: 0.4rem;">You have unsaved edits on "{{ editTitle || 'this page' }}"</strong>
                <span>
                  If you exit now without saving, your recent text, formatting, or image modifications will be discarded. You can save your work as a draft to finish later, or publish it live now.
                </span>
              </div>
            </div>

            <div class="modal-actions" style="justify-content: space-between; flex-wrap: wrap; gap: 0.8rem; margin-top: 1.5rem;">
              <button
                type="button"
                class="btn-delete"
                style="border-color: #cbd5e1; color: #64748b;"
                (click)="forceCloseEditor()"
                title="Discard your current changes and exit immediately"
              >
                Discard & Exit
              </button>
              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                <button
                  type="button"
                  class="btn-cancel"
                  (click)="unsavedWarningModalOpen.set(false)"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  style="font-size: 0.88rem; font-weight: 700; padding: 0.5rem 0.9rem;"
                  [disabled]="savingDraft()"
                  (click)="saveAndExitDraft()"
                  title="Save as a draft version and exit safely"
                >
                  {{ savingDraft() ? 'Saving...' : 'Save Draft & Exit' }}
                </button>
                <button
                  type="button"
                  class="btn-save btn-publish-live"
                  style="font-size: 0.88rem; padding: 0.5rem 1rem;"
                  [disabled]="savingEdit()"
                  (click)="saveAndExitLive()"
                  title="Publish live to readers and exit"
                >
                  {{ savingEdit() ? 'Publishing...' : 'Publish & Exit' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Delete Content Block Confirmation Modal -->
      @if (deleteBlockModalOpen()) {
        <div class="modal-backdrop" (click)="cancelDeleteBlock()" style="z-index: 2250;">
          <div class="modal-card delete-warning-modal-card" style="border-top-color: #ef4444; max-width: 480px;" (click)="$event.stopPropagation()">
            <div class="delete-warning-header">
              <div class="delete-warning-icon-wrapper" style="background: #fee2e2; color: #dc2626;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
              <div style="flex: 1;">
                <span class="delete-warning-sub" style="color: #dc2626;">Confirm Block Removal</span>
                <h3 class="delete-warning-title">Delete this content block?</h3>
              </div>
              <button type="button" class="btn-close" (click)="cancelDeleteBlock()">&times;</button>
            </div>

            <div class="delete-warning-body">
              <div class="delete-warning-banner" style="background: #fef2f2; border-color: #fecaca; color: #991b1b;">
                <strong style="color: #991b1b; display: block; margin-bottom: 0.35rem;">
                  {{ blockToDeleteTitle() }}
                </strong>
                <span style="font-size: 0.88rem; color: #7f1d1d; line-height: 1.45; display: block;">
                  {{ blockToDeleteDesc() }}
                </span>
              </div>
            </div>

            <div class="delete-warning-actions">
              <button
                type="button"
                class="btn-cancel"
                (click)="cancelDeleteBlock()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-delete"
                (click)="executeDeleteBlock()"
                style="background: #dc2626; color: #ffffff; border: none; font-weight: 700; padding: 0.55rem 1.2rem; border-radius: 6px; cursor: pointer;"
              >
                Yes, Delete Block
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Manual Image Crop & Resize Studio Modal -->
      <app-image-crop-modal
        [open]="cropModalOpen()"
        [imageSrc]="cropModalImageSrc()"
        [title]="cropModalTitle()"
        (close)="cropModalOpen.set(false)"
        (applied)="onCropApplied($event)"
      />
    }
  `
})
export class EditPageModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() selectedSubtopicId: string | null = null;
  @Input() allSubtopics: { id: string; label: string }[] = [];
  @Input() deletingSection = false;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{
    isDraft: boolean;
    id: string;
    title: string;
    overview: string;
    imageUrl: string;
    content: string;
  }>();
  @Output() requestDelete = new EventEmitter<{ id: string; title: string }>();

  currentSubtopicId = signal<string>('');
  editTab = signal<'edit' | 'preview' | 'versions'>('edit');
  loadingSectionEdit = signal(false);
  savingEdit = signal(false);
  savingDraft = signal(false);
  editSuccessMsg = signal('');
  editErrorMsg = signal('');

  editTitle = '';
  editOverview = '';
  editImageUrl = '';
  editContentText = '';
  versionChangeSummary = '';

  editBlocks = signal<ContentBlock[]>([{ type: 'paragraph', text: '' }]);

  // Version Control State
  sectionVersions = signal<SectionVersion[]>([]);
  loadingVersions = signal(false);
  revertingVersion = signal(false);

  // Unsaved Warning Modal State
  unsavedWarningModalOpen = signal(false);
  private initialEditState: {
    title: string;
    overview: string;
    imageUrl: string;
    rawContent: string;
  } = { title: '', overview: '', imageUrl: '', rawContent: '' };

  // Delete Content Block Confirmation Modal State
  deleteBlockModalOpen = signal(false);
  private blockToDeleteIndex: number | null = null;
  private blockToDeleteSnippet = '';
  private blockToDeleteTypeLabel = '';

  // Manual Crop & Resize Modal State
  cropModalOpen = signal(false);
  cropModalImageSrc = signal('');
  cropModalTitle = signal('Crop & Resize Image');
  private cropTarget: { type: 'page' | 'block'; index?: number } | null = null;

  constructor(private manualService: ManualService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedSubtopicId'] && this.selectedSubtopicId) {
      this.currentSubtopicId.set(this.selectedSubtopicId);
      if (this.isOpen) {
        this.loadSectionDataForEdit(this.selectedSubtopicId);
      }
    }

    if (changes['isOpen'] && this.isOpen) {
      this.editTab.set('edit');
      this.editSuccessMsg.set('');
      this.editErrorMsg.set('');
      const targetId = this.selectedSubtopicId || (this.allSubtopics.length > 0 ? this.allSubtopics[0].id : '');
      if (targetId) {
        this.currentSubtopicId.set(targetId);
        this.loadSectionDataForEdit(targetId);
      }
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (!this.isOpen) return;

    if (this.deleteBlockModalOpen()) {
      this.cancelDeleteBlock();
      return;
    }
    if (this.unsavedWarningModalOpen()) {
      this.unsavedWarningModalOpen.set(false);
      return;
    }
    this.requestExitEditor();
  }

  async onSelectSubtopicToEdit(id: string) {
    if (!id) return;
    this.currentSubtopicId.set(id);
    await this.loadSectionDataForEdit(id);
  }

  async loadSectionDataForEdit(id: string) {
    this.loadingSectionEdit.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');
    try {
      const art = await this.manualService.fetchArticle(id);
      this.editTitle = art.title || '';
      this.editOverview = art.overview || '';
      this.editImageUrl = art.imageUrl || '';
      const raw = art.content
        .map((b) => {
          if (b.type === 'media-text') {
            return `[media:${b.alignment || 'right'}|${b.imageSize || 'medium'}|${b.aspectRatio || '4-3'}|${b.imageUrl || ''}]\n${b.text || ''}`.trim();
          }
          return b.text || '';
        })
        .filter(Boolean)
        .join('\n\n');
      this.editContentText = raw;
      this.editBlocks.set(this.parseRawToBlocks(raw));

      this.initialEditState = {
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        rawContent: raw,
      };
    } catch (err: any) {
      this.editErrorMsg.set('Failed to load section data.');
    } finally {
      this.loadingSectionEdit.set(false);
    }
  }

  // Content Blocks Helpers
  parseRawToBlocks(rawText: string): ContentBlock[] {
    if (!rawText || !rawText.trim()) {
      return [{ type: 'paragraph', text: '' }];
    }
    const blocks: ContentBlock[] = [];
    const chunks = rawText.split(/\n\s*\n/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      const mediaMatch = trimmed.match(
        /^\[media:(left|right|full)(?:\|(small|medium|large|full|\d+%|\d+px))?(?:\|(4-3|16-9|1-1|auto))?\|([^\]]+)\](?:\s*([\s\S]*))?$/i
      );
      if (mediaMatch) {
        blocks.push({
          type: 'media-text',
          alignment: mediaMatch[1].toLowerCase() as 'left' | 'right' | 'full',
          imageSize: mediaMatch[2] ? mediaMatch[2].toLowerCase() : 'medium',
          aspectRatio: mediaMatch[3] ? mediaMatch[3].toLowerCase() : '4-3',
          imageUrl: mediaMatch[4].trim(),
          text: (mediaMatch[5] || '').trim(),
        });
        continue;
      }

      const mdMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\s*([\s\S]*))?$/);
      if (mdMatch) {
        blocks.push({
          type: 'media-text',
          alignment: 'right',
          imageUrl: mdMatch[2].trim(),
          caption: mdMatch[1].trim(),
          text: (mdMatch[3] || '').trim(),
        });
        continue;
      }

      blocks.push({
        type: 'paragraph',
        text: trimmed,
      });
    }

    return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: '' }];
  }

  serializeBlocksToRaw(blocks: ContentBlock[]): string {
    if (!blocks || blocks.length === 0) return '';
    return blocks
      .map((b) => {
        if (b.type === 'media-text') {
          const align = b.alignment || 'right';
          const size = b.imageSize || 'medium';
          const ratio = b.aspectRatio || '4-3';
          const img = (b.imageUrl || '').trim();
          const txt = (b.text || '').trim();
          if (img) {
            return `[media:${align}|${size}|${ratio}|${img}]\n${txt}`.trim();
          }
          return txt;
        }
        return (b.text || '').trim();
      })
      .filter(Boolean)
      .join('\n\n');
  }

  addEditBlock(type: 'paragraph' | 'media-text') {
    this.editBlocks.update((list) => [
      ...list,
      type === 'paragraph'
        ? { type: 'paragraph', text: '' }
        : { type: 'media-text', alignment: 'right', imageUrl: '', text: '' },
    ]);
  }

  promptRemoveEditBlock(index: number) {
    const blk = this.editBlocks()[index];
    if (!blk) return;
    this.blockToDeleteIndex = index;
    this.blockToDeleteTypeLabel = blk.type === 'media-text' ? 'Media + Text' : 'Paragraph';
    this.blockToDeleteSnippet = blk.text ? (blk.text.length > 70 ? blk.text.slice(0, 70) + '...' : blk.text) : '';
    this.deleteBlockModalOpen.set(true);
  }

  cancelDeleteBlock() {
    this.deleteBlockModalOpen.set(false);
    this.blockToDeleteIndex = null;
    this.blockToDeleteSnippet = '';
  }

  executeDeleteBlock() {
    if (this.blockToDeleteIndex === null) return;
    const idx = this.blockToDeleteIndex;
    this.editBlocks.update((list) => list.filter((_, i) => i !== idx));
    this.cancelDeleteBlock();
  }

  blockToDeleteTitle(): string {
    if (this.blockToDeleteIndex === null) return 'Are you sure you want to delete this block?';
    return `Are you sure you want to delete Block #${this.blockToDeleteIndex + 1} (${this.blockToDeleteTypeLabel})?`;
  }

  blockToDeleteDesc(): string {
    if (this.blockToDeleteSnippet) {
      return `All text and media in this block will be permanently removed: "${this.blockToDeleteSnippet}"`;
    }
    return 'All text, configuration, and image settings for this block will be permanently removed.';
  }

  moveEditBlock(index: number, direction: -1 | 1) {
    const list = [...this.editBlocks()];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    this.editBlocks.set(list);
  }

  setEditBlockAlignment(index: number, align: 'left' | 'right' | 'full') {
    this.editBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], alignment: align };
      }
      return copy;
    });
  }

  setEditBlockSize(index: number, size: 'small' | 'medium' | 'large' | 'full' | string) {
    this.editBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], imageSize: size };
      }
      return copy;
    });
  }

  setEditBlockRatio(index: number, ratio: '4-3' | '16-9' | '1-1' | 'auto') {
    this.editBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], aspectRatio: ratio };
      }
      return copy;
    });
  }

  getBlockThumbWidth(size?: string): string {
    switch (size) {
      case 'small': return '110px';
      case 'large': return '210px';
      case 'full': return '100%';
      case 'medium':
      default: return '150px';
    }
  }

  getBlockAspectRatio(ratio?: string): string {
    switch (ratio) {
      case '16-9': return '16 / 9';
      case '1-1': return '1 / 1';
      case 'auto': return 'auto';
      case '4-3':
      default: return '4 / 3';
    }
  }

  getBlockSizeLabel(size?: string): string {
    switch (size) {
      case 'small': return 'Small (32%)';
      case 'large': return 'Large (58%)';
      case 'full': return 'Full Width (100%)';
      case 'medium':
      default: return 'Medium (45%)';
    }
  }

  getBlockRatioLabel(ratio?: string): string {
    switch (ratio) {
      case '16-9': return '16:9 Wide';
      case '1-1': return '1:1 Square';
      case 'auto': return 'Auto (Natural)';
      case '4-3':
      default: return '4:3 Standard';
    }
  }

  onImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('Selected image exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result as string;
        if (result) {
          this.editImageUrl = result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.editImageUrl = '';
  }

  openCropModalForPageImage() {
    if (!this.editImageUrl) return;
    this.cropTarget = { type: 'page' };
    this.cropModalImageSrc.set(this.editImageUrl);
    this.cropModalTitle.set('Crop & Resize Page Illustration');
    this.cropModalOpen.set(true);
  }

  openCropModalForBlock(index: number) {
    const blk = this.editBlocks()[index];
    if (!blk || !blk.imageUrl) return;
    this.cropTarget = { type: 'block', index };
    this.cropModalImageSrc.set(blk.imageUrl);
    this.cropModalTitle.set(`Crop & Resize Image (Block #${index + 1})`);
    this.cropModalOpen.set(true);
  }

  onCropApplied(croppedDataUrl: string) {
    if (this.cropTarget?.type === 'page') {
      this.editImageUrl = croppedDataUrl;
    } else if (this.cropTarget?.type === 'block' && typeof this.cropTarget.index === 'number') {
      const idx = this.cropTarget.index;
      this.editBlocks.update((list) => {
        const copy = [...list];
        if (copy[idx]) {
          copy[idx] = { ...copy[idx], imageUrl: croppedDataUrl };
        }
        return copy;
      });
    }
    this.cropModalOpen.set(false);
  }

  onBlockImageSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 15 * 1024 * 1024) {
      alert('Selected image is too large. Please select an image under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.editBlocks.update((list) => {
        const copy = [...list];
        if (copy[index]) {
          copy[index] = { ...copy[index], imageUrl: reader.result as string };
        }
        return copy;
      });
    };
    reader.readAsDataURL(file);
  }

  // --- Save & Version Control Methods ---

  async handleSaveDraft() {
    const subId = this.currentSubtopicId();
    if (!subId || !this.editTitle.trim()) return;

    this.savingDraft.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');

    const finalContent = this.serializeBlocksToRaw(this.editBlocks());
    this.editContentText = finalContent;

    try {
      await this.manualService.saveContentEdit({
        id: subId,
        title: this.editTitle,
        overview: this.editOverview,
        content: finalContent,
        imageUrl: this.editImageUrl,
        isDraft: true,
        changeSummary: this.versionChangeSummary.trim() || 'Draft revision saved by admin',
      });

      this.editSuccessMsg.set('Draft revision successfully saved to database! Live readers continue seeing current published version.');
      this.versionChangeSummary = '';

      this.initialEditState = {
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        rawContent: finalContent,
      };

      this.saved.emit({
        isDraft: true,
        id: subId,
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        content: finalContent,
      });

      if (this.editTab() === 'versions') {
        await this.loadVersionsForSelectedPage();
      }
    } catch (err: any) {
      this.editErrorMsg.set(
        err?.message || 'Failed to save draft. Make sure you are logged in as admin.',
      );
    } finally {
      this.savingDraft.set(false);
    }
  }

  async handleSaveContentEdit() {
    const subId = this.currentSubtopicId();
    if (!subId || !this.editTitle.trim()) return;

    this.savingEdit.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');

    const finalContent = this.serializeBlocksToRaw(this.editBlocks());
    this.editContentText = finalContent;

    try {
      await this.manualService.saveContentEdit({
        id: subId,
        title: this.editTitle,
        overview: this.editOverview,
        content: finalContent,
        imageUrl: this.editImageUrl,
        isDraft: false,
        changeSummary: this.versionChangeSummary.trim() || 'Published update',
      });

      this.editSuccessMsg.set('Content successfully published and updated live in database!');
      this.versionChangeSummary = '';

      this.initialEditState = {
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        rawContent: finalContent,
      };

      this.saved.emit({
        isDraft: false,
        id: subId,
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        content: finalContent,
      });
    } catch (err: any) {
      this.editErrorMsg.set(
        err?.message || 'Failed to save changes. Make sure you are logged in as admin.',
      );
    } finally {
      this.savingEdit.set(false);
    }
  }

  async switchTabToVersions() {
    this.editTab.set('versions');
    await this.loadVersionsForSelectedPage();
  }

  async loadVersionsForSelectedPage() {
    const subId = this.currentSubtopicId();
    if (!subId) return;

    this.loadingVersions.set(true);
    try {
      const versions = await this.manualService.getSectionVersions(subId);
      this.sectionVersions.set(versions);
    } catch (err) {
      console.error('Failed to load section versions:', err);
      this.sectionVersions.set([]);
    } finally {
      this.loadingVersions.set(false);
    }
  }

  loadVersionIntoEditor(v: SectionVersion) {
    this.editTitle = v.title || '';
    this.editOverview = v.overview || '';
    this.editImageUrl = v.imageUrl || '';
    this.editContentText = v.content || '';
    this.editBlocks.set(this.parseRawToBlocks(v.content || ''));
    this.versionChangeSummary = `Loaded from Version ${v.versionNumber} (${v.status})`;
    this.editTab.set('edit');
    this.editSuccessMsg.set(`Loaded Version ${v.versionNumber} into the editor. You can review, modify, save as draft, or publish live.`);
  }

  async handleRevertVersion(versionNumber: number) {
    const subId = this.currentSubtopicId();
    if (!subId) return;

    this.revertingVersion.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');

    try {
      await this.manualService.revertSectionVersion(subId, versionNumber);
      this.editSuccessMsg.set(`Successfully restored live content to Version ${versionNumber}!`);
      await this.loadSectionDataForEdit(subId);
      await this.loadVersionsForSelectedPage();

      this.saved.emit({
        isDraft: false,
        id: subId,
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        content: this.editContentText,
      });
    } catch (err: any) {
      this.editErrorMsg.set(err?.message || 'Failed to revert to this version.');
    } finally {
      this.revertingVersion.set(false);
    }
  }

  // --- Unsaved Changes & Exit Navigation Handlers ---

  hasUnsavedChanges(): boolean {
    if (!this.isOpen) return false;
    const currentRaw = this.serializeBlocksToRaw(this.editBlocks());
    return (
      (this.editTitle || '') !== (this.initialEditState.title || '') ||
      (this.editOverview || '') !== (this.initialEditState.overview || '') ||
      (this.editImageUrl || '') !== (this.initialEditState.imageUrl || '') ||
      currentRaw !== (this.initialEditState.rawContent || '')
    );
  }

  requestExitEditor() {
    if (this.hasUnsavedChanges()) {
      this.unsavedWarningModalOpen.set(true);
    } else {
      this.forceCloseEditor();
    }
  }

  forceCloseEditor() {
    this.unsavedWarningModalOpen.set(false);
    this.close.emit();
  }

  async saveAndExitDraft() {
    await this.handleSaveDraft();
    if (!this.editErrorMsg()) {
      this.forceCloseEditor();
    }
  }

  async saveAndExitLive() {
    await this.handleSaveContentEdit();
    if (!this.editErrorMsg()) {
      this.forceCloseEditor();
    }
  }
}
