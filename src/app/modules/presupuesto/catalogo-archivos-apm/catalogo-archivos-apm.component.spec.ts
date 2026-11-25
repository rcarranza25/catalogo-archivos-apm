import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CatalogoArchivosApmComponent } from './catalogo-archivos-apm.component';
import { CatalogoArchivosApmSnackbarService } from './catalogo-archivos-apm-snackbar.service';

describe('CatalogoArchivosApmComponent — firmantes', () => {
  let fixture: ComponentFixture<CatalogoArchivosApmComponent>;
  let component: CatalogoArchivosApmComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoArchivosApmComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogoArchivosApmComponent);
    component = fixture.componentInstance;
    component.borrador.update((archivo) => ({ ...archivo, firmantes: [] }));
  });

  function registrarFirmante(nombre: string, orden = ''): void {
    component.agregarFirmante();
    component.actualizarFirmante('firmante', nombre);
    component.actualizarFirmante('orden', orden);
    component.aceptarFirmante();
  }

  it('registra un firmante nuevo con documento firmado en No', () => {
    registrarFirmante('Loli Jhover Chavez', '1');

    expect(component.firmantesVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, firmante: 'Loli Jhover Chavez', orden: '1', documentoFirmado: false }),
    ]);
  });

  it('muestra Documento firmado como etiquetas institucionales no interactivas', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [
        { id: 1, codigo: 1, firmante: 'Loli Jhover Chavez', orden: '', documentoFirmado: false },
        { id: 2, codigo: 2, firmante: 'Cinthya Bravo', orden: '', documentoFirmado: true },
      ],
    }));
    component.pestana.set('firmantes');
    fixture.detectChanges();

    const etiquetas = Array.from(fixture.nativeElement.querySelectorAll('siaf-status-tag')) as HTMLElement[];
    expect(etiquetas.map((etiqueta) => etiqueta.textContent?.trim())).toEqual(['Pendiente de firma', 'Firmado']);
    expect(etiquetas.map((etiqueta) => etiqueta.querySelector('span')?.classList.contains('h-6'))).toEqual([true, true]);
    expect(fixture.nativeElement.querySelector('[aria-label="Documento firmado"]')).toBeNull();
  });

  it('mantiene el estado vacío hasta que se pulse Añadir y crea la primera fila en blanco', () => {
    component.nuevo();

    expect(component.firmantesVista()).toEqual([]);
    expect(component.firmanteEsNuevo()).toBeFalse();
    expect(component.firmantesRequierenScrollVertical()).toBeFalse();

    component.agregarFirmante();

    expect(component.firmanteEsNuevo()).toBeTrue();
    expect(component.firmanteBorrador()).toEqual(
      jasmine.objectContaining({ codigo: 1, firmante: '', orden: '', documentoFirmado: false }),
    );
    expect(component.firmantesRequierenScrollVertical()).toBeFalse();
  });

  it('al abrir un archivo sin firmantes no muestra ninguna fila hasta pulsar Añadir', () => {
    const anexoInicial = component.archivos().find((archivo) => archivo.id === 101)!;

    component.abrir(anexoInicial);
    component.pestana.set('firmantes');
    fixture.detectChanges();

    expect(component.firmantesVista()).toEqual([]);
    expect(component.firmanteEsNuevo()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[aria-label="Tabla de firmantes"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Aún no se han agregado firmantes. Haga clic en Añadir para registrar el primero.',
    );

    component.agregarFirmante();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Tabla de firmantes"]')).not.toBeNull();
    expect(component.firmanteBorrador()).toEqual(
      jasmine.objectContaining({ codigo: 1, firmante: '', orden: '', documentoFirmado: false }),
    );
  });

  it('activa el scroll vertical de Firmantes recién desde la quinta fila visible', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [
        { id: 1, codigo: 1, firmante: 'Loli Jhover Chavez', orden: '', documentoFirmado: false },
        { id: 2, codigo: 2, firmante: 'Cinthya Bravo', orden: '', documentoFirmado: false },
        { id: 3, codigo: 3, firmante: 'Sergio Espinoza', orden: '', documentoFirmado: false },
        { id: 4, codigo: 4, firmante: 'Patricia CIME', orden: '', documentoFirmado: false },
      ],
    }));

    expect(component.firmantesRequierenScrollVertical()).toBeFalse();

    component.agregarFirmante();

    expect(component.firmantesRequierenScrollVertical()).toBeTrue();
  });

  it('ubica el scroll vertical de Firmantes únicamente en el cuerpo de la grilla', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir(apmGastos);
    component.pestana.set('firmantes');
    fixture.detectChanges();

    const grilla = fixture.nativeElement.querySelector('[aria-label="Tabla de firmantes"]') as HTMLElement;
    const cuerpo = grilla.querySelector('.apm-firmantes-table-body') as HTMLElement;
    expect(grilla.querySelectorAll('thead')).toHaveSize(1);
    expect(cuerpo.classList.contains('apm-firmantes-table-body--vertical')).toBeFalse();

    component.agregarFirmante();
    fixture.detectChanges();

    expect(cuerpo.classList.contains('apm-firmantes-table-body--vertical')).toBeTrue();
  });

  it('conserva visibles los firmantes previamente guardados al abrir un registro', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: ['Responsable de presupuesto'],
    }));

    expect(component.firmantesVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, firmante: 'Responsable de presupuesto', documentoFirmado: false }),
    ]);
  });

  it('muestra contadores derivados de las colecciones del borrador en las pestañas de configuración', () => {
    component.nuevo();
    expect(component.tabs.map((tab) => tab.label)).toEqual([
      'ATRIBUTOS (0)',
      'REGLAS SUMARIZADAS (0)',
      'REFERENCIAS CRUZADAS (0)',
      'FIRMANTES (0)',
    ]);

    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: ['PLIEGO'],
      reglas: [{ id: 1, operador: '3 - Igual (=)' }],
      referencias: ['14 - Ingresos por Fuente'],
      firmantes: [{ id: 1, codigo: 1, firmante: 'Loli Jhover Chavez', orden: '1', documentoFirmado: true }],
    }));

    expect(component.tabs.map((tab) => tab.label)).toEqual([
      'ATRIBUTOS (1)',
      'REGLAS SUMARIZADAS (1)',
      'REFERENCIAS CRUZADAS (1)',
      'FIRMANTES (1)',
    ]);
  });

  it('cancela una fila nueva y conserva los firmantes aceptados', () => {
    registrarFirmante('Cinthya Bravo');
    component.agregarFirmante();
    component.actualizarFirmante('firmante', 'Sergio Espinoza');
    component.cancelarFirmante();

    expect(component.firmantesVista().map((firmante) => firmante.firmante)).toEqual(['Cinthya Bravo']);
  });

  it('muestra MSG-010 al aceptar un orden duplicado y conserva la fila editable', () => {
    registrarFirmante('Patricia CIME', '1');
    component.agregarFirmante();
    component.actualizarFirmante('firmante', 'Peggy Alcón');
    component.actualizarFirmante('orden', '1');

    expect(component.firmanteValido()).toBeTrue();
    component.aceptarFirmante();

    expect(component.errorOrdenFirmante()).toBe('Ya existe un firmante con el orden 1 en este archivo');
    expect(component.firmanteEsNuevo()).toBeTrue();
    expect(component.firmanteBorrador()).toEqual(jasmine.objectContaining({ firmante: 'Peggy Alcón', orden: '1' }));
    component.cancelarFirmante();

    registrarFirmante('Peggy Alcón');
    expect(component.configuracionFirmantesValida()).toBeFalse();
  });

  it('muestra MSG-009 al aceptar un firmante duplicado sin excluirlo del selector', () => {
    registrarFirmante('Loli Jhover Chavez', '1');
    component.agregarFirmante();
    component.actualizarFirmante('firmante', 'Loli Jhover Chavez');
    component.actualizarFirmante('orden', '2');
    component.aceptarFirmante();

    expect(component.errorFirmante()).toBe('El usuario Loli Jhover Chavez ya figura como firmante de este archivo');
    expect(component.firmanteEsNuevo()).toBeTrue();
    expect(component.firmantesDisponibles.map((opcion) => opcion.value)).toContain('Loli Jhover Chavez');
  });

  it('permite conservar el propio firmante y orden al editarlo', () => {
    registrarFirmante('Cinthya Bravo', '2');
    const firmado = component.firmantesVista()[0];

    component.actualizarFirmanteFila(firmado, 'orden', '2');
    component.actualizarFirmanteFila(firmado, 'firmante', 'Cinthya Bravo');
    component.aceptarCambiosFirmante(firmado);

    expect(component.errorFirmanteFila(firmado)).toBe('');
    expect(component.errorOrdenFirmanteFila(firmado)).toBe('');
  });

  it('no permite editar ni solicitar eliminar un firmante con documento firmado', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [{ id: 1, codigo: 1, firmante: 'Cristina Mendoza', orden: '', documentoFirmado: true }],
    }));
    const firmado = component.firmantesVista()[0];

    component.editarFirmante(firmado);
    component.solicitarEliminarFirmante(firmado);

    expect(component.firmanteFilaAbierta()).toBeFalse();
    expect(component.confirmarEliminarFirmante()).toBeNull();
  });

  it('muestra MSG-037 y conserva el firmante si se cierra su confirmación de eliminación', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [{ id: 1, codigo: 1, firmante: 'Loli Jhover Chavez', orden: '', documentoFirmado: false }],
    }));
    component.pestana.set('firmantes');
    const firmante = component.firmantesVista()[0];
    component.solicitarEliminarFirmante(firmante);
    fixture.detectChanges();

    const modales = fixture.nativeElement.querySelectorAll('siaf-modal') as NodeListOf<HTMLElement>;
    const modal = Array.from(modales).find((element) => element.textContent?.includes('¿Está seguro(a) de eliminar al firmante?'))!;
    expect(modal.textContent).toContain('El firmante se retirará de la lista del archivo.');

    component.confirmarEliminarFirmante.set(null);
    expect(component.firmantesVista()).toHaveSize(1);
  });

  it('mantiene una fila aceptada editable y solo guarda sus cambios al confirmar', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [{ id: 1, codigo: 1, firmante: 'Loli Jhover Chavez', orden: '1', documentoFirmado: false }],
    }));
    const firmado = component.firmantesVista()[0];

    component.actualizarFirmanteFila(firmado, 'orden', '2');

    expect(component.firmanteTieneCambios(firmado)).toBeTrue();
    expect(component.firmantesVista()[0].orden).toBe('1');

    component.aceptarCambiosFirmante(firmado);

    expect(component.firmantesVista()[0].orden).toBe('2');
    expect(component.firmanteTieneCambios(component.firmantesVista()[0])).toBeFalse();
  });

  it('descarta los cambios de una fila editable al cancelar', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [{ id: 1, codigo: 1, firmante: 'Cinthya Bravo', orden: '', documentoFirmado: false }],
    }));
    const firmado = component.firmantesVista()[0];

    component.actualizarFirmanteFila(firmado, 'firmante', 'Sergio Espinoza');
    component.cancelarCambiosFirmante(firmado.id);

    expect(component.firmantesVista()[0].firmante).toBe('Cinthya Bravo');
    expect(component.firmanteTieneCambios(component.firmantesVista()[0])).toBeFalse();
  });

  it('muestra solo Cancelar y Aceptar en la fila de Firmantes que está en edición', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      firmantes: [{ id: 1, codigo: 1, firmante: 'Cinthya Bravo', orden: '1', documentoFirmado: false }],
    }));
    component.pestana.set('firmantes');
    const firmante = component.firmantesVista()[0];
    component.actualizarFirmanteFila(firmante, 'orden', '2');
    fixture.detectChanges();

    const fila = fixture.nativeElement.querySelector('[data-firmante-id="1"]') as HTMLElement;
    expect(fila.querySelector('[aria-label="Cancelar cambios de firmante"]')).not.toBeNull();
    expect(fila.querySelector('[aria-label="Aceptar cambios de firmante"]')).not.toBeNull();
    expect(fila.querySelector('[aria-label="Eliminar firmante"]')).toBeNull();

    component.cancelarCambiosFirmante(firmante.id);
    fixture.detectChanges();

    expect(fila.querySelector('[aria-label="Cancelar cambios de firmante"]')).toBeNull();
    expect(fila.querySelector('[aria-label="Aceptar cambios de firmante"]')).toBeNull();
    expect(fila.querySelector('[aria-label="Eliminar firmante"]')).not.toBeNull();
  });

  it('agrega una referencia cruzada válida sin alterar los atributos de origen', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [],
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: ['UNIDAD_EJECUTORA'], nombre: 'UNIDAD_EJECUTORA', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' }],
    }));

    component.agregarReferencia();
    component.actualizarReferenciaNueva('catalogoRelacional', '15 - Objeto del Gasto por Fuente');
    component.actualizarReferenciaNueva('atributosComunes', ['UNIDAD_EJECUTORA']);
    component.aceptarReferenciaNueva();

    expect(component.referenciasVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['UNIDAD_EJECUTORA'] }),
    ]);
    expect(component.atributosVista()[0].nombre).toBe('UNIDAD_EJECUTORA');
  });

  it('confirma o descarta los cambios de una referencia cruzada editable', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    const referencia = component.referenciasVista()[0];

    component.actualizarReferenciaFila(referencia, 'atributosComunes', ['FUENTE']);
    component.cancelarCambiosReferencia(referencia.id);
    expect(component.referenciasVista()[0].atributosComunes).toEqual(['PLIEGO']);

    component.actualizarReferenciaFila(referencia, 'atributosComunes', ['FUENTE']);
    component.aceptarCambiosReferencia(referencia);
    expect(component.referenciasVista()[0].atributosComunes).toEqual(['FUENTE']);
  });

  it('muestra solo X y ✓ durante la edición de una referencia, y la papelera en lectura', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    component.pestana.set('referencias');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[aria-label="Eliminar referencia cruzada"]')).toHaveSize(1);
    expect(fixture.nativeElement.querySelector('[aria-label="Cancelar cambios de referencia cruzada"]')).toBeNull();

    const referencia = component.referenciasVista()[0];
    component.actualizarReferenciaFila(referencia, 'atributosComunes', ['FUENTE']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Eliminar referencia cruzada"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Cancelar cambios de referencia cruzada"]')).toHaveSize(1);
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Aceptar cambios de referencia cruzada"]')).toHaveSize(1);

    component.cancelarCambiosReferencia(referencia.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[aria-label="Eliminar referencia cruzada"]')).toHaveSize(1);
  });

  it('muestra MSG-036 y conserva la referencia si se cierra su confirmación de eliminación', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    component.pestana.set('referencias');
    const referencia = component.referenciasVista()[0];
    component.solicitarEliminarReferencia(referencia);
    fixture.detectChanges();

    const modales = fixture.nativeElement.querySelectorAll('siaf-modal') as NodeListOf<HTMLElement>;
    const modal = Array.from(modales).find((element) => element.textContent?.includes('¿Está seguro(a) de eliminar la referencia cruzada?'))!;
    expect(modal.textContent).toContain('¿Está seguro(a) de eliminar la referencia cruzada?');
    expect(modal.textContent).toContain('La referencia se retirará de la lista del archivo.');

    component.confirmarEliminarReferencia.set(null);
    expect(component.referenciasVista()).toHaveSize(1);
  });

  it('RN-REF-006 rechaza un catálogo relacional duplicado y permite corregirlo', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    component.agregarReferencia();
    component.actualizarReferenciaNueva('catalogoRelacional', '15 - Objeto del Gasto por Fuente');
    component.actualizarReferenciaNueva('atributosComunes', ['FUENTE']);
    component.aceptarReferenciaNueva();

    expect(component.referenciasVista()).toHaveSize(1);
    expect(component.referenciaEsNueva()).toBeTrue();
    expect(component.tieneErrorCatalogoRelacionalNueva()).toBeTrue();
    expect(component.mensajeAlertaReferenciaDuplicada()).toBe(
      'Ya existe una referencia cruzada con el catálogo relacional 15 - Objeto del Gasto por Fuente en este archivo.',
    );
    expect(component.errorCatalogoRelacionalNueva()).toBe('');
    expect(component.referenciaNuevaValida()).toBeFalse();
    component.pestana.set('referencias');
    fixture.detectChanges();
    const encabezados = fixture.nativeElement.querySelectorAll('h3') as NodeListOf<HTMLElement>;
    const titulo = Array.from(encabezados)
      .find((element) => element.textContent?.trim() === 'Referencias cruzadas') as HTMLElement;
    expect(titulo.nextElementSibling?.tagName).toBe('SIAF-ALERT');
    expect(titulo.nextElementSibling?.textContent).toContain('Catálogo relacional duplicado');
    expect(titulo.nextElementSibling?.textContent).toContain('15 - Objeto del Gasto por Fuente');

    component.actualizarReferenciaNueva('catalogoRelacional', '14 - Ingresos por Fuente');
    expect(component.errorCatalogoRelacionalNueva()).toBe('');
    expect(component.referenciaNuevaValida()).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('siaf-alert')).toBeNull();
    component.aceptarReferenciaNueva();

    expect(component.referenciasVista()).toHaveSize(2);
    expect(component.referenciaEsNueva()).toBeFalse();
  });

  it('RN-REF-006 excluye la referencia actual durante la edición', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    const referencia = component.referenciasVista()[0];
    component.actualizarReferenciaFila(referencia, 'atributosComunes', ['FUENTE']);
    component.aceptarCambiosReferencia(referencia);

    expect(component.errorCatalogoRelacionalFila(referencia)).toBe('');
    expect(component.referenciasVista()[0].atributosComunes).toEqual(['FUENTE']);
  });

  it('muestra los alias históricos con el identificador técnico sin alterar su valor', () => {
    component.borrador.update((archivo) => ({ ...archivo, atributos: ['Fuente de financiamiento'] }));

    expect(component.identificadorTecnico('Objeto del gasto')).toBe('objeto_gasto');
    expect(component.identificadorTecnico('ANO_1')).toBe('Anio_1');
    expect(component.opcionesAtributosComunesReferencia()).toEqual([
      { value: 'Fuente de financiamiento', label: 'fuente' },
    ]);
  });

  it('ofrece en Referencias cruzadas solo los atributos de Texto del Anexo actual', () => {
    const anexo = component.archivos().find((archivo) => archivo.id === 101)!;
    component.abrir(anexo);

    expect(component.opcionesAtributosComunesReferencia()).toEqual([
      { value: 'PLIEGO', label: 'pliego' },
      { value: 'UNIDAD_EJECUTORA', label: 'unidad_ejecutora' },
      { value: 'FUENTE', label: 'fuente' },
      { value: 'CATEGORIA_GASTO', label: 'categoria_gasto' },
      { value: 'OBJETO_GASTO', label: 'objeto_gasto' },
      { value: 'GENERICA', label: 'generica' },
      { value: 'SUBGENERICA', label: 'subgenerica' },
    ]);
  });

  it('excluye los atributos Monto de APM Gastos en Referencias cruzadas', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir(apmGastos);

    expect(component.opcionesAtributosComunesReferencia()).toEqual([
      { value: 'PLIEGO', label: 'pliego' },
      { value: 'FUENTE', label: 'fuente' },
      { value: 'CATEGORIA_GASTO', label: 'categoria_gasto' },
    ]);
  });

  it('no ofrece atributos comunes para un archivo nuevo sin atributos', () => {
    component.nuevo();

    expect(component.opcionesAtributosComunesReferencia()).toEqual([]);
  });

  it('RN-SUM-008 no ofrece atributos comunes cuando el archivo padre no tiene atributos', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    const piePagina = component.archivos().find((archivo) => archivo.id === 104)!;
    component.abrir(apmGastos);
    component.agregarRegla();
    component.actualizarRegla('archivoPadre', String(piePagina.id));
    component.actualizarRegla('nivelAgregacion', 'Pliego');
    component.actualizarRegla('operador', '3 - Igual (=)');
    component.actualizarRegla('atributosComunes', ['PLIEGO']);
    component.actualizarRegla('montosARevisar', ['ASIGNACION']);

    expect(component.opcionesAtributosComunesRegla()).toEqual([]);
    expect(component.opcionesMontosARevisarRegla()).toEqual([]);
    expect(component.opcionesNivelesAgregacionRegla()).toEqual([]);
    expect(component.mostrarAlertaCompatibilidadRegla()).toBeTrue();
    expect(component.descripcionAlertaCompatibilidadRegla()).toContain('ni montos compatibles');
    expect(component.reglaBorrador().atributosComunes).toEqual([]);
    expect(component.reglaValida()).toBeFalse();
  });

  it('RN-SUM-008 ofrece solo atributos Texto coincidentes por nombre y clasificador', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    const anexo = component.archivos().find((archivo) => archivo.id === 101)!;
    component.abrir(apmGastos);
    component.agregarRegla();
    component.actualizarRegla('archivoPadre', String(anexo.id));

    expect(component.opcionesAtributosComunesRegla()).toEqual([
      { value: 'PLIEGO', label: 'pliego' },
      { value: 'FUENTE', label: 'fuente' },
      { value: 'CATEGORIA_GASTO', label: 'categoria_gasto' },
    ]);
    expect(component.opcionesMontosARevisarRegla()).toEqual([]);
    expect(component.mostrarAlertaCompatibilidadRegla()).toBeTrue();
    expect(component.descripcionAlertaCompatibilidadRegla()).toContain('no tiene montos compatibles');
  });

  it('RN-SUM-008 oculta la alerta cuando existen atributos y montos compatibles', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    const padreCompatible = structuredClone(apmGastos);
    padreCompatible.id = 990;
    padreCompatible.codigo = '90';
    component.archivos.update((archivos) => [...archivos, padreCompatible]);
    component.abrir(apmGastos);
    component.agregarRegla();
    component.actualizarRegla('archivoPadre', String(padreCompatible.id));

    expect(component.opcionesAtributosComunesRegla()).toHaveSize(3);
    expect(component.opcionesMontosARevisarRegla()).toEqual([{ value: 'ASIGNACION', label: 'asignacion' }]);
    expect(component.opcionesNivelesAgregacionRegla()).toEqual(component.nivelesAgregacion);
    expect(component.mostrarAlertaCompatibilidadRegla()).toBeFalse();
  });

  it('muestra una confirmación única al agregar una regla sumarizada', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    const padreCompatible = structuredClone(apmGastos);
    padreCompatible.id = 991;
    padreCompatible.codigo = '91';
    component.archivos.update((archivos) => [...archivos, padreCompatible]);
    component.abrir(apmGastos);
    component.agregarRegla();
    component.actualizarRegla('archivoPadre', String(padreCompatible.id));
    component.actualizarRegla('nivelAgregacion', 'Pliego');
    component.actualizarRegla('operador', '3 - Igual (=)');
    component.actualizarRegla('atributosComunes', ['PLIEGO']);
    component.actualizarRegla('montosARevisar', ['ASIGNACION']);

    component.guardarRegla();

    expect(component.panelReglaAbierto()).toBeFalse();
    expect(component.snack()).toBeTrue();
    expect(component.mensajeSnack()).toBe('El registro de regla sumarizada se agregó con éxito');
  });

  it('muestra selección general, edición y paginación superior en la grilla de reglas', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      reglas: [{ id: 1, codigo: 1, archivoPadre: '104', nivelAgregacion: 'Pliego', operador: '3 - Igual (=)', atributosComunes: [], montosARevisar: [] }],
    }));
    component.pestana.set('reglas');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Seleccionar todas las reglas"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('siaf-pagination[position="Top"]')).not.toBeNull();

    component.alternarSeleccionRegla(1, true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Editar regla"]')).not.toBeNull();
  });

  it('CONF-07 conserva las reglas al cancelar la eliminación', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      reglas: [{ id: 1, codigo: 1, archivoPadre: '104', nivelAgregacion: 'Pliego', operador: '3 - Igual (=)', atributosComunes: [], montosARevisar: [] }],
    }));
    component.alternarSeleccionRegla(1, true);
    component.confirmarEliminarReglas.set(true);

    component.confirmarEliminarReglas.set(false);

    expect(component.reglasVista()).toHaveSize(1);
    expect(component.reglasVista()[0].codigo).toBe(1);
  });

  it('RN-SUM-014 elimina del borrador las reglas seleccionadas y no reutiliza su código', () => {
    const archivo = component.archivos().find((item) => item.id === 103)!;
    component.abrir({
      ...archivo,
      reglas: [
        { id: 1, codigo: 1, archivoPadre: '104', nivelAgregacion: 'Pliego', operador: '3 - Igual (=)', atributosComunes: [], montosARevisar: [] },
        { id: 2, codigo: 2, archivoPadre: '104', nivelAgregacion: 'Pliego', operador: '3 - Igual (=)', atributosComunes: [], montosARevisar: [] },
      ],
    });
    component.alternarSeleccionRegla(2, true);
    component.confirmarEliminarReglas.set(true);

    component.eliminarReglasSeleccionadas();

    expect(component.reglasVista().map((regla) => regla.codigo)).toEqual([1]);
    expect(component.reglasSeleccionadas().size).toBe(0);
    expect(component.confirmarEliminarReglas()).toBeFalse();

    component.agregarRegla();
    expect(component.reglaBorrador().codigo).toBe(3);
  });

  it('RN-SUM-008 elimina selecciones incompatibles al cambiar el archivo padre', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir(apmGastos);
    component.agregarRegla();
    component.actualizarRegla('archivoPadre', '101');
    component.actualizarRegla('atributosComunes', ['PLIEGO', 'FUENTE']);
    component.actualizarRegla('montosARevisar', ['ASIGNACION']);
    component.actualizarRegla('archivoPadre', '104');

    expect(component.reglaBorrador().atributosComunes).toEqual([]);
    expect(component.reglaBorrador().montosARevisar).toEqual([]);
    expect(component.reglaBorrador().nivelAgregacion).toBe('');
    expect(component.opcionesAtributosComunesRegla()).toEqual([]);
  });

  it('RN-SUM-008 depura atributos incompatibles al editar una regla existente', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir({
      ...apmGastos,
      reglas: [{
        id: 1, codigo: 1, archivoPadre: '104', nivelAgregacion: 'Pliego',
        operador: '3 - Igual (=)', atributosComunes: ['PLIEGO'], montosARevisar: ['ASIGNACION'],
      }],
    });
    component.reglasSeleccionadas.set(new Set([1]));
    component.editarReglaSeleccionada();

    expect(component.reglaBorrador().atributosComunes).toEqual([]);
    expect(component.reglaValida()).toBeFalse();
  });

  it('reconoce atributos de Texto incorporados al borrador y no depende del catálogo relacional', () => {
    component.nuevo();
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [
        { id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
        { id: 2, codigo: 2, orden: '2', columnas: [], nombre: 'ASIGNACION', destino: '2 - Detalle JSON', tipoDato: 'Monto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: true, autogenerado: false, derivadoPor: '' },
      ],
    }));
    component.agregarReferencia();

    component.actualizarReferenciaNueva('catalogoRelacional', '14 - Ingresos por Fuente');
    expect(component.opcionesAtributosComunesReferencia()).toEqual([{ value: 'PLIEGO', label: 'pliego' }]);

    component.actualizarReferenciaNueva('catalogoRelacional', '15 - Objeto del Gasto por Fuente');
    expect(component.opcionesAtributosComunesReferencia()).toEqual([{ value: 'PLIEGO', label: 'pliego' }]);
  });

  it('retira de las referencias los atributos que dejan de ser Texto', () => {
    const anexo = component.archivos().find((archivo) => archivo.id === 101)!;
    component.abrir(anexo);
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    const pliego = component.atributosVista().find((atributo) => atributo.nombre === 'PLIEGO')!;
    component.editandoAtributo.set(true);
    component.atributoBorrador.set({ ...pliego, tipoDato: 'Monto' });

    component.guardarAtributo();

    expect(component.referenciasVista()[0].atributosComunes).toEqual([]);
  });

  it('mantiene el identificador técnico interno al editar su etiqueta visual', () => {
    component.atributoBorrador.set({
      id: 1, codigo: 1, orden: '', columnas: [], nombre: 'OBJETO_GASTO', destino: '', tipoDato: '', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: false, multianual: false, autogenerado: false, derivadoPor: '',
    });

    component.actualizarNombreAtributo('objeto_gasto');

    expect(component.atributoBorrador().nombre).toBe('OBJETO_GASTO');
  });

  it('asigna ASIGNACION al seleccionar columnas anuales en un atributo nuevo', () => {
    component.atributoBorrador.set({
      id: 1, codigo: 1, orden: '', columnas: [], nombre: '', destino: '', tipoDato: '', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: false, multianual: false, autogenerado: false, derivadoPor: '',
    });

    component.seleccionarColumnas(['ANO_1', 'ANO_2', 'ANO_3']);

    expect(component.atributoBorrador().nombre).toBe('ASIGNACION');
  });

  it('RN-ATR-019 impide registrar un atributo activo con Orden duplicado y conserva el panel', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' }],
    }));
    component.editandoAtributo.set(false);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '1', columnas: [], nombre: 'FUENTE', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    component.guardarAtributo();

    expect(component.errorOrdenAtributo()).toBe('Ya existe un atributo con el orden 1 en este archivo');
    expect(component.panelAtributoAbierto()).toBeTrue();
    expect(component.atributoBorrador().nombre).toBe('FUENTE');
    expect(component.atributosVista()).toHaveSize(1);
  });

  it('RN-ATR-019 permite conservar el propio Orden durante la edición', () => {
    const atributo = { id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' };
    component.borrador.update((archivo) => ({ ...archivo, atributos: [atributo] }));
    component.editandoAtributo.set(true);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set({ ...atributo, nombre: 'FUENTE' });

    component.guardarAtributo();

    expect(component.errorOrdenAtributo()).toBe('');
    expect(component.panelAtributoAbierto()).toBeFalse();
    expect(component.atributosVista()[0].nombre).toBe('FUENTE');
  });

  it('RN-ATR-019 no bloquea un Orden utilizado únicamente por un atributo inactivo', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '', estado: 'Inactivo' } as any],
    }));
    component.editandoAtributo.set(false);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '1', columnas: [], nombre: 'FUENTE', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    component.guardarAtributo();

    expect(component.errorOrdenAtributo()).toBe('');
    expect(component.atributosVista()).toHaveSize(2);
  });

  it('RN-ATR-020 impide registrar un Nombre del Campo duplicado al normalizar espacios', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' }],
    }));
    component.editandoAtributo.set(false);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '2', columnas: [], nombre: ' PLIEGO ', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    component.guardarAtributo();

    expect(component.errorNombreAtributo()).toBe('Ya existe un atributo con el nombre de campo  PLIEGO  en este archivo');
    expect(component.panelAtributoAbierto()).toBeTrue();
    expect(component.atributoBorrador().nombre).toBe(' PLIEGO ');
    expect(component.atributosVista()).toHaveSize(1);

    component.actualizarNombreAtributo('FUENTE');
    expect(component.errorNombreAtributo()).toBe('');
  });

  it('RN-ATR-020 permite conservar el propio Nombre del Campo durante la edición', () => {
    const atributo = { id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' };
    component.borrador.update((archivo) => ({ ...archivo, atributos: [atributo] }));
    component.editandoAtributo.set(true);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set(structuredClone(atributo));

    component.guardarAtributo();

    expect(component.errorNombreAtributo()).toBe('');
    expect(component.panelAtributoAbierto()).toBeFalse();
  });

  it('RN-ATR-020 no bloquea un Nombre del Campo utilizado únicamente por un atributo inactivo', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '', estado: 'Inactivo' } as any],
    }));
    component.editandoAtributo.set(false);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '2', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    component.guardarAtributo();

    expect(component.errorNombreAtributo()).toBe('');
    expect(component.atributosVista()).toHaveSize(2);
  });

  it('ofrece en Columna Excel solo las opciones no asignadas a otro atributo activo', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: ['FUENTE'], nombre: 'FUENTE', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' }],
    }));
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '2', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    expect(component.opcionesColumnasAtributo().some((opcion) => opcion.value === 'FUENTE')).toBeFalse();

    component.atributoBorrador.set({ ...component.atributosVista()[0] });
    expect(component.opcionesColumnasAtributo().some((opcion) => opcion.value === 'FUENTE')).toBeTrue();
  });

  it('impide aceptar una Columna Excel duplicada y mantiene abierto el side panel', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: ['FUENTE'], nombre: 'FUENTE', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' }],
    }));
    component.editandoAtributo.set(false);
    component.panelAtributoAbierto.set(true);
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '2', columnas: ['FUENTE'], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    component.guardarAtributo();

    expect(component.panelAtributoAbierto()).toBeTrue();
    expect(component.atributosVista()).toHaveSize(1);
  });

  it('vuelve a ofrecer una Columna Excel asignada solo a un atributo inactivo', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: ['FUENTE'], nombre: 'FUENTE', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '', estado: 'Inactivo' } as any],
    }));
    component.atributoBorrador.set({ id: 2, codigo: 2, orden: '2', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' });

    expect(component.opcionesColumnasAtributo().some((opcion) => opcion.value === 'FUENTE')).toBeTrue();
  });

  it('ofrece el atributo de monto y no sus columnas de Excel como monto a revisar', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      atributos: [
        { id: 1, codigo: 1, orden: '1', columnas: ['ANO_1', 'ANO_2', 'ANO_3'], nombre: 'ASIGNACION', destino: '2 - Detalle JSON', tipoDato: 'Monto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
        { id: 2, codigo: 2, orden: '2', columnas: ['PLIEGO'], nombre: 'PLIEGO', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
      ],
    }));

    expect(component.opcionesMontosARevisar()).toEqual([
      { value: 'ASIGNACION', label: 'asignacion' },
    ]);
  });

  it('RN-GEN-007 propone Techo para APM de Gastos y conserva la asignación editable', () => {
    component.cambiarTipo('1 - APM de Gastos');

    expect(component.tipoAsignacion()).toBe('Techo');
    expect(component.tipoAsignacionHabilitado()).toBeTrue();

    component.cambiarTipoAsignacion('Piso');
    expect(component.tipoAsignacion()).toBe('Piso');
  });

  it('exige Tipo de Control para APM Gastos y para ambos escenarios de Anexo', () => {
    prepararArchivoParaValidar({ tipo: '1 - APM de Gastos' });
    component.tipoAsignacion.set('');

    expect(component.tipoAsignacionHabilitado()).toBeTrue();
    expect(component.camposObligatoriosInvalidos()).toContain('tipoAsignacion');
    expect(component.puedeGrabar()).toBeFalse();

    prepararArchivoParaValidar({ tipo: '2 - Anexo', nombre: 'Anexo 2 Genérica' });
    component.tipoAsignacion.set('');

    expect(component.camposObligatoriosInvalidos()).toContain('tipoAsignacion');
    expect(component.puedeGrabar()).toBeFalse();

    prepararArchivoParaValidar({ tipo: '2 - Anexo', nombre: 'Anexo 2 Específica' });
    component.tipoAsignacion.set('');

    expect(component.camposObligatoriosInvalidos()).toContain('tipoAsignacion');
    expect(component.puedeGrabar()).toBeFalse();
  });

  it('permite grabar Pie de página sin Tipo de Control', () => {
    prepararArchivoParaValidar({ tipo: '3 - Pie de Página', nombre: 'Pie de página de validación' });
    component.tipoAsignacion.set('');
    component.prefijo.set('');
    component.orden.set('');

    expect(component.tipoAsignacionHabilitado()).toBeFalse();
    expect(component.camposObligatoriosInvalidos()).not.toContain('tipoAsignacion');
    expect(component.puedeGrabar()).toBeTrue();
  });

  it('RN-GEN-009 propone el máximo Orden activo de Anexos del año más uno', () => {
    component.borrador.update((archivo) => ({ ...archivo, anio: '2027' }));
    component.archivos.update((archivos) => [
      ...archivos,
      {
        id: 801, anio: '2027', codigo: '8', nombre: 'Anexo activo orden 7',
        tipo: '2 - Anexo', plantilla: 'anexo-7.xlsx', estado: 'Activo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], orden: '7',
      },
      {
        id: 802, anio: '2027', codigo: '9', nombre: 'Anexo inactivo orden 99',
        tipo: '2 - Anexo', plantilla: 'anexo-99.xlsx', estado: 'Inactivo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], orden: '99',
      },
      {
        id: 803, anio: '2026', codigo: '10', nombre: 'Anexo de otro año',
        tipo: '2 - Anexo', plantilla: 'anexo-2026.xlsx', estado: 'Activo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], orden: '80',
      },
    ]);

    component.cambiarTipo('2 - Anexo');

    expect(component.orden()).toBe('8');
  });

  it('RN-GEN-009 propone Orden 2 a partir del Anexo inicial activo de 2027', () => {
    component.borrador.update((archivo) => ({ ...archivo, anio: '2027' }));

    component.cambiarTipo('2 - Anexo');

    expect(component.orden()).toBe('2');
  });

  it('conserva los prefijos simulados al abrir los registros iniciales 2027', () => {
    const anexo = component.archivos().find((archivo) => archivo.anio === '2027' && archivo.codigo === '1')!;
    const apmGastos = component.archivos().find((archivo) => archivo.anio === '2027' && archivo.codigo === '2')!;

    component.abrir(anexo);
    expect(component.prefijo()).toBe('ANX1');

    component.abrir(apmGastos);
    expect(component.tipoAsignacion()).toBe('Techo');
    expect(component.prefijo()).toBe('APMG');
  });

  it('permite seleccionar y conservar Catálogo padre como derivación de un atributo autogenerado', () => {
    component.atributoBorrador.update((atributo) => ({ ...atributo, autogenerado: true }));

    component.actualizarAtributo('derivadoPor', 'CATALOGO PADRE');

    expect(component.derivados).toContain(jasmine.objectContaining({ value: 'CATALOGO PADRE', label: 'Catálogo padre' }));
    expect(component.atributoBorrador().derivadoPor).toBe('CATALOGO PADRE');
  });

  it('permite seleccionar y conservar Corte nivel como derivación independiente', () => {
    component.atributoBorrador.update((atributo) => ({ ...atributo, autogenerado: true }));

    component.actualizarAtributo('derivadoPor', 'CORTE NIVEL');

    expect(component.derivados).toContain(jasmine.objectContaining({ value: 'CORTE NIVEL', label: 'Corte nivel' }));
    expect(component.atributoBorrador().derivadoPor).toBe('CORTE NIVEL');
  });

  it('ofrece únicamente Catálogo padre y Corte nivel en Derivado por', () => {
    expect(component.derivados).toEqual([
      { value: 'CATALOGO PADRE', label: 'Catálogo padre' },
      { value: 'CORTE NIVEL', label: 'Corte nivel' },
    ]);
  });

  it('expone los dos catálogos relacionales definidos para la demostración', () => {
    expect(component.catalogosRelacionales).toEqual([
      { value: '14 - Ingresos por Fuente', label: '14 - Ingresos por Fuente' },
      { value: '15 - Objeto del Gasto por Fuente', label: '15 - Objeto del Gasto por Fuente' },
    ]);
  });

  it('precarga los cuatro atributos confirmados al abrir APM Gastos inicial 2027', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;

    component.abrir(apmGastos);

    expect(component.atributosVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, orden: '1', columnas: ['PLIEGO'], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '1 - Institucional', obligatorio: true, multianual: false, autogenerado: false }),
      jasmine.objectContaining({ codigo: 2, orden: '2', columnas: ['FUENTE'], nombre: 'FUENTE', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '5 - Fuente de financiamiento', nivelMinimo: '1 - Fuente', nivelMaximo: '2 - Subfuente', obligatorio: true }),
      jasmine.objectContaining({ codigo: 3, orden: '3', columnas: ['CATEGORIA_GASTO'], nombre: 'CATEGORIA_GASTO', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '6 - Categoría del gasto', nivelMinimo: '1 - Categoría', nivelMaximo: '1 - Categoría', obligatorio: true }),
      jasmine.objectContaining({ codigo: 4, orden: '4', columnas: ['ANO_1', 'ANO_2', 'ANO_3'], nombre: 'ASIGNACION', destino: '2 - Detalle JSON', tipoDato: 'Monto', clasificador: '', obligatorio: true, multianual: true, autogenerado: false }),
    ]);
  });

  it('precarga los cuatro firmantes de prueba de APM Gastos con sus estados y códigos', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;

    component.abrir(apmGastos);

    expect(component.firmantesVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, firmante: 'Loli Jhover Chavez', orden: '1', documentoFirmado: true }),
      jasmine.objectContaining({ codigo: 2, firmante: 'Cinthya Bravo', orden: '2', documentoFirmado: false }),
      jasmine.objectContaining({ codigo: 3, firmante: 'Diego Cárdenas Ochoa', orden: '3', documentoFirmado: true }),
      jasmine.objectContaining({ codigo: 4, firmante: 'Laura Dávila Cotrina', orden: '4', documentoFirmado: false }),
    ]);

    component.agregarFirmante();
    expect(component.firmanteBorrador().codigo).toBe(5);
    expect(component.firmantesDisponibles.map((opcion) => opcion.value)).toEqual(jasmine.arrayContaining([
      'Diego Cárdenas Ochoa',
      'Laura Dávila Cotrina',
    ]));
  });

  it('precarga las reglas y referencias de APM Gastos y continúa sus correlativos', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir(apmGastos);

    expect(component.reglasVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, archivoPadre: '101', nivelAgregacion: 'Pliego', operador: '3 - Igual (=)', atributosComunes: ['PLIEGO'], montosARevisar: ['ASIGNACION'] }),
      jasmine.objectContaining({ codigo: 2, archivoPadre: '101', nivelAgregacion: 'Unidad Ejecutora', operador: '4 - Mayor o igual (>=)', atributosComunes: ['FUENTE', 'CATEGORIA_GASTO'], montosARevisar: ['ASIGNACION'] }),
    ]);
    expect(component.referenciasVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, catalogoRelacional: '14 - Ingresos por Fuente', atributosComunes: ['FUENTE'] }),
      jasmine.objectContaining({ codigo: 2, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['CATEGORIA_GASTO'] }),
    ]);
    expect(component.tabs.map((tab) => tab.label)).toEqual([
      'ATRIBUTOS (4)',
      'REGLAS SUMARIZADAS (2)',
      'REFERENCIAS CRUZADAS (2)',
      'FIRMANTES (4)',
    ]);

    component.agregarRegla();
    expect(component.reglaBorrador().codigo).toBe(3);
    component.cerrarRegla();
    component.agregarReferencia();
    expect(component.referenciaBorrador().codigo).toBe(3);
  });

  it('RN-GEN-015 solicita confirmación y limpia los dependientes sin alterar Firmantes', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir(apmGastos);
    component.borrador.update((archivo) => ({
      ...archivo,
      reglas: [{ id: 1, operador: '3 - Igual (=)' }],
      referencias: ['15 - Objeto del Gasto por Fuente'],
      reporte: 'Reporte.xlsx',
    }));
    component.documentoReporte.set('Reporte.xlsx');

    component.retirarPlantilla();

    expect(component.confirmarPlantilla()).toBeTrue();
    expect(component.borrador().plantilla).toBe('APM de Gastos.xlsx');
    expect(component.borrador().atributos).toHaveSize(4);
    expect(component.borrador().reglas).toHaveSize(1);
    expect(component.borrador().referencias).toHaveSize(1);
    expect(component.borrador().firmantes).toHaveSize(4);

    component.confirmarCambioPlantilla();

    expect(component.borrador().plantilla).toBe('');
    expect(component.borrador().atributos).toEqual([]);
    expect(component.borrador().reglas).toEqual([]);
    expect(component.borrador().referencias).toEqual([]);
    expect(component.borrador().reporte).toBe('');
    expect(component.documentoReporte()).toBe('');
    expect(component.tabs.map((tab) => tab.label)).toEqual([
      'ATRIBUTOS (0)',
      'REGLAS SUMARIZADAS (0)',
      'REFERENCIAS CRUZADAS (0)',
      'FIRMANTES (4)',
    ]);
    expect(component.firmantesVista()).toEqual([
      jasmine.objectContaining({ firmante: 'Loli Jhover Chavez', documentoFirmado: true }),
      jasmine.objectContaining({ firmante: 'Cinthya Bravo', documentoFirmado: false }),
      jasmine.objectContaining({ firmante: 'Diego Cárdenas Ochoa', documentoFirmado: true }),
      jasmine.objectContaining({ firmante: 'Laura Dávila Cotrina', documentoFirmado: false }),
    ]);
  });

  it('RN-GEN-015 conserva el borrador si se cancela el retiro de plantilla', () => {
    const apmGastos = component.archivos().find((archivo) => archivo.id === 103)!;
    component.abrir(apmGastos);
    component.retirarPlantilla();

    component.cancelarCambioPlantilla();

    expect(component.confirmarPlantilla()).toBeFalse();
    expect(component.borrador().plantilla).toBe('APM de Gastos.xlsx');
    expect(component.borrador().atributos).toHaveSize(4);
    expect(component.firmantesVista()).toHaveSize(4);
  });

  it('precarga los ocho atributos documentados al abrir el Anexo inicial 2027', () => {
    const anexo = component.archivos().find((archivo) => archivo.id === 101)!;

    component.abrir(anexo);

    expect(component.atributosVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, orden: '1', columnas: [], nombre: 'PLIEGO', destino: '1 - Cabecera', tipoDato: 'Texto', clasificador: '1 - Institucional', obligatorio: true, multianual: false, autogenerado: true, derivadoPor: 'CATALOGO PADRE' }),
      jasmine.objectContaining({ codigo: 2, orden: '2', columnas: ['UNIDAD_EJECUTORA'], nombre: 'UNIDAD_EJECUTORA', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '1 - Institucional', obligatorio: true, autogenerado: false }),
      jasmine.objectContaining({ codigo: 3, orden: '3', columnas: ['FUENTE'], nombre: 'FUENTE', clasificador: '5 - Fuente de financiamiento', nivelMinimo: '1 - Fuente', nivelMaximo: '2 - Subfuente' }),
      jasmine.objectContaining({ codigo: 4, orden: '4', columnas: ['CATEGORIA_GASTO'], nombre: 'CATEGORIA_GASTO', clasificador: '6 - Categoría del gasto', nivelMinimo: '1 - Categoría', nivelMaximo: '1 - Categoría' }),
      jasmine.objectContaining({ codigo: 5, orden: '5', columnas: ['OBJETO_GASTO'], nombre: 'OBJETO_GASTO', clasificador: '4 - Objeto del gasto', nivelMinimo: '2 - Subgenérica', nivelMaximo: '2 - Subgenérica' }),
      jasmine.objectContaining({ codigo: 6, orden: '6', columnas: [], nombre: 'GENERICA', clasificador: '4 - Objeto del gasto', nivelMinimo: '1 - Genérica', nivelMaximo: '1 - Genérica', autogenerado: true, derivadoPor: 'CORTE NIVEL' }),
      jasmine.objectContaining({ codigo: 7, orden: '7', columnas: [], nombre: 'SUBGENERICA', clasificador: '4 - Objeto del gasto', nivelMinimo: '2 - Subgenérica', nivelMaximo: '2 - Subgenérica', autogenerado: true, derivadoPor: 'CORTE NIVEL' }),
      jasmine.objectContaining({ codigo: 8, orden: '8', columnas: ['ANO_1', 'ANO_2', 'ANO_3'], nombre: 'ASIGNACION', destino: '2 - Detalle JSON', tipoDato: 'Monto', obligatorio: true, multianual: true, autogenerado: false }),
    ]);
  });

  it('presenta las columnas múltiples como tags ordenados con sus etiquetas técnicas', () => {
    expect(component.etiquetasColumnasComoTags(['ANO_3', 'ANO_1', 'ANO_2'])).toEqual([
      'Anio_1',
      'Anio_2',
      'Anio_3',
    ]);
    expect(component.etiquetasColumnasComoTags(['PLIEGO'])).toEqual(['pliego']);
    expect(component.etiquetasColumnasComoTags([])).toEqual([]);
  });

  it('muestra las etiquetas descriptivas conocidas para Derivado por sin alterar otros valores', () => {
    expect(component.etiquetaDerivadoPor('CATALOGO PADRE')).toBe('Catálogo padre');
    expect(component.etiquetaDerivadoPor('CORTE NIVEL')).toBe('Corte nivel');
    expect(component.etiquetaDerivadoPor('1 - Corte nivel')).toBe('1 - Corte nivel');
    expect(component.etiquetaDerivadoPor('VALOR NO DEFINIDO')).toBe('VALOR NO DEFINIDO');
    expect(component.etiquetaDerivadoPor('')).toBe('');
  });

  it('RN-GEN-015 no exige Prefijo para Pie de página y lo conserva obligatorio para APM y Anexo', () => {
    component.borrador.update((archivo) => ({ ...archivo, nombre: 'Pie de página temporal', plantilla: 'pie.xlsx' }));
    component.cambiarTipo('3 - Pie de Página');

    expect(component.prefijoEsObligatorio()).toBeFalse();
    expect(component.camposObligatoriosInvalidos()).not.toContain('prefijo');
    expect(component.puedeGrabar()).toBeTrue();

    component.cambiarTipo('1 - APM de Gastos');
    expect(component.prefijoEsObligatorio()).toBeTrue();
    expect(component.camposObligatoriosInvalidos()).toContain('prefijo');
  });

  function prepararArchivoParaValidar(overrides: Record<string, unknown> = {}): void {
    component.borrador.update((archivo) => ({
      ...archivo,
      id: 999,
      anio: '2027',
      codigo: '99',
      nombre: 'Archivo de validación',
      tipo: '2 - Anexo',
      plantilla: 'archivo.xlsx',
      estado: 'Activo',
      ...overrides,
    }));
    component.tipoAsignacion.set('Techo');
    component.prefijo.set('VALID');
    component.orden.set('2');
  }

  it('RN-GEN-017 impide grabar un Código ya usado en el mismo Año, incluso si está inactivo', () => {
    component.archivos.update((archivos) => [
      ...archivos,
      {
        id: 901, anio: '2027', codigo: '77', nombre: 'Registro inactivo',
        tipo: '2 - Anexo', plantilla: 'inactivo.xlsx', estado: 'Inactivo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], orden: '15',
      },
    ]);
    prepararArchivoParaValidar({ codigo: '77' });

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toBe('AE-02: Ya existe un archivo con el código 77 para el año 2027.');
  });

  it('RN-GEN-018 impide grabar un Orden repetido de otro Anexo activo del Año', () => {
    component.archivos.update((archivos) => [
      ...archivos,
      {
        id: 902, anio: '2027', codigo: '78', nombre: 'Anexo activo',
        tipo: '2 - Anexo', plantilla: 'anexo.xlsx', estado: 'Activo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], orden: '1',
      },
    ]);
    prepararArchivoParaValidar({ orden: '1' });
    component.orden.set('1');

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toBe('AE-03: Ya existe un anexo con el orden 1 para el año 2027.');
  });

  it('RN-GEN-019 impide grabar un Prefijo repetido de otro registro activo del Año', () => {
    component.archivos.update((archivos) => [
      ...archivos,
      {
        id: 903, anio: '2027', codigo: '79', nombre: 'Archivo activo',
        tipo: '2 - Anexo', plantilla: 'activo.xlsx', estado: 'Activo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], prefijo: 'ANX11', orden: '3',
      },
    ]);
    prepararArchivoParaValidar();
    component.prefijo.set('ANX11');

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toBe('AE-04: Ya existe un archivo con el prefijo ANX11 para el año 2027.');
  });

  it('excluye el propio registro al validar Código, Orden y Prefijo durante una edición', () => {
    component.archivos.update((archivos) => [
      ...archivos,
      {
        id: 904, anio: '2027', codigo: '80', nombre: 'Anexo a editar',
        tipo: '2 - Anexo', plantilla: 'editar.xlsx', estado: 'Activo', desde: '', hasta: '',
        atributos: [], reglas: [], referencias: [], firmantes: [], prefijo: 'EDITAR', orden: '4',
      },
    ]);
    prepararArchivoParaValidar({ id: 904, codigo: '80', nombre: 'Anexo a editar' });
    component.prefijo.set('EDITAR');
    component.orden.set('4');

    expect(component.validarAntesDeGrabar()).toBeTrue();
  });

  it('RN-GEN-021 impide inactivar un Archivo padre de una regla sumarizada activa', () => {
    const padre = component.archivos()[0];
    component.archivos.update((archivos) => [
      ...archivos,
      {
        id: 905, anio: padre.anio, codigo: '90', nombre: 'Archivo con regla activa',
        tipo: '2 - Anexo', plantilla: 'regla.xlsx', estado: 'Activo', desde: '', hasta: '',
        atributos: [],
        reglas: [{ id: 1, operador: '3 - Igual (=)', archivoPadre: String(padre.id), nivelAgregacion: 'Pliego', atributosComunes: [], montosARevisar: [] }],
        referencias: [], firmantes: [],
      },
    ]);
    component.abrir(padre);

    component.solicitarCambioEstado('Inactivo');

    expect(component.confirmarInactivacion()).toBeFalse();
    expect(component.borrador().estado).toBe('Activo');
    expect(component.alertaFormulario()).toBe('AE-12: No es posible inactivar el archivo porque es Archivo Padre de una regla sumarizada activa.');
  });

  it('RN-GEN-022 cancela la inactivación sin modificar el registro', () => {
    const archivo = component.archivos()[0];
    component.abrir(archivo);

    component.solicitarCambioEstado('Inactivo');
    component.cancelarInactivacion();

    expect(component.confirmarInactivacion()).toBeFalse();
    expect(component.borrador().estado).toBe('Activo');
    expect(component.borrador().desde).toBe(archivo.desde);
    expect(component.borrador().hasta).toBe(archivo.hasta);
  });

  it('RN-GEN-022 inactiva después de CONF-05 y conserva la configuración', () => {
    const archivo = component.archivos()[0];
    const atributos = structuredClone(archivo.atributos);
    component.abrir(archivo);

    component.solicitarCambioEstado('Inactivo');
    expect(component.confirmarInactivacion()).toBeTrue();
    component.confirmarInactivacionArchivo();
    component.grabar();

    const inactivo = component.archivos().find((item) => item.id === archivo.id)!;
    expect(inactivo.estado).toBe('Inactivo');
    expect(inactivo.desde).toBe(archivo.desde);
    expect(inactivo.hasta).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(inactivo.atributos).toEqual(atributos);
  });

  it('mantiene el inactivo consultable y permite reactivarlo con nuevas fechas', () => {
    const archivo = { ...component.archivos()[0], estado: 'Inactivo' as const, desde: '01/01/2026', hasta: '02/02/2026' };
    component.archivos.update((archivos) => archivos.map((item) => item.id === archivo.id ? archivo : item));
    component.abrir(archivo);
    component.anioFiltro.set(archivo.anio);
    component.estadoFiltro.set('Inactivo');

    expect(component.archivosFiltrados().some((item) => item.id === archivo.id)).toBeTrue();
    expect(component.archivoEnConsulta()).toBeTrue();

    component.solicitarCambioEstado('Activo');
    component.grabar();

    const reactivado = component.archivos().find((item) => item.id === archivo.id)!;
    expect(reactivado.estado).toBe('Activo');
    expect(reactivado.desde).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(reactivado.hasta).toBe('');
    expect(component.archivoEnConsulta()).toBeFalse();
  });

  it('OBS-017 bloquea la grabación cuando existe una referencia cruzada pendiente', () => {
    prepararArchivoParaValidar();
    component.agregarReferencia();

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toContain('referencia cruzada');
  });

  it('RN-REF-006 impide grabar referencias aceptadas con el mismo catálogo relacional', () => {
    prepararArchivoParaValidar({
      referencias: [
        { id: 1, codigo: 1, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] },
        { id: 2, codigo: 2, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['FUENTE'] },
      ],
    });

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toBe(
      'Ya existe una referencia cruzada con el catálogo relacional 15 - Objeto del Gasto por Fuente en este archivo.',
    );
  });

  it('RN-SUM-008 impide grabar una regla aceptada con atributos comunes incompatibles', () => {
    prepararArchivoParaValidar({
      reglas: [{
        id: 1, codigo: 1, archivoPadre: '104', nivelAgregacion: 'Pliego',
        operador: '3 - Igual (=)', atributosComunes: ['PLIEGO'], montosARevisar: ['ASIGNACION'],
      }],
    });

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toBe('RN-SUM-008');
  });

  it('OBS-017 bloquea la grabación cuando existe un firmante pendiente', () => {
    prepararArchivoParaValidar();
    component.agregarFirmante();

    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toContain('firmante');
  });

  it('OBS-017 bloquea la grabación cuando un atributo del side panel tiene cambios pendientes', () => {
    prepararArchivoParaValidar();
    component.agregarAtributo();
    component.actualizarAtributo('nombre', 'atributo_pendiente');

    expect(component.panelAtributoConCambiosPendientes()).toBeTrue();
    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toContain('atributo');
  });

  it('OBS-017 bloquea la grabación cuando una regla sumarizada tiene cambios pendientes', () => {
    prepararArchivoParaValidar();
    component.agregarRegla();
    component.actualizarRegla('operador', '3 - Igual (=)');

    expect(component.panelReglaConCambiosPendientes()).toBeTrue();
    expect(component.validarAntesDeGrabar()).toBeFalse();
    expect(component.alertaFormulario()).toContain('regla sumarizada');
  });

  it('OBS-017 conserva el borrador cuando cancela el modal de grabación', () => {
    prepararArchivoParaValidar();

    component.solicitarGrabar();
    expect(component.confirmarGuardar()).toBeTrue();

    component.confirmarGuardar.set(false);
    expect(component.borrador().nombre).toBe('Archivo de validación');
    expect(component.editando()).toBeTrue();
  });

  it('OBS-017 pide confirmación antes de descartar cambios del formulario', () => {
    const archivo = component.archivos()[0];
    component.abrir(archivo);
    component.actualizar('nombre', 'Cambio sin grabar');

    component.solicitarCancelarFormulario();
    expect(component.confirmarDescartarCambios()).toBeTrue();
    expect(component.editando()).toBeTrue();

    component.confirmarSalidaSinGuardar();
    expect(component.editando()).toBeFalse();
  });

  it('OBS-017 informa registro agregado al grabar un archivo nuevo válido', () => {
    component.nuevo();
    component.borrador.update((archivo) => ({
      ...archivo, nombre: 'Archivo nuevo de prueba', tipo: '2 - Anexo', plantilla: 'Plantilla.xlsx',
    }));
    component.tipoAsignacion.set('Techo');
    component.prefijo.set('NUEVO');
    component.orden.set('2');

    component.grabar();

    expect(component.snack()).toBeFalse();
    expect(component.archivos().some((archivo) => archivo.nombre === 'Archivo nuevo de prueba')).toBeTrue();
    expect(component.editando()).toBeFalse();
  });

  it('bloquea el catálogo mientras el snackbar está abierto y lo libera al cerrarlo', () => {
    const snackbar = TestBed.inject(CatalogoArchivosApmSnackbarService);
    snackbar.show('Operación realizada');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('main > div[inert]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.fixed.inset-0.z-40')).not.toBeNull();
    const cerrar = fixture.nativeElement.querySelector('button[aria-label="Cerrar mensaje"]') as HTMLButtonElement | null;
    expect(cerrar).not.toBeNull();

    cerrar!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('main > div[inert]')).toBeNull();
    expect(snackbar.open()).toBeFalse();
  });

  it('libera una notificación activa al destruir el catálogo, salvo el mensaje diferido de Grabar', () => {
    const snackbar = TestBed.inject(CatalogoArchivosApmSnackbarService);
    snackbar.show('Operación local');

    fixture.destroy();
    expect(snackbar.open()).toBeFalse();

    const nuevaVista = TestBed.createComponent(CatalogoArchivosApmComponent);
    snackbar.prepareForTray('Registro agregado con éxito');
    nuevaVista.destroy();

    expect(snackbar.consumeForTray()).toBe('Registro agregado con éxito');
  });

  it('OBS-018 conserva el alta y el snackbar al recrear la bandeja después de navegar', () => {
    component.nuevo();
    component.borrador.update((archivo) => ({
      ...archivo,
      nombre: 'Archivo persistente de prueba',
      tipo: '2 - Anexo',
      plantilla: 'Plantilla.xlsx',
      atributos: ['PLIEGO'],
      reglas: [{ id: 1, operador: '3 - Igual (=)' }],
      referencias: ['Referencia de prueba'],
      firmantes: ['Responsable de presupuesto'],
    }));
    component.tipoAsignacion.set('Techo');
    component.prefijo.set('PERSISTE');
    component.orden.set('2');
    component.grabar();
    fixture.destroy();

    const bandejaFixture = TestBed.createComponent(CatalogoArchivosApmComponent);
    const bandeja = bandejaFixture.componentInstance;
    const creado = bandeja.archivos().find((archivo) => archivo.codigo === '4')!;

    expect(creado).toEqual(jasmine.objectContaining({
      nombre: 'Archivo persistente de prueba',
      atributos: ['PLIEGO'],
      reglas: [{ id: 1, operador: '3 - Igual (=)' }],
      referencias: ['Referencia de prueba'],
      firmantes: ['Responsable de presupuesto'],
    }));
    expect(bandeja.archivosFiltrados().length).toBe(4);
    expect(bandeja.snack()).toBeTrue();
    expect(bandeja.mensajeSnack()).toBe('Registro agregado con éxito');

    bandeja.cerrarSnackbar();
    bandejaFixture.destroy();
    const bandejaReabierta = TestBed.createComponent(CatalogoArchivosApmComponent).componentInstance;
    expect(bandejaReabierta.snack()).toBeFalse();
  });

  it('reemplaza una notificación activa en lugar de acumular snackbars', () => {
    const snackbar = TestBed.inject(CatalogoArchivosApmSnackbarService);

    snackbar.show('Primera operación');
    snackbar.show('Segunda operación');

    expect(snackbar.open()).toBeTrue();
    expect(snackbar.message()).toBe('Segunda operación');
  });

  it('OBS-018 conserva una copia al recrear la bandeja', () => {
    const origen = component.archivos().find((archivo) => archivo.anio === '2026' && archivo.tipo === '2 - Anexo')!;
    component.modoAlta.set('copia');
    component.origenSeleccionado.set(origen);
    component.continuarAlta();
    component.prefijo.set('COPIA');
    component.grabar();
    fixture.destroy();

    const bandeja = TestBed.createComponent(CatalogoArchivosApmComponent).componentInstance;

    expect(bandeja.archivos().some((archivo) => archivo.codigo === '4')).toBeTrue();
    expect(bandeja.mensajeSnack()).toBe('Configuración copiada con éxito');
  });

  it('OBS-018 conserva una edición al recrear la bandeja', () => {
    const original = component.archivos().find((archivo) => archivo.id === 101)!;
    component.abrir(original);
    component.actualizar('nombre', 'Anexo 2027 actualizado');
    component.grabar();
    fixture.destroy();

    const bandeja = TestBed.createComponent(CatalogoArchivosApmComponent).componentInstance;
    const actualizado = bandeja.archivos().find((archivo) => archivo.id === 101)!;

    expect(actualizado.nombre).toBe('Anexo 2027 actualizado');
    expect(bandeja.mensajeSnack()).toBe('Registro actualizado con éxito');
  });
});
