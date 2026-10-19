import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./components/search-start/search-start.component').then(
        (m) => m.SearchStartComponent,
      ),
  },
  {
    path: 'q/:query',
    loadComponent: () =>
      import('./components/search-results/search-results.component').then(
        (m) => m.SearchResultsComponent,
      ),
  },
  {
    path: 'p/:subtopicId',
    loadComponent: () =>
      import('./components/reader/reader.component').then(
        (m) => m.ReaderComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
