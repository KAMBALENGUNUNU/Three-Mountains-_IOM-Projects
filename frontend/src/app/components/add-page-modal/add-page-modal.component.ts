import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  HostListener,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Section, ContentBlock } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { ImageCropModalComponent } from '../image-crop-modal/image-crop-modal.component';

@Component({
  selector: 'app-add-page-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent, ImageCropModalComponent],
  styleUrl: '../modal-editor.css',
  template: `
    @if (open) {
      <div class="modal-backdrop editor-backdrop-fullscreen" (click)="requestExit()">
        <!-- Floating Sticky Exit Button Outside Content Area -->
        <button
          type="button"
          class="floating-exit-editor-btn"
          (click)="$event.stopPropagation(); requestExit()"
          title="Exit Editor (Esc)"
        >
          <span>Exit Editor</span>
          <span class="floating-exit-cross">&times;</span>
        </button>

        <div class="modal-card edit-modal-card fullscreen-editor-card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
              <div>
                <span class="modal-sub">Curriculum Creator</span>
                <h3 class="modal-title">Add New Page</h3>
              </div>
              <span class="version-status-pill status-draft">NEW PAGE DRAFT</span>
            </div>
          </div>

          <!-- Creator Navigation Tabs -->
          <div class="modal-tabs">
            <button
              type="button"
              class="modal-tab-btn"
              [class.active]="tab() === 'edit'"
              (click)="tab.set('edit')"
            >
              Edit Form
            </button>
            <button
              type="button"
              class="modal-tab-btn"
              [class.active]="tab() === 'preview'"
              (click)="tab.set('preview')"
            >
              Live Page Preview
            </button>
            <button
              type="button"
              class="modal-tab-btn"
              [class.active]="tab() === 'versions'"
              (click)="tab.set('versions')"
            >
              Version History &amp; Drafts
            </button>
          </div>

          <div class="modal-body">
            <!-- Target Section Dropdown -->
            <div class="form-group">
              <label for="new-page-section-select">
                Select Target Section:
                <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">
                  (The section where this page will belong)
                </span>
              </label>
              <select
                id="new-page-section-select"
                [(ngModel)]="newPageTopicId"
                class="form-select"
              >
                @for (sec of sections; track sec.id) {
                  <option [value]="sec.rawId">{{ sec.title }}</option>
                }
              </select>
            </div>

            @if (tab() === 'edit') {
              <!-- Page Title -->
              <div class="form-group">
                <label for="new-page-title">Page Title:</label>
                <input
                  id="new-page-title"
                  type="text"
                  [(ngModel)]="newPageTitle"
                  class="form-input"
                  placeholder="e.g. 4.3 Visa Verification Procedures"
                />
              </div>

              <!-- Page Image Management -->
              <div class="form-group">
                <label>Page Cover / Illustration Image:</label>
                <div class="image-uploader-card">
                  <div class="image-uploader-controls">
                    <label class="btn-upload-file">
                      <span class="upload-sticker">📁</span>
                      <span>Choose file</span>
                      <input
                        type="file"
                        accept="image/*"
                        (change)="onPageImageFileSelected($event)"
                        style="display: none;"
                      />
                    </label>
                    <span class="upload-or">or</span>
                    <input
                      type="text"
                      [(ngModel)]="newPageImageUrl"
                      placeholder="Paste Image URL (https://... or data:image...)"
                      class="form-input"
                      style="flex: 1; min-width: 220px;"
                    />
                    @if (newPageImageUrl) {
                      <button
                        type="button"
                        class="btn-remove-img"
                        (click)="newPageImageUrl = ''"
                        title="Remove page image"
                      >
                        Remove
                      </button>
                    }
                  </div>

                  @if (newPageImageUrl) {
                    <div class="img-preview-box">
                      <img [src]="newPageImageUrl" alt="Page Image Preview" class="img-thumb" style="max-height: 120px; object-fit: contain;" />
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

              <!-- Page Overview / Summary -->
              <div class="form-group">
                <label for="new-page-overview">
                  Card Overview / Summary:
                  <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">
                    (Short summary displayed on the card accordion before reading the full page)
                  </span>
                </label>
                <textarea
                  id="new-page-overview"
                  [(ngModel)]="newPageOverview"
                  rows="3"
                  class="form-textarea"
                  placeholder="Write a concise executive summary..."
                ></textarea>
              </div>

              <!-- Page Content Blocks Builder -->
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <label style="margin-bottom: 0;">
                    Page Content Blocks:
                    <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">
                      (Add paragraphs and images with custom left/right text alignment)
                    </span>
                  </label>
                </div>

                @for (blk of newPageBlocks(); track $index; let bIdx = $index) {
                  <div class="block-card">
                    <div class="block-card-header">
                      <span class="block-card-title">
                        @if (blk.type === 'media-text') {
                          Image &amp; Text Block #{{ bIdx + 1 }}
                        } @else {
                          Text Paragraph #{{ bIdx + 1 }}
                        }
                      </span>
                      <div class="block-card-actions">
                        <button
                          type="button"
                          class="btn-block-action"
                          [disabled]="bIdx === 0"
                          (click)="moveBlock(bIdx, -1)"
                          title="Move Up"
                        >▲</button>
                        <button
                          type="button"
                          class="btn-block-action"
                          [disabled]="bIdx === newPageBlocks().length - 1"
                          (click)="moveBlock(bIdx, 1)"
                          title="Move Down"
                        >▼</button>
                        <button
                          type="button"
                          class="btn-block-action btn-block-delete"
                          [disabled]="newPageBlocks().length <= 1"
                          (click)="promptRemoveBlock(bIdx)"
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
                          (click)="setBlockAlignment(bIdx, 'left')"
                          title="Image on the Left, Text on the Right"
                        >
                          Image Left | Text Right
                        </button>
                        <button
                          type="button"
                          class="btn-align"
                          [class.active]="blk.alignment === 'right' || !blk.alignment"
                          (click)="setBlockAlignment(bIdx, 'right')"
                          title="Text on the Left, Image on the Right"
                        >
                          Text Left | Image Right
                        </button>
                        <button
                          type="button"
                          class="btn-align"
                          [class.active]="blk.alignment === 'full'"
                          (click)="setBlockAlignment(bIdx, 'full')"
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
                      <div class="paragraph-block-editor">
                        <app-rich-text-editor
                          [(ngModel)]="blk.text"
                          placeholder="Write paragraph content with formatting, tables, quotes, or lists..."
                        ></app-rich-text-editor>
                      </div>
                    }
                  </div>
                }

                <!-- Add Block Actions -->
                <div class="add-block-btn-bar" style="margin-top: 0.8rem; display: flex; gap: 0.8rem;">
                  <button
                    type="button"
                    class="btn-add-block"
                    (click)="addBlock('paragraph')"
                  >
                    + Add Paragraph Block
                  </button>
                  <button
                    type="button"
                    class="btn-add-block"
                    (click)="addBlock('media-text')"
                  >
                    + Add Image &amp; Text Block
                  </button>
                </div>
              </div>

              <!-- Version Change Summary Input -->
              <div class="form-group" style="margin-top: 1.5rem;">
                <label for="new-page-change-summary">
                  Initial Version Change Summary:
                  <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">
                    (Optional note for curriculum history logs)
                  </span>
                </label>
                <input
                  id="new-page-change-summary"
                  type="text"
                  [(ngModel)]="newPageChangeSummary"
                  class="form-input"
                  placeholder="e.g. Created initial operating procedure for border clearance"
                />
              </div>

              @if (successMsg()) {
                <div class="form-success" style="margin-top: 1rem;">{{ successMsg() }}</div>
              }
              @if (errorMsg()) {
                <div class="form-error" style="margin-top: 1rem;">{{ errorMsg() }}</div>
              }

              <!-- Actions Bottom Bar -->
              <div class="modal-actions" style="justify-content: flex-end; margin-top: 1.5rem; gap: 0.8rem; flex-wrap: wrap;">
                <button
                  type="button"
                  class="btn-cancel"
                  [disabled]="creating()"
                  (click)="requestExit()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                  [disabled]="creating() || !newPageTitle.trim() || !hasContent() || !newPageTopicId"
                  (click)="handleCreate(true)"
                  title="Save as Draft revision without publishing live to readers"
                >
                  {{ creating() && isDraftCreation ? 'Saving Draft...' : 'Save as Draft' }}
                </button>
                <button
                  type="button"
                  class="btn-save btn-publish-live"
                  [disabled]="creating() || !newPageTitle.trim() || !hasContent() || !newPageTopicId"
                  (click)="handleCreate(false)"
                  title="Publish live to readers immediately"
                >
                  {{ creating() && !isDraftCreation ? 'Publishing...' : 'Create &amp; Publish Live' }}
                </button>
              </div>
            } @else if (tab() === 'preview') {
              <!-- Live Page Preview Tab -->
              <div class="page-preview-pane">
                <div class="preview-banner">
                  <div class="preview-banner-badge">
                    <span class="preview-dot"></span>
                    <span>LIVE PREVIEW SIMULATION</span>
                  </div>
                  <span class="preview-banner-text">
                    How this new page will appear to readers before publishing:
                  </span>
                </div>
                <button type="button" class="btn-back-to-edit" (click)="tab.set('edit')">
                  Back to Editing
                </button>
              </div>

              <div class="preview-reader-mock">
                <p style="font-size: 0.82rem; color: var(--muted); margin: 0 0 0.4rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                  Official OSBP Field Guide Page
                </p>

                <h1 style="font-size: 1.85rem; font-weight: 800; margin: 0 0 0.8rem; color: #00143c; line-height: 1.2;">
                  {{ newPageTitle || 'Untitled Page' }}
                </h1>

                @if (newPageOverview.trim()) {
                  <div class="preview-overview-box">
                    <div class="preview-overview-title">Key Operational Overview</div>
                    <p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: #1e293b; font-weight: 500;">
                      {{ newPageOverview }}
                    </p>
                  </div>
                }

                <div class="preview-content-layout">
                  @for (blk of newPageBlocks(); track $index) {
                    @if (blk.type === 'media-text') {
                      <div class="preview-media-box align-{{ blk.alignment || 'right' }}">
                        @if (blk.imageUrl) {
                          <div
                            class="preview-media-img"
                            [style.flex]="getBlockFlex(blk)"
                            [style.maxWidth]="getBlockMaxWidth(blk)"
                            [style.aspectRatio]="getBlockAspectRatio(blk.aspectRatio)"
                          >
                            <img
                              [src]="blk.imageUrl"
                              alt="Preview illustration"
                              [style.objectFit]="blk.aspectRatio === 'auto' ? 'contain' : 'cover'"
                            />
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

              <div class="modal-actions" style="justify-content: flex-end; margin-top: 1.2rem; gap: 0.8rem; flex-wrap: wrap;">
                <button type="button" class="btn-cancel" (click)="tab.set('edit')">
                  Back to Edit Form
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                  [disabled]="creating() || !newPageTitle.trim() || !hasContent() || !newPageTopicId"
                  (click)="handleCreate(true)"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  class="btn-save btn-publish-live"
                  [disabled]="creating() || !newPageTitle.trim() || !hasContent() || !newPageTopicId"
                  (click)="handleCreate(false)"
                >
                  {{ creating() ? 'Publishing...' : 'Create &amp; Publish Live' }}
                </button>
              </div>
            } @else if (tab() === 'versions') {
              <!-- Version Control & Draft Management for New Page -->
              <div class="version-control-pane">
                <div class="version-control-header">
                  <div>
                    <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #00143c;">
                      Version Control &amp; Draft Governance
                    </h4>
                    <p style="margin: 0.3rem 0 0; font-size: 0.84rem; color: #64748b;">
                      When this page is created, Version 1 will be permanently preserved in the audit log.
                    </p>
                  </div>
                </div>

                <div class="version-summary-card" style="margin-top: 1.2rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.2rem;">
                  <h5 style="margin: 0 0 0.6rem; font-size: 0.95rem; font-weight: 700; color: #1e293b;">
                    Publication Modes:
                  </h5>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.8rem;">
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                        <span class="version-status-pill status-draft">DRAFT</span>
                        <strong style="color: #00143c; font-size: 0.92rem;">Save as Draft</strong>
                      </div>
                      <p style="font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.4;">
                        Creates the page in the database as an internal Draft. It can be refined, edited, and published whenever ready.
                      </p>
                    </div>
                    <div style="background: #ffffff; border: 1.5px solid #22c55e; border-radius: 8px; padding: 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                        <span class="version-status-pill status-published">PUBLISHED</span>
                        <strong style="color: #00143c; font-size: 0.92rem;">Save &amp; Publish Live</strong>
                      </div>
                      <p style="font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.4;">
                        Creates the page, registers Version 1, updates the Lucene full-text search index, and publishes it immediately.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="form-group" style="margin-top: 1.5rem;">
                  <label for="new-page-version-summary-tab">
                    Initial Version Change Summary:
                    <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">
                      (Optional notes for curriculum version logs)
                    </span>
                  </label>
                  <input
                    id="new-page-version-summary-tab"
                    type="text"
                    [(ngModel)]="newPageChangeSummary"
                    class="form-input"
                    placeholder="e.g. Created initial operating procedure for border clearance"
                  />
                </div>

                <div class="modal-actions" style="margin-top: 1.5rem; justify-content: flex-end; gap: 0.8rem;">
                  <button type="button" class="btn-cancel" (click)="tab.set('edit')">
                    Back to Editor
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                    [disabled]="creating() || !newPageTitle.trim() || !hasContent() || !newPageTopicId"
                    (click)="handleCreate(true)"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    class="btn-save btn-publish-live"
                    [disabled]="creating() || !newPageTitle.trim() || !hasContent() || !newPageTopicId"
                    (click)="handleCreate(false)"
                  >
                    Save &amp; Publish Live
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Unsaved Changes Warning Modal for Add Page -->
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
                <span class="delete-warning-sub" style="color: #d97706;">Unsaved New Page Content</span>
                <h3 class="delete-warning-title">Save your new page before exiting?</h3>
              </div>
              <button type="button" class="btn-close" (click)="unsavedWarningModalOpen.set(false)">&times;</button>
            </div>

            <div class="delete-warning-body">
              <div class="delete-warning-banner" style="background: #fffbeb; border-color: #fde68a; color: #78350f;">
                <strong style="color: #92400e; display: block; margin-bottom: 0.4rem;">
                  You have unsaved content on "{{ newPageTitle || 'New Page' }}"
                </strong>
                <span>
                  If you exit now without saving, your newly created text, formatting, and content blocks will be permanently discarded.
                </span>
              </div>
            </div>

            <div class="delete-warning-actions">
              <button
                type="button"
                class="btn-cancel"
                (click)="forceClose()"
                title="Discard all changes and exit the editor"
              >
                Discard &amp; Exit
              </button>
              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="saveAndExit(true)"
                  [disabled]="creating() || !newPageTitle.trim()"
                  title="Save page as draft and exit"
                >
                  Save as Draft &amp; Exit
                </button>
                <button
                  type="button"
                  class="btn-save"
                  (click)="saveAndExit(false)"
                  [disabled]="creating() || !newPageTitle.trim()"
                  title="Save and publish page live immediately"
                >
                  Save &amp; Publish Live
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
                  Are you sure you want to delete Block #{{ (blockToDeleteIndex ?? 0) + 1 }}?
                </strong>
                <span style="font-size: 0.88rem; color: #7f1d1d; line-height: 1.45; display: block;">
                  All text, configuration, and image settings for this block will be permanently removed.
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
  `,
})
export class AddPageModalComponent implements OnChanges {
  @Input() open = false;
  @Input() sections: Section[] = [];
  @Input() defaultTopicId: number | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  tab = signal<'edit' | 'preview' | 'versions'>('edit');
  newPageTopicId: number | null = null;
  newPageTitle = '';
  newPageOverview = '';
  newPageImageUrl = '';
  newPageChangeSummary = '';
  newPageBlocks = signal<ContentBlock[]>([{ type: 'paragraph', text: '' }]);

