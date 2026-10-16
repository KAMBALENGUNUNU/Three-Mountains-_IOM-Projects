import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContentTree, Section, SubTopic } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon/icon.component';
import { AdminModalComponent } from '../admin-modal/admin-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent, AdminModalComponent],
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
          <p>
            Welcome to the OSBP Field Guide. Use this page to find your way around the platform and
            open the topic you need.
          </p>

          <h2>How to use this guide</h2>
          <ol>
            <li>
              <strong>Pick a topic.</strong> The topics are listed on the right. Each one shows its
              image, title and the number of pages inside it.
            </li>
            <li>
              <strong>Open the details.</strong> Select <em>Details</em> at the bottom of a topic to
              see all its pages. Select it again to close the list.
            </li>
            <li>
              <strong>Preview a page.</strong> Select a page marked with the open book icon to see a
              short preview and image, then choose <em>Open full page</em> to read it in full.
            </li>
            <li>
              <strong>Move between pages.</strong> At the bottom of each page, use <em>Previous</em>
              and <em>Next</em>. Use <em>Back</em> at the top to return to where you were.
            </li>
            <li>
              <strong>Search.</strong> Use the search button to look for a word or phrase and jump
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

                @if (user.role === 'admin') {
                  <button
                    (click)="openAdminModal()"
                    class="btn btn-gold"
                    style="justify-content: center; width: 100%; font-size: 0.92rem;"
                  >
                    Admin Management Suite
                  </button>
                }
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
              <span class="main-top-sub">Operational modules, border standards & trade facilitation</span>
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
                  ✏️ Edit Content
                </button>
                <button
                  type="button"
                  class="btn main-action-btn btn-admin-dark"
                  (click)="notificationService.openAddModal.set(true)"
                  title="Broadcast notification to all users"
                >
                  📢 Add Notification
                </button>
              </div>
            }
          </div>

          <ol class="cards">
            @for (section of coreModules(); track section.id) {
              <li class="card {{ getTintClass(section.order) }}" [attr.data-topic]="section.order">
                <!-- Header -->
                <div class="c-head">
                  <div class="c-img" role="img" aria-label="Image placeholder">
                    <app-icon [name]="getIconName(section.order)" [size]="48" />
                    <span>Image placeholder</span>
                  </div>
                  <div class="c-body">
                    <h2 class="c-title">{{ section.title }}</h2>
                    <span class="c-meta">
                      {{ getAllSubtopics(section).length }}
                      {{ getAllSubtopics(section).length === 1 ? 'Page' : 'Pages' }}
                    </span>
                  </div>
                </div>

                <!-- Subtopics List (when card details is open) -->
                @if (isTopicOpen(section.order.toString())) {
                  <ul class="c-list" [attr.id]="'subs-' + section.order">
                    @for (sub of getAllSubtopics(section); track sub.id; let sIdx = $index) {
                      <li class="c-sub">
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

                        <!-- Accordion Content Panel (with image placeholder & preview) -->
                        @if (activeSubtopicId() === sub.id) {
                          <div>
                            <div
                              class="panel {{ sIdx % 2 === 0 ? 'left' : 'right' }} {{
                                getTintClass(section.order)
                              }}"
                            >
                              <div class="ph" role="img" aria-label="Image placeholder">
                                <app-icon [name]="getIconName(section.order)" [size]="56" />
                                <span>Image placeholder</span>
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
                                      title="Edit this section directly from main page"
                                    >
                                      ✏️ Edit Section
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
                  <span>Details</span>
                </button>
              </li>
            }

            <!-- Reference Library & Preliminaries -->
            @for (sec of referenceSections(); track sec.id) {
              <li class="card t0" [attr.data-topic]="'ref-' + sec.order">
                <div class="c-head">
                  <div class="c-img" role="img" aria-label="Image placeholder">
                    <app-icon name="t0" [size]="48" />
                    <span>Image placeholder</span>
                  </div>
                  <div class="c-body">
                    <h2 class="c-title">{{ sec.title }}</h2>
                    <span class="c-meta">{{ getAllSubtopics(sec).length }} Resources</span>
                  </div>
                </div>

                @if (isTopicOpen('ref-' + sec.order)) {
                  <ul class="c-list" [attr.id]="'subs-' + sec.order">
                    @for (sub of getAllSubtopics(sec); track sub.id; let sIdx = $index) {
                      <li class="c-sub">
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

                        @if (activeSubtopicId() === sub.id) {
                          <div>
                            <div
                              class="panel {{ sIdx % 2 === 0 ? 'left' : 'right' }} t0"
                            >
                              <div class="ph" role="img" aria-label="Image placeholder">
                                <app-icon name="t0" [size]="56" />
                                <span>Image placeholder</span>
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
                                      title="Edit this section directly from main page"
                                    >
                                      ✏️ Edit Section
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
                  <span>Details</span>
                </button>
              </li>
            }
          </ol>
        </main>
      </div>

      <!-- Main Page Content Editor Modal -->
      @if (editModalOpen()) {
        <div class="modal-backdrop" (click)="editModalOpen.set(false)">
          <div class="modal-card edit-modal-card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <div>
                <span class="modal-sub">Curriculum Editor</span>
                <h3 class="modal-title">Edit Manual Content</h3>
              </div>
              <button type="button" class="btn-close" (click)="editModalOpen.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <!-- Section Selector Dropdown -->
              <div class="form-group">
                <label for="subtopic-picker">Select Section / Page to Edit:</label>
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
                  Loading section details...
                </div>
              } @else {
                <!-- Section Title -->
                <div class="form-group">
                  <label for="edit-title">Section Title:</label>
                  <input
                    id="edit-title"
                    type="text"
                    [(ngModel)]="editTitle"
                    class="form-input"
                    placeholder="Section Title"
                  />
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

                <!-- Full Text Content -->
                <div class="form-group">
                  <label for="edit-content">
                    Main Section Content:
                    <span style="font-weight: 400; font-size: 0.8rem; color: #64748b;">(Paragraphs / text displayed on reader page)</span>
                  </label>
                  <textarea
                    id="edit-content"
                    rows="9"
                    [(ngModel)]="editContentText"
                    class="form-input form-textarea"
                    placeholder="Enter section content text..."
                  ></textarea>
                </div>

                @if (editSuccessMsg()) {
                  <div class="form-success">{{ editSuccessMsg() }}</div>
                }
                @if (editErrorMsg()) {
                  <div class="form-error">{{ editErrorMsg() }}</div>
                }

                <div class="modal-actions">
                  <button
                    type="button"
                    class="btn-cancel"
                    (click)="editModalOpen.set(false)"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    class="btn-save"
                    [disabled]="savingEdit() || !editTitle.trim()"
                    (click)="handleSaveContentEdit()"
                  >
                    {{ savingEdit() ? 'Saving...' : 'Save Changes' }}
                  </button>
                </div>
              }
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
      .edit-modal-card {
        width: 100%;
        max-width: 680px;
        max-height: 90vh;
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
    `,
  ],
})
export class HomeComponent implements OnInit {
  tree = signal<ContentTree | null>(null);
  loading = signal(false);
  adminOpen = signal(false);

  openTopics = signal<Record<string, boolean>>({ '1': true });
  activeSubtopicId = signal<string | null>(null);
  previewTexts = signal<Record<string, string>>({});
  loadingPreview = signal<string | null>(null);

  // Main Page Content Editor
  editModalOpen = signal(false);
  selectedSubtopicId = signal<string>('');
  editTitle = '';
  editOverview = '';
  editContentText = '';
  loadingSectionEdit = signal(false);
  savingEdit = signal(false);
  editSuccessMsg = signal('');
  editErrorMsg = signal('');

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
  ) {}

  ngOnInit() {
    this.loadTree();
  }

  async loadTree() {
    try {
      this.loading.set(true);
      const data = await this.manualService.fetchContentTree();
      this.tree.set(data);
    } catch {
      this.tree.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  coreModules(): Section[] {
    const t = this.tree();
    if (!t) return [];
    return t.sections.filter((s) => s.order >= 1 && s.order <= 8);
  }

  referenceSections(): Section[] {
    const t = this.tree();
    if (!t) return [];
    return t.sections.filter((s) => s.order === 0 || s.order > 8);
  }

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
    const clean = text.replace(/\s+/g, ' ').trim();
    const firstSentenceMatch = clean.match(/^([^.!?]+[.!?])/);
    let snippet = firstSentenceMatch ? firstSentenceMatch[1].trim() : clean;
    if (snippet.length > 100) {
      snippet = snippet.substring(0, 97).trim() + '...';
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
        const snippet =
          sub.overview.length > 100
            ? sub.overview.substring(0, 97).trim() + '...'
            : sub.overview.trim();
        this.previewTexts.update((p) => ({ ...p, [sub.id]: snippet }));
        return;
      }

      this.loadingPreview.set(sub.id);
      try {
        const article = await this.manualService.fetchArticle(sub.id);
        let excerpt: string;
        if (article.overview && article.overview.trim()) {
          excerpt =
            article.overview.length > 100
              ? article.overview.substring(0, 97).trim() + '...'
              : article.overview.trim();
        } else {
          const para = article.content.find((b) => b.type === 'paragraph')?.text;
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
    return list;
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
    this.selectedSubtopicId.set(sub.id);
    await this.loadSectionDataForEdit(sub.id);
    this.editModalOpen.set(true);
  }

  async onSelectSubtopicToEdit(id: string) {
    this.selectedSubtopicId.set(id);
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
      this.editContentText = art.content.map((b) => b.text || '').join('\n\n');
    } catch (err: any) {
      this.editErrorMsg.set('Failed to load section data.');
    } finally {
      this.loadingSectionEdit.set(false);
    }
  }

  async handleSaveContentEdit() {
    const subId = this.selectedSubtopicId();
    if (!subId || !this.editTitle.trim()) return;

    this.savingEdit.set(true);
    this.editSuccessMsg.set('');
    this.editErrorMsg.set('');

    try {
      await this.manualService.saveContentEdit({
        id: subId,
        title: this.editTitle,
        overview: this.editOverview,
        content: this.editContentText,
      });

      this.editSuccessMsg.set('✓ Content successfully saved and updated in database!');

      // Update local preview snippet immediately so cards show updated text
      this.previewTexts.update((p) => ({
        ...p,
        [subId]: this.editOverview.trim() || this.formatSnippet(this.editContentText, this.editTitle),
      }));

      // Reload tree so titles in menu/cards are updated
      await this.loadTree();
    } catch (err: any) {
      this.editErrorMsg.set(
        err?.message || 'Failed to save changes. Make sure you are logged in as admin.',
      );
    } finally {
      this.savingEdit.set(false);
    }
  }
}
