import { Routes } from '@angular/router';

export const PRESUPUESTO_ROUTES: Routes = [{
  path: 'procesos/catalogo-archivos-apm/nuevo',
  title: 'Catálogo de Archivos de la APM',
  loadComponent: () => import('./catalogo-archivos-apm/catalogo-archivos-apm.component').then(m => m.CatalogoArchivosApmComponent),
}, {
  path: 'procesos/catalogo-archivos-apm',
  title: 'Catálogo de Archivos de la APM',
  loadComponent: () => import('./catalogo-archivos-apm/catalogo-archivos-apm.component').then(m => m.CatalogoArchivosApmComponent),
}];
