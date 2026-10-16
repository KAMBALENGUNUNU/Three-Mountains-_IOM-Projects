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
        <!-- Top Bar with Back Button -->
        <header class="pbar" style="display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="back" (click)="goBack()">
            <app-icon name="left" [size]="20" />
            Back
          </button>
          @if (authService.isAdmin()) {
            <button
              type="button"
              style="padding: 0.4rem 0.9rem; font-size: 0.84rem; border: 1px solid #ef4444; border-radius: 6px; background: transparent; color: #dc2626; font-weight: 700; cursor: pointer;"
              (click)="handleDeleteCurrent()"
              title="Delete this section from the manual"
            >
              Delete Section
            </button>
          }
        </header>

        <!-- Main Article Page -->
        <article class="page">
          <p class="crumb">{{ art.sectionTitle }} › {{ art.topicTitle }}</p>

          <h1 style="margin: 0.2rem 0 0.5rem; line-height: 1.15;">{{ art.title }}</h1>
          <p class="ref">Official OSBP Manual Section • {{ art.wordCount }} words</p>

          @if (art.overview) {
            <div
              style="margin: 1.2rem 0 1.6rem; padding: 1.1rem 1.4rem; background: var(--tint-soft, var(--blue-soft)); border-left: 4px solid var(--tint, var(--blue)); border-radius: 0 8px 8px 0; font-size: 1.05rem; font-weight: 500; color: var(--ink); line-height: 1.6;"
            >
              <div
                style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tint, var(--blue)); margin-bottom: 0.35rem;"
              >
                Key Operational Overview
              </div>
              <p style="margin: 0;">{{ art.overview }}</p>
            </div>
          }

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
                    <div class="ph" role="img" aria-label="Section illustration">
                      @if (idx === 0 && art.imageUrl) {
                        <img
                          [src]="art.imageUrl"
                          alt="{{ art.title }}"
                          style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;"
                        />
                      } @else {
                        <app-icon [name]="iconName()" [size]="56" />
                        <span>Image placeholder</span>
                      }
                    </div>
                    <div class="btxt">
                      <p>{{ block.text }}</p>
                    </div>
                  </div>
                }
              }
            </div>

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
        imageUrl: art.imageUrl,
      });
      this.isEditing.set(false);
      await this.loadArticle(this.subtopicId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save edit.');
    } finally {
      this.saving.set(false);
    }
  }

  toggleEdit() {
    if (this.authService.isAdmin()) {
      this.isEditing.update((v) => !v);
      if (this.isEditing()) {
        setTimeout(() => {
          const editor = document.getElementById('section-inline-editor');
          if (editor) {
            editor.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
      }
    } else {
      alert(
        'Admin privileges are required to modify official manual content.\n\nPlease log in as an administrator (e.g. admin@osbp.com / Password: Admin@1234).',
      );
    }
  }

  navigateTo(id: string) {
    this.router.navigate(['/p', id]);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  async handleDeleteCurrent() {
    const art = this.article();
    if (!art) return;
    const ok = window.confirm(
      `Are you sure you want to delete "${art.title}"?\n\nThis will permanently remove this section from the manual.`
    );
    if (!ok) return;

    try {
      await this.manualService.deleteSection(art.subtopicId);
      this.router.navigate(['/']);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete section.');
    }
  }
}
