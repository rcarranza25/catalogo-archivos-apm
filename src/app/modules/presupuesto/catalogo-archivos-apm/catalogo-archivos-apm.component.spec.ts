import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CatalogoArchivosApmComponent } from './catalogo-archivos-apm.component';

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

  it('mantiene las denominaciones plurales de las pestañas de configuración', () => {
    expect(component.tabs.map((tab) => tab.label)).toEqual([
      'ATRIBUTOS',
      'REGLAS SUMARIZADAS',
      'REFERENCIAS CRUZADAS',
      'FIRMANTES',
    ]);
  });

  it('cancela una fila nueva y conserva los firmantes aceptados', () => {
    registrarFirmante('Cinthya Bravo');
    component.agregarFirmante();
    component.actualizarFirmante('firmante', 'Sergio Espinoza');
    component.cancelarFirmante();

    expect(component.firmantesVista().map((firmante) => firmante.firmante)).toEqual(['Cinthya Bravo']);
  });

  it('rechaza órdenes duplicados y la mezcla entre firma secuencial y paralela', () => {
    registrarFirmante('Patricia CIME', '1');
    component.agregarFirmante();
    component.actualizarFirmante('firmante', 'Peggy Alcón');
    component.actualizarFirmante('orden', '1');

    expect(component.firmanteValido()).toBeFalse();
    expect(component.errorOrdenFirmante()).toContain('ya fue asignado');
    component.cancelarFirmante();

    registrarFirmante('Peggy Alcón');
    expect(component.configuracionFirmantesValida()).toBeFalse();
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

  it('agrega una referencia cruzada válida sin alterar los atributos de origen', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [],
      atributos: [{ id: 1, codigo: 1, orden: '1', columnas: ['UNIDAD_EJECUTORA'], nombre: 'UNIDAD_EJECUTORA', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' }],
    }));

    component.agregarReferencia();
    component.actualizarReferenciaNueva('catalogoRelacional', '15 - CR Objeto del Gasto por Fuente');
    component.actualizarReferenciaNueva('atributosComunes', ['UNIDAD_EJECUTORA']);
    component.aceptarReferenciaNueva();

    expect(component.referenciasVista()).toEqual([
      jasmine.objectContaining({ codigo: 1, catalogoRelacional: '15 - CR Objeto del Gasto por Fuente', atributosComunes: ['UNIDAD_EJECUTORA'] }),
    ]);
    expect(component.atributosVista()[0].nombre).toBe('UNIDAD_EJECUTORA');
  });

  it('confirma o descarta los cambios de una referencia cruzada editable', () => {
    component.borrador.update((archivo) => ({
      ...archivo,
      referencias: [{ id: 1, codigo: 1, catalogoRelacional: '15 - CR Objeto del Gasto por Fuente', atributosComunes: ['PLIEGO'] }],
    }));
    const referencia = component.referenciasVista()[0];

    component.actualizarReferenciaFila(referencia, 'atributosComunes', ['FUENTE']);
    component.cancelarCambiosReferencia(referencia.id);
    expect(component.referenciasVista()[0].atributosComunes).toEqual(['PLIEGO']);

    component.actualizarReferenciaFila(referencia, 'atributosComunes', ['FUENTE']);
    component.aceptarCambiosReferencia(referencia);
    expect(component.referenciasVista()[0].atributosComunes).toEqual(['FUENTE']);
  });

  it('muestra los alias históricos con el identificador técnico sin alterar su valor', () => {
    component.borrador.update((archivo) => ({ ...archivo, atributos: ['Fuente de financiamiento'] }));

    expect(component.identificadorTecnico('Objeto del gasto')).toBe('objeto_gasto');
    expect(component.identificadorTecnico('ANO_1')).toBe('Anio_1');
    expect(component.opcionesAtributosComunes()).toEqual([
      { value: 'Fuente de financiamiento', label: 'fuente' },
    ]);
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
});
