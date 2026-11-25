import { Injectable, signal } from '@angular/core';

/**
 * Coordinador de notificaciones del Catálogo APM.
 *
 * El alcance es intencionalmente exclusivo del catálogo: conserva una única
 * notificación activa, bloquea la interacción desde el host del catálogo y
 * transporta una vez el resultado de Grabar hacia la bandeja.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoArchivosApmSnackbarService {
  readonly open = signal(false);
  readonly message = signal('');
  readonly context = signal('');
  private pendingMessage = '';

  show(message: string, context = 'catalogo-apm'): void {
    if (!message || (this.open() && this.message() === message)) return;
    this.message.set(message);
    this.context.set(context);
    this.open.set(true);
  }

  dismiss(): void {
    this.open.set(false);
    this.message.set('');
    this.context.set('');
  }

  prepareForTray(message: string): void {
    this.pendingMessage = message;
  }

  consumeForTray(): string {
    const message = this.pendingMessage;
    this.pendingMessage = '';
    return message;
  }

  hasPendingForTray(): boolean {
    return Boolean(this.pendingMessage);
  }
}
