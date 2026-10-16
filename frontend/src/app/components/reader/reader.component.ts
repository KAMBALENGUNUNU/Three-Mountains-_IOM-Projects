import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Article, FlatNode } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    @if (loading()) {
      <div>
        <header class="pbar">
          <button type="button" class="back" (click)="goBack()">
            <app-icon name="left" [size]="20" />
            Back
          </button>
        </header>
        <article class="page">
          <p style="color: var(--muted); font-style: italic; padding: 2rem 0;">
            Loading section documentation from database...
          </p>
        </article>
      </div>
    } @else if (!article()) {
      <div>
        <header class="pbar">
          <button type="button" class="back" (click)="goBack()">
            <app-icon name="left" [size]="20" />
            Back
          </button>
        </header>
        <article class="page">
          <h2>Section not found</h2>
          <p>The requested manual section could not be located in the database.</p>
          <button type="button" class="btn" (click)="goBack()">Return to topics</button>
        </article>
      </div>
    } @else {
      @let art = article()!;
      <div>
        <!-- Top Bar with Back Button and Admin Edit Trigger -->
        <header class="pbar">
          <button type="button" class="back" (click)="goBack()">
            <app-icon name="left" [size]="20" />
            Back
          </button>

          @if (authService.isAdmin()) {
            <button
              type="button"
              class="btn btn-secondary"
              style="font-size: 0.85rem; padding: 0.35rem 0.8rem;"
              (click)="isEditing.set(!isEditing())"
            >
              {{ isEditing() ? 'Cancel Edit' : 'Edit Section (Admin)' }}
            </button>
          }
        </header>

        <!-- Main Article Page -->
        <article class="page">
          <p class="crumb">{{ art.sectionTitle }} › {{ art.topicTitle }}</p>

          <h1>{{ art.title }}</h1>
          <p class="ref">Official OSBP Manual Section • {{ art.wordCount }} words</p>

          <!-- Admin Quick Inline Editor -->
          @if (isEditing()) {
            <div
              style="padding: 1.4rem; border-radius: 8px; border: 2px solid var(--blue); background: #fff; margin-bottom: 2rem;"
            >
              <h3 style="margin: 0 0 1rem; font-size: 1.15rem;">Edit Section Content</h3>
              <div style="margin-bottom: 1rem;">
                <label
                  style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.3rem;"
                >
                  Section Title:
                </label>
                <input
                  type="text"
                  [(ngModel)]="editTitle"
                  style="width: 100%; padding: 0.6rem 0.8rem; border: 1px solid var(--line); border-radius: 6px; font: inherit;"
                />
              </div>

              <div style="margin-bottom: 1rem;">
                <label
                  style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.3rem;"
                >
                  Card Overview & Snippet (Managed from Backend):
                </label>
                <input
                  type="text"
                  [(ngModel)]="editOverview"
                  placeholder="Concise 1-sentence summary displayed on topic cards"
                  style="width: 100%; padding: 0.6rem 0.8rem; border: 1px solid var(--line); border-radius: 6px; font: inherit;"
                />
              </div>

              <div style="margin-bottom: 1.2rem;">
                <label
                  style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.3rem;"
                >
                  Legal Text Content:
                </label>
                <textarea
                  rows="12"
                  [(ngModel)]="editContent"
                  style="width: 100%; padding: 0.8rem; border: 1px solid var(--line); border-radius: 6px; font: inherit; font-size: 0.95rem; line-height: 1.5;"
                ></textarea>
              </div>

              <div style="display: flex; gap: 0.8rem;">
                <button
                  type="button"
                  class="btn"
                  [disabled]="saving()"
                  (click)="handleSaveEdit()"
                >
                  {{ saving() ? 'Saving...' : 'Save & Sync Search Index' }}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="isEditing.set(false)"
                >
                  Cancel
                </button>
              </div>
            </div>
          } @else {
            <!-- Content Blocks: Alternating image placeholders and text -->
            <div class="blocks-container">
              @for (block of art.content; track $index; let idx = $index) {
                @if (block.type === 'heading') {
                  <h2 [attr.id]="'sec-' + idx">{{ block.text }}</h2>
                } @else if (block.type === 'table') {
                  <div
                    style="overflow-x: auto; margin: 1.4rem 0; border: 1px solid var(--line); border-radius: 8px;"
                  >
                    <table
                      style="width: 100%; border-collapse: collapse; font-size: 0.92rem;"
                    >
                      @if (block.headers) {
                        <thead style="background: var(--blue); color: #fff;">
                          <tr>
                            @for (h of block.headers; track $index) {
                              <th
                                style="padding: 0.8rem 1rem; text-align: left; font-weight: 700;"
                              >
                                {{ h }}
                              </th>
                            }
                          </tr>
                        </thead>
                      }
                      <tbody>
                        @for (row of block.rows; track $index; let rI = $index) {
                          <tr
                            [style.background]="rI % 2 === 0 ? '#fff' : 'var(--paper)'"
                            style="border-bottom: 1px solid var(--line);"
                          >
                            @for (cell of row; track $index) {
                              <td style="padding: 0.8rem 1rem;">{{ cell }}</td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else if (block.type === 'callout') {
                  <div
                    style="border-left: 4px solid var(--blue); background: var(--blue-soft); padding: 1rem 1.2rem; border-radius: 0 8px 8px 0; margin: 1.2rem 0;"
                  >
                    <p style="margin: 0; font-weight: 500; color: var(--ink);">
                      {{ block.text }}
                    </p>
                  </div>
                } @else if (block.type === 'list') {
                  <ul style="padding-left: 1.4rem; margin: 1rem 0;">
                    @for (item of block.items; track $index) {
                      <li style="margin-bottom: 0.5rem;">{{ item }}</li>
                    }
                  </ul>
                } @else {
                  <div
                    class="block {{ idx % 2 === 0 ? 'left' : 'right' }} {{ tintClass() }}"
                  >
                    <div class="ph" role="img" aria-label="Image placeholder">
                      <app-icon [name]="iconName()" [size]="56" />
                      <span>Image placeholder</span>
                    </div>
                    <div class="btxt">
                      <p>{{ block.text }}</p>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- Previous and Next Navigation Buttons -->
          <nav class="pn" aria-label="Other sections">
            @if (prevSubtopic()) {
              <button
                type="button"
                class="prev"
                (click)="navigateTo(prevSubtopic()!.subtopicId)"
              >
                <small>Previous</small>
                <span>{{ prevSubtopic()!.subtopicTitle }}</span>
              </button>
            } @else {
              <div></div>
            }

            @if (nextSubtopic()) {
              <button
                type="button"
                class="next"
                (click)="navigateTo(nextSubtopic()!.subtopicId)"
              >
                <small>Next</small>
                <span>{{ nextSubtopic()!.subtopicTitle }}</span>
              </button>
            } @else {
              <div></div>
            }
          </nav>

          <p class="notice" style="margin-top: 2.4rem;">
            Official EAC & IOM OSBP Field Guide · Digital Edition
          </p>
        </article>

        <!-- Floating Side Rail for Instant Search -->
        <a class="rail" routerLink="/search" aria-label="Search the guide">
          <span class="dot">
            <app-icon name="search" [size]="24" />
          </span>
          <span class="lbl">Search</span>
        </a>
      </div>
    }
  `,
})
export class ReaderComponent implements OnInit, OnDestroy {
  subtopicId = '';
  article = signal<Article | null>(null);
  loading = signal(true);
  isEditing = signal(false);
  editTitle = '';
  editOverview = '';
  editContent = '';
  saving = signal(false);

  prevSubtopic = signal<FlatNode | null>(null);
  nextSubtopic = signal<FlatNode | null>(null);
  tintClass = signal('t1');
  iconName = signal('t1');

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService,
    private manualService: ManualService,
  ) {}

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('subtopicId');
      if (id) {
        this.subtopicId = id;
        this.loadArticle(id);
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  async loadArticle(id: string) {
    this.loading.set(true);
    this.isEditing.set(false);
    try {
      if (!this.manualService.getCachedTree()) {
        await this.manualService.fetchContentTree();
      }

      const art = await this.manualService.fetchArticle(id);
      this.article.set(art);
      this.editTitle = art.title;
      this.editOverview = art.overview || '';
      this.editContent = art.content.map((b) => b.text || '').join('\n\n');

      const adj = this.manualService.getAdjacentSubtopics(id);
      this.prevSubtopic.set(adj.prev);
      this.nextSubtopic.set(adj.next);

      // Determine topic tint
      const secMatch = art.sectionId.match(/\d+/);
      const secNum = secMatch ? parseInt(secMatch[0], 10) : 1;
      const rem = secNum % 3;
      this.tintClass.set(rem === 1 ? 't1' : rem === 2 ? 't2' : 't0');
      this.iconName.set(secNum >= 1 && secNum <= 8 ? `t${secNum}` : 't0');
    } catch (err) {
      console.error('Failed to load article:', err);
      this.article.set(null);
    } finally {
      this.loading.set(false);
      window.scrollTo(0, 0);
    }
  }

  async handleSaveEdit() {
    const art = this.article();
    if (!art) return;
    this.saving.set(true);
    try {
      await this.manualService.saveContentEdit({
        id: art.subtopicId,
        title: this.editTitle,
        overview: this.editOverview,
        content: this.editContent,
      });
      this.isEditing.set(false);
      await this.loadArticle(this.subtopicId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save edit.');
    } finally {
      this.saving.set(false);
    }
  }

  navigateTo(id: string) {
    this.router.navigate(['/p', id]);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