  creating = signal(false);
  isDraftCreation = false;
  successMsg = signal('');
  errorMsg = signal('');

  unsavedWarningModalOpen = signal(false);
  deleteBlockModalOpen = signal(false);
  blockToDeleteIndex: number | null = null;

  // Manual Crop & Resize Modal State
  cropModalOpen = signal(false);
  cropModalImageSrc = signal('');
  cropModalTitle = signal('Crop & Resize Image');
  private cropTarget: { type: 'page' | 'block'; index?: number } | null = null;

  constructor(private manualService: ManualService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultTopicId'] && this.defaultTopicId) {
      this.newPageTopicId = this.defaultTopicId;
    }
    if (changes['open'] && this.open) {
      if (!this.newPageTopicId && this.sections.length > 0 && this.sections[0].rawId) {
        this.newPageTopicId = this.sections[0].rawId;
      }
      this.tab.set('edit');
      this.successMsg.set('');
      this.errorMsg.set('');
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (!this.open) return;
    if (this.deleteBlockModalOpen()) {
      this.cancelDeleteBlock();
      return;
    }
    if (this.unsavedWarningModalOpen()) {
      this.unsavedWarningModalOpen.set(false);
      return;
    }
    this.requestExit();
  }

  hasContent(): boolean {
    const raw = this.serializeBlocksToRaw(this.newPageBlocks()).trim();
    return raw.length > 0;
  }

