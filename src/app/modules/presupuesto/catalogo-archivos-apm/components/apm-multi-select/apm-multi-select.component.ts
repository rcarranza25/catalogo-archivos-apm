import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { FocoDirective } from '../../../../../shared/ui/foco/foco.directive';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { SelectOption, SelectOptionsComponent } from '../../../../../shared/ui/select-options/select-options.component';
import { TagComponent } from '../../../../../shared/ui/tag/tag.component';

/**
 * Selector múltiple local del Catálogo de Archivos APM.
 *
 * Combina las casillas de `siaf-select-options` con los
 * tags removibles de `siaf-tag`. Se mantiene local porque `siaf-input` ofrece
 * esos dos patrones por separado y no debe modificarse el UI Kit compartido.
 */
@Component({
  selector: 'siaf-apm-multi-select',
  standalone: true,
  imports: [FocoDirective, IconComponent, SelectOptionsComponent, TagComponent],
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    /* Tras cerrar con mouse, el foco DOM vuelve al disparador pero el borde
       recupera el estado neutro. El foco visible de teclado se conserva. */
    [role='combobox'][aria-expanded='false']:not([data-error='true']):focus:not(:focus-visible) {
      border-width: 1px;
      border-color: var(--sys-color-border-states-enabled);
    }
  `,
  template: `
    <div class="grid w-full min-w-0 gap-1.5">
      <div class="relative block w-full min-w-0">
        @if (floatingLabel) {
          <span
            class="absolute -top-2.5 left-3 z-[1] rounded-siaf-sm bg-surface px-siaf-xxs text-xs font-medium leading-normal"
            [class.text-[var(--sys-color-text-neutral-disabled)]]="disabled"
            [class.text-[var(--sys-color-text-feedback-danger)]]="error"
            [class.text-[var(--sys-color-text-neutral-activated)]]="!disabled && !error && open()"
            [class.text-[var(--sys-color-text-neutral-low)]]="!disabled && !error && !open()"
          >{{ label }}@if (required) { <span class="text-[var(--sys-color-text-feedback-danger)]">*</span> }</span>
        }

        <div
          class="flex min-h-10 w-full flex-wrap items-center gap-siaf-xs rounded-siaf-md px-siaf-md py-siaf-xs text-left text-sm outline-none transition"
          [class]="controlClass"
          role="combobox"
          tabindex="0"
          [attr.aria-label]="label"
          [attr.aria-expanded]="open()"
          [attr.aria-required]="required"
          [attr.aria-disabled]="disabled"
          [attr.data-error]="!!error"
          aria-haspopup="listbox"
          (click)="toggle()"
          (keydown.enter)="toggleFromKeyboard($event)"
          (keydown.space)="toggleFromKeyboard($event)"
          (keydown.escape)="close()"
        >
          @if (!hasValue) {
            <span class="flex-1 text-[var(--sys-color-text-neutral-low)]">{{ label }}@if (required) { <span class="text-[var(--sys-color-text-feedback-danger)]">*</span> }</span>
          }

          @for (option of selectedOptions; track option.value) {
            <siaf-tag
              variant="input"
              [removable]="!disabled"
              [removeLabel]="'Quitar ' + option.label"
              (removed)="remove(option.value)"
            >{{ option.label }}</siaf-tag>
          }

          <siaf-icon class="ml-auto shrink-0 text-text transition" [class.rotate-180]="open()" name="expand_more" [size]="24" aria-hidden="true" />
        </div>

        @if (open()) {
          <button
            class="fixed inset-0 z-30 cursor-default bg-transparent"
            type="button"
            data-capa-cierre
            tabindex="-1"
            aria-hidden="true"
            (mousedown)="$event.preventDefault()"
            (click)="close()"
          ></button>
          <div
            class="relative z-40 mt-siaf-xs sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+4px)] sm:mt-0"
            siafFoco
            [siafFocoAtrapar]="false"
            (siafFocoEscape)="close()"
            (siafFocoSalida)="close()"
          >
            <siaf-select-options
              [options]="menuOptions"
              [selectedValues]="selectedMenuValues"
              [multiple]="true"
              [checkboxes]="true"
              (selected)="toggleOption($event)"
            />
          </div>
        }
      </div>

      @if (error) {
        <span class="text-xs text-[var(--sys-color-text-feedback-danger)]">{{ error }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApmMultiSelectComponent {
  @Input() label = '';
  @Input() options: SelectOption[] = [];
  @Input() value: readonly string[] = [];
  @Input() required = false;
  @Input() disabled = false;
  @Input() error = '';

  @Output() readonly valueChange = new EventEmitter<string[]>();

  readonly open = signal(false);

  /** Las selecciones siempre se muestran y emiten en el orden definido por las opciones. */
  get selectedValues(): string[] {
    const selected = new Set(this.value);
    return this.options.filter((option) => selected.has(option.value)).map((option) => option.value);
  }

  get selectedOptions(): SelectOption[] {
    const selected = new Set(this.selectedValues);
    return this.options.filter((option) => selected.has(option.value));
  }

  /** Variante UI Kit: label dentro vacío; label flotante cuando existen valores. */
  get hasValue(): boolean {
    return this.selectedValues.length > 0;
  }

  get floatingLabel(): boolean {
    return this.hasValue;
  }

  /** Primera opción vacía del patrón institucional: limpia, pero no se guarda como dato. */
  get menuOptions(): SelectOption[] {
    return [{ value: '', label: 'Seleccionar' }, ...this.options.filter((option) => option.value !== '')];
  }

  /** La opción vacía refleja visualmente el estado sin selecciones. */
  get selectedMenuValues(): string[] {
    return this.selectedValues.length ? this.selectedValues : [''];
  }

  get controlClass(): string {
    if (this.disabled) {
      return 'cursor-not-allowed border border-[var(--sys-color-border-states-disabled)] bg-[var(--sys-color-bg-surfaces-disabled)] text-[var(--sys-color-text-neutral-disabled)]';
    }
    if (this.error) {
      return 'border-2 border-[var(--sys-color-border-feedback-danger)] bg-surface hover:border-[var(--sys-color-border-feedback-danger)] focus:border-[var(--sys-color-border-feedback-danger)] focus-within:border-[var(--sys-color-border-feedback-danger)] focus:outline-solid focus:outline-2 focus:outline-offset-2 focus:outline-[var(--sys-color-border-states-focus)]';
    }
    return 'border border-[var(--sys-color-border-states-enabled)] bg-surface hover:border-2 hover:border-[var(--sys-color-border-states-hover)] focus:border-2 focus:border-[var(--sys-color-border-states-focus)] focus-within:border-2 focus-within:border-[var(--sys-color-border-states-focus)]';
  }

  toggle(): void {
    if (!this.disabled) this.open.update((isOpen) => !isOpen);
  }

  toggleFromKeyboard(event: Event): void {
    event.preventDefault();
    this.toggle();
  }

  close(): void {
    this.open.set(false);
  }

  toggleOption(value: string): void {
    if (this.disabled) return;
    if (!value) {
      this.clear();
      return;
    }
    const current = new Set(this.selectedValues);
    current.has(value) ? current.delete(value) : current.add(value);
    this.emit(current);
  }

  clear(): void {
    if (this.disabled) return;
    this.emit(new Set());
  }

  remove(value: string): void {
    if (this.disabled) return;
    const current = new Set(this.selectedValues);
    current.delete(value);
    this.emit(current);
  }

  private emit(values: ReadonlySet<string>): void {
    this.valueChange.emit(this.options.filter((option) => values.has(option.value)).map((option) => option.value));
  }
}
