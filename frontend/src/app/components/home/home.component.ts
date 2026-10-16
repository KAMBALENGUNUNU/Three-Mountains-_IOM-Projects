import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ContentTree, Section, SubTopic } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../icon/icon.component';
import { AdminModalComponent } from '../admin-modal/admin-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, AdminModalComponent],
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
                                <button
                                  type="button"
                                  class="btn"
                                  (click)="openArticle(sub.id)"
                                >
                                  Open full page
                                </button>
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
                                <button
                                  type="button"
                                  class="btn btn-gold"
                                  (click)="openArticle(sub.id)"
                                >
                                  Open full page
                                </button>
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

      <!-- Admin Modal -->
      <app-admin-modal
        [open]="adminOpen()"
        [tree]="tree()"
        (close)="adminOpen.set(false)"
        (refresh)="loadTree()"
      />
    }
  `,
})
export class HomeComponent implements OnInit {
  tree = signal<ContentTree | null>(null);
  loading = signal(false);
  adminOpen = signal(false);

  openTopics = signal<Record<string, boolean>>({ '1': true });
  activeSubtopicId = signal<string | null>(null);
  previewTexts = signal<Record<string, string>>({});
  loadingPreview = signal<string | null>(null);

  constructor(
    public authService: AuthService,
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

  async toggleSubtopic(sub: SubTopic) {
    if (this.activeSubtopicId() === sub.id) {
      this.activeSubtopicId.set(null);
      return;
    }
    this.activeSubtopicId.set(sub.id);

    if (!this.previewTexts()[sub.id]) {
      this.loadingPreview.set(sub.id);
      try {
        const article = await this.manualService.fetchArticle(sub.id);
        const para = article.content.find((b) => b.type === 'paragraph')?.text;
        const excerpt = para || `Official operational handbook content for ${sub.title}.`;
        this.previewTexts.update((p) => ({ ...p, [sub.id]: excerpt }));
      } catch {
        this.previewTexts.update((p) => ({
          ...p,
          [sub.id]: `Official operational handbook content for ${sub.title}. Click "Open full page" to view.`,
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
}
