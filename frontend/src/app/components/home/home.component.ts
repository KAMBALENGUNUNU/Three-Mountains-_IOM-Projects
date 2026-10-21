import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContentTree, Section, SubTopic, ContentBlock, SectionVersion } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon/icon.component';
import { AdminModalComponent } from '../admin-modal/admin-modal.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent, AdminModalComponent, RichTextEditorComponent],
  template: `
    @if (loading()) {
      <div
        style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--paper); padding: 2rem; text-align: center;"
      >
        <h1 style="font-size: 2.4rem; font-weight: 800; margin: 0 0 1rem;">OSBP Field Guide</h1>
        <p style="color: var(--muted); font-size: 1.05rem; margin: 0;">
          Connecting to backend database & loading manual curriculum...
        </p>
      </div>
    } @else if (!tree()) {
      <div
        style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--paper); padding: 2rem; text-align: center;"
      >
        <h2 style="font-size: 1.8rem; font-weight: 800; margin: 0 0 1rem;">
          Unable to load manual curriculum
        </h2>
        <p style="color: var(--ink-soft); margin-bottom: 1.5rem; max-width: 440px;">
          Could not retrieve the table of contents from the Spring Boot backend on port 8080.
        </p>
        <div style="display: flex; gap: 0.8rem;">
          <button type="button" class="btn" (click)="loadTree()">Retry Connection</button>
          <button type="button" class="btn btn-secondary" (click)="authService.logout()">
            Sign Out
          </button>
        </div>
      </div>
    } @else {
      <div class="hshell">
        <!-- Left Column: Fixed Sticky Guidance & User Controls -->
        <aside class="hleft">
          <h1>OSBP Field Guide</h1>
          <hr />
          <p>Welcome to the OSBP Field Guide.</p>

          <h2>How to use this guide</h2>
          <ol>
            <li>
              <strong>Pick a topic.</strong> The topics are listed on the right. Each one shows its
              image, title and the number of pages inside it.
            </li>
            <li>
              Open the details by selecting 'Details' at the bottom of a topic block.
            </li>
            <li>
              <strong>Move between pages.</strong> At the bottom of each page, use <em>Previous</em>
              and <em>Next</em>. Use <em>Back</em> at the top to return to where you were.
            </li>
            <li>
              <strong>Search.</strong> Use the search bar below to look for a word or phrase and jump
              straight to the right page.
            </li>
          </ol>

          <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.2rem;">
            <a class="btn" routerLink="/search">
              <app-icon name="search" [size]="18" />
              Search the guide
            </a>

            <!-- User Authentication & Admin status pill -->
            <div
              style="padding: 1rem 1.2rem; border-radius: 8px; border: 1px solid var(--line); background: var(--card); display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1rem;"
            >
              @if (authService.currentUser(); as user) {
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div
                      style="width: 32px; height: 32px; border-radius: 6px; background: var(--blue); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.85rem;"
                    >
                      {{ user.fullName ? user.fullName.charAt(0).toUpperCase() : 'O' }}
                    </div>
                    <div>
                      <div style="font-weight: 700; font-size: 0.95rem;">{{ user.fullName }}</div>
                      <div style="font-size: 0.78rem; color: var(--muted);">
                        {{ user.role === 'admin' ? 'Administrator' : 'Border Officer' }}
                      </div>
                    </div>
                  </div>
                  <button
                    (click)="authService.logout()"
                    style="font-size: 0.85rem; font-weight: 600; color: var(--ink-soft); text-decoration: underline;"
                  >
                    Sign out
                  </button>
                </div>
              }
            </div>
          </div>

          <p class="notice">Official EAC & IOM OSBP Field Guide · Digital Edition</p>
        </aside>

        <!-- Right Column: Topic Cards with Details and Subtopic Expansion -->
        <main class="hright">
          <!-- Top Bar for Main Page: Content Title & Admin Actions -->
          <div class="main-top-bar">
            <div>
              <h2 class="main-top-title">Field Guide Curriculum</h2>
              <span class="main-top-sub">Operational sections, border standards & trade facilitation</span>
            </div>
            @if (authService.isAdmin()) {
              <div class="main-admin-actions">
                <button
                  type="button"
                  class="btn btn-gold main-action-btn"
                  (click)="openContentEditor()"
                  title="Edit sections, titles, and curriculum content"
                >
                  <app-icon name="edit" [size]="16" />
                  Edit Content
                </button>
                <button
                  type="button"
                  class="btn main-action-btn btn-admin-dark"
                  (click)="openAddSectionModal()"
                  title="Add a new section / module"
                >
                  <app-icon name="plus" [size]="14" />
                  Add Section
                </button>
              </div>
            }
          </div>

          <ol class="cards">
            @for (section of coreModules(); track section.id; let secIdx = $index) {
              <li
                class="card {{ getTintClass(section.order) }}"
                [attr.data-topic]="section.order"
                [attr.draggable]="authService.isAdmin()"
                (dragstart)="onSectionDragStart($event, secIdx)"
                (dragover)="onSectionDragOver($event)"
                (drop)="onSectionDrop($event, secIdx)"
              >
                <!-- Header -->
                <div class="c-head">
                  <div class="c-img" role="img" aria-label="Section illustration">
                    @if (section.imageUrl) {
                      <img
                        [src]="section.imageUrl"
                        alt="{{ section.title }}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
                      />
                    } @else {
                      <app-icon [name]="getIconName(section.order)" [size]="48" />
                      <span>Image placeholder</span>
                    }
                  </div>
                  <div class="c-body">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                      <h2 class="c-title" style="margin: 0;">{{ section.title }}</h2>
                      @if (authService.isAdmin()) {
                        <div style="display: flex; gap: 0.35rem; align-items: center; flex-shrink: 0; flex-wrap: wrap;">
                          <div class="reorder-btn-group" title="Move section up or down">
                            <button
                              type="button"
                              class="btn-reorder"
                              [disabled]="secIdx === 0 || reorderingSection()"
                              (click)="moveSection(secIdx, -1); $event.stopPropagation()"
                              title="Move section up"
                            >▲</button>
                            <button
                              type="button"
                              class="btn-reorder"
                              [disabled]="secIdx === coreModules().length - 1 || reorderingSection()"
                              (click)="moveSection(secIdx, 1); $event.stopPropagation()"
                              title="Move section down"
                            >▼</button>
                          </div>
                          <button
                            type="button"
                            class="btn-edit-module"
                            (click)="openModuleEditor(section); $event.stopPropagation()"
                            title="Edit this section's title and illustration image"
                          >
                            <app-icon name="edit" [size]="13" />
                            Edit Section
                          </button>
                          <button
                            type="button"
                            class="btn-delete-module"
                            (click)="confirmDeleteModule(section); $event.stopPropagation()"
                            title="Delete this section and all its pages"
                          >
                            Delete Section
                          </button>
                        </div>
                      }
                    </div>
                    <span class="c-meta">
                      {{ getAllSubtopics(section).length }}
                      {{ getAllSubtopics(section).length === 1 ? 'Page' : 'Pages' }}
                    </span>
                  </div>
                </div>

                <!-- Subtopics List (when card details is open) -->
                @if (isTopicOpen(section.order.toString())) {
                  <div class="c-top-close-bar">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                      <span class="c-top-close-count">
                        {{ getAllSubtopics(section).length }} {{ getAllSubtopics(section).length === 1 ? 'Page' : 'Pages' }}
                      </span>
                      @if (authService.isAdmin()) {
                        <button
                          type="button"
                          class="btn-add-page-inside"
                          (click)="openAddPageModal(section); $event.stopPropagation()"
                          title="Add a new page to {{ section.title }}"
                        >
                          + Add Page
                        </button>
                      }
                    </div>
                    <button
                      type="button"
                      class="btn-close-details"
                      (click)="toggleTopic(section.order.toString())"
                      title="Close details"
                    >
                      <app-icon name="close" [size]="12" />
                      <span>Close details</span>
                    </button>
                  </div>

                  <ul class="c-list" [attr.id]="'subs-' + section.order">
                    @for (sub of getAllSubtopics(section); track sub.id; let sIdx = $index) {
                      <li
                        class="c-sub"
                        [attr.draggable]="authService.isAdmin()"
                        (dragstart)="onPageDragStart($event, section, sIdx)"
                        (dragover)="onPageDragOver($event)"
                        (drop)="onPageDrop($event, section, sIdx)"
                      >
                        <div class="c-sub-row">
                          @if (authService.isAdmin()) {
                            <div class="reorder-page-group" (click)="$event.stopPropagation()">
                              <button
                                type="button"
                                class="btn-reorder-page"
                                [disabled]="sIdx === 0 || reorderingPage()"
                                (click)="movePage(section, sIdx, -1)"
                                title="Move page up"
                              >▲</button>
                              <button
                                type="button"
                                class="btn-reorder-page"
                                [disabled]="sIdx === getAllSubtopics(section).length - 1 || reorderingPage()"
                                (click)="movePage(section, sIdx, 1)"
                                title="Move page down"
                              >▼</button>
                            </div>
                          }
                          <button
                            type="button"
                            class="c-sbtn"
                            (click)="toggleSubtopic(sub)"
                            [attr.aria-expanded]="activeSubtopicId() === sub.id"
                          >
                            <app-icon name="book" [size]="16" />
                            <span class="c-stitle">{{ sub.title }}</span>
                            <app-icon name="chev" [size]="18" customClass="chev" />
                          </button>
                        </div>

                        <!-- Accordion Content Panel (with image placeholder & preview) -->
                        @if (activeSubtopicId() === sub.id) {
                          <div>
                            <div
                              class="panel {{ sIdx % 2 === 0 ? 'left' : 'right' }} {{
                                getTintClass(section.order)
                              }}"
                            >
                              <div class="ph" role="img" aria-label="Image placeholder">
                                @if (sub.imageUrl || previewImages()[sub.id]) {
                                  <img
                                    [src]="sub.imageUrl || previewImages()[sub.id]"
                                    alt="{{ sub.title }}"
                                    style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;"
                                  />
                                } @else {
                                  <app-icon [name]="getIconName(section.order)" [size]="56" />
                                  <span>Image placeholder</span>
                                }
                              </div>
                              <div class="ptxt">
                                @if (loadingPreview() === sub.id) {
                                  <p style="color: var(--muted); font-style: italic;">
                                    Loading section overview...
                                  </p>
                                } @else {
                                  <p>
                                    {{
                                      previewTexts()[sub.id] ||
                                        'Standard operating procedure for ' + sub.title + '.'
                                    }}
                                  </p>
                                }
                                <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-top: 0.8rem;">
                                  <button
                                    type="button"
                                    class="btn btn-gold"
                                    (click)="openArticle(sub.id)"
                                  >
                                    Open full page
                                  </button>
                                  @if (authService.isAdmin()) {
                                    <button
                                      type="button"
                                      class="btn btn-admin-dark"
                                      style="font-size: 0.84rem; font-weight: 700; padding: 0.45rem 0.85rem;"
                                      (click)="openDirectEdit(sub)"
                                      title="Edit this page directly from main page"
                                    >
                                      Edit Page
                                    </button>
                                    <button
                                      type="button"
                                      class="btn btn-card-delete"
                                      (click)="confirmDeletePage(sub.id, sub.title)"
                                      title="Delete this page"
                                    >
                                      Delete Page
                                    </button>
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                      </li>
                    }
                  </ul>
                }

                <!-- Bottom Details Button -->
                <button
                  type="button"
                  class="c-det"
                  (click)="toggleTopic(section.order.toString())"
                  [attr.aria-expanded]="isTopicOpen(section.order.toString())"
                >
                  <app-icon name="chev" [size]="14" customClass="chev" />
                  <span>{{ isTopicOpen(section.order.toString()) ? 'Close details' : 'Details' }}</span>
                </button>
              </li>
            }

            <!-- Reference Library & Preliminaries -->
            @for (sec of referenceSections(); track sec.id) {
              <li class="card t0" [attr.data-topic]="'ref-' + sec.order">
                <div class="c-head">
                  <div class="c-img" role="img" aria-label="Section illustration">
                    @if (sec.imageUrl) {
                      <img
                        [src]="sec.imageUrl"
                        alt="{{ sec.title }}"
                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
                      />
                    } @else {
                      <app-icon name="t0" [size]="48" />
                      <span>Image placeholder</span>
                    }
                  </div>
                  <div class="c-body">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                      <h2 class="c-title" style="margin: 0;">{{ sec.title }}</h2>
                      @if (authService.isAdmin()) {
                        <div style="display: flex; gap: 0.4rem; align-items: center; flex-shrink: 0;">
                          <button
                            type="button"
                            class="btn-edit-module"
                            (click)="openModuleEditor(sec)"
                            title="Edit this section's title and illustration image"
                          >
                            <app-icon name="edit" [size]="13" />
                            Edit Section
                          </button>
                          <button
                            type="button"
                            class="btn-delete-module"
                            (click)="confirmDeleteModule(sec)"
                            title="Delete this section and all its pages"
                          >
                            Delete Section
                          </button>
                        </div>
                      }
                    </div>
                    <span class="c-meta">{{ getAllSubtopics(sec).length }} Resources</span>
                  </div>
                </div>

                @if (isTopicOpen('ref-' + sec.order)) {
                  <div class="c-top-close-bar">
                    <span class="c-top-close-count">
                      {{ getAllSubtopics(sec).length }} Resources
                    </span>
                    <button
                      type="button"
                      class="btn-close-details"
                      (click)="toggleTopic('ref-' + sec.order)"
                      title="Close details"
                    >
                      <app-icon name="close" [size]="12" />
                      <span>Close details</span>
                    </button>
                  </div>

                  <ul class="c-list" [attr.id]="'subs-' + sec.order">
                    @for (sub of getAllSubtopics(sec); track sub.id; let sIdx = $index) {
                      <li
                        class="c-sub"
                        [attr.draggable]="authService.isAdmin()"
                        (dragstart)="onPageDragStart($event, sec, sIdx)"
                        (dragover)="onPageDragOver($event)"
                        (drop)="onPageDrop($event, sec, sIdx)"
                      >
                        <div class="c-sub-row">
                          @if (authService.isAdmin()) {
                            <div class="reorder-page-group" (click)="$event.stopPropagation()">
                              <button
                                type="button"
                                class="btn-reorder-page"
                                [disabled]="sIdx === 0 || reorderingPage()"
                                (click)="movePage(sec, sIdx, -1)"
                                title="Move page up"
                              >▲</button>
                              <button
                                type="button"
                                class="btn-reorder-page"
                                [disabled]="sIdx === getAllSubtopics(sec).length - 1 || reorderingPage()"
                                (click)="movePage(sec, sIdx, 1)"
                                title="Move page down"
                              >▼</button>
                            </div>
                          }
                          <button
                            type="button"
                            class="c-sbtn"
                            (click)="toggleSubtopic(sub)"
                            [attr.aria-expanded]="activeSubtopicId() === sub.id"
                          >
                            <app-icon name="book" [size]="16" />
                            <span class="c-stitle">{{ sub.title }}</span>
                            <app-icon name="chev" [size]="18" customClass="chev" />
                          </button>
                        </div>

                        @if (activeSubtopicId() === sub.id) {
                          <div>
                            <div
                              class="panel {{ sIdx % 2 === 0 ? 'left' : 'right' }} t0"
                            >
                              <div class="ph" role="img" aria-label="Image placeholder">
                                @if (sub.imageUrl || previewImages()[sub.id]) {
                                   <img
                                     [src]="sub.imageUrl || previewImages()[sub.id]"
                                     alt="{{ sub.title }}"
                                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;"
                                   />
                                 } @else {
                                   <app-icon name="t0" [size]="56" />
                                   <span>Image placeholder</span>
                                 }
                              </div>
                              <div class="ptxt">
                                <p>
                                  {{
                                    previewTexts()[sub.id] ||
                                      'Official handbook resource: ' + sub.title + '.'
                                  }}
                                </p>
                                <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-top: 0.8rem;">
                                  <button
                                    type="button"
                                    class="btn btn-gold"
                                    (click)="openArticle(sub.id)"
                                  >
                                    Open full page
                                  </button>
                                  @if (authService.isAdmin()) {
                                    <button
                                      type="button"
                                      class="btn btn-admin-dark"
                                      style="font-size: 0.84rem; font-weight: 700; padding: 0.45rem 0.85rem;"
                                      (click)="openDirectEdit(sub)"
                                      title="Edit this page directly from main page"
                                    >
                                      Edit Page
                                    </button>
                                    <button
                                      type="button"
                                      class="btn btn-card-delete"
                                      (click)="confirmDeletePage(sub.id, sub.title)"
                                      title="Delete this page"
                                    >
                                      Delete Page
                                    </button>
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                      </li>
                    }
                  </ul>
                }

                <button
                  type="button"
                  class="c-det"
                  (click)="toggleTopic('ref-' + sec.order)"
                  [attr.aria-expanded]="isTopicOpen('ref-' + sec.order)"
                >
                  <app-icon name="chev" [size]="14" customClass="chev" />
                  <span>{{ isTopicOpen('ref-' + sec.order) ? 'Close details' : 'Details' }}</span>
                </button>
              </li>
            }
          </ol>
        </main>
      </div>

      <!-- Main Page Content Editor Modal -->
      @if (editModalOpen()) {
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
              <!-- Page Selector Dropdown (Always visible at top so admin knows what is being edited) -->
              <div class="form-group">
                <label for="subtopic-picker">Select Page to Edit:</label>
                <select
                  id="subtopic-picker"
                  [ngModel]="selectedSubtopicId()"
                  (ngModelChange)="onSelectSubtopicToEdit($event)"
                  class="form-select"
                >
                  @for (item of allSubtopicsList(); track item.id) {
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

                <!-- Page Image Management (File Upload or Image URL) -->
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
                        <img [src]="editImageUrl" alt="Page Image Preview" class="img-thumb" />
                        <div class="img-preview-meta">
                          <span class="badge-success">Image Attached</span>
                          <span class="img-preview-hint">
                            This image will appear on the page and in card previews.
                          </span>
                        </div>
                      </div>
                    } @else {
                      <div class="img-empty-box">
                        <span>No custom image selected (default topic illustration placeholder will be used)</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Card Overview / Summary (snippet shown on home card) -->
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

                        <!-- Image Size & Aspect Ratio Adjustments -->
                        <div class="image-size-group">
                          <div class="image-size-row">
                            <span class="alignment-label" style="min-width: 85px;">Image Size:</span>
                            <div class="btn-size-pills">
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.imageSize === 'small'"
                                (click)="setEditBlockSize(bIdx, 'small')"
                                title="Small (200px / 32% width)"
                              >
                                Small (32%)
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="!blk.imageSize || blk.imageSize === 'medium'"
                                (click)="setEditBlockSize(bIdx, 'medium')"
                                title="Medium (280px / 45% width - Standard)"
                              >
                                Medium (45%)
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.imageSize === 'large'"
                                (click)="setEditBlockSize(bIdx, 'large')"
                                title="Large (380px / 58% width)"
                              >
                                Large (58%)
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.imageSize === 'full'"
                                (click)="setEditBlockSize(bIdx, 'full')"
                                title="Full Width (100% width)"
                              >
                                Full Width (100%)
                              </button>
                            </div>
                          </div>

                          <div class="image-size-row" style="margin-top: 0.45rem;">
                            <span class="alignment-label" style="min-width: 85px;">Proportions:</span>
                            <div class="btn-size-pills">
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="!blk.aspectRatio || blk.aspectRatio === '4-3'"
                                (click)="setEditBlockRatio(bIdx, '4-3')"
                                title="Standard 4:3 proportion"
                              >
                                4:3 Standard
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.aspectRatio === '16-9'"
                                (click)="setEditBlockRatio(bIdx, '16-9')"
                                title="Widescreen 16:9 proportion"
                              >
                                16:9 Wide
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.aspectRatio === '1-1'"
                                (click)="setEditBlockRatio(bIdx, '1-1')"
                                title="Square 1:1 proportion"
                              >
                                1:1 Square
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.aspectRatio === 'auto'"
                                (click)="setEditBlockRatio(bIdx, 'auto')"
                                title="Natural proportion (preserves full image without cropping)"
                              >
                                Natural (Auto)
                              </button>
                            </div>
                          </div>
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
                                    [style.width]="getBlockThumbWidth(blk.imageSize)"
                                    [style.aspectRatio]="getBlockAspectRatio(blk.aspectRatio)"
                                    [style.maxHeight]="blk.aspectRatio === 'auto' ? '140px' : 'none'"
                                    style="border: 2px solid var(--blue); border-radius: 6px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
                                  >
                                    <img
                                      [src]="blk.imageUrl"
                                      alt="Block image preview"
                                      [style.objectFit]="blk.aspectRatio === 'auto' ? 'contain' : 'cover'"
                                      style="width: 100%; height: 100%; display: block;"
                                    />
                                  </div>
                                  <div class="img-preview-meta" style="flex: 1;">
                                    <span class="badge-success">Attached</span>
                                    <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.35rem; line-height: 1.4;">
                                      Size: <strong>{{ getBlockSizeLabel(blk.imageSize) }}</strong>
                                      <br />
                                      Ratio: <strong>{{ getBlockRatioLabel(blk.aspectRatio) }}</strong>
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
                    [disabled]="deletingSection() || savingEdit() || savingDraft()"
                    (click)="confirmDeletePage(selectedSubtopicId(), editTitle)"
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
                      [disabled]="savingEdit() || savingDraft() || !editTitle.trim() || deletingSection()"
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
                      [disabled]="deletingSection() || savingEdit() || savingDraft()"
                      (click)="confirmDeletePage(selectedSubtopicId(), editTitle)"
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
                        [disabled]="savingEdit() || savingDraft() || !editTitle.trim() || deletingSection()"
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
      }

      <!-- Section Editor Modal -->
      @if (moduleModalOpen() && selectedModule(); as mod) {
        <div class="modal-backdrop" (click)="closeModuleEditor()">
          <div class="modal-card edit-modal-card" style="max-width: 600px;" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <div>
                <span class="modal-sub">Section Settings</span>
                <h3 class="modal-title">Edit Section</h3>
              </div>
              <button type="button" class="btn-close" (click)="closeModuleEditor()">&times;</button>
            </div>

            <div class="modal-body">
              @if (moduleSuccessMsg()) {
                <div class="form-success">{{ moduleSuccessMsg() }}</div>
              }
              @if (moduleErrorMsg()) {
                <div class="form-error">{{ moduleErrorMsg() }}</div>
              }

              <!-- Section Title -->
              <div class="form-group">
                <label for="edit-module-title">Section Title:</label>
                <input
                  id="edit-module-title"
                  type="text"
                  [(ngModel)]="editModuleTitle"
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
                        (change)="onModuleImageSelected($event)"
                        style="display: none;"
                      />
                    </label>
                    <span class="upload-or">or</span>
                    <input
                      type="text"
                      [(ngModel)]="editModuleImageUrl"
                      placeholder="Paste Image URL (https://... or data:image...)"
                      class="form-input"
                      style="flex: 1; min-width: 220px;"
                    />
                    @if (editModuleImageUrl) {
                      <button
                        type="button"
                        class="btn-remove-img"
                        (click)="removeModuleImage()"
                        title="Remove section image"
                      >
                        Remove
                      </button>
                    }
                  </div>

                  @if (editModuleImageUrl) {
                    <div class="img-preview-box">
                      <img [src]="editModuleImageUrl" alt="Section Image Preview" class="img-thumb" style="width: 140px; height: 95px; object-fit: cover; border-radius: 6px;" />
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
                  [disabled]="deletingModule() || savingModule()"
                  (click)="confirmDeleteModule(mod)"
                  title="Delete this section and all its pages"
                >
                  {{ deletingModule() ? 'Deleting...' : 'Delete Section' }}
                </button>
                <div style="display: flex; gap: 0.8rem;">
                  <button
                    type="button"
                    class="btn-cancel"
                    [disabled]="savingModule() || deletingModule()"
                    (click)="closeModuleEditor()"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="btn-save"
                    [disabled]="savingModule() || !editModuleTitle.trim() || deletingModule()"
                    (click)="handleSaveModuleEdit()"
                  >
                    {{ savingModule() ? 'Saving...' : 'Save Section Changes' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================ -->
      <!-- Add Section Modal Dialog -->
      <!-- ============================================================ -->
      @if (addSectionModalOpen()) {
        <div class="modal-backdrop" (click)="closeAddSectionModal()">
          <div class="modal-card edit-modal-card" style="max-width: 640px;" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <div>
                <span class="modal-sub">Section Creator</span>
                <h3 class="modal-title">Add New Section</h3>
              </div>
              <button type="button" class="btn-close" (click)="closeAddSectionModal()">&times;</button>
            </div>

            <div class="modal-body">
              @if (addSectionSuccessMsg()) {
                <div class="form-success">{{ addSectionSuccessMsg() }}</div>
              }
              @if (addSectionErrorMsg()) {
                <div class="form-error">{{ addSectionErrorMsg() }}</div>
              }

              <!-- Section Title -->
              <div class="form-group">
                <label for="new-section-title">
                  Section Title:
                  <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(e.g., Section 9: CROSS-BORDER HEALTH PROTOCOLS)</span>
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
                        (change)="onNewSectionImageSelected($event)"
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
                      <img [src]="newSectionImageUrl" alt="Section Image Preview" class="img-thumb" style="width: 140px; height: 95px; object-fit: cover; border-radius: 6px;" />
                      <div class="img-preview-meta">
                        <span class="badge-success">Image Attached</span>
                        <span class="img-preview-hint">This illustration image will be displayed on the section card replacing the placeholder.</span>
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
                  [disabled]="creatingSection()"
                  (click)="closeAddSectionModal()"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-save"
                  [disabled]="creatingSection() || !newSectionTitle.trim()"
                  (click)="handleCreateSection()"
                >
                  {{ creatingSection() ? 'Creating Section...' : 'Create Section' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================ -->
      <!-- Add Page Modal Dialog (Full-Screen Creator with Draft & Version Control) -->
      <!-- ============================================================ -->
      @if (addPageModalOpen()) {
        <div class="modal-backdrop editor-backdrop-fullscreen" (click)="requestExitAddPage()">
          <!-- Floating Sticky Exit Button Outside Content Area -->
          <button
            type="button"
            class="floating-exit-editor-btn"
            (click)="$event.stopPropagation(); requestExitAddPage()"
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
                [class.active]="addPageTab() === 'edit'"
                (click)="addPageTab.set('edit')"
              >
                Edit Form
              </button>
              <button
                type="button"
                class="modal-tab-btn"
                [class.active]="addPageTab() === 'preview'"
                (click)="addPageTab.set('preview')"
              >
                Live Page Preview
              </button>
              <button
                type="button"
                class="modal-tab-btn"
                [class.active]="addPageTab() === 'versions'"
                (click)="addPageTab.set('versions')"
              >
                Version History & Drafts
              </button>
            </div>

            <div class="modal-body">
              <!-- Target Section Dropdown -->
              <div class="form-group">
                <label for="new-page-section-select">
                  Select Target Section:
                  <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(The section where this page will belong)</span>
                </label>
                <select
                  id="new-page-section-select"
                  [(ngModel)]="newPageTopicId"
                  class="form-select"
                >
                  @for (sec of (tree()?.sections || []); track sec.id) {
                    <option [value]="sec.rawId">{{ sec.title }}</option>
                  }
                </select>
              </div>

              @if (addPageTab() === 'edit') {
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
                  <label>Page Illustration / Photo:</label>
                  <div class="image-uploader-card">
                    <div class="image-uploader-controls">
                      <label class="btn-upload-file">
                        <span class="upload-sticker">📁</span>
                        <span>Choose image file</span>
                        <input
                          type="file"
                          accept="image/*"
                          (change)="onNewPageImageSelected($event)"
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
                          title="Remove image"
                        >
                          Remove
                        </button>
                      }
                    </div>

                    @if (newPageImageUrl) {
                      <div class="img-preview-box">
                        <img [src]="newPageImageUrl" alt="Page Image Preview" class="img-thumb" />
                        <div class="img-preview-meta">
                          <span class="badge-success">Image Attached</span>
                          <span class="img-preview-hint">This image will appear on the page and in card previews.</span>
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
                  <label for="new-page-overview">
                    Card Overview & Summary:
                    <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(Short summary shown on main page cards)</span>
                  </label>
                  <textarea
                    id="new-page-overview"
                    rows="2"
                    [(ngModel)]="newPageOverview"
                    class="form-input"
                    placeholder="Enter brief preview summary..."
                  ></textarea>
                </div>

                <!-- Page Content Blocks Builder -->
                <div class="form-group">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <label style="margin-bottom: 0;">
                      Page Content Blocks:
                      <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(Add paragraphs and images with custom left/right text alignment)</span>
                    </label>
                  </div>

                  @for (blk of newPageBlocks(); track $index; let bIdx = $index) {
                    <div class="block-card">
                      <div class="block-card-header">
                        <span class="block-card-title">
                          @if (blk.type === 'media-text') {
                            Image & Text Block #{{ bIdx + 1 }}
                          } @else {
                            Text Paragraph #{{ bIdx + 1 }}
                          }
                        </span>
                        <div class="block-card-actions">
                          <button
                            type="button"
                            class="btn-block-action"
                            [disabled]="bIdx === 0"
                            (click)="moveNewPageBlock(bIdx, -1)"
                            title="Move Up"
                          >▲</button>
                          <button
                            type="button"
                            class="btn-block-action"
                            [disabled]="bIdx === newPageBlocks().length - 1"
                            (click)="moveNewPageBlock(bIdx, 1)"
                            title="Move Down"
                          >▼</button>
                          <button
                            type="button"
                            class="btn-block-action btn-block-delete"
                            [disabled]="newPageBlocks().length <= 1"
                            (click)="promptRemoveNewPageBlock(bIdx)"
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
                            (click)="setNewPageBlockAlignment(bIdx, 'left')"
                            title="Image on the Left, Text on the Right"
                          >
                            Image Left | Text Right
                          </button>
                          <button
                            type="button"
                            class="btn-align"
                            [class.active]="blk.alignment === 'right' || !blk.alignment"
                            (click)="setNewPageBlockAlignment(bIdx, 'right')"
                            title="Text on the Left, Image on the Right"
                          >
                            Text Left | Image Right
                          </button>
                          <button
                            type="button"
                            class="btn-align"
                            [class.active]="blk.alignment === 'full'"
                            (click)="setNewPageBlockAlignment(bIdx, 'full')"
                            title="Full width image with text below"
                          >
                            Full Width
                          </button>
                        </div>

                        <!-- Image Size & Aspect Ratio Adjustments -->
                        <div class="image-size-group">
                          <div class="image-size-row">
                            <span class="alignment-label" style="min-width: 85px;">Image Size:</span>
                            <div class="btn-size-pills">
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.imageSize === 'small'"
                                (click)="setNewPageBlockSize(bIdx, 'small')"
                                title="Small (200px / 32% width)"
                              >
                                Small (32%)
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="!blk.imageSize || blk.imageSize === 'medium'"
                                (click)="setNewPageBlockSize(bIdx, 'medium')"
                                title="Medium (280px / 45% width - Standard)"
                              >
                                Medium (45%)
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.imageSize === 'large'"
                                (click)="setNewPageBlockSize(bIdx, 'large')"
                                title="Large (380px / 58% width)"
                              >
                                Large (58%)
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.imageSize === 'full'"
                                (click)="setNewPageBlockSize(bIdx, 'full')"
                                title="Full Width (100% width)"
                              >
                                Full Width (100%)
                              </button>
                            </div>
                          </div>

                          <div class="image-size-row" style="margin-top: 0.45rem;">
                            <span class="alignment-label" style="min-width: 85px;">Proportions:</span>
                            <div class="btn-size-pills">
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="!blk.aspectRatio || blk.aspectRatio === '4-3'"
                                (click)="setNewPageBlockRatio(bIdx, '4-3')"
                                title="Standard 4:3 proportion"
                              >
                                4:3 Standard
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.aspectRatio === '16-9'"
                                (click)="setNewPageBlockRatio(bIdx, '16-9')"
                                title="Widescreen 16:9 proportion"
                              >
                                16:9 Wide
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.aspectRatio === '1-1'"
                                (click)="setNewPageBlockRatio(bIdx, '1-1')"
                                title="Square 1:1 proportion"
                              >
                                1:1 Square
                              </button>
                              <button
                                type="button"
                                class="btn-size"
                                [class.active]="blk.aspectRatio === 'auto'"
                                (click)="setNewPageBlockRatio(bIdx, 'auto')"
                                title="Natural proportion (preserves full image without cropping)"
                              >
                                Natural (Auto)
                              </button>
                            </div>
                          </div>
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
                                    (change)="onNewPageBlockImageSelected($event, bIdx)"
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
                                    [style.width]="getBlockThumbWidth(blk.imageSize)"
                                    [style.aspectRatio]="getBlockAspectRatio(blk.aspectRatio)"
                                    [style.maxHeight]="blk.aspectRatio === 'auto' ? '140px' : 'none'"
                                    style="border: 2px solid var(--blue); border-radius: 6px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
                                  >
                                    <img
                                      [src]="blk.imageUrl"
                                      alt="Block image preview"
                                      [style.objectFit]="blk.aspectRatio === 'auto' ? 'contain' : 'cover'"
                                      style="width: 100%; height: 100%; display: block;"
                                    />
                                  </div>
                                  <div class="img-preview-meta" style="flex: 1;">
                                    <span class="badge-success">Attached</span>
                                    <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.35rem; line-height: 1.4;">
                                      Size: <strong>{{ getBlockSizeLabel(blk.imageSize) }}</strong>
                                      <br />
                                      Ratio: <strong>{{ getBlockRatioLabel(blk.aspectRatio) }}</strong>
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
                    <button type="button" class="btn-add-block" (click)="addNewPageBlock('paragraph')">
                      + Add Text Paragraph
                    </button>
                    <button type="button" class="btn-add-block" (click)="addNewPageBlock('media-text')">
                      + Add Image & Text Block
                    </button>
                  </div>
                </div>

                <!-- Version / Change Summary Input -->
                <div class="form-group" style="margin-top: 1.2rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem 1rem;">
                  <label for="new-page-summary-inline" style="font-size: 0.88rem; font-weight: 700; color: #1e293b; margin-bottom: 0.35rem;">
                    Initial Version Change Summary:
                    <span style="font-weight: 400; font-size: 0.78rem; color: #64748b;">(Recorded into revision history & audit logs)</span>
                  </label>
                  <input
                    id="new-page-summary-inline"
                    type="text"
                    [(ngModel)]="newPageChangeSummary"
                    class="form-input"
                    placeholder="e.g. Created initial operating procedure for border clearance"
                    style="font-size: 0.9rem;"
                  />
                </div>

                @if (addPageSuccessMsg()) {
                  <div class="form-success">{{ addPageSuccessMsg() }}</div>
                }
                @if (addPageErrorMsg()) {
                  <div class="form-error">{{ addPageErrorMsg() }}</div>
                }

                <div class="modal-actions" style="justify-content: flex-end; gap: 0.8rem; flex-wrap: wrap;">
                  <button
                    type="button"
                    class="btn-cancel"
                    [disabled]="creatingPage()"
                    (click)="requestExitAddPage()"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                    [disabled]="creatingPage() || !newPageTitle.trim() || !hasNewPageContent() || !newPageTopicId"
                    (click)="handleCreatePage(true)"
                    title="Save as Draft revision without publishing live to readers"
                  >
                    {{ creatingPage() && isDraftCreation ? 'Saving Draft...' : 'Save as Draft' }}
                  </button>
                  <button
                    type="button"
                    class="btn-preview-switch"
                    (click)="addPageTab.set('preview')"
                    [disabled]="!newPageTitle.trim()"
                    title="Preview exact page display before publishing"
                  >
                    Preview Page
                  </button>
                  <button
                    type="button"
                    class="btn-save btn-publish-live"
                    [disabled]="creatingPage() || !newPageTitle.trim() || !hasNewPageContent() || !newPageTopicId"
                    (click)="handleCreatePage(false)"
                  >
                    {{ creatingPage() && !isDraftCreation ? 'Publishing...' : 'Save & Publish Live' }}
                  </button>
                </div>
              } @else if (addPageTab() === 'preview') {
                <!-- Live Page Preview Mode -->
                <div class="live-preview-container">
                  <div class="preview-notice-bar">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <span class="preview-badge-live">Preview Mode</span>
                      <span style="font-size: 0.88rem; color: #334155; font-weight: 600;">
                        How this new page will appear to readers before publishing:
                      </span>
                    </div>
                    <button type="button" class="btn-back-to-edit" (click)="addPageTab.set('edit')">
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

                  @if (addPageSuccessMsg()) {
                    <div class="form-success" style="margin-top: 1rem;">{{ addPageSuccessMsg() }}</div>
                  }
                  @if (addPageErrorMsg()) {
                    <div class="form-error" style="margin-top: 1rem;">{{ addPageErrorMsg() }}</div>
                  }

                  <div class="modal-actions" style="justify-content: flex-end; margin-top: 1.2rem; gap: 0.8rem; flex-wrap: wrap;">
                    <button type="button" class="btn-cancel" (click)="addPageTab.set('edit')">
                      Back to Edit Form
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary"
                      style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                      [disabled]="creatingPage() || !newPageTitle.trim() || !hasNewPageContent() || !newPageTopicId"
                      (click)="handleCreatePage(true)"
                      title="Save as Draft revision without publishing live to readers"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      class="btn-save btn-publish-live"
                      [disabled]="creatingPage() || !newPageTitle.trim() || !hasNewPageContent() || !newPageTopicId"
                      (click)="handleCreatePage(false)"
                    >
                      {{ creatingPage() ? 'Publishing...' : 'Create & Publish Live' }}
                    </button>
                  </div>
                </div>
              } @else if (addPageTab() === 'versions') {
                <!-- Version Control & Draft Management for New Page -->
                <div class="version-control-pane">
                  <div class="version-control-header">
                    <div>
                      <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #00143c;">Version Control & Draft Governance</h4>
                      <p style="margin: 0.3rem 0 0; font-size: 0.84rem; color: #64748b;">
                        When this page is created, Version 1 will be permanently preserved in the audit log.
                      </p>
                    </div>
                  </div>

                  <div class="version-summary-card" style="margin-top: 1.2rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.2rem;">
                    <h5 style="margin: 0 0 0.6rem; font-size: 0.95rem; font-weight: 700; color: #1e293b;">Publication Modes:</h5>
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
                          <strong style="color: #00143c; font-size: 0.92rem;">Save & Publish Live</strong>
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
                      <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(Optional notes for curriculum version logs)</span>
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
                    <button type="button" class="btn-cancel" (click)="addPageTab.set('edit')">
                      Back to Editor
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary"
                      style="font-size: 0.88rem; font-weight: 600; padding: 0.5rem 1rem;"
                      [disabled]="creatingPage() || !newPageTitle.trim() || !hasNewPageContent() || !newPageTopicId"
                      (click)="handleCreatePage(true)"
                      title="Save as Draft revision"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      class="btn-save btn-publish-live"
                      [disabled]="creatingPage() || !newPageTitle.trim() || !hasNewPageContent() || !newPageTopicId"
                      (click)="handleCreatePage(false)"
                    >
                      Save & Publish Live
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Unsaved Changes Warning Modal for Add Page -->
      @if (unsavedAddPageWarningModalOpen()) {
        <div class="modal-backdrop" (click)="unsavedAddPageWarningModalOpen.set(false)" style="z-index: 2200;">
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
                <span class="delete-warning-kicker" style="color: #d97706;">Unsaved New Page Content</span>
                <h3 class="delete-warning-title">Save your new page before exiting?</h3>
              </div>
              <button type="button" class="btn-close" (click)="unsavedAddPageWarningModalOpen.set(false)">&times;</button>
            </div>

            <div class="delete-warning-body">
              <div class="delete-warning-banner" style="background: #fffbeb; border-color: #fde68a; color: #78350f;">
                <strong style="color: #92400e; display: block; margin-bottom: 0.4rem;">You have unsaved content on "{{ newPageTitle || 'New Page' }}"</strong>
                <span>
                  If you exit now without saving, your newly created text, formatting, and content blocks will be permanently discarded.
                </span>
              </div>
            </div>

            <div class="delete-warning-actions">
              <button
                type="button"
                class="btn-cancel"
                (click)="forceCloseAddPage()"
                title="Discard all changes and exit the editor"
              >
                Discard & Exit
              </button>
              <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="saveAddPageAndExitDraft()"
                  [disabled]="creatingPage() || !newPageTitle.trim()"
                  title="Save page as draft and exit"
                >
                  Save as Draft & Exit
                </button>
                <button
                  type="button"
                  class="btn-save"
                  (click)="saveAddPageAndExitLive()"
                  [disabled]="creatingPage() || !newPageTitle.trim()"
                  title="Save and publish page live immediately"
                >
                  Save & Publish Live
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Admin Modal -->
      <app-admin-modal
        [open]="adminOpen()"
        [tree]="tree()"
        (close)="adminOpen.set(false)"
        (refresh)="loadTree()"
      />

      <!-- Elegant Delete Warning Confirmation Modal -->
      @if (deleteModalOpen()) {
        <div class="modal-backdrop" (click)="closeDeleteModal()">
          <div class="modal-card delete-warning-modal-card" (click)="$event.stopPropagation()">
            <div class="delete-warning-header">
              <div class="delete-warning-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div style="flex: 1;">
                <span class="delete-warning-sub">Security & Integrity Validation</span>
                <h3 class="delete-warning-title">
                  {{ deleteModalType() === 'page' ? 'Confirm Permanent Page Deletion' : 'Confirm Permanent Section Deletion' }}
                </h3>
              </div>
              <button type="button" class="btn-close" (click)="closeDeleteModal()">&times;</button>
            </div>

            <div class="delete-warning-body">
              <div class="delete-warning-banner">
                <strong style="color: #991b1b; display: block; margin-bottom: 0.3rem;">⚠️ Caution: This action cannot be undone!</strong>
                @if (deleteModalType() === 'page') {
                  <span>
                    You are about to permanently delete page <strong>"{{ deleteModalTargetTitle() }}"</strong> from the database. It will be removed immediately from the manual curriculum, search index, and cached table of contents.
                  </span>
                } @else {
                  <span>
                    You are about to permanently delete section <strong>"{{ deleteModalTargetTitle() }}"</strong>.
                    @if (deleteModalItemCount() > 0) {
                      <span style="display: block; margin-top: 0.4rem; font-weight: 700; color: #b91c1c;">
                        All {{ deleteModalItemCount() }} nested page(s) and operational topics in this section will also be permanently deleted!
                      </span>
                    }
                  </span>
                }
              </div>

              @if (deleteModalError()) {
                <div class="form-error" style="margin-top: 1rem;">{{ deleteModalError() }}</div>
              }
            </div>

            <div class="modal-actions" style="justify-content: flex-end; gap: 0.8rem; margin-top: 1.5rem;">
              <button
                type="button"
                class="btn-cancel"
                [disabled]="deleteModalExecuting()"
                (click)="closeDeleteModal()"
              >
                Cancel & Keep Safe
              </button>
              <button
                type="button"
                class="btn-delete"
                style="background: #dc2626; color: #fff; font-weight: 700; padding: 0.6rem 1.25rem; border-radius: 6px; border: none; cursor: pointer;"
                [disabled]="deleteModalExecuting()"
                (click)="executeConfirmedDelete()"
              >
                {{ deleteModalExecuting() ? 'Deleting...' : 'Yes, Delete Permanently' }}
              </button>
            </div>
          </div>
        </div>
      }

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
    }
  `,
  styles: [
    `
      .main-top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--line);
        flex-wrap: wrap;
      }
      .main-top-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--ink);
      }
      .main-top-sub {
        font-size: 0.88rem;
        color: var(--ink-soft);
      }
      .main-admin-actions {
        display: flex;
        gap: 0.65rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .main-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.88rem;
        font-weight: 800;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.15s;
      }
      .main-action-btn:active {
        transform: scale(0.98);
      }
      .btn-admin-dark {
        background: #1a1a1a;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-admin-dark:hover {
        background: #333333;
      }

      /* Edit Modal Styling */
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
      .editor-backdrop-fullscreen {
        padding: 0.8rem;
        align-items: center;
        justify-content: center;
        position: fixed;
      }
      .floating-exit-editor-btn {
        position: fixed;
        top: 1.15rem;
        right: 1.6rem;
        z-index: 2150;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        background: #dc2626;
        border: 1px solid #b91c1c;
        border-radius: 8px;
        padding: 0.5rem 1.1rem;
        font-size: 0.88rem;
        font-weight: 600;
        color: #ffffff;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
        transition: all 0.16s ease;
      }
      .floating-exit-editor-btn:hover {
        background: #b91c1c;
        border-color: #991b1b;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(185, 28, 28, 0.48);
      }
      .floating-exit-cross {
        font-size: 1.15rem;
        line-height: 1;
        font-weight: 700;
      }
      .fullscreen-editor-card {
        width: 98vw;
        max-width: 1560px;
        height: 96vh;
        max-height: 96vh;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        position: relative;
      }
      .edit-modal-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .modal-head {
        padding: 1.2rem 1.6rem;
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
        font-size: 1.25rem;
        color: #1a1a1a;
      }
      .btn-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: #64748b;
        cursor: pointer;
      }

      /* Modal Navigation Tabs */
      .modal-tabs {
        display: flex;
        background: #f1f5f9;
        border-bottom: 1px solid #e2e8f0;
        padding: 0 1.2rem;
        gap: 0.5rem;
      }
      .modal-tab-btn {
        padding: 0.75rem 1.2rem;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        font-weight: 700;
        font-size: 0.9rem;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.15s;
      }
      .modal-tab-btn:hover {
        color: #00143c;
      }
      .modal-tab-btn.active {
        color: #00143c;
        border-bottom-color: #FFB81C;
        background: #ffffff;
      }

      .modal-body {
        padding: 1.5rem 1.8rem;
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
      .form-input,
      .form-select {
        width: 100%;
        padding: 0.65rem 0.85rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font: inherit;
        font-size: 0.95rem;
        box-sizing: border-box;
      }
      .form-input:focus,
      .form-select:focus {
        outline: none;
        border-color: #FFB81C;
        box-shadow: 0 0 0 3px rgba(255, 184, 28, 0.25);
      }
      .form-textarea {
        font-family: inherit;
        line-height: 1.5;
        resize: vertical;
      }

      /* Image Uploader Styling */
      .image-uploader-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.9rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .image-uploader-controls {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        flex-wrap: wrap;
      }
      .btn-upload-file {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--blue, #003399);
        color: #ffffff;
        font-size: 0.92rem;
        font-weight: 700;
        padding: 0.6rem 1.1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0, 53, 160, 0.25);
      }
      .btn-upload-file:hover {
        background: #002277;
      }
      .upload-sticker {
        font-size: 1.15rem;
        line-height: 1;
      }
      .upload-or {
        font-size: 0.8rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
      }
      .btn-remove-img {
        background: #fee2e2;
        border: 1px solid #fca5a5;
        color: #991b1b;
        font-size: 0.82rem;
        font-weight: 700;
        padding: 0.55rem 0.85rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-remove-img:hover {
        background: #fecaca;
      }
      .img-preview-box {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.6rem;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
      }
      .img-thumb {
        width: 100px;
        height: 75px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      .img-preview-meta {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .badge-success {
        display: inline-block;
        width: fit-content;
        background: #dcfce7;
        color: #166534;
        font-size: 0.75rem;
        font-weight: 800;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        letter-spacing: 0.03em;
      }
      .img-preview-hint {
        font-size: 0.82rem;
        color: #64748b;
      }
      .img-empty-box {
        padding: 0.65rem 0.8rem;
        background: #f1f5f9;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
        font-size: 0.82rem;
        color: #64748b;
      }
      .btn-preview-switch {
        padding: 0.6rem 1.2rem;
        border: 1px solid #002244;
        border-radius: 6px;
        background: #f0f7ff;
        color: #002244;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-preview-switch:hover {
        background: #002244;
        color: #ffffff;
      }
      .btn-preview-switch:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-publish-live {
        background: #FFB81C;
        color: #00143c;
        box-shadow: 0 2px 6px rgba(255, 184, 28, 0.4);
      }
      .btn-publish-live:hover {
        background: #e5a414;
      }

      /* Live Preview Mode Styling */
      .live-preview-container {
        display: flex;
        flex-direction: column;
      }
      .preview-notice-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 0.65rem 1rem;
        margin-bottom: 1.2rem;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .preview-badge-live {
        background: #2563eb;
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 800;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        letter-spacing: 0.05em;
      }
      .btn-back-to-edit {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 0.4rem 0.8rem;
        font-size: 0.82rem;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
        color: #1e293b;
      }
      .btn-back-to-edit:hover {
        background: #f1f5f9;
      }
      .preview-reader-mock {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1.6rem;
        box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.03);
      }
      .preview-overview-box {
        border-left: 4px solid var(--blue, #003399);
        background: #eef4ff;
        padding: 1rem 1.25rem;
        border-radius: 0 8px 8px 0;
        margin-bottom: 1.4rem;
      }
      .preview-overview-title {
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--blue, #003399);
        margin-bottom: 0.3rem;
      }
      .preview-content-layout {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .preview-block {
        width: 100%;
      }
      .preview-media-box {
        display: flex;
        gap: 1.4rem;
        align-items: flex-start;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.1rem;
      }
      .preview-media-box.align-left {
        flex-direction: row;
      }
      .preview-media-box.align-right {
        flex-direction: row-reverse;
      }
      .preview-media-box.align-full {
        flex-direction: column;
      }
      .preview-media-img {
        width: 220px;
        min-width: 220px;
        max-width: 40%;
        border-radius: 6px;
        overflow: hidden;
      }
      .preview-media-box.align-full .preview-media-img {
        width: 100%;
        min-width: 100%;
        max-width: 100%;
        max-height: 320px;
      }
      .preview-media-img img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 6px;
        object-fit: cover;
      }
      .preview-media-text {
        flex: 1;
        font-size: 0.96rem;
        line-height: 1.6;
        color: #334155;
      }

      /* Content Blocks Editor Styles */
      .content-blocks-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }
      .content-blocks-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .content-blocks-actions {
        display: flex;
        gap: 0.5rem;
      }
      .btn-add-block {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        font-size: 0.82rem;
        font-weight: 700;
        color: #00143c;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-add-block:hover {
        background: #FFB81C;
        border-color: #e5a414;
      }
      .block-card {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        position: relative;
        transition: border-color 0.15s;
      }
      .block-card:hover {
        border-color: #94a3b8;
      }
      .block-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e2e8f0;
      }
      .block-badge {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        background: #e2e8f0;
        color: #334155;
      }
      .block-badge.badge-media {
        background: #FFF4DD;
        color: #b45309;
      }
      .block-controls {
        display: flex;
        align-items: center;
        gap: 0.3rem;
      }
      .btn-block-ctrl {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
      }
      .btn-block-ctrl:hover:not(:disabled) {
        background: #FFB81C;
        color: #1a1a1a;
      }
      .btn-block-ctrl:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
      .btn-block-delete {
        background: #fff;
        border: 1px solid #fca5a5;
        color: #dc2626;
      }
      .btn-block-delete:hover {
        background: #fef2f2 !important;
        border-color: #ef4444 !important;
      }
      .alignment-group {
        display: flex;
        gap: 0.35rem;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .alignment-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #475569;
        margin-right: 0.3rem;
      }
      .btn-align {
        padding: 0.3rem 0.65rem;
        font-size: 0.78rem;
        font-weight: 700;
        border: 1px solid #cbd5e1;
        border-radius: 5px;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .btn-align.active {
        background: #00143c;
        border-color: #00143c;
        color: #ffffff;
      }
      .media-block-editor-grid {
        display: flex;
        gap: 1.25rem;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .media-block-uploader {
        width: 32%;
        min-width: 200px;
        max-width: 280px;
      }
      .media-block-text {
        flex: 1;
        min-width: 280px;
      }

      .form-success {
        padding: 0.75rem 1rem;
        background: #ecfdf5;
        border: 1px solid #10b981;
        color: #065f46;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }
      .form-error {
        padding: 0.75rem 1rem;
        background: #fee2e2;
        border: 1px solid #f87171;
        color: #991b1b;
        border-radius: 6px;
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.8rem;
        margin-top: 1.2rem;
      }
      .btn-cancel {
        padding: 0.6rem 1.2rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-save {
        padding: 0.6rem 1.5rem;
        border: none;
        border-radius: 6px;
        background: #FFB81C;
        color: #1a1a1a;
        font-weight: 800;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-save:hover {
        background: #e5a414;
      }
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-delete {
        padding: 0.6rem 1.2rem;
        border: 1px solid #ef4444;
        border-radius: 6px;
        background: transparent;
        color: #dc2626;
        font-weight: 700;
        font-size: 0.88rem;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .btn-delete:hover {
        background: #fef2f2;
      }
      .btn-delete:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-card-delete {
        font-size: 0.84rem;
        font-weight: 700;
        padding: 0.45rem 0.85rem;
        border: 1px solid #ef4444;
        border-radius: 6px;
        background: transparent;
        color: #dc2626;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-card-delete:hover {
        background: #fef2f2;
      }
      .btn-add-page-direct {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: #002244;
        border: 1px solid #00143c;
        border-radius: 5px;
        padding: 0.35rem 0.65rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .btn-add-page-direct:hover {
        background: #FFB81C;
        border-color: #e5a414;
        color: #00143c;
      }
      .btn-add-page-inside {
        background: #f0fdf4;
        border: 1px solid #86efac;
        color: #166534;
        padding: 0.3rem 0.75rem;
        border-radius: 5px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .btn-add-page-inside:hover {
        background: #dcfce7;
        border-color: #4ade80;
      }
      .btn-edit-module {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 5px;
        padding: 0.35rem 0.7rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #00143c;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .btn-edit-module:hover {
        background: #FFB81C;
        border-color: #e5a414;
        color: #1a1a1a;
      }
      .btn-delete-module {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: #fff;
        border: 1px solid #fca5a5;
        border-radius: 5px;
        padding: 0.35rem 0.65rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #dc2626;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .btn-delete-module:hover {
        background: #fef2f2;
        border-color: #ef4444;
      }

      /* Version Control & History Styles */
      .version-history-container {
        padding: 0.5rem 0;
      }
      .version-history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1rem;
      }
      .version-empty-state {
        padding: 2.5rem 1.5rem;
        text-align: center;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px dashed #cbd5e1;
      }
      .version-list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        max-height: 480px;
        overflow-y: auto;
      }
      .version-item {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .version-item:hover {
        border-color: #cbd5e1;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      .version-item.is-draft {
        border-left: 4px solid #f59e0b;
        background: #fffdfa;
      }
      .version-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .version-badge {
        font-size: 0.72rem;
        font-weight: 800;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        background: #0284c7;
        color: #ffffff;
        letter-spacing: 0.05em;
      }
      .version-badge.badge-draft {
        background: #f59e0b;
        color: #ffffff;
      }
      .version-summary {
        font-size: 0.85rem;
        color: #475569;
        margin-bottom: 0.75rem;
        background: #f1f5f9;
        padding: 0.4rem 0.75rem;
        border-radius: 6px;
      }
      .version-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
      }

      /* Delete Warning Modal Styles */
      .delete-warning-modal-card {
        max-width: 520px;
        border-top: 4px solid #dc2626;
      }
      .delete-warning-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.2rem;
      }
      .delete-warning-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #fee2e2;
        color: #dc2626;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .delete-warning-sub {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        color: #dc2626;
      }
      .delete-warning-title {
        margin: 0.2rem 0 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
      }
      .delete-warning-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 1rem;
        color: #334155;
        font-size: 0.92rem;
        line-height: 1.5;
      }
      .reorder-btn-group {
        display: inline-flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 5px;
        overflow: hidden;
      }
      .btn-reorder {
        background: transparent;
        border: none;
        padding: 0.35rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
        line-height: 1;
        transition: background 0.15s, color 0.15s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-reorder:not(:last-child) {
        border-right: 1px solid #cbd5e1;
      }
      .btn-reorder:hover:not(:disabled) {
        background: #FFB81C;
        color: #1a1a1a;
      }
      .btn-reorder:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .c-sub-row {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 0.4rem;
      }
      .c-sub-row .c-sbtn {
        flex: 1;
      }
      .reorder-page-group {
        display: inline-flex;
        align-items: center;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .btn-reorder-page {
        background: transparent;
        border: none;
        padding: 0.28rem 0.42rem;
        font-size: 0.68rem;
        font-weight: 700;
        color: #475569;
        cursor: pointer;
        line-height: 1;
        transition: background 0.15s, color 0.15s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-reorder-page:not(:last-child) {
        border-right: 1px solid #cbd5e1;
      }
      .btn-reorder-page:hover:not(:disabled) {
        background: #FFB81C;
        color: #1a1a1a;
      }
      .btn-reorder-page:disabled {
        opacity: 0.25;
        cursor: not-allowed;
      }
      .card[draggable="true"] {
        cursor: grab;
      }
      .c-sub[draggable="true"] {
        cursor: grab;
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  tree = signal<ContentTree | null>(null);
  loading = signal(false);
  adminOpen = signal(false);

  openTopics = signal<Record<string, boolean>>({});
  activeSubtopicId = signal<string | null>(null);
  previewTexts = signal<Record<string, string>>({});
  loadingPreview = signal<string | null>(null);

  // Main Page Content Editor
  editModalOpen = signal(false);
  selectedSubtopicId = signal<string>('');
  editTitle = '';
  editOverview = '';
  editContentText = '';
  editImageUrl = '';
  editBlocks = signal<ContentBlock[]>([]);
  editTab = signal<'edit' | 'preview' | 'versions'>('edit');
  loadingSectionEdit = signal(false);
  savingEdit = signal(false);
  savingDraft = signal(false);
  deletingSection = signal(false);
  editSuccessMsg = signal('');
  editErrorMsg = signal('');
  previewImages = signal<Record<string, string>>({});

  // Version Control & History
  sectionVersions = signal<SectionVersion[]>([]);
  loadingVersions = signal(false);
  revertingVersion = signal(false);
  versionChangeSummary = '';

  // Delete Confirmation Modal State
  deleteModalOpen = signal(false);
  deleteModalType = signal<'page' | 'module'>('page');
  deleteModalTargetId = signal<string | number | null>(null);
  deleteModalTargetTitle = signal<string>('');
  deleteModalItemCount = signal<number>(0);
  deleteModalExecuting = signal(false);
  deleteModalError = signal('');

  // Content Block Deletion Warning State
  deleteBlockModalOpen = signal(false);
  blockToDeleteTarget = signal<{ isAddPage: boolean; index: number; blockType: string; snippet?: string } | null>(null);

  // Unsaved Changes Confirmation Dialog State
  unsavedWarningModalOpen = signal(false);
  initialEditState = {
    title: '',
    overview: '',
    imageUrl: '',
    rawContent: '',
  };

  // Module Settings Editor
  moduleModalOpen = signal(false);
  selectedModule = signal<Section | null>(null);
  editModuleTitle = '';
  editModuleImageUrl = '';
  savingModule = signal(false);
  deletingModule = signal(false);
  moduleSuccessMsg = signal('');
  moduleErrorMsg = signal('');

  // Reordering State
  reorderingSection = signal(false);
  reorderingPage = signal(false);
  draggedSectionIndex: number | null = null;
  draggedPageInfo: { sectionId: string; pageIndex: number } | null = null;

  // Add Section Creator
  addSectionModalOpen = signal(false);
  newSectionTitle = '';
  newSectionImageUrl = '';
  creatingSection = signal(false);
  addSectionErrorMsg = signal('');
  addSectionSuccessMsg = signal('');

  // Add Page Creator
  addPageModalOpen = signal(false);
  addPageTab = signal<'edit' | 'preview' | 'versions'>('edit');
  newPageTopicId: number | null = null;
  newPageTitle = '';
  newPageOverview = '';
  newPageContent = '';
  newPageImageUrl = '';
  newPageChangeSummary = '';
  isDraftCreation = false;
  unsavedAddPageWarningModalOpen = signal(false);
  newPageBlocks = signal<ContentBlock[]>([]);
  creatingPage = signal(false);
  addPageErrorMsg = signal('');
  addPageSuccessMsg = signal('');

  // Dropdown list computed from tree
  allSubtopicsList = computed(() => {
    const t = this.tree();
    if (!t) return [];
    const list: { id: string; label: string }[] = [];
    t.sections.forEach((sec) => {
      sec.topics.forEach((top) => {
        top.subtopics.forEach((sub) => {
          list.push({
            id: sub.id,
            label: `${sec.title} → ${sub.title}`,
          });
        });
      });
    });
    return list;
  });

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    private manualService: ManualService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.loadTree().then(() => {
      this.checkRouteForEditRequest();
    });
  }

  private checkRouteForEditRequest() {
    const editPageId = this.route.snapshot.queryParamMap.get('editPageId');
    if (editPageId) {
      this.selectedSubtopicId.set(editPageId);
      this.editModalOpen.set(true);
      this.editTab.set('edit');
      this.loadSectionDataForEdit(editPageId);
      // Clean query params from URL without reload
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editPageId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  async loadTree(forceRefresh: boolean = false) {
    const cached = this.manualService.getCachedTree();
    if (!forceRefresh && cached) {
      this.tree.set(cached);
      this.loading.set(false);
      return;
    }

    try {
      this.loading.set(true);
      const data = await this.manualService.fetchContentTree(forceRefresh);
      this.tree.set(data);
    } catch {
      this.tree.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  readonly coreModules = computed<Section[]>(() => {
    const t = this.tree();
    if (!t) return [];
    return t.sections.filter((s) => {
      if (s.order === 0) return false;
      const lower = s.title.toLowerCase();
      if (lower.includes('reference') || lower.includes('bibliography') || lower.includes('preliminar')) {
        return false;
      }
      return true;
    });
  });

  readonly referenceSections = computed<Section[]>(() => {
    const t = this.tree();
    if (!t) return [];
    return t.sections.filter((s) => {
      if (s.order === 0) return true;
      const lower = s.title.toLowerCase();
      return lower.includes('reference') || lower.includes('bibliography') || lower.includes('preliminar');
    });
  });

  isTopicOpen(no: string): boolean {
    return !!this.openTopics()[no];
  }

  toggleTopic(no: string) {
    const map = { ...this.openTopics() };
    map[no] = !map[no];
    this.openTopics.set(map);
  }

  formatSnippet(text: string | undefined, title: string): string {
    if (!text || !text.trim()) {
      return `Standard operating guidance for ${title}.`;
    }
    // 1. Strip custom media tags [media:...] and markdown images ![alt](url)
    let clean = text
      .replace(/\[media:(?:left|right|full)(?:\|[^\]|]+)*\|[^\]]+\]/gi, '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '');

    // 2. Strip HTML tags (e.g. <p>, <b>, <table>, <tr>, <td>, etc.)
    clean = clean.replace(/<[^>]+>/g, ' ');

    // 3. Decode common HTML entities
    clean = clean
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'");

    // 4. Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();
    if (!clean) {
      return `Standard operating guidance for ${title}.`;
    }

    const firstSentenceMatch = clean.match(/^([^.!?]+[.!?])/);
    let snippet = firstSentenceMatch ? firstSentenceMatch[1].trim() : clean;
    if (snippet.length > 130) {
      snippet = snippet.substring(0, 127).trim() + '...';
    }
    return snippet;
  }

  async toggleSubtopic(sub: SubTopic) {
    if (this.activeSubtopicId() === sub.id) {
      this.activeSubtopicId.set(null);
      return;
    }
    this.activeSubtopicId.set(sub.id);

    if (!this.previewTexts()[sub.id]) {
      if (sub.overview && sub.overview.trim()) {
        const cleanOverview = sub.overview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const snippet =
          cleanOverview.length > 130
            ? cleanOverview.substring(0, 127).trim() + '...'
            : cleanOverview;
        this.previewTexts.update((p) => ({ ...p, [sub.id]: snippet }));
        return;
      }

      this.loadingPreview.set(sub.id);
      try {
        const article = await this.manualService.fetchArticle(sub.id);
        let excerpt: string;
        if (article.overview && article.overview.trim()) {
          const cleanArtOverview = article.overview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          excerpt =
            cleanArtOverview.length > 130
              ? cleanArtOverview.substring(0, 127).trim() + '...'
              : cleanArtOverview;
        } else {
          const para = article.content.find((b) => b.type === 'paragraph' || b.type === 'media-text')?.text;
          excerpt = this.formatSnippet(para, sub.title);
        }
        this.previewTexts.update((p) => ({ ...p, [sub.id]: excerpt }));
      } catch {
        this.previewTexts.update((p) => ({
          ...p,
          [sub.id]: this.formatSnippet(undefined, sub.title),
        }));
      } finally {
        this.loadingPreview.set(null);
      }
    }
  }

  getAllSubtopics(sec: Section): SubTopic[] {
    const list: SubTopic[] = [];
    sec.topics.forEach((top) => {
      top.subtopics.forEach((sub) => list.push(sub));
    });
    list.sort((a, b) => ((a.orderIndex ?? a.order) - (b.orderIndex ?? b.order)));
    return list;
  }

  private updateSectionNumberInTitle(title: string, newNumber: number): string {
    if (/^section\s*\d*[:.-]?\s*/i.test(title)) {
      return title.replace(/^section\s*\d*[:.-]?\s*/i, `Section ${newNumber}: `);
    }
    if (/^module\s*\d*[:.-]?\s*/i.test(title)) {
      return title.replace(/^module\s*\d*[:.-]?\s*/i, `Section ${newNumber}: `);
    }
    return `Section ${newNumber}: ${title}`;
  }

  async moveSection(fromIndex: number, direction: -1 | 1) {
    const targetIndex = fromIndex + direction;
    const modules = this.coreModules();
    if (targetIndex < 0 || targetIndex >= modules.length) return;
    await this.reorderSectionToIndex(fromIndex, targetIndex);
  }

  async reorderSectionToIndex(fromIndex: number, toIndex: number) {
    const currentTree = this.tree();
    if (!currentTree || this.reorderingSection()) return;

    const coreList = [...this.coreModules()];
    if (fromIndex < 0 || fromIndex >= coreList.length || toIndex < 0 || toIndex >= coreList.length) return;

    const [moved] = coreList.splice(fromIndex, 1);
    coreList.splice(toIndex, 0, moved);

    // Renumber orders 1..N and update titles
    coreList.forEach((sec, idx) => {
      const newNum = idx + 1;
      sec.order = newNum;
      sec.title = this.updateSectionNumberInTitle(sec.title, newNum);
    });

    const coreRawIds = new Set(coreList.map((s) => s.rawId));
    const nonCoreBefore = currentTree.sections.filter((s) => s.order === 0 && !coreRawIds.has(s.rawId));
    const nonCoreAfter = currentTree.sections.filter((s) => s.order !== 0 && !coreRawIds.has(s.rawId));
    const updatedSections = [...nonCoreBefore, ...coreList, ...nonCoreAfter];
    this.tree.set({ ...currentTree, sections: updatedSections });

    const topicIds = coreList
      .map((s) => s.rawId)
      .filter((id): id is number => typeof id === 'number');

    try {
      this.reorderingSection.set(true);
      await this.manualService.reorderTopics(topicIds);
    } catch (err) {
      console.error('Failed to save section order:', err);
      await this.loadTree();
    } finally {
      this.reorderingSection.set(false);
    }
  }

  onSectionDragStart(event: DragEvent, index: number) {
    this.draggedSectionIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `section:${index}`);
    }
  }

  onSectionDragOver(event: DragEvent) {
    if (this.draggedSectionIndex !== null) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  async onSectionDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    if (this.draggedSectionIndex === null || this.draggedSectionIndex === targetIndex) {
      this.draggedSectionIndex = null;
      return;
    }
    const from = this.draggedSectionIndex;
    this.draggedSectionIndex = null;
    await this.reorderSectionToIndex(from, targetIndex);
  }

  async movePage(section: Section, fromIndex: number, direction: -1 | 1) {
    const targetIndex = fromIndex + direction;
    const pages = this.getAllSubtopics(section);
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    await this.reorderPageToIndex(section, fromIndex, targetIndex);
  }

  async reorderPageToIndex(section: Section, fromIndex: number, toIndex: number) {
    if (this.reorderingPage()) return;
    const pages = [...this.getAllSubtopics(section)];
    if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return;

    const [moved] = pages.splice(fromIndex, 1);
    pages.splice(toIndex, 0, moved);

    // Update order numbers sequentially
    pages.forEach((p, idx) => {
      p.order = idx + 1;
      p.orderIndex = idx + 1;
    });

    // Optimistically trigger tree change
    const currentTree = this.tree();
    if (currentTree) {
      this.tree.set({ ...currentTree });
    }

    const sectionIds = pages
      .map((p) => Number(p.id))
      .filter((id) => !isNaN(id) && id > 0);

    try {
      this.reorderingPage.set(true);
      await this.manualService.reorderSections(sectionIds);
    } catch (err) {
      console.error('Failed to save page order:', err);
      await this.loadTree();
    } finally {
      this.reorderingPage.set(false);
    }
  }

  onPageDragStart(event: DragEvent, section: Section, pageIndex: number) {
    this.draggedPageInfo = { sectionId: section.id, pageIndex };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `page:${section.id}:${pageIndex}`);
    }
  }

  onPageDragOver(event: DragEvent) {
    if (this.draggedPageInfo !== null) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  async onPageDrop(event: DragEvent, section: Section, targetIndex: number) {
    event.preventDefault();
    if (
      !this.draggedPageInfo ||
      this.draggedPageInfo.sectionId !== section.id ||
      this.draggedPageInfo.pageIndex === targetIndex
    ) {
      this.draggedPageInfo = null;
      return;
    }
    const from = this.draggedPageInfo.pageIndex;
    this.draggedPageInfo = null;
    await this.reorderPageToIndex(section, from, targetIndex);
  }

  getTintClass(order: number): string {
    const rem = order % 3;
    if (rem === 1) return 't1';
    if (rem === 2) return 't2';
    return 't0';
  }

  getIconName(order: number): string {
    if (order >= 1 && order <= 8) return `t${order}`;
    return 't0';
  }

  openArticle(subtopicId: string) {
    this.router.navigate(['/p', subtopicId]);
  }

  openAdminModal() {
    this.adminOpen.set(true);
  }

  // --- Main Page Content Editor Methods ---

  async openContentEditor() {
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');
    this.editTab.set('edit');
    const all = this.allSubtopicsList();
    if (all.length > 0) {
      const targetId = this.selectedSubtopicId() || all[0].id;
      this.selectedSubtopicId.set(targetId);
      await this.loadSectionDataForEdit(targetId);
    }
    this.editModalOpen.set(true);
  }

  async openDirectEdit(sub: SubTopic) {
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');
    this.editTab.set('edit');
    this.selectedSubtopicId.set(sub.id);
    await this.loadSectionDataForEdit(sub.id);
    this.editModalOpen.set(true);
  }

  async onSelectSubtopicToEdit(id: string) {
    this.selectedSubtopicId.set(id);
    await this.loadSectionDataForEdit(id);
  }

  parseRawToBlocks(rawText: string): ContentBlock[] {
    if (!rawText || !rawText.trim()) {
      return [{ type: 'paragraph', text: '' }];
    }
    const blocks: ContentBlock[] = [];
    const chunks = rawText.split(/\n\s*\n/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      const mediaMatch = trimmed.match(/^\[media:(left|right|full)(?:\|(small|medium|large|full|\d+%|\d+px))?(?:\|(4-3|16-9|1-1|auto))?\|([^\]]+)\](?:\s*([\s\S]*))?$/i);
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

  // --- Block Editing Helper Actions ---

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
    const typeLabel = blk.type === 'media-text' ? 'Media + Text' : 'Paragraph';
    const textSnippet = blk.text ? (blk.text.length > 70 ? blk.text.slice(0, 70) + '...' : blk.text) : '';
    this.blockToDeleteTarget.set({
      isAddPage: false,
      index,
      blockType: typeLabel,
      snippet: textSnippet,
    });
    this.deleteBlockModalOpen.set(true);
  }

  promptRemoveNewPageBlock(index: number) {
    const blk = this.newPageBlocks()[index];
    if (!blk) return;
    const typeLabel = blk.type === 'media-text' ? 'Image & Text' : 'Text Paragraph';
    const textSnippet = blk.text ? (blk.text.length > 70 ? blk.text.slice(0, 70) + '...' : blk.text) : '';
    this.blockToDeleteTarget.set({
      isAddPage: true,
      index,
      blockType: typeLabel,
      snippet: textSnippet,
    });
    this.deleteBlockModalOpen.set(true);
  }

  cancelDeleteBlock() {
    this.deleteBlockModalOpen.set(false);
    this.blockToDeleteTarget.set(null);
  }

  executeDeleteBlock() {
    const target = this.blockToDeleteTarget();
    if (!target) return;
    if (target.isAddPage) {
      this.newPageBlocks.update((list) => list.filter((_, i) => i !== target.index));
    } else {
      this.editBlocks.update((list) => list.filter((_, i) => i !== target.index));
    }
    this.cancelDeleteBlock();
  }

  blockToDeleteTitle(): string {
    const target = this.blockToDeleteTarget();
    if (!target) return 'Are you sure you want to delete this block?';
    return `Are you sure you want to delete Block #${target.index + 1} (${target.blockType})?`;
  }

  blockToDeleteDesc(): string {
    const target = this.blockToDeleteTarget();
    if (!target) return 'All text and media in this block will be permanently removed.';
    if (target.snippet) {
      return `All text and media in this block will be permanently removed: "${target.snippet}"`;
    }
    return 'All text, configuration, and image settings for this block will be permanently removed.';
  }

  removeEditBlock(index: number) {
    this.promptRemoveEditBlock(index);
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

  // --- Add Page Block Helper Actions ---

  addNewPageBlock(type: 'paragraph' | 'media-text') {
    this.newPageBlocks.update((list) => [
      ...list,
      type === 'paragraph'
        ? { type: 'paragraph', text: '' }
        : { type: 'media-text', alignment: 'right', imageUrl: '', text: '' },
    ]);
  }

  removeNewPageBlock(index: number) {
    this.promptRemoveNewPageBlock(index);
  }

  moveNewPageBlock(index: number, direction: -1 | 1) {
    const list = [...this.newPageBlocks()];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    this.newPageBlocks.set(list);
  }

  setNewPageBlockAlignment(index: number, align: 'left' | 'right' | 'full') {
    this.newPageBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], alignment: align };
      }
      return copy;
    });
  }

  setNewPageBlockSize(index: number, size: 'small' | 'medium' | 'large' | 'full' | string) {
    this.newPageBlocks.update((list) => {
      const copy = [...list];
      if (copy[index]) {
        copy[index] = { ...copy[index], imageSize: size };
      }
      return copy;
    });
  }

  setNewPageBlockRatio(index: number, ratio: '4-3' | '16-9' | '1-1' | 'auto') {
    this.newPageBlocks.update((list) => {
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

  onNewPageBlockImageSelected(event: Event, index: number) {
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

  async loadSectionDataForEdit(id: string) {
    this.loadingSectionEdit.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');
    try {
      const art = await this.manualService.fetchArticle(id);
      this.editTitle = art.title || '';
      this.editOverview = art.overview || '';
      this.editImageUrl = art.imageUrl || '';
      const raw = art.content.map((b) => {
        if (b.type === 'media-text') {
          return `[media:${b.alignment || 'right'}|${b.imageSize || 'medium'}|${b.aspectRatio || '4-3'}|${b.imageUrl || ''}]\n${b.text || ''}`.trim();
        }
        return b.text || '';
      }).filter(Boolean).join('\n\n');
      this.editContentText = raw;
      this.editBlocks.set(this.parseRawToBlocks(raw));

      // Record initial baseline to track unsaved modifications
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

  getPreviewWordCount(): number {
    const raw = this.serializeBlocksToRaw(this.editBlocks());
    if (!raw) return 0;
    return raw.trim().split(/\s+/).filter(Boolean).length;
  }

  async handleSaveDraft() {
    const subId = this.selectedSubtopicId();
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

      // Update baseline since changes have been saved to draft
      this.initialEditState = {
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        rawContent: finalContent,
      };

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
    const subId = this.selectedSubtopicId();
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

      // Update baseline since changes have been published live
      this.initialEditState = {
        title: this.editTitle,
        overview: this.editOverview,
        imageUrl: this.editImageUrl,
        rawContent: finalContent,
      };

      // Update local preview snippet & image immediately so cards reflect updated text & image
      const cleanSavedOverview = this.editOverview.trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.previewTexts.update((p) => ({
        ...p,
        [subId]: cleanSavedOverview || this.formatSnippet(this.editContentText, this.editTitle),
      }));
      this.previewImages.update((p) => ({
        ...p,
        [subId]: this.editImageUrl,
      }));

      // Reload tree so titles/images in menu/cards are updated
      await this.loadTree();
    } catch (err: any) {
      this.editErrorMsg.set(
        err?.message || 'Failed to save changes. Make sure you are logged in as admin.',
      );
    } finally {
      this.savingEdit.set(false);
    }
  }

  // --- Version Control Methods ---

  async switchTabToVersions() {
    this.editTab.set('versions');
    await this.loadVersionsForSelectedPage();
  }

  async loadVersionsForSelectedPage() {
    const subId = this.selectedSubtopicId();
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
    const subId = this.selectedSubtopicId();
    if (!subId) return;

    this.revertingVersion.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');

    try {
      await this.manualService.revertSectionVersion(subId, versionNumber);
      this.editSuccessMsg.set(`Successfully restored live content to Version ${versionNumber}!`);
      // Reload current section data
      await this.loadSectionDataForEdit(subId);
      await this.loadVersionsForSelectedPage();
      await this.loadTree();
    } catch (err: any) {
      this.editErrorMsg.set(err?.message || 'Failed to revert to this version.');
    } finally {
      this.revertingVersion.set(false);
    }
  }

  // --- Delete Validation & Confirmation Dialog Methods ---

  confirmDeletePage(subId: string | number, title: string) {
    this.deleteModalType.set('page');
    this.deleteModalTargetId.set(subId);
    this.deleteModalTargetTitle.set(title || 'this page');
    this.deleteModalItemCount.set(0);
    this.deleteModalError.set('');
    this.deleteModalOpen.set(true);
  }

  confirmDeleteModule(sec: Section) {
    if (!sec.rawId) {
      alert('Cannot delete this section because its database ID is missing.');
      return;
    }
    const subCount = this.getAllSubtopics(sec).length;
    this.deleteModalType.set('module');
    this.deleteModalTargetId.set(sec.rawId);
    this.deleteModalTargetTitle.set(sec.title);
    this.deleteModalItemCount.set(subCount);
    this.deleteModalError.set('');
    this.deleteModalOpen.set(true);
  }

  closeDeleteModal() {
    if (this.deleteModalExecuting()) return;
    this.deleteModalOpen.set(false);
    this.deleteModalTargetId.set(null);
    this.deleteModalError.set('');
  }

  async executeConfirmedDelete() {
    const targetId = this.deleteModalTargetId();
    if (!targetId) return;

    this.deleteModalExecuting.set(true);
    this.deleteModalError.set('');

    try {
      if (this.deleteModalType() === 'page') {
        await this.manualService.deleteSection(String(targetId));
        if (this.activeSubtopicId() === String(targetId)) {
          this.activeSubtopicId.set(null);
        }
        if (this.editModalOpen()) {
          this.editModalOpen.set(false);
        }
        this.closeDeleteModal();
        await this.loadTree();
      } else {
        await this.manualService.deleteTopic(Number(targetId));
        if (this.moduleModalOpen()) {
          this.closeModuleEditor();
        }
        this.closeDeleteModal();
        await this.loadTree();
      }
    } catch (err: any) {
      this.deleteModalError.set(err?.message || 'Failed to execute deletion.');
    } finally {
      this.deleteModalExecuting.set(false);
    }
  }

  async handleDeleteDirect(sub: SubTopic) {
    this.confirmDeletePage(sub.id, sub.title);
  }

  async handleDeleteCurrentSection() {
    const subId = this.selectedSubtopicId();
    if (!subId) return;
    this.confirmDeletePage(subId, this.editTitle || 'this page');
  }

  // --- Unsaved Changes & Exit Navigation Handlers ---

  hasUnsavedChanges(): boolean {
    if (!this.editModalOpen()) return false;
    const currentRaw = this.serializeBlocksToRaw(this.editBlocks());
    return (
      (this.editTitle || '') !== (this.initialEditState.title || '') ||
      (this.editOverview || '') !== (this.initialEditState.overview || '') ||
      (this.editImageUrl || '') !== (this.initialEditState.imageUrl || '') ||
      currentRaw !== (this.initialEditState.rawContent || '')
    );
  }

  @HostListener('window:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    if (this.deleteBlockModalOpen()) {
      this.cancelDeleteBlock();
      return;
    }
    if (this.unsavedWarningModalOpen()) {
      this.unsavedWarningModalOpen.set(false);
      return;
    }
    if (this.unsavedAddPageWarningModalOpen()) {
      this.unsavedAddPageWarningModalOpen.set(false);
      return;
    }
    if (this.deleteModalOpen()) {
      this.closeDeleteModal();
      return;
    }
    if (this.editModalOpen()) {
      this.requestExitEditor();
      return;
    }
    if (this.addPageModalOpen()) {
      this.requestExitAddPage();
      return;
    }
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
    this.editModalOpen.set(false);
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

  // --- Module Settings Editor Methods ---

  openModuleEditor(sec: Section) {
    this.selectedModule.set(sec);
    this.editModuleTitle = sec.title;
    this.editModuleImageUrl = sec.imageUrl || '';
    this.moduleSuccessMsg.set('');
    this.moduleErrorMsg.set('');
    this.moduleModalOpen.set(true);
  }

  closeModuleEditor() {
    this.moduleModalOpen.set(false);
    this.selectedModule.set(null);
  }

  onModuleImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 15 * 1024 * 1024) {
      this.moduleErrorMsg.set('Selected image is too large. Please select an image under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.editModuleImageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeModuleImage() {
    this.editModuleImageUrl = '';
  }

  async handleSaveModuleEdit() {
    const mod = this.selectedModule();
    if (!mod || !this.editModuleTitle.trim()) return;

    if (!mod.rawId) {
      this.moduleErrorMsg.set('Cannot find the topic ID for this section.');
      return;
    }

    this.savingModule.set(true);
    this.moduleSuccessMsg.set('');
    this.moduleErrorMsg.set('');

    try {
      await this.manualService.updateTopic(mod.rawId, {
        title: this.editModuleTitle.trim(),
        imageUrl: this.editModuleImageUrl ? this.editModuleImageUrl.trim() : '',
        topicNumber: mod.order,
      });

      this.moduleSuccessMsg.set('Section updated successfully!');
      await this.loadTree();
      setTimeout(() => {
        if (this.moduleModalOpen()) {
          this.closeModuleEditor();
        }
      }, 900);
    } catch (err: any) {
      this.moduleErrorMsg.set(
        err?.message || 'Failed to save section. Ensure you are logged in as admin.',
      );
    } finally {
      this.savingModule.set(false);
    }
  }

  // ------------------------------------------------------------------ //
  //  Add Section Creator Methods
  // ------------------------------------------------------------------ //

  openAddSectionModal() {
    this.newSectionTitle = '';
    this.newSectionImageUrl = '';
    this.addSectionErrorMsg.set('');
    this.addSectionSuccessMsg.set('');
    this.addSectionModalOpen.set(true);
  }

  closeAddSectionModal() {
    this.addSectionModalOpen.set(false);
  }

  onNewSectionImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 15 * 1024 * 1024) {
      this.addSectionErrorMsg.set('Selected image is too large. Please select an image under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.newSectionImageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async handleCreateSection() {
    const title = this.newSectionTitle.trim();
    if (!title) {
      this.addSectionErrorMsg.set('Section title is required.');
      return;
    }

    this.creatingSection.set(true);
    this.addSectionErrorMsg.set('');
    this.addSectionSuccessMsg.set('');

    try {
      await this.manualService.createNewSection({
        title,
        imageUrl: this.newSectionImageUrl || null,
      });

      this.addSectionSuccessMsg.set(`Section "${title}" was created successfully!`);
      await this.loadTree();

      setTimeout(() => {
        if (this.addSectionModalOpen()) {
          this.closeAddSectionModal();
        }
      }, 900);
    } catch (err: any) {
      this.addSectionErrorMsg.set(err?.message || 'Failed to create section. Ensure you are logged in as admin.');
    } finally {
      this.creatingSection.set(false);
    }
  }

  // ------------------------------------------------------------------ //
  //  Add Page Creator Methods
  // ------------------------------------------------------------------ //

  openAddPageModal(targetSection?: Section) {
    this.addPageTab.set('edit');
    this.newPageTitle = '';
    this.newPageOverview = '';
    this.newPageContent = '';
    this.newPageImageUrl = '';
    this.newPageBlocks.set([{ type: 'paragraph', text: '' }]);
    this.addPageErrorMsg.set('');
    this.addPageSuccessMsg.set('');

    const sections = this.tree()?.sections || [];
    if (targetSection && typeof targetSection.rawId === 'number') {
      this.newPageTopicId = targetSection.rawId;
    } else {
      const firstSection = sections.find((s) => typeof s.rawId === 'number');
      this.newPageTopicId = firstSection ? (firstSection.rawId ?? null) : null;
    }

    this.addPageModalOpen.set(true);
  }

  getNewPageParagraphs(): string[] {
    const raw = this.serializeBlocksToRaw(this.newPageBlocks());
    if (!raw) return [];
    return raw
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  getNewPageWordCount(): number {
    const raw = this.serializeBlocksToRaw(this.newPageBlocks());
    if (!raw) return 0;
    return raw.trim().split(/\s+/).filter(Boolean).length;
  }

  hasNewPageContent(): boolean {
    return this.newPageBlocks().some(
      (b) => (b.text && b.text.trim().length > 0) || (b.imageUrl && b.imageUrl.trim().length > 0)
    );
  }

  hasUnsavedAddPageChanges(): boolean {
    if (this.newPageTitle.trim() !== '') return true;
    if (this.newPageOverview.trim() !== '') return true;
    if (this.newPageImageUrl.trim() !== '') return true;
    if (this.newPageBlocks().length > 1) return true;
    const firstText = this.newPageBlocks()[0]?.text;
    if (this.newPageBlocks().length === 1 && firstText && firstText.trim() !== '') return true;
    return false;
  }

  requestExitAddPage() {
    if (this.hasUnsavedAddPageChanges()) {
      this.unsavedAddPageWarningModalOpen.set(true);
    } else {
      this.forceCloseAddPage();
    }
  }

  forceCloseAddPage() {
    this.unsavedAddPageWarningModalOpen.set(false);
    this.closeAddPageModal();
  }

  async saveAddPageAndExitDraft() {
    await this.handleCreatePage(true);
    if (!this.addPageErrorMsg()) {
      this.forceCloseAddPage();
    }
  }

  async saveAddPageAndExitLive() {
    await this.handleCreatePage(false);
    if (!this.addPageErrorMsg()) {
      this.forceCloseAddPage();
    }
  }

  closeAddPageModal() {
    this.addPageModalOpen.set(false);
    this.unsavedAddPageWarningModalOpen.set(false);
    this.newPageTitle = '';
    this.newPageOverview = '';
    this.newPageContent = '';
    this.newPageImageUrl = '';
    this.newPageChangeSummary = '';
    this.newPageBlocks.set([{ type: 'paragraph', text: '' }]);
    this.addPageErrorMsg.set('');
    this.addPageSuccessMsg.set('');
    this.addPageTab.set('edit');
  }

  onNewPageImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 15 * 1024 * 1024) {
      this.addPageErrorMsg.set('Selected image is too large. Please select an image under 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.newPageImageUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async handleCreatePage(isDraft: boolean = false) {
    const title = this.newPageTitle.trim();
    const content = this.serializeBlocksToRaw(this.newPageBlocks()).trim() || this.newPageContent.trim();
    const topicId = Number(this.newPageTopicId);

    if (!topicId || isNaN(topicId)) {
      this.addPageErrorMsg.set('Please select a target section.');
      return;
    }
    if (!title) {
      this.addPageErrorMsg.set('Page title is required.');
      return;
    }
    if (!content) {
      this.addPageErrorMsg.set('Page content is required.');
      return;
    }

    this.isDraftCreation = isDraft;
    this.creatingPage.set(true);
    this.addPageErrorMsg.set('');
    this.addPageSuccessMsg.set('');

    try {
      await this.manualService.createNewPage(topicId, {
        title,
        content,
        overview: this.newPageOverview.trim() || undefined,
        imageUrl: this.newPageImageUrl || null,
        isDraft,
        changeSummary: this.newPageChangeSummary.trim() || (isDraft ? 'Initial draft page creation' : 'Initial published page creation'),
      });

      this.addPageSuccessMsg.set(
        isDraft
          ? `Page "${title}" saved as draft revision!`
          : `Page "${title}" was created successfully and published live!`
      );
      await this.loadTree();

      // Automatically expand section accordion so the new page is immediately visible
      const sec = this.tree()?.sections.find((s) => s.rawId === topicId);
      if (sec) {
        this.openTopics.update((map) => ({ ...map, [sec.order.toString()]: true }));
      }

      setTimeout(() => {
        if (this.addPageModalOpen()) {
          this.closeAddPageModal();
        }
      }, 900);
    } catch (err: any) {
      this.addPageErrorMsg.set(err?.message || 'Failed to create page. Ensure you are logged in as admin.');
    } finally {
      this.creatingPage.set(false);
    }
  }
}
