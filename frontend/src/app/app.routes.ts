import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SearchStartComponent } from './components/search-start/search-start.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { ReaderComponent } from './components/reader/reader.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchStartComponent },
  { path: 'q/:query', component: SearchResultsComponent },
  { path: 'p/:subtopicId', component: ReaderComponent },
  { path: '**', redirectTo: '' },
];
