import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-search-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <div class="gstart">
      <div class="top">
        <button type="button" class="back" (click)="goBack()">
          <app-icon name="left" [size]="20" />
          Back to topics
        </button>
      </div>

      <main class="gcenter">
        <h1>OSBP Field Guide</h1>
        <form class="gform" (ngSubmit)="handleSubmit()" role="search">
          <div class="gbox">
            <app-icon name="search" [size]="22" />
            <label class="sr-only" for="q">Search the guide</label>
            <input
              #searchInput
              id="q"
              type="search"
              [(ngModel)]="query"
              name="query"
              placeholder="Search by keyword, directive, procedure..."
              autocomplete="off"
              enterkeyhint="search"
            />
          </div>
          <button type="submit" class="gbtn">Search</button>
        </form>
      </main>

      <footer class="gfoot">
        Official EAC & IOM OSBP Field Guide · Digital Edition
      </footer>
    </div>
  `,
})
export class SearchStartComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  query = '';

  constructor(private router: Router) {}

  ngAfterViewInit() {
    this.searchInput?.nativeElement?.focus();
  }

  handleSubmit() {
    const trimmed = this.query.trim();
    if (!trimmed) {
      this.searchInput?.nativeElement?.focus();
      return;
    }
    this.router.navigate(['/q', trimmed]);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
