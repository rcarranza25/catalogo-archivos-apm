import { Injectable, signal } from '@angular/core';

import type { Archivo } from './catalogo-archivos-apm.component';

/**
 * Estado efímero del Catálogo APM. Permanece durante la sesión de la aplicación
 * para que el cambio entre las rutas de alta y bandeja no reinicialice la vista.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoArchivosApmStateService {
  readonly archivos = signal<Archivo[]>([]);
  private inicializado = false;

  inicializarUnaVez(iniciales: readonly Archivo[]): void {
    if (this.inicializado) return;

    this.archivos.set(Array.from(iniciales, (archivo) => structuredClone(archivo)));
    this.inicializado = true;
  }

  /** Restaura el catálogo de demostración sin afectar otros estados de la aplicación. */
  restablecer(iniciales: readonly Archivo[]): void {
    this.archivos.set(Array.from(iniciales, (archivo) => structuredClone(archivo)));
    this.inicializado = true;
  }
}
