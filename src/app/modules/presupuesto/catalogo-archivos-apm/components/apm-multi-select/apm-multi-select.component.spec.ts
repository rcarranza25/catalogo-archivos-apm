import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApmMultiSelectComponent } from './apm-multi-select.component';

describe('ApmMultiSelectComponent', () => {
  let fixture: ComponentFixture<ApmMultiSelectComponent>;
  let component: ApmMultiSelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ApmMultiSelectComponent] }).compileComponents();
    fixture = TestBed.createComponent(ApmMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', [
      { value: 'anio_1', label: 'Anio_1' },
      { value: 'anio_2', label: 'Anio_2' },
      { value: 'anio_3', label: 'Anio_3' },
    ]);
    fixture.componentRef.setInput('value', ['anio_3', 'anio_1', 'anio_1']);
    fixture.detectChanges();
  });

  it('muestra y emite las selecciones sin duplicados en el orden de las opciones', () => {
    expect(component.selectedValues).toEqual(['anio_1', 'anio_3']);

    let emitted: string[] | undefined;
    component.valueChange.subscribe((value) => emitted = value);
    component.toggleOption('anio_2');

    expect(emitted).toEqual(['anio_1', 'anio_2', 'anio_3']);
  });

  it('incluye la opción Seleccionar y esta limpia todos los valores', () => {
    expect(component.menuOptions.map((option) => option.label)).toEqual(['Seleccionar', 'Anio_1', 'Anio_2', 'Anio_3']);
    expect(component.selectedMenuValues).toEqual(['anio_1', 'anio_3']);

    let emitted: string[] | undefined;
    component.valueChange.subscribe((value) => emitted = value);

    component.toggleOption('');
    expect(emitted).toEqual([]);
  });

  it('muestra Seleccionar como encabezado informativo sin checkbox cuando se configura', () => {
    fixture.componentRef.setInput('showSelectionHeader', true);
    component.open.set(true);
    fixture.detectChanges();

    expect(component.selectableOptions.map((option) => option.label)).toEqual(['Anio_1', 'Anio_2', 'Anio_3']);
    expect(fixture.nativeElement.querySelector('[data-selection-header]')?.textContent?.trim()).toBe('Seleccionar');
    expect(fixture.nativeElement.querySelectorAll('[data-selection-header] input[type="checkbox"]').length).toBe(0);
  });

  it('retira una selección mediante su tag', () => {
    let emitted: string[] | undefined;
    component.valueChange.subscribe((value) => emitted = value);

    component.remove('anio_1');

    expect(emitted).toEqual(['anio_3']);
  });

  it('muestra Label text vacío y cambia a Input text al existir selección', () => {
    fixture.componentRef.setInput('label', 'Montos a revisar');
    fixture.componentRef.setInput('value', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="combobox"] > span.flex-1')?.textContent?.replace('*', '').trim()).toBe('Montos a revisar');
    expect(fixture.nativeElement.querySelector('span.absolute')).toBeNull();

    fixture.componentRef.setInput('value', ['anio_1']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('span.absolute')?.textContent?.replace('*', '').trim()).toBe('Montos a revisar');
  });

  it('puede abrir el panel como capa fija para una grilla con desbordamiento', () => {
    fixture.componentRef.setInput('panelFixed', true);
    fixture.componentRef.setInput('panelMinWidth', 360);

    component.toggle();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('siaf-select-options')?.parentElement as HTMLElement;
    expect(panel.classList.contains('fixed')).toBeTrue();
    expect(panel.classList.contains('overflow-y-auto')).toBeTrue();
  });
});
