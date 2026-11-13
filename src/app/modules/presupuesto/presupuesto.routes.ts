import { Routes } from '@angular/router';

export const PRESUPUESTO_ROUTES: Routes = [{
  path: 'procesos/catalogo-archivos-apm/nuevo',
  loadComponent: () => import('./catalogo-archivos-apm/catalogo-archivos-apm.component').then(m => m.CatalogoArchivosApmComponent),
}, {
  path: 'procesos/catalogo-archivos-apm',
  loadComponent: () => import('./catalogo-archivos-apm/catalogo-archivos-apm.component').then(m => m.CatalogoArchivosApmComponent),
}];