  hasUnsavedChanges(): boolean {
    const hasBlocksText = this.newPageBlocks().some(
      (b) => (b.text && b.text.trim().length > 0) || (b.imageUrl && b.imageUrl.trim().length > 0)
    );
    return (
      this.newPageTitle.trim().length > 0 ||
      this.newPageOverview.trim().length > 0 ||
      this.newPageImageUrl.trim().length > 0 ||
      hasBlocksText
    );
  }

  requestExit() {
    if (this.hasUnsavedChanges()) {
      this.unsavedWarningModalOpen.set(true);
    } else {
      this.forceClose();
    }
  }

  forceClose() {
    this.unsavedWarningModalOpen.set(false);
    this.resetForm();
    this.close.emit();
  }

  resetForm() {
    this.newPageTitle = '';
    this.newPageOverview = '';
    this.newPageImageUrl = '';
    this.newPageChangeSummary = '';
    this.newPageBlocks.set([{ type: 'paragraph', text: '' }]);
    this.tab.set('edit');
    this.successMsg.set('');
    this.errorMsg.set('');
  }

  async saveAndExit(isDraft: boolean) {
    await this.handleCreate(isDraft);
    if (!this.errorMsg()) {
      this.forceClose();
    }
  }

  addBlock(type: 'paragraph' | 'media-text') {
    this.newPageBlocks.update((list) => [
      ...list,
      type === 'paragraph'
        ? { type: 'paragraph', text: '' }
        : { type: 'media-text', alignment: 'right', imageSize: 'medium', aspectRatio: '4-3', imageUrl: '', text: '' },
    ]);
  }

