import { Routes } from '@angular/router';
import { Showcase } from './pages/showcase/showcase';
import { Pokemon } from './pages/pokemon/pokemon';
import { Items } from './pages/items/items';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'showcase',
    pathMatch: 'full',
  },
  {
    path: 'showcase',
    component: Showcase,
  },
  {
    path: 'pokemon',
    component: Pokemon,
  },
  {
    path: 'items',
    component: Items,
  },
];
