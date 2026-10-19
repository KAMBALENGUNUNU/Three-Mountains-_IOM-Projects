import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SearchResult, SearchHit } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <div>
      <!-- Top Search Bar -->
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

      <!-- Main Results Container -->
      <main class="rmain">
        @if (loading()) {
          <p class="rcount" style="font-style: italic;">
            Searching manual across all operational sections...
          </p>
        } @else if (!result() || result()!.hits.length === 0) {
          <div style="padding: 2rem 0;">
            <p class="rcount">
              No results found for <strong>"{{ query }}"</strong>.
            </p>
            <p style="color: var(--muted); margin-top: 0.6rem;">
              Suggestions:
              <br />• Ensure all words are spelled correctly.
              <br />• Try different or more general keywords (e.g. "visa", "clearance", "pass").
              <br />• Search for article titles or statutory references.
            </p>
          </div>
        } @else {
          <p class="rcount">
            About <strong>{{ result()!.totalOccurrences }}</strong> results across
            <strong>{{ result()!.totalSections }}</strong> sections ({{ result()!.tookMs }} ms)
          </p>

          <ol class="rlist">
            @for (hit of shownHits(); track hit.subtopicId) {
              <li class="ritem">
                <p class="rcrumb">{{ hit.sectionTitle }} › {{ hit.topicTitle }}</p>
                <h2 class="rtitle">
                  <a [routerLink]="['/p', hit.subtopicId]">{{ hit.subtopicTitle }}</a>
                </h2>

                <p class="rsnip">
                  {{ hit.snippet }}
                </p>

                <div class="rmeta">
                  <span>{{ hit.matchCount }} matches in this section</span>
                  <button
                    type="button"
                    class="r-expand"
                    (click)="toggleHit(hit.subtopicId)"
                    [attr.aria-expanded]="isHitOpen(hit.subtopicId)"
                  >
                    {{ isHitOpen(hit.subtopicId) ? 'Show less' : 'Read more' }}
                    <app-icon name="chev" [size]="14" customClass="chev" />
                  </button>
                </div>

                @if (isHitOpen(hit.subtopicId)) {
                  <div class="r-more">
                    <p style="margin-top: 0;">
                      Detailed excerpt from the official OSBP manual for
                      <strong>{{ hit.subtopicTitle }}</strong>:
                    </p>
                    <blockquote
                      style="border-left: 3px solid var(--blue); padding-left: 1rem; margin: 0.8rem 0; color: var(--ink-soft); font-style: italic;"
                    >
                      "{{ hit.snippet }}"
                    </blockquote>
                    <a
                      [routerLink]="['/p', hit.subtopicId]"
                      class="btn"
                      style="display: inline-flex; margin-top: 0.8rem;"
                    >
                      Open section in reader
                    </a>
                  </div>
                }
              </li>
            }
          </ol>

          @if (shownCount() < (result()?.hits?.length || 0)) {
            <div style="text-align: center; margin: 2rem 0;">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="shownCount.set(shownCount() + 10)"
              >
                Load more results
              </button>
            </div>
          }
        }
      </main>

      <footer class="notice" style="text-align: center; padding: 2rem;">
        Official EAC & IOM OSBP Field Guide · Digital Edition
      </footer>
    </div>
  `,
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  query = '';
  result = signal<SearchResult | null>(null);
  loading = signal(true);
  openHits = signal<Record<string, boolean>>({});
  shownCount = signal(10);

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

  toggleHit(hitId: string) {
    const map = { ...this.openHits() };
    map[hitId] = !map[hitId];
    this.openHits.set(map);
  }

  isHitOpen(hitId: string): boolean {
    return !!this.openHits()[hitId];
  }

  shownHits(): SearchHit[] {
    const res = this.result();
    if (!res) return [];
    return res.hits.slice(0, this.shownCount());
  }
}
