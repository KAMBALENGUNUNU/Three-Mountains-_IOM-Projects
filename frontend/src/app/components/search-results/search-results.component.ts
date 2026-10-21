import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SearchResult, SearchHit, ContentBlock } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <div class="search-results-page">
      <!-- Top Search Bar (Prototype .rbar) -->
      <header class="rbar">
        <a class="brand" routerLink="/">OSBP Field Guide</a>

        <form class="gform" (ngSubmit)="handleSearch()" role="search">
          <div class="gbox">
            <app-icon name="search" [size]="20" />
            <label class="sr-only" for="rq">Search the guide</label>
            <input
              id="rq"
              type="search"
              [(ngModel)]="query"
              name="query"
              placeholder="Search the guide..."
              autocomplete="off"
              enterkeyhint="search"
            />
          </div>
          <button type="submit" class="gbtn">Search</button>
        </form>

        <a class="topics-link" routerLink="/">Topics</a>
      </header>

      <!-- Main Results Container (Prototype .rmain) -->
      <main class="rmain">
        @if (loading()) {
          <p class="rcount" style="font-style: italic;">
            Searching manual across all operational sections...
          </p>
        } @else if (!result() || result()!.hits.length === 0) {
          <div class="none">
            <h2>Nothing found for “<span>{{ query }}</span>”</h2>
            <p>Check the spelling, or try a shorter or more general word.</p>
            <p><a routerLink="/">Browse the topics</a></p>
          </div>
        } @else {
          <p class="rcount">
            {{ result()!.totalOccurrences }} {{ result()!.totalOccurrences === 1 ? 'result' : 'results' }}
          </p>

          <ol class="rlist">
            @for (hit of shownHits(); track hit.subtopicId; let i = $index) {
              <li class="res" [attr.data-rid]="hit.subtopicId">
                <p class="crumb">{{ formatCrumb(hit) }}</p>

                <h2 class="rtitle">
                  <button
                    type="button"
                    class="rt-btn"
                    (click)="toggleHit(hit.subtopicId)"
                    [attr.aria-expanded]="isHitOpen(hit.subtopicId)"
                    [attr.aria-controls]="'r-' + i"
                  >
                    <span [innerHTML]="highlightTitle(hit.subtopicTitle, query)"></span>
                  </button>
                </h2>

                <p class="snip">{{ hit.snippet }}</p>

                <button
                  type="button"
                  class="more"
                  (click)="toggleHit(hit.subtopicId)"
                  [attr.aria-expanded]="isHitOpen(hit.subtopicId)"
                  [attr.aria-controls]="'r-' + i"
                >
                  <span class="ml">{{ isHitOpen(hit.subtopicId) ? 'Show less' : 'Read more' }}</span>
                  <app-icon name="chev" [size]="18" customClass="chev" />
                </button>

                @if (isHitOpen(hit.subtopicId)) {
                  <div
                    [id]="'r-' + i"
                    class="panel"
                    [ngClass]="[getSideClass(hit.subtopicId, i), getTintClass(hit.sectionId)]"
                  >
                    <div class="ph" role="img" aria-label="Image placeholder">
                      @if (previewImages()[hit.subtopicId]) {
                        <img
                          [src]="previewImages()[hit.subtopicId]"
                          [alt]="hit.subtopicTitle"
                          style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;"
                        />
                      } @else {
                        <app-icon [name]="getTopicIcon(hit.sectionId)" [size]="56" />
                        <span>Image placeholder</span>
                      }
                    </div>

                    <div class="ptxt">
                      <p>{{ hit.snippet }}</p>
                      @if (previewTexts()[hit.subtopicId]) {
                        <p>{{ previewTexts()[hit.subtopicId] }}</p>
                      }
                      <a class="btn" [routerLink]="['/p', hit.subtopicId]">Open full page</a>
                    </div>
                  </div>
                }
              </li>
            }
          </ol>

          @if (shownCount() < (result()?.hits?.length || 0)) {
            <p class="rmore">
              <button type="button" (click)="shownCount.set(shownCount() + 10)">
                More results
              </button>
            </p>
          }
        }

        <p class="notice" style="margin-top: 2.4rem;">
          Official EAC &amp; IOM OSBP Field Guide · Digital Edition
        </p>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--paper);
        color: var(--ink);
      }

      /* Tint definitions matching prototype */
      .t1 {
        --tint: var(--blue);
        --tint-soft: var(--blue-soft);
      }
      .t2 {
        --tint: var(--teal);
        --tint-soft: var(--teal-soft);
      }
      .t0 {
        --tint: var(--gold);
        --tint-soft: var(--gold-soft);
      }

      /* Results top bar */
      .rbar {
        display: flex;
        align-items: center;
        gap: 1.4rem;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--line);
        background: var(--card);
      }

      .rbar .brand {
        white-space: nowrap;
        font-weight: 800;
        font-size: 1.1rem;
        letter-spacing: -0.01em;
        text-decoration: none;
        color: var(--ink);
      }

      .rbar .brand:hover {
        color: var(--blue);
      }

      .rbar .gform {
        display: flex;
        align-items: center;
        flex-direction: row;
        width: 100%;
        max-width: 640px;
      }

      .rbar .gbox {
        position: relative;
        width: 100%;
      }

      .rbar .gbox app-icon {
        position: absolute;
        left: 1.1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--ink-soft);
        pointer-events: none;
      }

      .rbar .gbox input {
        width: 100%;
        height: 2.8rem;
        padding: 0 1.2rem 0 3.2rem;
        font: inherit;
        font-size: 1rem;
        color: var(--ink);
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 999px;
        transition: box-shadow 0.15s, border-color 0.15s;
      }

      .rbar .gbox input:hover {
        box-shadow: 0 1px 6px rgba(0, 53, 160, 0.14);
        border-color: transparent;
      }

      .rbar .gbox input:focus {
        outline: none;
        box-shadow: 0 1px 8px rgba(0, 53, 160, 0.28);
        border-color: var(--blue);
      }

      .rbar .gbtn {
        display: none;
      }

      .rbar .topics-link {
        margin-left: auto;
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--ink-soft);
        text-decoration: none;
        white-space: nowrap;
        transition: color 0.15s;
      }

      .rbar .topics-link:hover {
        color: var(--blue);
      }

      /* Main container */
      .rmain {
        max-width: 700px;
        margin: 0 auto;
        padding: 1.2rem 1.5rem 5rem;
      }

      .rcount {
        margin: 0 0 1.4rem;
        font-size: 0.92rem;
        color: var(--ink-soft);
      }

      .rlist {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .res {
        margin-bottom: 2rem;
      }

      .crumb {
        margin: 0 0 0.15rem;
        font-size: 0.88rem;
        color: var(--ink-soft);
      }

      .rtitle {
        margin: 0;
        font-size: 1.3rem;
        line-height: 1.3;
        font-weight: 600;
      }

      .rt-btn {
        color: var(--blue);
        background: none;
        border: 0;
        padding: 0;
        font: inherit;
        font-size: 1.3rem;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        line-height: 1.3;
      }

      .rt-btn:hover {
        text-decoration: underline;
      }

      :host ::ng-deep .rt-btn strong {
        font-weight: 800;
        color: var(--blue-dark);
      }

      .snip {
        margin: 0.25rem 0 0.3rem;
        font-size: 1rem;
        color: var(--ink-soft);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.5;
      }

      .more {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--blue);
        padding: 0.2rem 0;
        cursor: pointer;
        background: none;
        border: 0;
      }

      .more:hover {
        text-decoration: underline;
      }

      .chev {
        transition: transform 0.15s;
        color: var(--ink-soft);
      }

      [aria-expanded="true"] > .chev,
      [aria-expanded="true"] .chev {
        transform: rotate(180deg);
      }

      /* Expandable panel */
      .panel {
        display: flex;
        gap: 1.4rem;
        align-items: flex-start;
        margin: 0.7rem 0 0;
        padding-left: 1.1rem;
        border-left: 3px solid var(--tint, var(--blue));
      }

      .panel.right {
        flex-direction: row-reverse;
      }

      .ph {
        flex: 0 0 210px;
        aspect-ratio: 4 / 3;
        border-radius: 10px;
        background: var(--tint-soft, var(--blue-soft));
        color: var(--tint, var(--blue));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        overflow: hidden;
        position: relative;
      }

      .ph span {
        font-size: 0.8rem;
        font-weight: 600;
      }

      .ptxt {
        flex: 1;
        min-width: 0;
      }

      .ptxt p {
        margin: 0 0 0.8rem;
        font-size: 1rem;
        line-height: 1.55;
        color: var(--ink);
      }

      .btn {
        display: inline-block;
        font-weight: 700;
        font-size: 1rem;
        color: #fff;
        background: var(--blue);
        padding: 0.65rem 1.2rem;
        border-radius: 8px;
        text-decoration: none;
        border: none;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      .btn:hover {
        background: var(--blue-dark);
      }

      /* More results */
      .rmore {
        margin: 1rem 0 0;
      }

      .rmore button {
        font-weight: 700;
        color: var(--blue);
        border: 1px solid var(--line);
        background: var(--card);
        border-radius: 8px;
        padding: 0.65rem 1.3rem;
        cursor: pointer;
        transition: border-color 0.15s;
      }

      .rmore button:hover {
        border-color: var(--blue);
      }

      /* Zero state */
      .none {
        padding: 1.5rem 0;
      }

      .none h2 {
        font-size: 1.3rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
        color: var(--ink);
      }

      .none p {
        margin: 0 0 0.5rem;
        color: var(--ink-soft);
      }

      .none a {
        color: var(--blue);
        font-weight: 600;
        text-decoration: none;
      }

      .none a:hover {
        text-decoration: underline;
      }

      .notice {
        margin: 0.5rem 0 0;
        font-size: 0.86rem;
        color: var(--ink-soft);
        border-left: 3px solid var(--gold);
        padding-left: 0.7rem;
      }

      /* Small screens */
      @media (max-width: 760px) {
        .rbar {
          flex-wrap: wrap;
          gap: 0.8rem 1rem;
        }

        .rbar .gform {
          order: 3;
          flex-basis: 100%;
          max-width: none;
        }

        .panel,
        .panel.right {
          flex-direction: column;
        }

        .ph {
          flex: none;
          width: 100%;
          aspect-ratio: 16 / 9;
        }
      }
    `,
  ],
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  query = '';
  result = signal<SearchResult | null>(null);
  loading = signal(true);
  openHits = signal<Record<string, boolean>>({});
  shownCount = signal(10);
  previewTexts = signal<Record<string, string>>({});
  previewImages = signal<Record<string, string>>({});

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private manualService: ManualService,
  ) {}

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const q = params.get('query');
      if (q) {
        this.query = decodeURIComponent(q);
        this.executeSearch(this.query);
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  async executeSearch(q: string) {
    this.loading.set(true);
    try {
      if (!this.manualService.getCachedTree()) {
        await this.manualService.fetchContentTree();
      }
      const res = await this.manualService.searchContent(q);
      this.result.set(res);
    } catch {
      this.result.set({
        query: q,
        totalOccurrences: 0,
        totalSections: 0,
        hits: [],
        tookMs: 0,
      });
    } finally {
      this.loading.set(false);
      window.scrollTo(0, 0);
    }
  }

  handleSearch() {
    const trimmed = this.query.trim();
    if (!trimmed) return;
    this.router.navigate(['/q', trimmed]);
  }

  async toggleHit(hitId: string) {
    const map = { ...this.openHits() };
    const willOpen = !map[hitId];
    map[hitId] = willOpen;
    this.openHits.set(map);

    if (willOpen && !this.previewTexts()[hitId]) {
      try {
        const article = await this.manualService.fetchArticle(hitId);
        if (article) {
          if (article.imageUrl) {
            this.previewImages.update((p) => ({ ...p, [hitId]: article.imageUrl! }));
          }
          if (article.overview) {
            const clean = article.overview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            this.previewTexts.update((p) => ({ ...p, [hitId]: clean }));
          } else if (article.content && article.content.length > 0) {
            const para = article.content.find((b: ContentBlock) => b.type === 'paragraph' || b.type === 'media-text')?.text;
            if (para) {
              const clean = para.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              this.previewTexts.update((p) => ({ ...p, [hitId]: clean }));
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

  isHitOpen(hitId: string): boolean {
    return !!this.openHits()[hitId];
  }

  shownHits(): SearchHit[] {
    const res = this.result();
    if (!res) return [];
    return res.hits.slice(0, this.shownCount());
  }

  formatCrumb(hit: SearchHit): string {
    const sec = hit.sectionTitle || 'Topic';
    const top = hit.topicTitle ? ` › ${hit.topicTitle}` : '';
    return `${sec}${top}`;
  }

  getTintClass(sectionId?: string): string {
    if (!sectionId) return 't1';
    const num = parseInt(sectionId.replace(/\D/g, ''), 10);
    if (isNaN(num)) return 't1';
    return 't' + (num % 3);
  }

  getTopicIcon(sectionId?: string): string {
    if (!sectionId) return 't1';
    const num = parseInt(sectionId.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num >= 0 && num <= 8) {
      return 't' + num;
    }
    return 't1';
  }

  getSideClass(subtopicId: string, idx: number): string {
    return idx % 2 === 1 ? 'right' : 'left';
  }

  highlightTitle(title: string, query: string): string {
    if (!title) return '';
    if (!query || !query.trim()) return this.escapeHtml(title);

    const STOP: Record<string, number> = {};
    'the a an to of my is are what do i how if and or in on for with at it this that when should does who'
      .split(' ')
      .forEach((w) => {
        STOP[w] = 1;
      });

    const stem = (w: string) => {
      if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      return w;
    };

    const qTokens = query
      .toLowerCase()
      .replace(/[\u2019']/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => Boolean(w) && !STOP[w])
      .map(stem);

    if (qTokens.length === 0) return this.escapeHtml(title);

    return title
      .split(/([A-Za-z0-9\u2019'\-]+)/)
      .map((part) => {
        if (!/^[A-Za-z0-9]/.test(part)) return this.escapeHtml(part);
        const st = stem(part.toLowerCase().replace(/[\u2019']/g, ''));
        const hit = qTokens.some((t) => st === t || (t.length >= 3 && st.startsWith(t)));
        return hit ? `<strong>${this.escapeHtml(part)}</strong>` : this.escapeHtml(part);
      })
      .join('');
  }

  escapeHtml(text: string): string {
    return String(text).replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return map[c] || c;
    });
  }
}