  moveBlock(index: number, direction: -1 | 1) {
    const list = [...this.newPageBlocks()];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    this.newPageBlocks.set(list);
  }

  promptRemoveBlock(index: number) {
    this.blockToDeleteIndex = index;
    this.deleteBlockModalOpen.set(true);
  }

  cancelDeleteBlock() {
    this.deleteBlockModalOpen.set(false);
    this.blockToDeleteIndex = null;
  }

  executeDeleteBlock() {
    if (this.blockToDeleteIndex !== null) {
      this.newPageBlocks.update((list) => list.filter((_, i) => i !== this.blockToDeleteIndex));
    }
    this.cancelDeleteBlock();
  }

  setBlockAlignment(index: number, align: 'left' | 'right' | 'full') {
    this.newPageBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], alignment: align };
      }
      return copy;
    });
  }

  setBlockSize(index: number, size: 'small' | 'medium' | 'large' | 'full' | string) {
    this.newPageBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], imageSize: size };
      }
      return copy;
    });
  }

  setBlockRatio(index: number, ratio: '4-3' | '16-9' | '1-1' | 'auto') {
    this.newPageBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], aspectRatio: ratio };
      }
      return copy;
    });
  }

  onPageImageFileSelected(event: Event) {
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
          this.newPageImageUrl = result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  openCropModalForPageImage() {
    if (!this.newPageImageUrl) return;
    this.cropTarget = { type: 'page' };
    this.cropModalImageSrc.set(this.newPageImageUrl);
    this.cropModalTitle.set('Crop & Resize Page Illustration');
    this.cropModalOpen.set(true);
  }

  openCropModalForBlock(index: number) {
    const blk = this.newPageBlocks()[index];
    if (!blk || !blk.imageUrl) return;
    this.cropTarget = { type: 'block', index };
    this.cropModalImageSrc.set(blk.imageUrl);
    this.cropModalTitle.set(`Crop & Resize Image (Block #${index + 1})`);
    this.cropModalOpen.set(true);
  }

  onCropApplied(croppedDataUrl: string) {
    if (this.cropTarget?.type === 'page') {
      this.newPageImageUrl = croppedDataUrl;
    } else if (this.cropTarget?.type === 'block' && typeof this.cropTarget.index === 'number') {
      const idx = this.cropTarget.index;
      this.newPageBlocks.update((list) => {
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
      this.newPageBlocks.update((list) => {
        const copy = [...list];
        if (copy[index]) {
          copy[index] = { ...copy[index], imageUrl: reader.result as string };
        }
        return copy;
      });
    };
    reader.readAsDataURL(file);
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

  getBlockFlex(block: ContentBlock): string {
    if (block.alignment === 'full') return 'none';
    switch (block.imageSize) {
      case 'small': return '0 0 200px';
      case 'large': return '0 0 380px';
      case 'full': return 'none';
      case 'medium':
      default: return '0 0 280px';
    }
  }

  getBlockMaxWidth(block: ContentBlock): string {
    if (block.alignment === 'full' || block.imageSize === 'full') return '100%';
    switch (block.imageSize) {
      case 'small': return '32%';
      case 'large': return '58%';
      case 'medium':
      default: return '45%';
    }
  }

  async handleCreate(isDraft: boolean = false) {
    const title = this.newPageTitle.trim();
    const content = this.serializeBlocksToRaw(this.newPageBlocks()).trim();
    const topicId = Number(this.newPageTopicId);

    if (!topicId || isNaN(topicId)) {
      this.errorMsg.set('Please select a target section.');
      return;
    }
    if (!title) {
      this.errorMsg.set('Page title is required.');
      return;
    }
    if (!content) {
      this.errorMsg.set('Page content is required.');
      return;
    }

    this.isDraftCreation = isDraft;
    this.creating.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    try {
      await this.manualService.createNewPage(topicId, {
        title,
        content,
        overview: this.newPageOverview.trim() || undefined,
        imageUrl: this.newPageImageUrl.trim() || undefined,
        isDraft,
        changeSummary: this.newPageChangeSummary.trim() || (isDraft ? 'Initial draft created by admin' : 'Initial published page created by admin'),
      });

      this.successMsg.set(
        isDraft
          ? 'Draft page created successfully in database!'
          : 'Page published live successfully to readers and search index!'
      );
      this.created.emit();
      setTimeout(() => {
        this.forceClose();
      }, 700);
    } catch (err: any) {
      this.errorMsg.set(
        err?.message || 'Failed to create page. Ensure you are logged in as admin.'
      );
    } finally {
      this.creating.set(false);
    }
  }
}
