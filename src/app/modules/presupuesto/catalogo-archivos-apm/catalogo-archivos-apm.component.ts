import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from "@angular/core";
import { Router } from "@angular/router";
import { BreadcrumbComponent } from "../../../shared/components/breadcrumb/breadcrumb.component";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { PaginationComponent } from "../../../shared/components/pagination/pagination.component";
import { RecordsSearchToolbarComponent } from "../../../shared/components/records-search-toolbar/records-search-toolbar.component";
import { SelectionSideNavComponent } from "../../../shared/components/selection-side-nav/selection-side-nav.component";
import { AlertComponent } from "../../../shared/ui/alert/alert.component";
import { ButtonComponent } from "../../../shared/ui/button/button.component";
import { ColumnVisibilityPanelComponent, ColumnVisibilityPanelSection } from "../../../shared/ui/column-visibility-panel/column-visibility-panel.component";
import { IconComponent } from "../../../shared/ui/icon/icon.component";
import { IconDropdownMenuComponent } from "../../../shared/ui/icon-dropdown-menu/icon-dropdown-menu.component";
import { ModalComponent } from "../../../shared/ui/modal/modal.component";
import { RadioComponent } from "../../../shared/ui/radio/radio.component";
import { RecordStatusTagComponent } from "../../../shared/ui/record-status-tag/record-status-tag.component";
import { SideNavComponent } from "../../../shared/ui/side-nav/side-nav.component";
import { SidePanelComponent } from "../../../shared/ui/side-panel/side-panel.component";
import { SnackbarComponent } from "../../../shared/ui/snackbar/snackbar.component";
import { StatusTagComponent } from "../../../shared/ui/status-tag/status-tag.component";
import { TagComponent } from "../../../shared/ui/tag/tag.component";
import { TabsComponent, TabItem } from "../../../shared/ui/tabs/tabs.component";
import { TextFieldComponent } from "../../../shared/ui/text-field/text-field.component";
import { TooltipDirective } from "../../../shared/ui/tooltip/tooltip.directive";
import { UploadSideNavComponent } from "../../../shared/ui/upload-side-nav/upload-side-nav.component";
import { ApmMultiSelectComponent } from "./components/apm-multi-select/apm-multi-select.component";
import { CatalogoArchivosApmStateService } from './catalogo-archivos-apm-state.service';
import { CatalogoArchivosApmSnackbarService } from './catalogo-archivos-apm-snackbar.service';
import type { DocumentsRecordsColumn } from '../../../shared/types/documents-records.types';

/** Desactiva solo el tooltip de contenido del valor de un select del Catálogo APM. */
@Directive({ selector: "siaf-input[apmDisableContentTooltip]", standalone: true })
class ApmDisableContentTooltipDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly eventos = ["mouseenter", "focusin", "pointerdown", "pointermove", "pointerup", "pointercancel", "contextmenu"] as const;
  private readonly bloquearTooltip = (evento: Event): void => evento.stopImmediatePropagation();

  ngAfterViewInit(): void {
    for (const evento of this.eventos) this.host.nativeElement.addEventListener(evento, this.bloquearTooltip, true);
  }

  ngOnDestroy(): void {
    for (const evento of this.eventos) this.host.nativeElement.removeEventListener(evento, this.bloquearTooltip, true);
  }
}

type Estado = "Activo" | "Inactivo";
type Regla = {
  id: number;
  operador: string;
  codigo?: number;
  archivoPadre?: string;
  nivelAgregacion?: string;
  atributosComunes?: string[];
  montosARevisar?: string[];
  /** Campos de la maqueta previa: se mantienen para no perder registros existentes. */
  origen?: string;
  nivel?: string;
  valor?: string;
};
type Atributo = {
  id: number; codigo: number; orden: string; columnas: string[]; nombre: string;
  destino: string; tipoDato: string; clasificador: string; nivelMinimo: string;
  nivelMaximo: string; obligatorio: boolean; multianual: boolean;
  autogenerado: boolean; derivadoPor: string;
};
type Firmante = {
  id: number;
  codigo: number;
  firmante: string;
  orden: string;
  documentoFirmado: boolean;
};
type ReferenciaCruzada = {
  id: number;
  codigo: number;
  catalogoRelacional: string;
  atributosComunes: string[];
};
type SeccionDetalleArchivo = 'atributos' | 'reglas' | 'referencias' | 'firmantes';
export type Archivo = {
  id: number;
  anio: string;
  codigo: string;
  nombre: string;
  tipo: string;
  plantilla: string;
  estado: Estado;
  desde: string;
  hasta: string;
  atributos: (string | Atributo)[];
  reglas: Regla[];
  /** Los textos históricos se conservan y se normalizan solo para la grilla. */
  referencias: (string | ReferenciaCruzada)[];
  /** Los textos históricos se normalizan al leer para conservar los datos existentes. */
  firmantes: (string | Firmante)[];
  /** Datos de cabecera que se conservan al tomar un archivo como origen. */
  tipoAsignacion?: string;
  prefijo?: string;
  /** Documento reporte opcional asociado a la configuración. */
  reporte?: string;
  /** Orden de foliación aplicable únicamente a archivos de tipo Anexo. */
  orden?: string;
};

const ANEXO_12: Archivo = {
  id: 12,
  anio: "2026",
  codigo: "12",
  nombre: "Asignación presupuestaria por pliego y fuente de financiamiento",
  tipo: "2 - Anexo",
  plantilla: "Plantilla_Anexo_12.xlsx",
  estado: "Activo",
  desde: "14/07/2025",
  hasta: "-",
  atributos: ["Año presupuestal", "Pliego", "Fuente de financiamiento"],
  reglas: [
    {
      id: 1,
      origen: "APM Gastos",
      nivel: "Pliego",
      operador: "Mayor o igual (≥)",
      valor: "0",
    },
  ],
  referencias: ["Clasificador de gasto", "Fuente de financiamiento"],
  firmantes: ["Responsable de presupuesto", "Jefe de la OPP"],
  tipoAsignacion: "Techo",
  prefijo: "ANX12",
};
const crearOrigen = (
  id: number,
  anio: string,
  codigo: string,
  nombre: string,
  tipo: string,
  desde: string,
  prefijo: string,
): Archivo => ({
  id,
  anio,
  codigo,
  nombre,
  tipo,
  plantilla: `Plantilla_${codigo}.xlsx`,
  estado: "Activo",
  desde,
  hasta: "-",
  atributos: ["Año presupuestal", "Pliego", "Unidad ejecutora"],
  reglas: [{ id: 1, origen: "APM Gastos", nivel: "Pliego", operador: "Mayor o igual (≥)", valor: "0" }],
  referencias: ["Clasificador de gasto"],
  firmantes: ["Responsable de presupuesto"],
  tipoAsignacion: tipo === "3 - Pie de Página" ? "" : "Techo",
  prefijo,
});
const BASE: Archivo[] = [
  {
    id: 11,
    anio: "2026",
    codigo: "11",
    nombre:
      "Asignación presupuestaria por unidad ejecutora y subgenérica de gasto",
    tipo: "2 - Anexo",
    plantilla: "Plantilla_Anexo_11.xlsx",
    estado: "Activo",
    desde: "07/07/2025",
    hasta: "-",
    atributos: [
      { id: 1, codigo: 1, orden: '1', columnas: ['ANO_1'], nombre: 'ANO_1', destino: '2 - Detalle JSON', tipoDato: 'Numérico', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
      { id: 2, codigo: 2, orden: '2', columnas: ['PLIEGO'], nombre: 'PLIEGO', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '1 - Institucional', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
      { id: 3, codigo: 3, orden: '3', columnas: ['UNIDAD_EJECUTORA'], nombre: 'UNIDAD_EJECUTORA', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '1 - Institucional', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
      { id: 4, codigo: 4, orden: '4', columnas: ['FUENTE'], nombre: 'FUENTE', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '5 - Fuente de financiamiento', nivelMinimo: '1 - Fuente', nivelMaximo: '1 - Fuente', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
      { id: 5, codigo: 5, orden: '5', columnas: ['OBJETO_GASTO'], nombre: 'SUBGENERICA', destino: '2 - Detalle JSON', tipoDato: 'Texto', clasificador: '4 - Objeto del gasto', nivelMinimo: '2 - Subgenérica', nivelMaximo: '2 - Subgenérica', obligatorio: true, multianual: false, autogenerado: false, derivadoPor: '' },
      { id: 6, codigo: 6, orden: '6', columnas: ['ANO_1', 'ANO_2', 'ANO_3'], nombre: 'ASIGNACION', destino: '2 - Detalle JSON', tipoDato: 'Monto', clasificador: '', nivelMinimo: '', nivelMaximo: '', obligatorio: true, multianual: true, autogenerado: false, derivadoPor: '' },
    ],
    reglas: [
      { id: 1, codigo: 1, archivoPadre: '12', nivelAgregacion: 'Pliego', operador: '3 - Igual (=)', atributosComunes: ['PLIEGO'], montosARevisar: ['ASIGNACION'] },
      { id: 2, codigo: 2, archivoPadre: '12', nivelAgregacion: 'Unidad Ejecutora', operador: '4 - Mayor o igual (>=)', atributosComunes: ['PLIEGO', 'UNIDAD_EJECUTORA'], montosARevisar: ['ASIGNACION'] },
    ],
    referencias: [
      { id: 1, codigo: 1, catalogoRelacional: '14 - Ingresos por Fuente', atributosComunes: ['PLIEGO'] },
      { id: 2, codigo: 2, catalogoRelacional: '15 - Objeto del Gasto por Fuente', atributosComunes: ['UNIDAD_EJECUTORA'] },
    ],
    firmantes: [
      { id: 1, codigo: 1, firmante: 'Patricia Mendoza Ruiz', orden: '1', documentoFirmado: false },
      { id: 2, codigo: 2, firmante: 'Jorge Salazar Torres', orden: '2', documentoFirmado: false },
      { id: 3, codigo: 3, firmante: 'Carmen Valdivia López', orden: '3', documentoFirmado: false },
      { id: 4, codigo: 4, firmante: 'Ricardo Fernández Castro', orden: '4', documentoFirmado: false },
    ],
    tipoAsignacion: "Techo",
    prefijo: "ANX11",
    orden: "2",
  },
  ANEXO_12,
  {
    id: 13,
    anio: "2026",
    codigo: "13",
    nombre:
      "Asignación presupuestaria por unidad ejecutora y específica de gasto",
    tipo: "2 - Anexo",
    plantilla: "Plantilla_Anexo_13.xlsx",
    estado: "Activo",
    desde: "21/07/2025",
    hasta: "-",
    atributos: ["Año presupuestal", "Unidad ejecutora", "Específica de gasto"],
    reglas: [
      {
        id: 1,
        origen: "APM Gastos",
        nivel: "Unidad ejecutora",
        operador: "Mayor o igual (≥)",
        valor: "0",
      },
    ],
    referencias: ["Clasificador de gasto"],
    firmantes: ["Responsable de presupuesto", "Jefe de la OPP"],
    tipoAsignacion: "Piso",
    prefijo: "ANX13",
  },
  crearOrigen(14, "2026", "14", "Asignación presupuestaria multianual de gastos", "1 - APM de Gastos", "04/07/2025", "GAST"),
  crearOrigen(15, "2026", "15", "Pie de página de la APM", "3 - Pie de Página", "04/07/2025", "PIEP"),
  crearOrigen(201, "2025", "1", "Asignación presupuestaria multianual de gastos", "1 - APM de Gastos", "05/07/2024", "GAST"),
  crearOrigen(202, "2025", "2", "Asignación por pliego y fuente de financiamiento", "2 - Anexo", "05/07/2024", "ANX2"),
  crearOrigen(203, "2025", "3", "Asignación por unidad ejecutora y genérica de gasto", "2 - Anexo", "12/07/2024", "ANX3"),
  crearOrigen(204, "2025", "4", "Pie de página de la APM", "3 - Pie de Página", "12/07/2024", "PIEP"),
  {
    id: 101,
    anio: "2027",
    codigo: "1",
    nombre:
      "Asignación presupuestaria por unidad ejecutora y subgenérica de gasto",
    tipo: "2 - Anexo",
    plantilla: "Plantilla_Anexo_1.xlsx",
    estado: "Activo",
    desde: "05/07/2026",
    hasta: "",
    atributos: [
      { id: 1, codigo: 1, orden: "1", columnas: [], nombre: "PLIEGO", destino: "1 - Cabecera", tipoDato: "Texto", clasificador: "1 - Institucional", nivelMinimo: "", nivelMaximo: "", obligatorio: true, multianual: false, autogenerado: true, derivadoPor: "CATALOGO PADRE" },
      { id: 2, codigo: 2, orden: "2", columnas: ["UNIDAD_EJECUTORA"], nombre: "UNIDAD_EJECUTORA", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "1 - Institucional", nivelMinimo: "", nivelMaximo: "", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 3, codigo: 3, orden: "3", columnas: ["FUENTE"], nombre: "FUENTE", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "5 - Fuente de financiamiento", nivelMinimo: "1 - Fuente", nivelMaximo: "2 - Subfuente", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 4, codigo: 4, orden: "4", columnas: ["CATEGORIA_GASTO"], nombre: "CATEGORIA_GASTO", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "6 - Categoría del gasto", nivelMinimo: "1 - Categoría", nivelMaximo: "1 - Categoría", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 5, codigo: 5, orden: "5", columnas: ["OBJETO_GASTO"], nombre: "OBJETO_GASTO", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "4 - Objeto del gasto", nivelMinimo: "2 - Subgenérica", nivelMaximo: "2 - Subgenérica", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 6, codigo: 6, orden: "6", columnas: [], nombre: "GENERICA", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "4 - Objeto del gasto", nivelMinimo: "1 - Genérica", nivelMaximo: "1 - Genérica", obligatorio: true, multianual: false, autogenerado: true, derivadoPor: "CORTE NIVEL" },
      { id: 7, codigo: 7, orden: "7", columnas: [], nombre: "SUBGENERICA", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "4 - Objeto del gasto", nivelMinimo: "2 - Subgenérica", nivelMaximo: "2 - Subgenérica", obligatorio: true, multianual: false, autogenerado: true, derivadoPor: "CORTE NIVEL" },
      { id: 8, codigo: 8, orden: "8", columnas: ["ANO_1", "ANO_2", "ANO_3"], nombre: "ASIGNACION", destino: "2 - Detalle JSON", tipoDato: "Monto", clasificador: "", nivelMinimo: "", nivelMaximo: "", obligatorio: true, multianual: true, autogenerado: false, derivadoPor: "" },
    ],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
    tipoAsignacion: "Techo",
    orden: "1",
    prefijo: "ANX1",
  },
  {
    id: 103,
    anio: "2027",
    codigo: "2",
    nombre: "APM Gastos",
    tipo: "1 - APM de Gastos",
    plantilla: "APM de Gastos.xlsx",
    estado: "Activo",
    desde: "10/08/2026",
    hasta: "",
    atributos: [
      { id: 1, codigo: 1, orden: "1", columnas: ["PLIEGO"], nombre: "PLIEGO", destino: "1 - Cabecera", tipoDato: "Texto", clasificador: "1 - Institucional", nivelMinimo: "", nivelMaximo: "", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 2, codigo: 2, orden: "2", columnas: ["FUENTE"], nombre: "FUENTE", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "5 - Fuente de financiamiento", nivelMinimo: "1 - Fuente", nivelMaximo: "2 - Subfuente", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 3, codigo: 3, orden: "3", columnas: ["CATEGORIA_GASTO"], nombre: "CATEGORIA_GASTO", destino: "2 - Detalle JSON", tipoDato: "Texto", clasificador: "6 - Categoría del gasto", nivelMinimo: "1 - Categoría", nivelMaximo: "1 - Categoría", obligatorio: true, multianual: false, autogenerado: false, derivadoPor: "" },
      { id: 4, codigo: 4, orden: "4", columnas: ["ANO_1", "ANO_2", "ANO_3"], nombre: "ASIGNACION", destino: "2 - Detalle JSON", tipoDato: "Monto", clasificador: "", nivelMinimo: "", nivelMaximo: "", obligatorio: true, multianual: true, autogenerado: false, derivadoPor: "" },
    ],
    reglas: [
      {
        id: 1,
        codigo: 1,
        archivoPadre: "101",
        nivelAgregacion: "Pliego",
        operador: "3 - Igual (=)",
        atributosComunes: ["PLIEGO"],
        montosARevisar: ["ASIGNACION"],
      },
      {
        id: 2,
        codigo: 2,
        archivoPadre: "101",
        nivelAgregacion: "Unidad Ejecutora",
        operador: "4 - Mayor o igual (>=)",
        atributosComunes: ["FUENTE", "CATEGORIA_GASTO"],
        montosARevisar: ["ASIGNACION"],
      },
    ],
    referencias: [
      { id: 1, codigo: 1, catalogoRelacional: "14 - Ingresos por Fuente", atributosComunes: ["FUENTE"] },
      { id: 2, codigo: 2, catalogoRelacional: "15 - Objeto del Gasto por Fuente", atributosComunes: ["CATEGORIA_GASTO"] },
    ],
    firmantes: [
      { id: 1, codigo: 1, firmante: "Loli Jhover Chavez", orden: "1", documentoFirmado: true },
      { id: 2, codigo: 2, firmante: "Cinthya Bravo", orden: "2", documentoFirmado: false },
      { id: 3, codigo: 3, firmante: "Diego Cárdenas Ochoa", orden: "3", documentoFirmado: true },
      { id: 4, codigo: 4, firmante: "Laura Dávila Cotrina", orden: "4", documentoFirmado: false },
    ],
    tipoAsignacion: "Techo",
    prefijo: "APMG",
  },
  {
    id: 104,
    anio: "2027",
    codigo: "3",
    nombre: "Pie de página",
    tipo: "3 - Pie de Página",
    plantilla: "Pie de Página.xlsx",
    estado: "Activo",
    desde: "21/09/2026",
    hasta: "",
    atributos: [],
    reglas: [],
    referencias: [],
    // El escenario inicial 2027 no precarga firmantes: se agregan desde la grilla.
    firmantes: [],
  },
];

const limpiarFirmantesMockIniciales = (archivo: Archivo): Archivo => {
  const esRegistroInicial2027 = [101, 103, 104].includes(archivo.id);
  const contieneSoloMock =
    archivo.firmantes.length > 0 &&
    archivo.firmantes.every(
      (firmante) => typeof firmante === 'string' && firmante === 'Responsable de presupuesto',
    );

  return esRegistroInicial2027 && contieneSoloMock
    ? { ...archivo, firmantes: [] }
    : archivo;
};

@Component({
  selector: "siaf-catalogo-archivos-apm",
  standalone: true,
  imports: [
    AlertComponent,
    ApmMultiSelectComponent,
    BreadcrumbComponent,
    ButtonComponent,
    ColumnVisibilityPanelComponent,
    IconComponent,
    IconDropdownMenuComponent,
    ModalComponent,
    PageHeaderComponent,
    PaginationComponent,
    RadioComponent,
    RecordStatusTagComponent,
    RecordsSearchToolbarComponent,
    SelectionSideNavComponent,
    SideNavComponent,
    SidePanelComponent,
    SnackbarComponent,
    StatusTagComponent,
    TagComponent,
    TabsComponent,
    TextFieldComponent,
    ApmDisableContentTooltipDirective,
    TooltipDirective,
    UploadSideNavComponent,
  ],
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }

    /* Cada nivel que contiene la grilla puede encogerse dentro del frame.
       Sin estos mínimos explícitos, un item de grid usa el ancho min-content
       de la tabla y lo propaga hasta el scroll global. */
    .apm-page,
    .apm-content,
    .apm-record,
    .apm-configuration,
    .apm-tab-panel {
      min-width: 0;
      max-width: 100%;
    }

    .apm-attributes-table-scroll {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
    }

    /* content-body de Figma: Fill container, Hug contents, 24/16 y gap 24. */
    .apm-attributes-content-body {
      max-width: 100%;
    }

    .apm-attributes-content-block {
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }

    /* La selección de la barra y la primera columna comparten esta medida.
       El centrado se resuelve por la celda, no por márgenes en los checkboxes. */
    .apm-attribute-selection-column {
      width: 48px;
      min-width: 48px;
    }

    .apm-attributes-table {
      table-layout: fixed;
    }

    .apm-attributes-table th,
    .apm-attributes-table td {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* Las selecciones múltiples mantienen una sola fila: cada valor ocupa una
       línea y la tercera se recorta con elipsis si hay más contenido. */
    .apm-attributes-table td.apm-multi-value-cell {
      white-space: normal;
      text-overflow: clip;
    }

    .apm-rules-table {
      table-layout: fixed;
    }

    .apm-rules-table th,
    .apm-rules-table td {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .apm-rules-table td.apm-rules-multi-value-cell {
      white-space: normal;
      text-overflow: clip;
    }

    .apm-editable-table {
      table-layout: fixed;
    }

    /* El detalle no participa en el ancho intrínseco de la tabla principal.
       Cada tabla interna administra su propio desborde horizontal. */
    .apm-nested-section {
      min-width: 0;
      /* El primer riel coincide con el inicio de Código de la bandeja. El
         clamp mantiene el ajuste al variar el ancho sin anclarlo a un viewport. */
      padding-inline: clamp(1rem, 7.5vw, 8.7rem) 1rem;
    }

    .apm-nested-section-heading {
      min-width: 0;
    }

    .apm-nested-table-content {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      /* El contenido se alinea con el texto; el espacio anterior pertenece al chevron. */
      padding-left: 28px;
      padding-right: 0;
    }

    /* El buscador del selector de origen reutiliza un componente con ⋮ por
       defecto; este panel solo expone búsqueda y filtros. */
    :host ::ng-deep siaf-selection-side-nav .apm-copy-origin-search [data-accion='more'] {
      display: none;
    }

    .apm-firmantes-table-scroll {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .apm-firmantes-table-body {
      overflow: visible;
    }

    .apm-firmantes-table-body--vertical {
      max-height: 22rem;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-gutter: stable;
    }

    .apm-editable-actions {
      position: sticky;
      right: 0;
      z-index: 1;
    }

    .apm-editable-table thead .apm-editable-actions {
      z-index: 2;
      background: var(--sys-color-bg-surfaces-surface-high);
    }

    .apm-editable-table tbody .apm-editable-actions {
      background: var(--sys-color-bg-surfaces-surface);
    }

    .apm-grid-actions {
      min-height: 2rem;
      align-items: center;
    }

    /* En las acciones compactas de grilla, el estado disabled se expresa con
       el ícono atenuado. Así no se confunde con la capa de hover o foco. */
    :host ::ng-deep siaf-button.apm-grid-action .siaf-button:disabled {
      background-color: transparent;
      color: var(--sys-color-text-neutral-disabled);
    }

    :host ::ng-deep siaf-button.apm-grid-action .siaf-button:disabled::before {
      background-color: transparent;
    }

    .apm-multi-value-lines {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow-wrap: anywhere;
      white-space: pre-line;
    }

    .apm-column-tags {
      display: flex;
      max-width: 100%;
      flex-wrap: wrap;
      gap: var(--sys-spacing-xs, 4px);
      align-items: center;
    }

    /* Estados de las tarjetas de elección: un único modo gobierna radio, fill y stroke. */
    :host [role="radio"][aria-checked="false"] {
      background-color: var(--sys-color-bg-states-light-enabled);
      border-color: var(--sys-color-border-states-enabled);
    }

    :host [role="radio"][aria-checked="true"] {
      background-color: var(--sys-color-bg-states-light-selected);
      border-color: var(--sys-color-border-states-active);
    }

    /* Los indicadores se derivan de aria-checked, igual que fill y stroke. */
    :host [role="radiogroup"] > [role="radio"] .font-medium {
      font-size: 0;
      line-height: 1;
    }

    :host [role="radiogroup"] > [role="radio"] .font-medium::before {
      display: inline-block;
      margin-right: var(--sys-gap-base-xs, 8px);
      color: var(--sys-color-icon-states-enabled);
      content: "○";
      font-size: 20px;
      line-height: 1;
      vertical-align: -2px;
    }

    :host
      [role="radiogroup"]
      > [role="radio"][aria-checked="true"]
      .font-medium::before {
      color: var(--sys-color-icon-states-active);
      content: "◉";
    }

    :host [role="radiogroup"] > [role="radio"]:first-child .font-medium::after,
    :host [role="radiogroup"] > [role="radio"]:last-child .font-medium::after {
      color: var(--sys-color-text-neutral-high);
      font-size: var(--sys-typography-size-body-2, 14px);
      line-height: normal;
    }

    :host [role="radiogroup"] > [role="radio"]:first-child .font-medium::after {
      content: "Agregar nuevo archivo de la APM";
    }

    :host [role="radiogroup"] > [role="radio"]:last-child .font-medium::after {
      content: "Crear copia de una configuración existente";
    }

    /* La lupa conserva su caja de botón de ícono: roja al habilitarse y gris al deshabilitarse. */
    :host
      article
      > section
      > section
      > div
      > siaf-button
      ::ng-deep
      .siaf-button:not(:disabled) {
      background-color: var(--sys-color-bg-brand-accent);
      border-color: var(--sys-color-bg-brand-accent);
      color: var(--sys-color-text-brand-white);
    }

    /* El bloque de selección es una superficie, no un control deshabilitado. */
    :host article > section > section {
      background-color: var(--sys-color-bg-surfaces-surface) !important;
    }

    :host article > section > section > p {
      background-color: var(--sys-color-bg-surfaces-surface-low);
      border-radius: var(--sys-radius-sm);
      padding: var(--sys-padding-base-sm, 12px);
    }

    :host article > section > section > p + siaf-button {
      margin-top: var(--sys-gap-base-lg, 24px);
    }

    :host main:has([role="radiogroup"]) article > header {
      display: none;
    }

    /* Solo en Carga documento plantilla, la tarjeta usa el recurso XLS de
       Figma y no ofrece reemplazar: el flujo de validación sigue en uploader. */
    :host ::ng-deep .apm-plantilla-upload siaf-uploader > div > div > siaf-icon:first-child {
      background: center / contain no-repeat url('/assets/figma/modal-annulment/xls-file.svg');
    }

    :host ::ng-deep .apm-plantilla-upload siaf-uploader > div > div > siaf-icon:first-child > span {
      visibility: hidden;
    }

    :host ::ng-deep .apm-plantilla-upload siaf-uploader button[aria-label="Reintentar"] {
      display: none;
    }

    /* Los selects del panel conservan foco DOM tras elegir con mouse. Una vez
       cerrados, vuelven al borde neutro; focus-visible de teclado no cambia. */
    :host ::ng-deep .apm-atributo-panel siaf-input button[aria-haspopup="listbox"][aria-expanded="false"]:focus:not(:focus-visible) {
      border-width: 1px;
      border-color: var(--sys-color-border-states-enabled);
    }

    @media (min-width: 1280px) {
      :host ::ng-deep .apm-registro-panel .siaf-sidepanel-overlay > aside {
        inset: auto;
        top: 0;
        right: 0;
        width: min(calc(100vw - 65px), 1287px);
        height: min(688px, 100vh);
      }
    }

    .apm-regla-form {
      width: min(100%, 1212px);
      margin-inline: auto;
    }

    @media (min-width: 768px) {
      .apm-regla-form {
        grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <main
    class="apm-page min-h-[calc(100vh-56px)] bg-[var(--sys-color-bg-surfaces-surface-lowest)] text-text"
  >
    <div [attr.inert]="snack() ? '' : null">
    <siaf-breadcrumb [items]="breadcrumbs" />
    <siaf-page-header title="CONFIGURACIÓN DE ARCHIVOS DE LA APM">
      @if (seleccionandoModo()) {
        <div actions class="flex items-center gap-siaf-xs">
          <siaf-button variant="outline" icon="close" (click)="cancelarModo()"
            >Cancelar</siaf-button
          >
          <siaf-button variant="accent" icon="save" [disabled]="true"
            >Grabar</siaf-button
          >
        </div>
      }
    </siaf-page-header>
    <!-- El formulario inicia inmediatamente debajo del Content Head (gap vertical 0).
         Se conserva el padding horizontal y el inferior para todas las vistas del módulo. -->
    <section class="apm-content px-siaf-md pb-siaf-md pt-siaf-sm">
      @if (!editando() && !seleccionandoModo()) {
        <article class="rounded-siaf-md bg-surface p-siaf-md">
          <header class="flex items-center gap-siaf-md">
            <h2 class="m-0 text-base font-bold uppercase">
              Archivos de la APM
            </h2>
            <siaf-button
              class="ml-auto"
              variant="accent"
              icon="add"
              [iconOnly]="true"
              ariaLabel="Registrar archivo"
              (click)="iniciarAlta()"
            />
          </header>
          <div class="mt-siaf-md flex flex-col">
            <siaf-records-search-toolbar
              [value]="busqueda()"
              placeholder="Buscar archivo"
              (valueChange)="busqueda.set($any($event))"
              ><ng-container actions
                ><siaf-button
                  variant="text"
                  icon="filter_list"
                  [iconOnly]="true"
                  ariaLabel="Filtros"
                  (click)="abrirFiltros()" />
                <siaf-icon-dropdown-menu icon="more_vert" ariaLabel="Más opciones" [items]="opcionesMasOpciones" (selected)="manejarMasOpciones($event)" /></ng-container
            ></siaf-records-search-toolbar>
            <div class="mt-siaf-lg flex min-h-8 items-center gap-siaf-xs" aria-label="Filtros aplicados">
              @if (anioFiltro()) {
                <siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Año" (removed)="quitarFiltro('anio')">
                  Año: {{ anioFiltro() }}
                </siaf-tag>
              }
              @if (estadoFiltro()) {
                <siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Estado" (removed)="quitarFiltro('estado')">
                  Estado: {{ estadoFiltro() }}
                </siaf-tag>
              }
              @if (codigoFiltro()) {<siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Código" (removed)="quitarFiltro('codigo')">Código: {{ codigoFiltro() }}</siaf-tag>}
              @if (nombreFiltro()) {<siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Nombre del archivo" (removed)="quitarFiltro('nombre')">Nombre: {{ nombreFiltro() }}</siaf-tag>}
              @if (tipoFiltro()) {<siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Tipo" (removed)="quitarFiltro('tipo')">Tipo: {{ tipoFiltro() }}</siaf-tag>}
              @if (tipoAsignacionFiltro()) {<siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Tipo de asignación" (removed)="quitarFiltro('tipoAsignacion')">Tipo de asignación: {{ tipoAsignacionFiltro() }}</siaf-tag>}
              @if (desdeFiltro()) {<siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Fecha desde" (removed)="quitarFiltro('desde')">Fecha desde: {{ desdeFiltro() }}</siaf-tag>}
              @if (hastaFiltro()) {<siaf-tag variant="input" [removable]="true" removeLabel="Quitar filtro Fecha hasta" (removed)="quitarFiltro('hasta')">Fecha hasta: {{ hastaFiltro() }}</siaf-tag>}
              @if (hayFiltrosActivos()) {
                <div class="ml-auto">
                  <siaf-button variant="outline" size="sm" icon="delete" (click)="limpiarFiltros()">Borrar filtros</siaf-button>
                </div>
              }
            </div>
            <div class="mt-siaf-lg min-w-0 max-w-full overflow-x-auto rounded-siaf-sm">
              <table class="min-w-full table-fixed border-collapse text-left" [style.width.px]="anchoBandeja()">
                <thead class="bg-surface-high text-[10px] uppercase">
                  <tr
                    class="h-10 border-b border-[var(--sys-color-divider-default)]"
                  >
                    @if (haySeccionesVisibles()) {<th class="w-10 px-siaf-xs"><span class="sr-only">Expandir detalle</span></th>}
                    @if (columnaBandejaVisible('anio')) {<th class="w-[85px] px-siaf-md">Año</th>}
                    @if (columnaBandejaVisible('codigo')) {<th class="w-[85px] px-siaf-md">Código</th>}
                    @if (columnaBandejaVisible('nombre')) {<th class="w-[380px] px-siaf-md">Nombre del archivo</th>}
                    @if (columnaBandejaVisible('prefijo')) {<th class="w-[90px] px-siaf-md">Prefijo</th>}
                    @if (columnaBandejaVisible('tipo')) {<th class="w-[170px] px-siaf-md">Tipo</th>}
                    @if (columnaBandejaVisible('tipoControl')) {<th class="w-[160px] px-siaf-md">Tipo de control</th>}
                    @if (columnaBandejaVisible('plantilla')) {<th class="w-[200px] px-siaf-md">Documento plantilla</th>}
                    @if (columnaBandejaVisible('reporte')) {<th class="w-[200px] px-siaf-md">Documento reporte</th>}
                    @if (columnaBandejaVisible('estado')) {<th class="w-[130px] px-siaf-md">Estado</th>}
                    @if (columnaBandejaVisible('desde')) {<th class="w-[125px] px-siaf-md">Fecha desde</th>}
                    @if (columnaBandejaVisible('hasta')) {<th class="w-[125px] px-siaf-md">Fecha hasta</th>}
                  </tr>
                </thead>
                <tbody
                  class="text-[length:var(--sys-typography-size-body-2,14px)] font-normal leading-normal"
                >
                  @for (a of archivosFiltrados(); track a.id) {
                    <tr
                      class="h-14 cursor-pointer border-b border-[var(--sys-color-divider-default)] hover:bg-[var(--sys-color-bg-states-light-hover)]"
                      tabindex="0"
                      (click)="abrir(a)"
                      (keydown.enter)="abrir(a)"
                    >
                      @if (haySeccionesVisibles()) {<td class="px-siaf-xs text-center"><button type="button" class="inline-flex size-8 items-center justify-center rounded-siaf-sm hover:bg-surface-muted" [attr.aria-label]="(archivoExpandido(a.id) ? 'Contraer' : 'Expandir') + ' detalles de ' + a.nombre" (click)="$event.stopPropagation(); alternarArchivoExpandido(a.id)"><siaf-icon [name]="archivoExpandido(a.id) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" [size]="20" /></button></td>}
                      @if (columnaBandejaVisible('anio')) {<td class="w-[85px] px-siaf-md">{{ a.anio }}</td>}
                      @if (columnaBandejaVisible('codigo')) {<td class="w-[85px] px-siaf-md">{{ a.codigo }}</td>}
                      @if (columnaBandejaVisible('nombre')) {<td class="w-[380px] whitespace-normal px-siaf-md py-siaf-sm">{{ a.nombre }}</td>}
                      @if (columnaBandejaVisible('prefijo')) {<td class="w-[90px] px-siaf-md">{{ a.prefijo || '—' }}</td>}
                      @if (columnaBandejaVisible('tipo')) {<td class="w-[170px] whitespace-normal px-siaf-md">{{ a.tipo }}</td>}
                      @if (columnaBandejaVisible('tipoControl')) {<td class="w-[160px] px-siaf-md">{{ a.tipoAsignacion || '—' }}</td>}
                      @if (columnaBandejaVisible('plantilla')) {<td class="w-[200px] whitespace-normal px-siaf-md">{{ a.plantilla || '—' }}</td>}
                      @if (columnaBandejaVisible('reporte')) {<td class="w-[200px] whitespace-normal px-siaf-md">{{ a.reporte || '—' }}</td>}
                      @if (columnaBandejaVisible('estado')) {<td class="px-siaf-md">
                        <siaf-record-status-tag [status]="a.estado" />
                      </td>}
                      @if (columnaBandejaVisible('desde')) {<td class="px-siaf-md">{{ a.desde }}</td>}
                      @if (columnaBandejaVisible('hasta')) {<td class="px-siaf-md">{{ a.hasta }}</td>}
                    </tr>
                    @if (haySeccionesVisibles() && archivoExpandido(a.id)) {
                      <tr class="border-b border-[var(--sys-color-divider-default)] bg-[var(--sys-color-bg-surfaces-surface-low)]">
                        <td [attr.colspan]="cantidadColumnasBandejaVisibles() + 1" class="min-w-0 p-siaf-md">
                          <div class="grid min-w-0 gap-0">
                            @for (seccion of seccionesDetalleArchivo; track seccion.id) {
                              @if (seccionVisible(seccion.id)) {
                              <section class="apm-nested-section border-b border-[var(--sys-color-divider-default)] last:border-b-0">
                                <button type="button" class="apm-nested-section-heading flex min-h-12 w-full items-center gap-siaf-xs text-left text-sm font-bold" [attr.aria-label]="(seccionDetalleExpandida(a.id, seccion.id) ? 'Contraer' : 'Expandir') + ' ' + seccion.label" (click)="alternarSeccionDetalle(a.id, seccion.id)">
                                  <siaf-icon [name]="seccionDetalleExpandida(a.id, seccion.id) ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" [size]="20" />
                                  <span>{{ seccion.label }} ({{ cantidadSeccionDetalle(a, seccion.id) }})</span>
                                </button>
                                @if (seccionDetalleExpandida(a.id, seccion.id)) {
                                  <div class="apm-nested-table-content overflow-x-auto pb-siaf-md">
                                    @switch (seccion.id) {
                                      @case ('atributos') {
                                        <table class="w-full min-w-[1900px] border-collapse text-left text-sm"><thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="px-siaf-md py-siaf-sm">Código</th><th class="px-siaf-md py-siaf-sm">Orden</th><th class="px-siaf-md py-siaf-sm">Columna Excel</th><th class="px-siaf-md py-siaf-sm">Nombre de campo</th><th class="px-siaf-md py-siaf-sm">Destino del dato</th><th class="px-siaf-md py-siaf-sm">Tipo de dato</th><th class="px-siaf-md py-siaf-sm">Clasificador</th><th class="px-siaf-md py-siaf-sm">Nivel mínimo</th><th class="px-siaf-md py-siaf-sm">Nivel máximo</th><th class="px-siaf-md py-siaf-sm">Obligatorio</th><th class="px-siaf-md py-siaf-sm">Multianual</th><th class="px-siaf-md py-siaf-sm">Autogenerado</th><th class="px-siaf-md py-siaf-sm">Derivado por</th></tr></thead><tbody>@for (atributo of atributosDeArchivo(a); track atributo.id) {<tr class="border-b border-[var(--sys-color-divider-default)]"><td class="px-siaf-md py-siaf-sm">{{ atributo.codigo }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.orden }}</td><td class="px-siaf-md py-siaf-sm">{{ etiquetasColumnasOrdenadas(atributo.columnas) }}</td><td class="px-siaf-md py-siaf-sm">{{ identificadorTecnico(atributo.nombre) }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.destino }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.tipoDato }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.clasificador }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.nivelMinimo }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.nivelMaximo }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.obligatorio ? 'Sí' : 'No' }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.multianual ? 'Sí' : 'No' }}</td><td class="px-siaf-md py-siaf-sm">{{ atributo.autogenerado ? 'Sí' : 'No' }}</td><td class="px-siaf-md py-siaf-sm">{{ etiquetaDerivadoPor(atributo.derivadoPor) }}</td></tr>} @empty {<tr><td colspan="13" class="px-siaf-md py-siaf-sm text-text-muted">No hay atributos registrados.</td></tr>}</tbody></table>
                                      }
                                      @case ('reglas') {
                                        <table class="w-full min-w-[900px] border-collapse text-left text-sm"><thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="px-siaf-md py-siaf-sm">Código</th><th class="px-siaf-md py-siaf-sm">Archivo padre</th><th class="px-siaf-md py-siaf-sm">Nivel de agregación</th><th class="px-siaf-md py-siaf-sm">Operador</th><th class="px-siaf-md py-siaf-sm">Atributos comunes</th><th class="px-siaf-md py-siaf-sm">Montos a revisar</th></tr></thead><tbody>@for (regla of reglasDeArchivo(a); track regla.id) {<tr class="border-b border-[var(--sys-color-divider-default)]"><td class="px-siaf-md py-siaf-sm">{{ regla.codigo }}</td><td class="px-siaf-md py-siaf-sm">{{ regla.archivoPadre }}</td><td class="px-siaf-md py-siaf-sm">{{ regla.nivelAgregacion }}</td><td class="px-siaf-md py-siaf-sm">{{ regla.operador }}</td><td class="px-siaf-md py-siaf-sm">{{ etiquetasAtributos(regla.atributosComunes ?? []) }}</td><td class="px-siaf-md py-siaf-sm">{{ etiquetasAtributos(regla.montosARevisar ?? []) }}</td></tr>} @empty {<tr><td colspan="6" class="px-siaf-md py-siaf-sm text-text-muted">No hay reglas sumarizadas registradas.</td></tr>}</tbody></table>
                                      }
                                      @case ('referencias') {
                                        <table class="w-full min-w-[720px] border-collapse text-left text-sm"><thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="px-siaf-md py-siaf-sm">Código</th><th class="px-siaf-md py-siaf-sm">Catálogo relacional</th><th class="px-siaf-md py-siaf-sm">Atributos comunes</th></tr></thead><tbody>@for (referencia of referenciasDeArchivo(a); track referencia.id) {<tr class="border-b border-[var(--sys-color-divider-default)]"><td class="px-siaf-md py-siaf-sm">{{ referencia.codigo }}</td><td class="px-siaf-md py-siaf-sm">{{ referencia.catalogoRelacional }}</td><td class="px-siaf-md py-siaf-sm">{{ etiquetasAtributos(referencia.atributosComunes) }}</td></tr>} @empty {<tr><td colspan="3" class="px-siaf-md py-siaf-sm text-text-muted">No hay referencias cruzadas registradas.</td></tr>}</tbody></table>
                                      }
                                      @case ('firmantes') {
                                        <table class="w-full min-w-[720px] border-collapse text-left text-sm"><thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="px-siaf-md py-siaf-sm">Código</th><th class="px-siaf-md py-siaf-sm">Firmante</th><th class="px-siaf-md py-siaf-sm">Orden</th><th class="px-siaf-md py-siaf-sm">Documento firmado</th></tr></thead><tbody>@for (firmante of firmantesDeArchivo(a); track firmante.id) {<tr class="border-b border-[var(--sys-color-divider-default)]"><td class="px-siaf-md py-siaf-sm">{{ firmante.codigo }}</td><td class="px-siaf-md py-siaf-sm">{{ firmante.firmante }}</td><td class="px-siaf-md py-siaf-sm">{{ firmante.orden }}</td><td class="px-siaf-md py-siaf-sm"><siaf-status-tag [tone]="firmante.documentoFirmado ? 'success' : 'warning'" appearance="soft" size="small">{{ firmante.documentoFirmado ? 'Firmado' : 'Pendiente de firma' }}</siaf-status-tag></td></tr>} @empty {<tr><td colspan="4" class="px-siaf-md py-siaf-sm text-text-muted">No hay firmantes registrados.</td></tr>}</tbody></table>
                                      }
                                    }
                                  </div>
                                }
                              </section>}
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  } @empty {
                    <tr>
                      <td class="p-siaf-md" [attr.colspan]="cantidadColumnasBandejaVisibles() + (haySeccionesVisibles() ? 1 : 0)">
                        <div
                          class="rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                        >
                          No hay archivos para los filtros seleccionados.
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <siaf-pagination
              class="mt-siaf-xs"
              position="Bottom"
              [rowPage]="true"
              [pageSize]="10"
              [totalItems]="archivosFiltrados().length"
              [totalPages]="1"
            />
          </div>
        </article>
      } @else if (seleccionandoModo()) {
        <article class="rounded-siaf-md bg-surface p-siaf-md">
          <header class="flex flex-wrap items-center gap-siaf-md">
            <h2 class="m-0 text-base font-bold uppercase">
              Agregar registro de archivos de la APM
            </h2>
            <siaf-button
              class="ml-auto"
              variant="outline"
              (click)="cancelarModo()"
              >Cancelar</siaf-button
            >
          </header>
          <section class="mt-siaf-lg grid gap-siaf-lg">
            <h3 class="m-0 text-sm font-bold uppercase">
              Crear registro nuevo o crear una copia de configuración existente
            </h3>
            <div
              class="grid gap-siaf-md md:grid-cols-2"
              role="radiogroup"
              aria-label="Tipo de registro"
            >
              <button
                class="rounded-siaf-sm border p-siaf-md text-left"
                [class.border-[var(--sys-color-border-states-focus)]]="
                  modoAlta() === 'nuevo'
                "
                [class.bg-[var(--sys-color-bg-states-light-selected)]]="
                  modoAlta() === 'nuevo'
                "
                [attr.aria-checked]="modoAlta() === 'nuevo'"
                role="radio"
                type="button"
                (click)="seleccionarModo('nuevo')"
              >
                <span class="font-medium"
                  >◉ Agregar nuevo archivo de la APM</span
                ><small class="mt-1 block text-text-muted"
                  >Agrega un registro vacío con los valores
                  predeterminados.</small
                ></button
              ><button
                class="rounded-siaf-sm border border-[var(--sys-color-divider-strong)] bg-surface p-siaf-md text-left"
                [class.border-[var(--sys-color-border-states-focus)]]="
                  modoAlta() === 'copia'
                "
                [class.bg-[var(--sys-color-bg-states-light-selected)]]="
                  modoAlta() === 'copia'
                "
                [attr.aria-checked]="modoAlta() === 'copia'"
                role="radio"
                type="button"
                (click)="seleccionarModo('copia')"
              >
                <span class="font-medium"
                  >○ Crear copia de una configuración existente</span
                ><small class="mt-1 block text-text-muted"
                  >Selecciona un archivo de la APM como origen.</small
                >
              </button>
            </div>
            <section
              class="rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-high)] p-siaf-md"
            >
              <div class="flex items-center gap-siaf-md">
                <h3 class="m-0 text-sm font-bold uppercase">
                  Seleccionar archivo de la APM
                </h3>
                <siaf-button
                  class="ml-auto"
                  variant="text"
                  icon="search"
                  [iconOnly]="true"
                  ariaLabel="Buscar archivo de origen"
                  [disabled]="modoAlta() !== 'copia'"
                  (click)="abrirPanelOrigen()"
                />
              </div>
              <p class="mt-siaf-md text-sm text-text-muted">
                {{
                  modoAlta() === "nuevo"
                    ? "No se ha agregado ningún archivo. Haga clic en “Agregar nuevo archivo de la APM” para añadir un registro."
                    : origenSeleccionado()
                      ? origenSeleccionado()!.nombre +
                        " — " +
                        origenSeleccionado()!.tipo
                      : "Seleccione un archivo de origen con la lupa."
                }}
              </p>
              <siaf-button
                variant="outline"
                icon="add"
                [disabled]="modoAlta() !== 'nuevo' && !origenSeleccionado()"
                (click)="continuarAlta()"
                >Agregar nuevo archivo de la APM</siaf-button
              >
            </section>
          </section>
        </article>
      } @else {
        <article class="apm-record grid gap-siaf-sm bg-transparent">
          <section class="min-w-0 rounded-siaf-md bg-surface">
            <header class="flex flex-wrap items-center gap-siaf-md p-siaf-md">
              <h2 class="m-0 text-base font-bold uppercase">
                {{
                  esNuevo()
                    ? "Agregar registro de archivos de la APM"
                    : "Editar registro de archivos de la APM"
                }}
              </h2>
              <div class="ml-auto flex gap-siaf-xs">
                <siaf-button variant="outline" (click)="solicitarCancelarFormulario()"
                  >Cancelar</siaf-button
                ><siaf-button variant="accent" [disabled]="!puedeGrabar() || archivoEnConsulta()" (click)="solicitarGrabar()"
                  >Grabar</siaf-button
                >
              </div>
            </header>
            @if (alertaFormulario()) {
              <siaf-alert tone="error" [title]="alertaFormulario()" />
            }
            <section class="grid gap-siaf-md px-siaf-md pb-siaf-md pt-0" [attr.inert]="archivoEnConsulta() ? '' : null">
              <h3 class="m-0 text-sm font-bold uppercase">Datos del archivo</h3>
              <div class="grid gap-siaf-md md:grid-cols-6">
                <siaf-input
                  class="md:col-span-1"
                  label="Año"
                  [autoSuccess]="false"
                  [value]="borrador().anio"
                  [disabled]="true"
                /><siaf-input
                  class="md:col-span-1"
                  label="Código"
                  [autoSuccess]="false"
                  [value]="borrador().codigo"
                  [disabled]="true"
                /><siaf-input
                  class="md:col-span-4"
                  label="Nombre"
                  [required]="true"
                  [autoSuccess]="false"
                  [value]="borrador().nombre"
                  [error]="errorCampo('nombre')"
                  (valueChange)="actualizar('nombre', $any($event))"
                />
              </div>
              <div class="grid gap-siaf-md md:grid-cols-6">
                <siaf-input
                  class="md:col-span-1"
                  label="Tipo"
                  type="select"
                  [required]="true"
                  [autoSuccess]="false"
                  [options]="opcionesConSeleccionar(opcionesTipoArchivo())"
                  [value]="borrador().tipo"
                  [error]="errorCampo('tipo')"
                  (valueChange)="cambiarTipo($any($event))"
                />
                <siaf-input
                  class="md:col-span-1"
                  label="Tipo de Control"
                  type="select"
                  [required]="tipoAsignacionHabilitado()"
                  [disabled]="!tipoAsignacionHabilitado()"
                  [autoSuccess]="false"
                  [options]="opcionesConSeleccionar(opcionesTipoAsignacion)"
                  [value]="tipoAsignacion()"
                  [error]="errorCampo('tipoAsignacion')"
                  (valueChange)="cambiarTipoAsignacion($any($event))"
                /><siaf-input
                  class="md:col-span-2"
                  label="Orden"
                  [required]="esAnexo()"
                  [disabled]="!esAnexo()"
                  [autoSuccess]="false"
                  [value]="orden()"
                  (valueChange)="cambiarOrden($any($event))"
                  [error]="errorOrden()"
                /><siaf-input
                  class="md:col-span-2"
                  label="Prefijo"
                  [required]="prefijoEsObligatorio()"
                  [disabled]="!tipoSeleccionado()"
                  [autoSuccess]="false"
                  [value]="prefijo()"
                  [error]="errorCampo('prefijo')"
                  (valueChange)="cambiarPrefijo($any($event))"
                />
              </div>
              <div class="grid gap-siaf-md md:grid-cols-2">
                <section class="grid gap-siaf-xs">
                  <div class="flex items-center gap-siaf-xs">
                    <h3 class="m-0 text-sm font-bold uppercase">
                      Documento plantilla
                      <span class="text-[var(--sys-color-text-feedback-danger)]"
                        >*</span
                      >
                    </h3>
                    <siaf-button
                      class="ml-auto"
                      variant="accent"
                      icon="file_upload"
                      [iconOnly]="true"
                      [disabled]="!tipoSeleccionado() || !!borrador().plantilla"
                      ariaLabel="Adjuntar documento plantilla"
                      (click)="adjuntarPlantilla()"
                    />
                  </div>
                  @if (borrador().plantilla) {
                    <div class="overflow-hidden border-b border-[var(--sys-color-divider-default)] text-sm">
                      <div class="grid grid-cols-[48px_1fr] bg-surface-high text-[10px] font-bold uppercase"><span class="px-siaf-md py-siaf-xs">Nro</span><span class="px-siaf-md py-siaf-xs">Archivo</span></div>
                      <div class="grid grid-cols-[48px_1fr] items-center"><span class="px-siaf-md">1</span><div class="flex min-w-0 items-center gap-siaf-xs px-siaf-md py-siaf-xs"><div class="min-w-0 flex-1"><strong class="block truncate">{{ borrador().plantilla }}</strong><small class="text-text-muted">{{ tamanoPlantilla() }}</small></div><button type="button" class="inline-flex size-6 items-center justify-center" aria-label="Descargar documento plantilla"><siaf-icon name="download" [size]="20" /></button><button type="button" class="inline-flex size-6 items-center justify-center" aria-label="Retirar documento plantilla" (click)="retirarPlantilla()"><siaf-icon name="cancel" [size]="20" /></button></div></div>
                    </div>
                  } @else {
                    <p class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted">No se ha subido ningún documento. Haga clic en el botón para adjuntar.</p>
                  }
                  @if (errorCampo("plantilla")) {
                    <small
                      class="text-xs text-[var(--sys-color-text-feedback-danger)]"
                    >
                      {{ errorCampo("plantilla") }}
                    </small>
                  }
                </section>
                <section class="grid gap-siaf-xs">
                  <div class="flex items-center gap-siaf-xs">
                    <h3 class="m-0 text-sm font-bold uppercase">
                      Documento reporte
                    </h3>
                    <siaf-button
                      class="ml-auto"
                      variant="accent"
                      icon="file_upload"
                      [iconOnly]="true"
                      [disabled]="!tipoSeleccionado() || !!documentoReporte()"
                      ariaLabel="Adjuntar documento reporte"
                      (click)="adjuntarReporte()"
                    />
                  </div>
                  <p
                    class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                  >
                    {{
                      documentoReporte() ||
                        "No se ha subido ningún documento. Haga clic en el botón para adjuntar."
                    }}
                  </p>
                </section>
              </div>
            </section>
          </section>
          <section class="apm-configuration rounded-siaf-md bg-surface p-siaf-md" [attr.inert]="archivoEnConsulta() ? '' : null">
            <div class="mb-siaf-md flex items-center gap-siaf-xs">
              <h3 class="m-0 text-sm font-bold uppercase">
                Configuración de archivo
              </h3>
            </div>
            <div class="apm-tab-panel apm-attributes-content-body flex w-full min-w-0 flex-col gap-siaf-lg border border-[var(--sys-color-divider-default)] px-siaf-lg py-siaf-md">
              <siaf-tabs
                [tabs]="tabs"
                [activeId]="pestana()"
                ariaLabel="Configuración del archivo"
                [fullWidth]="true"
                [border]="false"
                (activeIdChange)="pestana.set($event)"
              />
              @if (pestana() === "atributos") {
                <div class="apm-attributes-content-block flex w-full min-w-0 flex-col gap-siaf-lg">
                  <div class="flex items-center gap-siaf-xs">
                    <h3 class="m-0 text-sm font-bold uppercase">
                      Atributos del archivo
                    </h3>
                    <siaf-button
                      class="ml-auto"
                      variant="accent"
                      icon="add"
                      [iconOnly]="true"
                      [disabled]="!borrador().plantilla"
                      ariaLabel="Agregar atributo"
                      (click)="agregarAtributo()"
                    />
                  </div>
                  @if (atributosVista().length) {
                    <siaf-records-search-toolbar class="block min-w-0" placeholder="Buscar">
                      <ng-container actions>
                        <siaf-button variant="text" icon="filter_list" [iconOnly]="true" ariaLabel="Filtrar atributos" />
                        <siaf-button variant="text" icon="more_vert" [iconOnly]="true" ariaLabel="Más opciones de atributos" />
                      </ng-container>
                    </siaf-records-search-toolbar>
                    <div class="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center">
                      <div class="apm-attribute-selection-column grid place-items-center">
                        <input type="checkbox" [checked]="todosAtributosSeleccionados()" (change)="seleccionarTodosAtributos($any($event.target).checked)" aria-label="Seleccionar todos los atributos" />
                      </div>
                      <div class="flex min-w-0 items-center gap-siaf-xs">
                        @if (cantidadAtributosSeleccionados() === 1) {
                          <siaf-button variant="text" icon="edit" [iconOnly]="true" ariaLabel="Editar atributo" (click)="editarAtributo()" />
                        }
                        @if (cantidadAtributosSeleccionados() > 0) {
                          <siaf-button variant="text" icon="delete" [iconOnly]="true" ariaLabel="Eliminar atributos seleccionados" (click)="confirmarEliminarAtributo.set(true)" />
                        }
                        <siaf-pagination class="ml-auto min-w-0" position="Top" [pageSize]="10" [totalItems]="atributosVista().length" [totalPages]="1" />
                      </div>
                    </div>
                    <div class="apm-attributes-table-scroll" aria-label="Tabla de atributos del archivo">
                      <table class="apm-attributes-table min-w-[2240px] w-full border-collapse text-sm">
                        <colgroup><col class="apm-attribute-selection-column" /><col class="w-[72px]" /><col class="w-[72px]" /><col class="w-[260px]" /><col class="w-[260px]" /><col class="w-[200px]" /><col class="w-[240px]" /><col class="w-[160px]" /><col class="w-[160px]" /><col class="w-[135px]" /><col class="w-[180px]" /><col class="w-[135px]" /><col class="w-[120px]" /><col class="w-[120px]" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="apm-attribute-selection-column p-0"></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Código</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Orden</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Columna del Excel</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nombre del campo</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Destino del dato</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Clasificador</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nivel mínimo</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nivel máximo</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Autogenerado</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Derivado por</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Tipo de dato</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Obligatorio</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Multianual</span></th></tr></thead>
                        <tbody>@for (a of atributosVista(); track a.id) {<tr class="border-b border-[var(--sys-color-divider-default)]" [class.bg-[var(--sys-color-bg-states-light-selected)]]="atributoEstaSeleccionado(a.id)"><td class="apm-attribute-selection-column p-0 text-center align-middle"><input type="checkbox" [checked]="atributoEstaSeleccionado(a.id)" (change)="alternarSeleccionAtributo(a.id, $any($event.target).checked)" aria-label="Seleccionar fila atributo" /></td><td class="p-siaf-sm" siafTooltip>{{a.codigo}}</td><td class="p-siaf-sm" siafTooltip>{{a.orden}}</td><td class="apm-multi-value-cell p-siaf-sm">@if (a.columnas.length === 1) {<span class="apm-multi-value-lines" [siafTooltip]="etiquetasColumnasOrdenadas(a.columnas)" tooltipMode="truncated">{{etiquetasColumnasEnLineas(a.columnas)}}</span>} @else if (a.columnas.length > 1) {<div class="apm-column-tags" [siafTooltip]="etiquetasColumnasOrdenadas(a.columnas)">@for (columna of etiquetasColumnasComoTags(a.columnas); track columna) {<siaf-tag variant="input" size="small">{{ columna }}</siaf-tag>}</div>}</td><td class="p-siaf-sm" [siafTooltip]="identificadorTecnico(a.nombre)" tooltipMode="truncated">{{identificadorTecnico(a.nombre)}}</td><td class="p-siaf-sm" siafTooltip>{{a.destino}}</td><td class="p-siaf-sm" siafTooltip>{{a.clasificador}}</td><td class="p-siaf-sm" siafTooltip>{{a.nivelMinimo}}</td><td class="p-siaf-sm" siafTooltip>{{a.nivelMaximo}}</td><td class="p-siaf-sm" siafTooltip>{{a.autogenerado ? 'Sí' : 'No'}}</td><td class="p-siaf-sm" siafTooltip>{{etiquetaDerivadoPor(a.derivadoPor)}}</td><td class="p-siaf-sm" siafTooltip>{{a.tipoDato}}</td><td class="p-siaf-sm" siafTooltip>{{a.obligatorio ? 'Sí' : 'No'}}</td><td class="p-siaf-sm" siafTooltip>{{a.multianual ? 'Sí' : 'No'}}</td></tr>}</tbody>
                      </table>
                    </div>
                    <siaf-pagination class="block min-w-0" position="Bottom" [rowPage]="true" [pageSize]="10" [rowsPerPage]="10" [totalItems]="atributosVista().length" [totalPages]="1" />
                  } @else {
                      <span
                        class="w-full rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                        >{{
                          borrador().plantilla
                            ? "Aún no se han agregado atributos. Haga clic en Añadir para registrar el primero."
                            : "Adjunte el documento plantilla para agregar atributos."
                        }}</span
                      >
                  }
                </div>
              }
              @if (pestana() === "reglas") {
                <div class="p-siaf-md">
                  <div class="mb-siaf-md flex">
                    <h3 class="m-0 text-sm font-bold">Reglas sumarizadas</h3>
                    <siaf-button
                      class="ml-auto"
                      variant="filled"
                      icon="add"
                      [iconOnly]="true"
                      ariaLabel="Agregar regla"
                      (click)="agregarRegla()"
                    />
                  </div>
                  @if (borrador().reglas.length) {
                    <div class="mb-siaf-sm grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center">
                      <div class="apm-attribute-selection-column grid place-items-center">
                        <input type="checkbox" [checked]="todasReglasSeleccionadas()" (change)="seleccionarTodasReglas($any($event.target).checked)" aria-label="Seleccionar todas las reglas" />
                      </div>
                      <div class="flex min-w-0 items-center gap-siaf-xs">
                        @if (cantidadReglasSeleccionadas() === 1) {
                          <siaf-button variant="text" icon="edit" [iconOnly]="true" ariaLabel="Editar regla" (click)="editarReglaSeleccionada()" />
                        }
                        @if (cantidadReglasSeleccionadas() > 0) {
                          <siaf-button variant="text" icon="delete" [iconOnly]="true" ariaLabel="Eliminar reglas seleccionadas" (click)="confirmarEliminarReglas.set(true)" />
                        }
                        <siaf-pagination class="ml-auto min-w-0" position="Top" [pageSize]="10" [totalItems]="reglasVista().length" [totalPages]="1" />
                      </div>
                    </div>
                    <div class="overflow-x-auto" aria-label="Tabla de reglas sumarizadas">
                      <table class="apm-rules-table min-w-[1260px] w-full border-collapse text-sm">
                        <thead class="bg-surface-high text-[10px] uppercase">
                          <tr>
                            <th class="w-12"></th>
                            <th class="p-siaf-sm"><span class="block truncate" siafTooltip>Código</span></th>
                            <th class="p-siaf-sm"><span class="block truncate" siafTooltip>Archivo padre</span></th>
                            <th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nivel de agregación</span></th>
                            <th class="p-siaf-sm"><span class="block truncate" siafTooltip>Operador</span></th>
                            <th class="p-siaf-sm"><span class="block truncate" siafTooltip>Atributos comunes</span></th>
                            <th class="p-siaf-sm"><span class="block truncate" siafTooltip>Montos a revisar</span></th>
                          </tr>
                        </thead>
                        <tbody
                          class="text-[length:var(--sys-typography-size-body-2,14px)] font-normal leading-normal"
                        >
                          @for (r of reglasVista(); track r.id) {
                            <tr
                              class="border-b border-[var(--sys-color-divider-default)]"
                              [class.bg-[var(--sys-color-bg-states-light-selected)]]="reglaEstaSeleccionada(r.id)"
                            >
                              <td class="p-siaf-sm text-center"><input type="checkbox" [checked]="reglaEstaSeleccionada(r.id)" (change)="alternarSeleccionRegla(r.id, $any($event.target).checked)" aria-label="Seleccionar regla" /></td>
                              <td class="p-siaf-sm" siafTooltip>{{ r.codigo }}</td>
                              <td class="p-siaf-sm" siafTooltip>{{ etiquetaArchivoPadre(r) }}</td>
                              <td class="p-siaf-sm" siafTooltip>{{ r.nivelAgregacion }}</td>
                              <td class="p-siaf-sm" siafTooltip>{{ r.operador }}</td>
                              <td class="apm-rules-multi-value-cell p-siaf-sm"><span class="apm-multi-value-lines" [siafTooltip]="etiquetasAtributos(r.atributosComunes ?? [])" tooltipMode="truncated">{{ etiquetasAtributosEnLineas(r.atributosComunes ?? []) }}</span></td>
                              <td class="apm-rules-multi-value-cell p-siaf-sm"><span class="apm-multi-value-lines" [siafTooltip]="etiquetasAtributos(r.montosARevisar ?? [])" tooltipMode="truncated">{{ etiquetasAtributosEnLineas(r.montosARevisar ?? []) }}</span></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <siaf-pagination class="mt-siaf-sm block min-w-0" position="Bottom" [rowPage]="true" [pageSize]="10" [rowsPerPage]="10" [totalItems]="reglasVista().length" [totalPages]="1" />
                  } @else {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      Aún no se han registrado reglas sumarizadas. Haz clic en el botón Agregar (+) para registrar la primera.
                    </p>
                  }
                </div>
              }
              @if (pestana() === "referencias") {
                <div class="p-siaf-md">
                  <h3 class="m-0 mb-siaf-md text-sm font-bold">
                    Referencias cruzadas
                  </h3>
                  @if (mensajeAlertaReferenciaDuplicada(); as mensajeDuplicidad) {
                    <siaf-alert
                      class="mb-siaf-md block"
                      tone="error"
                      title="Catálogo relacional duplicado"
                      [description]="mensajeDuplicidad"
                    />
                  }
                  @if (referenciasVista().length || referenciaEsNueva()) {
                    <div class="overflow-x-auto" aria-label="Tabla de referencias cruzadas">
                      <table class="apm-editable-table min-w-[920px] w-full border-collapse text-sm">
                        <colgroup><col class="w-[110px]" /><col class="w-[300px]" /><col class="w-[minmax(360px,1fr)]" /><col class="w-[130px]" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr>
                          <th class="p-siaf-sm text-left">Código</th><th class="p-siaf-sm text-left">Catálogo relacional</th><th class="p-siaf-sm text-left">Atributos comunes</th><th class="apm-editable-actions p-siaf-sm text-center"></th>
                        </tr></thead>
                        <tbody>
                          @for (referencia of referenciasVista(); track referencia.id) {
                            @let fila = referenciaFila(referencia);
                            <tr class="border-b border-[var(--sys-color-divider-default)]" [attr.data-referencia-id]="referencia.id">
                              <td class="p-siaf-sm"><siaf-input class="min-w-0" label="Código" [disabled]="true" [value]="fila.codigo.toString()" /></td>
                              <td class="p-siaf-sm"><siaf-input apmDisableContentTooltip data-catalogo-relacional-field label="Catálogo relacional" type="select" [required]="true" [autoSuccess]="false" [state]="tieneErrorCatalogoRelacionalFila(referencia) ? 'error' : 'enabled'" [error]="errorCatalogoRelacionalFila(referencia)" [selectPanelFixed]="true" [selectPanelMinWidth]="300" [options]="opcionesConSeleccionar(catalogosRelacionales)" [value]="fila.catalogoRelacional" (valueChange)="actualizarReferenciaFila(referencia, 'catalogoRelacional', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-apm-multi-select label="Atributos comunes" [required]="true" [showSelectionHeader]="true" [panelFixed]="true" [singleScrollPanel]="true" [panelMinWidth]="360" [options]="opcionesAtributosComunesReferencia()" [value]="fila.atributosComunes" (valueChange)="actualizarReferenciaFila(referencia, 'atributosComunes', $any($event))" /></td>
                              <td class="apm-editable-actions p-siaf-sm"><div class="apm-grid-actions flex justify-center gap-siaf-xxs">
                                @if (referenciaTieneCambios(referencia)) {
                                  <siaf-button class="apm-grid-action" siafTooltip="Cancelar" tooltipMode="always" variant="text" size="sm" icon="close" [iconOnly]="true" ariaLabel="Cancelar cambios de referencia cruzada" (click)="cancelarCambiosReferencia(referencia.id)" />
                                  <siaf-button class="apm-grid-action" siafTooltip="Aceptar" tooltipMode="always" variant="text" size="sm" icon="check" [iconOnly]="true" ariaLabel="Aceptar cambios de referencia cruzada" [disabled]="!referenciaFilaValida(referencia)" (click)="aceptarCambiosReferencia(referencia)" />
                                } @else {
                                  <siaf-button class="apm-grid-action" siafTooltip="Eliminar" tooltipMode="always" variant="text" size="sm" icon="delete" [iconOnly]="true" ariaLabel="Eliminar referencia cruzada" [disabled]="referenciaFilaAbierta()" (click)="solicitarEliminarReferencia(referencia)" />
                                }
                              </div></td>
                            </tr>
                          }
                          @if (referenciaEsNueva()) {
                            @let fila = referenciaBorrador();
                            <tr class="border-b border-[var(--sys-color-divider-default)]" data-referencia-id="nueva">
                              <td class="p-siaf-sm"><siaf-input class="min-w-0" label="Código" [disabled]="true" [value]="fila.codigo.toString()" /></td>
                              <td class="p-siaf-sm"><siaf-input apmDisableContentTooltip data-catalogo-relacional-field label="Catálogo relacional" type="select" [required]="true" [autoSuccess]="false" [state]="tieneErrorCatalogoRelacionalNueva() ? 'error' : 'enabled'" [error]="errorCatalogoRelacionalNueva()" [selectPanelFixed]="true" [selectPanelMinWidth]="300" [options]="opcionesConSeleccionar(catalogosRelacionales)" [value]="fila.catalogoRelacional" (valueChange)="actualizarReferenciaNueva('catalogoRelacional', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-apm-multi-select label="Atributos comunes" [required]="true" [showSelectionHeader]="true" [panelFixed]="true" [singleScrollPanel]="true" [panelMinWidth]="360" [options]="opcionesAtributosComunesReferencia()" [value]="fila.atributosComunes" (valueChange)="actualizarReferenciaNueva('atributosComunes', $any($event))" /></td>
                              <td class="apm-editable-actions p-siaf-sm"><div class="apm-grid-actions flex justify-center gap-siaf-xxs"><siaf-button class="apm-grid-action" siafTooltip="Cancelar" tooltipMode="always" variant="text" size="sm" icon="close" [iconOnly]="true" ariaLabel="Cancelar nueva referencia cruzada" (click)="cancelarReferenciaNueva()" /><siaf-button class="apm-grid-action" siafTooltip="Aceptar" tooltipMode="always" variant="text" size="sm" icon="check" [iconOnly]="true" ariaLabel="Aceptar nueva referencia cruzada" [disabled]="!referenciaNuevaValida()" (click)="aceptarReferenciaNueva()" /></div></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <siaf-button class="mt-siaf-md" variant="text" icon="add" [disabled]="referenciaFilaAbierta()" (click)="agregarReferencia()">Añadir</siaf-button>
                    <siaf-pagination class="mt-siaf-md block min-w-0" position="Bottom" [rowPage]="true" [pageSize]="10" [rowsPerPage]="10" [totalItems]="referenciasVista().length" [totalPages]="1" />
                  } @else {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      Aún no se han agregado referencias cruzadas. Haga clic en Añadir para registrar la primera.
                    </p>
                    <siaf-button class="mt-siaf-md" variant="text" icon="add" [disabled]="referenciaFilaAbierta()" (click)="agregarReferencia()">Añadir</siaf-button>
                  }
                </div>
              }
              @if (pestana() === "firmantes") {
                <div class="p-siaf-md">
                  <h3 class="m-0 mb-siaf-md text-sm font-bold">AGREGAR FIRMANTES</h3>
                  @if (firmantesVista().length || firmanteEsNuevo()) {
                    <div class="apm-firmantes-table-scroll" aria-label="Tabla de firmantes">
                      <table class="apm-editable-table min-w-[980px] w-full border-collapse text-sm">
                        <colgroup><col class="w-[90px]" /><col class="w-[320px]" /><col class="w-[170px]" /><col class="w-[190px]" /><col class="w-[130px]" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr>
                          <th class="p-siaf-sm text-left">Código</th><th class="p-siaf-sm text-left">Firmante</th><th class="p-siaf-sm text-left">Orden</th><th class="p-siaf-sm text-left">Documento firmado</th><th class="p-siaf-sm text-center"></th>
                        </tr></thead>
                      </table>
                      <div class="apm-firmantes-table-body" [class.apm-firmantes-table-body--vertical]="firmantesRequierenScrollVertical()">
                      <table class="apm-editable-table min-w-[980px] w-full border-collapse text-sm">
                        <colgroup><col class="w-[90px]" /><col class="w-[320px]" /><col class="w-[170px]" /><col class="w-[190px]" /><col class="w-[130px]" /></colgroup>
                        <tbody>
                          @for (firmante of firmantesVista(); track firmante.id) {
                            @let fila = firmanteFila(firmante);
                            <tr class="border-b border-[var(--sys-color-divider-default)]" [attr.data-firmante-id]="firmante.id">
                              <td class="p-siaf-sm"><siaf-input class="min-w-0" label="Código" [disabled]="true" [value]="fila.codigo.toString()" /></td>
                              <td class="p-siaf-sm"><siaf-input data-firmante-field label="Firmante" type="select" [required]="true" [autoSuccess]="false" [selectPanelFixed]="true" [selectPanelMinWidth]="320" [disabled]="firmante.documentoFirmado" [error]="errorFirmanteFila(firmante)" [options]="opcionesConSeleccionar(firmantesDisponibles)" [value]="fila.firmante" (valueChange)="actualizarFirmanteFila(firmante, 'firmante', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-input data-orden-field label="Orden" type="number" [autoSuccess]="false" [disabled]="firmante.documentoFirmado" [error]="errorOrdenFirmanteFila(firmante)" [value]="fila.orden" (valueChange)="actualizarFirmanteFila(firmante, 'orden', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-status-tag [tone]="fila.documentoFirmado ? 'success' : 'warning'" appearance="soft" size="small">{{ fila.documentoFirmado ? 'Firmado' : 'Pendiente de firma' }}</siaf-status-tag></td>
                              <td class="p-siaf-sm"><div class="apm-grid-actions flex justify-center gap-siaf-xxs">
                                @if (firmanteTieneCambios(firmante)) {
                                  <siaf-button class="apm-grid-action" siafTooltip="Cancelar" tooltipMode="always" variant="text" size="sm" icon="close" [iconOnly]="true" ariaLabel="Cancelar cambios de firmante" (click)="cancelarCambiosFirmante(firmante.id)" />
                                  <siaf-button class="apm-grid-action" siafTooltip="Aceptar" tooltipMode="always" variant="text" size="sm" icon="check" [iconOnly]="true" ariaLabel="Aceptar cambios de firmante" [disabled]="!firmanteFilaValida(firmante)" (click)="aceptarCambiosFirmante(firmante)" />
                                } @else {
                                  <siaf-button class="apm-grid-action" siafTooltip="Eliminar" tooltipMode="always" variant="text" size="sm" icon="delete" [iconOnly]="true" ariaLabel="Eliminar firmante" [disabled]="firmante.documentoFirmado || firmanteFilaAbierta()" (click)="solicitarEliminarFirmante(firmante)" />
                                }
                              </div></td>
                            </tr>
                          }
                          @if (firmanteEsNuevo()) {
                            @let fila = firmanteBorrador();
                            <tr class="border-b border-[var(--sys-color-divider-default)]" data-firmante-id="nuevo">
                              <td class="p-siaf-sm"><siaf-input class="min-w-0" label="Código" [disabled]="true" [value]="fila.codigo.toString()" /></td>
                              <td class="p-siaf-sm"><siaf-input data-firmante-field label="Firmante" type="select" [required]="true" [autoSuccess]="false" [selectPanelFixed]="true" [selectPanelMinWidth]="320" [error]="errorFirmante()" [options]="opcionesConSeleccionar(firmantesDisponibles)" [value]="fila.firmante" (valueChange)="actualizarFirmante('firmante', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-input data-orden-field label="Orden" type="number" [autoSuccess]="false" [error]="errorOrdenFirmante()" [value]="fila.orden" (valueChange)="actualizarFirmante('orden', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-status-tag tone="warning" appearance="soft" size="small">Pendiente de firma</siaf-status-tag></td>
                              <td class="p-siaf-sm"><div class="apm-grid-actions flex justify-center gap-siaf-xxs"><siaf-button class="apm-grid-action" siafTooltip="Cancelar" tooltipMode="always" variant="text" size="sm" icon="close" [iconOnly]="true" ariaLabel="Cancelar nuevo firmante" (click)="cancelarFirmante()" /><siaf-button class="apm-grid-action" siafTooltip="Aceptar" tooltipMode="always" variant="text" size="sm" icon="check" [iconOnly]="true" ariaLabel="Aceptar nuevo firmante" [disabled]="!firmanteValido()" (click)="aceptarFirmante()" /></div></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                      </div>
                    </div>
                    <siaf-button class="mt-siaf-md" variant="text" icon="add" [disabled]="firmanteFilaAbierta()" (click)="agregarFirmante()">Añadir</siaf-button>
                    <siaf-pagination class="mt-siaf-md block min-w-0" position="Bottom" [rowPage]="true" [pageSize]="10" [rowsPerPage]="10" [totalItems]="firmantesVista().length" [totalPages]="1" />
                  } @else {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      Aún no se han agregado firmantes. Haga clic en Añadir para registrar el primero.
                    </p>
                    <siaf-button class="mt-siaf-md" variant="text" icon="add" [disabled]="firmanteFilaAbierta()" (click)="agregarFirmante()">Añadir</siaf-button>
                  }
                </div>
              }
            </div>
          </section>
          <section class="rounded-siaf-md bg-surface p-siaf-md">
            <h3 class="m-0 mb-siaf-md text-sm font-bold uppercase">Vigencia</h3>
            <div class="grid gap-siaf-md md:grid-cols-3">
              <siaf-radio-group
                label="Estado"
                name="estado-archivo"
                [inline]="true"
                [options]="estados"
                [value]="borrador().estado"
                (valueChange)="solicitarCambioEstado($any($event))"
              />
              <div>
                <siaf-input
                  label="Fecha desde"
                  [disabled]="true"
                  [value]="borrador().desde"
                /><small class="mt-siaf-xxs block text-xs text-text-muted"
                  >Será asignada cuando se grabe el registro</small
                >
              </div>
              <siaf-input
                label="Fecha hasta"
                [disabled]="true"
                [value]="borrador().hasta"
              />
            </div>
          </section>
        </article>
      }
    </section>
    <siaf-side-nav
      title="Filtros"
      [open]="filtros()"
      confirmLabel="Aplicar"
      (confirmed)="aplicarFiltros()"
      (canceled)="cancelarFiltros()"
      (closed)="cancelarFiltros()"
      ><div class="grid gap-siaf-md">
        <siaf-input
          label="Año"
          type="select"
          [autoSuccess]="false"
          [options]="[
            { value: '', label: 'Todos' },
            { value: '2027', label: '2027' },
            { value: '2026', label: '2026' },
          ]"
          [value]="filtrosBorrador().anio"
          (valueChange)="actualizarFiltroBorrador('anio', $any($event))"
        /><siaf-input label="Código" [value]="filtrosBorrador().codigo" (valueChange)="actualizarFiltroBorrador('codigo', $any($event))" />
        <siaf-input label="Nombre del archivo" [value]="filtrosBorrador().nombre" (valueChange)="actualizarFiltroBorrador('nombre', $any($event))" />
        <siaf-input label="Tipo" type="select" [autoSuccess]="false" [options]="opcionesConSeleccionar(opcionesTipoArchivo())" [value]="filtrosBorrador().tipo" (valueChange)="actualizarFiltroBorrador('tipo', $any($event))" />
        <siaf-input label="Tipo de asignación" type="select" [autoSuccess]="false" [options]="opcionesConSeleccionar(opcionesTipoAsignacion)" [value]="filtrosBorrador().tipoAsignacion" (valueChange)="actualizarFiltroBorrador('tipoAsignacion', $any($event))" />
        <siaf-input
          label="Estado"
          type="select"
          [autoSuccess]="false"
          [options]="[
            { value: '', label: 'Todos' },
            { value: 'Activo', label: 'Activo' },
            { value: 'Inactivo', label: 'Inactivo' },
          ]"
          [value]="filtrosBorrador().estado"
          (valueChange)="actualizarFiltroBorrador('estado', $any($event))"
        />
        <siaf-input label="Fecha desde" [value]="filtrosBorrador().desde" (valueChange)="actualizarFiltroBorrador('desde', $any($event))" />
        <siaf-input label="Fecha hasta" [value]="filtrosBorrador().hasta" (valueChange)="actualizarFiltroBorrador('hasta', $any($event))" />
        </div
    ></siaf-side-nav>
    <siaf-selection-side-nav class="apm-copy-origin-search"
      title="Agregar archivo de la APM"
      mode="single"
      [open]="panelOrigen()"
      [rows]="origenesFiltrados()"
      [columns]="columnasOrigen"
      [selectedIds]="
        origenSeleccionado() ? [origenSeleccionado()!.id.toString()] : []
      "
      [disabledIds]="origenesNoElegibles()"
      [searchValue]="busquedaOrigen()"
      searchPlaceholder="Buscar por nombre o código"
      [paginated]="true"
      [fitContent]="true"
      [pageSize]="10"
      [totalItems]="origenesFiltrados().length"
      [totalPages]="1"
      [customTable]="true"
      (searchChange)="busquedaOrigen.set($event)"
      (filterRequested)="alternarFiltroAnioOrigen()"
      (selectionChange)="seleccionarOrigenPorId($event)"
      (accepted)="aceptarOrigen()"
      (closed)="cancelarOrigen()"
    >
      <div class="flex min-h-8 items-center">
        <span class="inline-flex h-8 items-center rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] bg-surface px-siaf-xs py-siaf-xxs text-sm leading-normal text-text">
          Tipo: {{ tipoOrigen() }}
        </span>
        @if (anioOrigenFiltro()) {
          <span class="ml-siaf-xs inline-flex h-8 items-center gap-siaf-xxs rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] bg-surface px-siaf-xs py-siaf-xxs text-sm leading-normal text-text">
            Año: {{ anioOrigenFiltro() }}
            <button type="button" class="inline-flex size-5 items-center justify-center rounded-siaf-sm text-[var(--sys-color-icon-states-enabled)]" aria-label="Quitar filtro Año" (click)="anioOrigenFiltro.set('')">
              <siaf-icon name="close" [size]="20" />
            </button>
          </span>
        }
        @if (estadoOrigenFiltro()) {
          <span class="ml-siaf-xs inline-flex h-8 items-center gap-siaf-xxs rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] bg-surface px-siaf-xs py-siaf-xxs text-sm leading-normal text-text">
            Estado: {{ estadoOrigenFiltro() }}
            <button type="button" class="inline-flex size-5 items-center justify-center rounded-siaf-sm text-[var(--sys-color-icon-states-enabled)]" aria-label="Quitar filtro Estado" (click)="estadoOrigenFiltro.set('')"><siaf-icon name="close" [size]="20" /></button>
          </span>
        }
        @if (anioOrigenFiltro() || estadoOrigenFiltro()) {
          <div class="ml-auto"><siaf-button variant="outline" size="sm" icon="delete" (click)="limpiarFiltrosOrigen()">Borrar filtros</siaf-button></div>
        }
      </div>
      <div class="mt-siaf-lg overflow-x-auto">
        <table class="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead class="bg-surface-high text-xs font-bold uppercase">
            <tr class="h-10">
              <th class="w-12"></th>
              <th class="px-siaf-md">Año</th>
              <th class="px-siaf-md">Código</th>
              <th class="px-siaf-md">Nombre del archivo</th>
              <th class="px-siaf-md">Tipo</th>
              <th class="px-siaf-md">Fecha desde</th>
              <th class="px-siaf-md">Fecha hasta</th>
            </tr>
          </thead>
          <tbody>
            @for (a of origenesFiltrados(); track a.id) {
              <tr
                class="h-14 border-b border-[var(--sys-color-divider-default)]"
                [class.cursor-pointer]="!tipoBloqueado(a)"
                [class.opacity-50]="tipoBloqueado(a)"
                [class.bg-[var(--sys-color-bg-states-light-selected)]]="
                  origenSeleccionado()?.id === a.id
                "
                (click)="seleccionarOrigen(a)"
              >
                <td class="px-siaf-md">
                  <input
                    type="radio"
                    name="origen-apm"
                    [checked]="origenSeleccionado()?.id === a.id"
                    [disabled]="tipoBloqueado(a)"
                    (click)="$event.stopPropagation()"
                    (change)="seleccionarOrigen(a)"
                    aria-label="Seleccionar archivo"
                  />
                </td>
                <td class="px-siaf-md">{{ a.anio }}</td>
                <td class="px-siaf-md">{{ a.codigo }}</td>
                <td class="px-siaf-md">
                  {{ a.nombre }}
                  @if (a.id === 11) {<small class="ml-3 text-base font-bold text-[#0066FF]">← Elegir este registro</small>}
                  @if (tipoBloqueado(a)) {
                    <small
                      class="block text-[var(--sys-color-text-feedback-danger)]"
                      >{{ motivoBloqueo(a) }}</small
                    >
                  }
                </td>
                <td class="px-siaf-md">{{ a.tipo }}</td>
                <td class="px-siaf-md">{{ a.desde }}</td>
                <td class="px-siaf-md">{{ a.hasta }}</td>
              </tr>
            } @empty {
              <tr>
                <td class="p-siaf-md" colspan="7">
                  <div
                    class="rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                  >
                    No se encontraron archivos de origen.
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </siaf-selection-side-nav>
    <siaf-side-nav title="Filtros" [open]="panelFiltrosOrigen()" confirmLabel="Aplicar" (confirmed)="aplicarFiltrosOrigen()" (canceled)="panelFiltrosOrigen.set(false)" (closed)="panelFiltrosOrigen.set(false)">
      <div class="grid gap-siaf-md">
        <siaf-input label="Año" type="select" [autoSuccess]="false" [options]="[{ value: '', label: 'Todos' }, { value: '2026', label: '2026' }, { value: '2025', label: '2025' }]" [value]="filtrosOrigenBorrador().anio" (valueChange)="actualizarFiltroOrigen('anio', $any($event))" />
        <siaf-input label="Estado" type="select" [autoSuccess]="false" [options]="[{ value: '', label: 'Todos' }, { value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]" [value]="filtrosOrigenBorrador().estado" (valueChange)="actualizarFiltroOrigen('estado', $any($event))" />
      </div>
    </siaf-side-nav>
    <siaf-upload-side-nav
      class="apm-plantilla-upload"
      title="Carga documento plantilla"
      [open]="cargaPlantillaAbierta()"
      description="Selecciona y carga el archivo de tu elección."
      accept=".xls,.xlsx"
      acceptedLabel="Solo admite archivos .xls, .xlsx"
      hint="Se permiten archivos de 10 MB como máximo"
      [maxSizeMb]="10"
      invalidFormatMessage="AE-20: El archivo debe tener formato .xls o .xlsx."
      (closed)="cancelarCargaPlantilla()"
      (confirmed)="confirmarCargaPlantilla($event)"
    />
    <siaf-upload-side-nav
      title="Carga documento reporte"
      [open]="cargaReporteAbierta()"
      description="Selecciona y carga el archivo de tu elección."
      accept=".xls,.xlsx"
      acceptedLabel="Solo admite archivos .xls, .xlsx"
      hint="Se permiten archivos de 10 MB como máximo"
      [maxSizeMb]="10"
      invalidFormatMessage="AE-20: El archivo debe tener formato .xls o .xlsx."
      (closed)="cancelarCargaReporte()"
      (confirmed)="confirmarCargaReporte($event)"
    />
    <siaf-side-panel class="apm-atributo-panel apm-registro-panel" [open]="panelAtributoAbierto()" [title]="editandoAtributo() ? 'Editar atributo del archivo' : 'Agregar atributo del archivo'" [confirmDisabled]="!atributoValido()" (closed)="cerrarAtributo()" (confirmed)="guardarAtributo()">
      <div class="flex flex-col gap-siaf-lg">
        <section><h3 class="mb-siaf-md text-sm font-bold uppercase">Columna</h3><div class="grid min-w-0 grid-cols-1 gap-siaf-md lg:grid-cols-4">
          <siaf-input class="min-w-0" label="Código" [value]="atributoBorrador().codigo.toString()" [disabled]="true" />
          <siaf-input class="min-w-0" label="Orden" type="number" [required]="true" [error]="errorOrdenAtributo()" [value]="atributoBorrador().orden" (valueChange)="actualizarAtributo('orden', $any($event))" />
          <siaf-apm-multi-select class="min-w-0" label="Columna Excel" [disabled]="atributoBorrador().autogenerado" [options]="opcionesColumnasAtributo()" [value]="atributoBorrador().columnas" (valueChange)="seleccionarColumnas($any($event))" />
          <siaf-input class="min-w-0" label="Nombre del campo" [required]="true" [error]="errorNombreAtributo()" [value]="identificadorTecnico(atributoBorrador().nombre)" (valueChange)="actualizarNombreAtributo($any($event))" />
          <siaf-input class="min-w-0 lg:col-span-2" label="Destino del dato" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(destinosAtributo)" [value]="atributoBorrador().destino" (valueChange)="actualizarAtributo('destino', $any($event))" />
          <siaf-input class="min-w-0 lg:col-span-2" label="Tipo de dato" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(tiposDato)" [value]="atributoBorrador().tipoDato" (valueChange)="actualizarAtributo('tipoDato', $any($event))" />
        </div></section>
        <section><h3 class="mb-siaf-md text-sm font-bold uppercase">Datos del clasificador</h3><div class="grid min-w-0 grid-cols-1 gap-siaf-md lg:grid-cols-3">
          <siaf-input class="min-w-0" label="Clasificador" type="select" [autoSuccess]="false" [disabled]="atributoBorrador().tipoDato === 'Monto'" [options]="opcionesConSeleccionar(clasificadores)" [value]="atributoBorrador().clasificador" (valueChange)="cambiarClasificador($any($event))" />
          <siaf-input class="min-w-0" label="Nivel mínimo" type="select" [autoSuccess]="false" [disabled]="atributoBorrador().tipoDato === 'Monto' || !atributoBorrador().clasificador" [options]="opcionesConSeleccionar(nivelesDelClasificador())" [value]="atributoBorrador().nivelMinimo" (valueChange)="actualizarAtributo('nivelMinimo', $any($event))" />
          <siaf-input class="min-w-0" label="Nivel máximo" type="select" [autoSuccess]="false" [disabled]="atributoBorrador().tipoDato === 'Monto' || !atributoBorrador().clasificador" [options]="opcionesConSeleccionar(nivelesDelClasificador())" [value]="atributoBorrador().nivelMaximo" (valueChange)="actualizarAtributo('nivelMaximo', $any($event))" />
        </div></section>
        <section><h3 class="mb-siaf-md text-sm font-bold uppercase">Características</h3><div class="grid min-w-0 grid-cols-1 items-center gap-siaf-md text-sm lg:grid-cols-4"><label class="inline-flex min-w-0 items-center gap-siaf-xs"><input type="checkbox" [checked]="atributoBorrador().obligatorio" (change)="actualizarAtributo('obligatorio',$any($event.target).checked)" /> Obligatorio</label><label class="inline-flex min-w-0 items-center gap-siaf-xs"><input type="checkbox" [checked]="atributoBorrador().multianual" (change)="actualizarAtributo('multianual',$any($event.target).checked)" /> Multianual</label><label class="inline-flex min-w-0 items-center gap-siaf-xs"><input type="checkbox" [checked]="atributoBorrador().autogenerado" (change)="actualizarAtributo('autogenerado',$any($event.target).checked)" /> Autogenerado</label><siaf-input class="min-w-0" label="Derivado por" type="select" [autoSuccess]="false" [disabled]="!atributoBorrador().autogenerado" [options]="opcionesConSeleccionar(derivados)" [value]="atributoBorrador().derivadoPor" (valueChange)="actualizarAtributo('derivadoPor',$any($event))" /></div></section>
      </div>
    </siaf-side-panel>
    <siaf-side-panel class="apm-regla-panel apm-registro-panel" [open]="panelReglaAbierto()" [title]="editandoRegla() ? 'Editar regla sumarizada' : 'Agregar regla sumarizada'" [confirmDisabled]="!reglaValida()" (closed)="cerrarRegla()" (confirmed)="guardarRegla()">
      @if (mostrarAlertaCompatibilidadRegla()) {<siaf-alert class="mb-siaf-md block" tone="info" [title]="tituloAlertaCompatibilidadRegla()" [description]="descripcionAlertaCompatibilidadRegla()" [leadingIcon]="true" />}
      <div class="apm-regla-form grid grid-cols-1 gap-x-siaf-lg gap-y-siaf-md md:grid-cols-2">
        <siaf-input label="Código" [disabled]="true" [autoSuccess]="false" [value]="reglaBorrador().codigo ?? ''" />
        <siaf-input label="Archivo padre" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(opcionesArchivoPadre())" [value]="reglaBorrador().archivoPadre ?? ''" (valueChange)="actualizarRegla('archivoPadre', $any($event))" />
        <siaf-input label="Nivel de agregación" type="select" [required]="true" [autoSuccess]="false" [disabled]="!opcionesNivelesAgregacionRegla().length" [options]="opcionesConSeleccionar(opcionesNivelesAgregacionRegla())" [value]="reglaBorrador().nivelAgregacion ?? ''" (valueChange)="actualizarRegla('nivelAgregacion', $any($event))" />
        <siaf-input label="Operador" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(operadoresRegla)" [value]="reglaBorrador().operador" (valueChange)="actualizarRegla('operador', $any($event))" />
        <siaf-apm-multi-select label="Atributos comunes" [required]="true" [showSelectionHeader]="true" [disabled]="!opcionesAtributosComunesRegla().length" [options]="opcionesAtributosComunesRegla()" [value]="reglaBorrador().atributosComunes ?? []" (valueChange)="actualizarRegla('atributosComunes', $any($event))" />
        <siaf-apm-multi-select label="Montos a revisar" [required]="true" [showSelectionHeader]="true" [disabled]="!opcionesMontosARevisarRegla().length" [options]="opcionesMontosARevisarRegla()" [value]="reglaBorrador().montosARevisar ?? []" (valueChange)="actualizarRegla('montosARevisar', $any($event))" />
      </div>
    </siaf-side-panel>
    <siaf-column-visibility-panel
      title="COLUMNAS VISIBLES"
      selectAllLabel="Seleccionar todas"
      [open]="panelColumnas()"
      [catalogLayout]="true"
      [individualColumns]="columnasGenerales"
      [sections]="seccionesColumnas"
      [allSelected]="todasLasColumnasSeleccionadas()"
      [allIndeterminate]="columnasIndeterminadas()"
      [dirty]="columnasPendientesDeAplicar()"
      [isColumnVisible]="columnaPanelVisible"
      [isSectionSelected]="seccionColumnasSeleccionada"
      [isSectionIndeterminate]="seccionColumnasIndeterminada"
      (closed)="cerrarPanelColumnas()"
      (toggleAll)="alternarTodasLasColumnas($event)"
      (toggleColumn)="alternarColumnaPanel($event)"
      (toggleSection)="alternarSeccionPanel($event)"
      (reset)="restablecerColumnas()"
      (applied)="aplicarColumnas()"
    />
    <siaf-modal [open]="confirmarEliminarAtributo()" [showIllustration]="false" title="¿Eliminar atributo?" description="El atributo seleccionado se retirará del formulario." (confirmed)="eliminarAtributo()" (closed)="confirmarEliminarAtributo.set(false)" />
    <siaf-modal [open]="confirmarEliminarReglas()" variant="delete-record" [showIllustration]="false" title="¿Está seguro(a) de eliminar la regla sumarizada?" description="La regla sumarizada seleccionada se retirará de la lista del archivo." (confirmed)="eliminarReglasSeleccionadas()" (closed)="confirmarEliminarReglas.set(false)" />
    <siaf-modal [open]="confirmarEliminarReferencia() !== null" variant="delete-record" [showIllustration]="false" title="¿Está seguro(a) de eliminar la referencia cruzada?" description="La referencia se retirará de la lista del archivo." (confirmed)="eliminarReferencia()" (closed)="confirmarEliminarReferencia.set(null)" />
    <siaf-modal [open]="confirmarEliminarFirmante() !== null" variant="delete-record" [showIllustration]="false" title="¿Está seguro(a) de eliminar al firmante?" description="El firmante se retirará de la lista del archivo." (confirmed)="eliminarFirmante()" (closed)="confirmarEliminarFirmante.set(null)" />
    <siaf-modal [open]="confirmarReinicioDemo()" variant="custom" [showIllustration]="false" title="¿Reiniciar demo?" description="Se restaurarán los datos iniciales de Archivos de la APM." (confirmed)="reiniciarDemo()" (canceled)="confirmarReinicioDemo.set(false)" (closed)="confirmarReinicioDemo.set(false)" />
    <siaf-modal
      [open]="confirmarPlantilla()"
      variant="custom"
      [showIllustration]="false"
      title="¿Desea reemplazar el Documento Plantilla?"
      description="Se eliminarán los atributos, las reglas sumarizadas, las referencias cruzadas y el Documento Reporte registrados."
      (confirmed)="confirmarCambioPlantilla()"
      (canceled)="cancelarCambioPlantilla()"
      (closed)="cancelarCambioPlantilla()"
    />
    <siaf-modal
      [open]="confirmarGuardar()"
      variant="custom"
      title="¿Grabar archivo de la APM?"
      description="El registro se grabará."
      illustrationSrc="assets/figma/modals/save_1.svg"
      [showIllustration]="true"
      (confirmed)="grabar()"
      (canceled)="confirmarGuardar.set(false)"
      (closed)="confirmarGuardar.set(false)"
    />
    <siaf-modal
      [open]="confirmarDescartarCambios()"
      variant="custom"
      [showIllustration]="false"
      title="¿Descartar cambios?"
      description="Los cambios no grabados se perderán."
      (confirmed)="confirmarSalidaSinGuardar()"
      (canceled)="confirmarDescartarCambios.set(false)"
      (closed)="confirmarDescartarCambios.set(false)"
    />
    <siaf-modal
      [open]="confirmarInactivacion()"
      variant="custom"
      [showIllustration]="false"
      title="¿Está seguro(a) de inactivar el archivo?"
      description="El archivo dejará de estar disponible, pero su información no será eliminada."
      (confirmed)="confirmarInactivacionArchivo()"
      (canceled)="cancelarInactivacion()"
      (closed)="cancelarInactivacion()"
    />
    </div>
    @if (snack()) {<div class="fixed inset-0 z-40 cursor-default bg-transparent" aria-hidden="true"></div>}
    <div #snackbarHost class="fixed bottom-siaf-lg left-1/2 z-50 w-[min(430px,calc(100vw-32px))] -translate-x-1/2">
      <siaf-snackbar
        [open]="snack()"
        tone="success"
        [message]="mensajeSnack()"
        (closed)="cerrarSnackbar()"
      />
    </div>
  </main>`,
})
export class CatalogoArchivosApmComponent implements AfterViewInit, OnDestroy {
  private static readonly IDENTIFICADORES_TECNICOS: Readonly<Record<string, string>> = {
    Pliego: 'PLIEGO',
    'Unidad ejecutora': 'UNIDAD_EJECUTORA',
    'Fuente de financiamiento': 'FUENTE',
    Fuente: 'FUENTE',
    'Categoría de gasto': 'CATEGORIA_GASTO',
    'Objeto del gasto': 'OBJETO_GASTO',
    Genérica: 'GENERICA',
    Subgenérica: 'SUBGENERICA',
    'Subgenérica det': 'SUBGENERICA_DET',
    'Específica de gasto': 'ESPECIFICA',
    Específica: 'ESPECIFICA',
  };
  private static readonly IDENTIFICADORES_TECNICOS_VALIDOS: ReadonlySet<string> = new Set([
    'PLIEGO',
    'UNIDAD_EJECUTORA',
    'FUENTE',
    'CATEGORIA_GASTO',
    'OBJETO_GASTO',
    'GENERICA',
    'SUBGENERICA',
    'SUBGENERICA_DET',
    'ESPECIFICA',
    'ASIGNACION',
    'ANO_1',
    'ANO_2',
    'ANO_3',
  ]);
  private readonly router = inject(Router);
  private readonly estadoCatalogo = inject(CatalogoArchivosApmStateService);
  private readonly snackbarCatalogo = inject(CatalogoArchivosApmSnackbarService);
  @ViewChild('snackbarHost') private snackbarHost?: ElementRef<HTMLElement>;
  private focoAntesSnackbar: HTMLElement | null = null;
  readonly breadcrumbs = [
    { label: "Inicio", href: "/panel" },
    { label: "Clasificadores y catálogos" },
    { label: "Catálogos" },
    { label: "Catálogo de archivos de la APM" },
  ];
  get tabs(): TabItem[] {
    const archivo = this.borrador();
    return [
      { id: "atributos", label: `ATRIBUTOS (${archivo.atributos.length})` },
      { id: "reglas", label: `REGLAS SUMARIZADAS (${archivo.reglas.length})` },
      { id: "referencias", label: `REFERENCIAS CRUZADAS (${archivo.referencias.length})` },
      { id: "firmantes", label: `FIRMANTES (${archivo.firmantes.length})` },
    ];
  }
  readonly estados = [
    { label: "Activo", value: "Activo" },
    { label: "Inactivo", value: "Inactivo" },
  ];
  readonly opcionesTipoArchivo = computed(() => [
    {
      value: "1 - APM de Gastos",
      label: "1 - APM de Gastos",
    },
    {
      value: "2 - Anexo",
      label: "2 - Anexo",
    },
    { value: "3 - Pie de Página", label: "3 - Pie de Página" },
  ]);
  readonly opcionesTipoAsignacion = [
    { value: "Techo", label: "Techo" },
    { value: "Piso", label: "Piso" },
  ];
  readonly archivos = this.estadoCatalogo.archivos;
  readonly busqueda = signal("");
  readonly archivosExpandidos = signal<ReadonlySet<number>>(new Set());
  readonly seccionesExpandidas = signal<ReadonlySet<string>>(new Set());
  readonly seccionesDetalleArchivo: { id: SeccionDetalleArchivo; label: string }[] = [
    { id: 'atributos', label: 'ATRIBUTOS' },
    { id: 'reglas', label: 'REGLAS SUMARIZADAS' },
    { id: 'referencias', label: 'REFERENCIAS CRUZADAS' },
    { id: 'firmantes', label: 'FIRMANTES' },
  ];
  readonly panelColumnas = signal(false);
  readonly confirmarReinicioDemo = signal(false);
  readonly columnasGeneralesVisibles = signal<ReadonlySet<string>>(new Set(['anio', 'codigo', 'nombre', 'prefijo', 'tipo', 'estado', 'desde', 'hasta']));
  readonly borradorColumnasGeneralesVisibles = signal<ReadonlySet<string>>(new Set(['anio', 'codigo', 'nombre', 'prefijo', 'tipo', 'estado', 'desde', 'hasta']));
  /** La bandeja inicia como consulta plana; el usuario habilita los detalles desde Columnas visibles. */
  readonly seccionesVisibles = signal<ReadonlySet<SeccionDetalleArchivo>>(new Set());
  readonly borradorSeccionesVisibles = signal<ReadonlySet<SeccionDetalleArchivo>>(new Set());
  readonly camposInternosVisibles = signal<ReadonlySet<string>>(new Set());
  readonly borradorCamposInternosVisibles = signal<ReadonlySet<string>>(new Set());
  readonly opcionesMasOpciones = [
    { label: 'Columnas visibles', value: 'columnas' },
    { label: 'Reiniciar demo', value: 'reiniciar-demo' },
  ];
  readonly columnasGenerales: DocumentsRecordsColumn[] = [
    ['anio', 'Año'], ['codigo', 'Código'], ['nombre', 'Nombre del archivo'], ['prefijo', 'Prefijo'], ['tipo', 'Tipo'], ['tipoControl', 'Tipo de control'], ['plantilla', 'Documento plantilla'], ['reporte', 'Documento reporte'], ['estado', 'Estado'], ['desde', 'Fecha desde'], ['hasta', 'Fecha hasta'],
  ].map(([key, label]) => ({ key, label, visibility: 'visible', group: 'default' }));
  readonly seccionesColumnas: ColumnVisibilityPanelSection[] = [
    { label: 'ATRIBUTOS', columns: ['Código', 'Orden', 'Columna Excel', 'Nombre del campo', 'Destino del dato', 'Clasificador', 'Nivel mínimo', 'Nivel máximo', 'Autogenerado', 'Derivado por', 'Tipo de dato', 'Obligatorio', 'Multianual'].map((label, indice) => ({ key: `atributos-${indice}`, label, visibility: 'visible' as const, group: 'more' as const })), collapsible: true },
    { label: 'REGLAS SUMARIZADAS', columns: ['Código', 'Archivo padre', 'Nivel de agregación', 'Operador', 'Atributos comunes', 'Montos a revisar'].map((label, indice) => ({ key: `reglas-${indice}`, label, visibility: 'visible' as const, group: 'more' as const })), collapsible: true },
    { label: 'REFERENCIAS CRUZADAS', columns: ['Código', 'Catálogo relacional', 'Atributos comunes'].map((label, indice) => ({ key: `referencias-${indice}`, label, visibility: 'visible' as const, group: 'more' as const })), collapsible: true },
    { label: 'FIRMANTES', columns: ['Código', 'Firmante', 'Orden', 'Documento firmado'].map((label, indice) => ({ key: `firmantes-${indice}`, label, visibility: 'visible' as const, group: 'more' as const })), collapsible: true },
  ];
  readonly columnaPanelVisible = (clave: string): boolean =>
    this.borradorColumnasGeneralesVisibles().has(clave) || this.borradorCamposInternosVisibles().has(clave);
  // La vista inicial del catálogo parte de la programación vigente.
  // Un string vacío representa un filtro retirado desde los tags aplicados.
  readonly anioFiltro = signal("2027");
  readonly codigoFiltro = signal("");
  readonly nombreFiltro = signal("");
  readonly tipoFiltro = signal("");
  readonly tipoAsignacionFiltro = signal("");
  readonly estadoFiltro = signal<Estado | "">("Activo");
  readonly desdeFiltro = signal("");
  readonly hastaFiltro = signal("");
  readonly filtrosBorrador = signal({ anio: '2027', codigo: '', nombre: '', tipo: '', tipoAsignacion: '', estado: 'Activo' as Estado | '', desde: '', hasta: '' });
  readonly filtros = signal(false);
  readonly editando = signal(false);
  readonly seleccionandoModo = signal(false);
  readonly modoAlta = signal<"nuevo" | "copia">("nuevo");
  readonly panelOrigen = signal(false);
  readonly busquedaOrigen = signal("");
  /** Filtros adicionales del panel; el tipo viene siempre del formulario. */
  readonly anioOrigenFiltro = signal("");
  readonly estadoOrigenFiltro = signal<Estado | "">("");
  readonly panelFiltrosOrigen = signal(false);
  readonly filtrosOrigenBorrador = signal<{ anio: string; estado: Estado | '' }>({ anio: '', estado: '' });
  readonly origenSeleccionado = signal<Archivo | null>(null);
  readonly orden = signal("1");
  readonly tipoAsignacion = signal("");
  readonly prefijo = signal("");
  readonly documentoReporte = signal("");
  readonly cargaPlantillaAbierta = signal(false);
  readonly cargaReporteAbierta = signal(false);
  readonly panelAtributoAbierto = signal(false);
  readonly editandoAtributo = signal(false);
  readonly atributosSeleccionados = signal<ReadonlySet<number>>(new Set());
  readonly cantidadAtributosSeleccionados = computed(() => this.atributosSeleccionados().size);
  readonly todosAtributosSeleccionados = computed(() => {
    const atributos = this.atributosVista();
    return atributos.length > 0 && atributos.every((atributo) => this.atributosSeleccionados().has(atributo.id));
  });
  readonly confirmarEliminarAtributo = signal(false);
  readonly atributoBorrador = signal<Atributo>({id:0,codigo:1,orden:'',columnas:[],nombre:'',destino:'',tipoDato:'',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''});
  readonly errorOrdenAtributo = signal('');
  readonly errorNombreAtributo = signal('');
  readonly panelReglaAbierto = signal(false);
  readonly editandoRegla = signal(false);
  readonly reglaBorrador = signal<Regla>({ id: 0, codigo: 1, archivoPadre: '', nivelAgregacion: '', operador: '', atributosComunes: [], montosARevisar: [] });
  readonly reglasSeleccionadas = signal<ReadonlySet<number>>(new Set());
  readonly cantidadReglasSeleccionadas = computed(() => this.reglasSeleccionadas().size);
  readonly confirmarEliminarReglas = signal(false);
  private codigoMaximoReglaHistorico = 0;
  readonly todasReglasSeleccionadas = computed(() => {
    const reglas = this.reglasVista();
    return reglas.length > 0 && reglas.every((regla) => this.reglasSeleccionadas().has(regla.id));
  });
  readonly firmantesDisponibles = [
    'Patricia Mendoza Ruiz',
    'Jorge Salazar Torres',
    'Carmen Valdivia López',
    'Ricardo Fernández Castro',
    'Loli Jhover Chavez',
    'Cinthya Bravo',
    'Diego Cárdenas Ochoa',
    'Laura Dávila Cotrina',
    'Sergio Espinoza',
    'Patricia CIME',
    'Peggy Alcón',
    'Cristina Mendoza',
  ].map((value) => ({ value, label: value }));
  readonly firmanteEsNuevo = signal(false);
  readonly firmanteEditandoId = signal<number | null>(null);
  readonly firmanteBorrador = signal<Firmante>({ id: 0, codigo: 1, firmante: '', orden: '', documentoFirmado: false });
  readonly borradoresFirmantes = signal<Readonly<Record<number, Firmante>>>({});
  readonly erroresFirmantes = signal<Readonly<Record<number, { firmante: string; orden: string }>>>({});
  readonly confirmarEliminarFirmante = signal<number | null>(null);
  readonly referenciaEsNueva = signal(false);
  readonly referenciaBorrador = signal<ReferenciaCruzada>({ id: 0, codigo: 1, catalogoRelacional: '', atributosComunes: [] });
  readonly borradoresReferencias = signal<Readonly<Record<number, ReferenciaCruzada>>>({});
  readonly erroresReferencias = signal<Readonly<Record<number, string>>>({});
  readonly confirmarEliminarReferencia = signal<number | null>(null);
  readonly catalogosRelacionales = [
    { value: '14 - Ingresos por Fuente', label: '14 - Ingresos por Fuente' },
    { value: '15 - Objeto del Gasto por Fuente', label: '15 - Objeto del Gasto por Fuente' },
  ];
  readonly nivelesAgregacion = ['Pliego', 'Unidad Ejecutora'].map((value) => ({ value, label: value }));
  readonly operadoresRegla = [
    ['3 - Igual (=)', '3 - Igual (=)'],
    ['4 - Mayor o igual (>=)', '4 - Mayor o igual (>=)'],
    ['5 - Menor o igual (<=)', '5 - Menor o igual (<=)'],
  ].map(([value, label]) => ({ value, label }));
  readonly columnasPlantilla = [
    'PLIEGO',
    'UNIDAD_EJECUTORA',
    'FUENTE',
    'CATEGORIA_GASTO',
    'OBJETO_GASTO',
    'ANO_1',
    'ANO_2',
    'ANO_3',
  ].map((value) => ({ value, label: this.identificadorTecnico(value) }));
  readonly destinosAtributo = ['1 - Cabecera','2 - Detalle JSON'].map(value=>({value,label:value}));
  readonly tiposDato = ['Texto','Numérico','Monto','Fecha'].map(value=>({value,label:value}));
  readonly clasificadores = ['1 - Institucional','4 - Objeto del gasto','5 - Fuente de financiamiento','6 - Categoría del gasto'].map(value=>({value,label:value}));
  readonly derivados = [
    { value: 'CATALOGO PADRE', label: 'Catálogo padre' },
    { value: 'CORTE NIVEL', label: 'Corte nivel' },
  ];
  readonly nivelesPorClasificador: Record<string, { value: string; label: string }[]> = {
    '1 - Institucional': [],
    '4 - Objeto del gasto': [
      '1 - Genérica',
      '2 - Subgenérica',
      '3 - Subgenérica det',
      '4 - Específica',
    ].map(value => ({ value, label: value })),
    '5 - Fuente de financiamiento': [
      '1 - Fuente',
      '2 - Subfuente',
    ].map(value => ({ value, label: value })),
    '6 - Categoría del gasto': [
      '1 - Categoría',
    ].map(value => ({ value, label: value })),
  };
  readonly atributosVista = computed(() => this.borrador().atributos.map((a, i) => this.normalizarAtributo(a, i)));
  readonly referenciasVista = computed(() => this.borrador().referencias.map((referencia, indice) => this.normalizarReferencia(referencia, indice)));
  readonly firmantesVista = computed(() => this.borrador().firmantes.map((firmante, indice) => this.normalizarFirmante(firmante, indice)));
  readonly firmantesRequierenScrollVertical = computed(
    () => this.firmantesVista().length + (this.firmanteEsNuevo() ? 1 : 0) >= 5,
  );
  readonly archivoPlantilla = signal<File | null>(null);
  readonly tamanoPlantilla = computed(() => {
    const archivo = this.archivoPlantilla();
    if (!archivo) return "500kb";
    if (archivo.size < 1024) return `${archivo.size}B`;
    return archivo.size < 1024 * 1024
      ? `${Math.round(archivo.size / 1024)}kb`
      : `${(archivo.size / (1024 * 1024)).toFixed(1)}MB`;
  });
  readonly alertaFormulario = signal("");
  readonly camposConError = signal<string[]>([]);
  readonly esNuevo = signal(false);
  readonly borrador = signal<Archivo>(structuredClone(ANEXO_12));
  readonly pestana = signal("atributos");
  readonly confirmarPlantilla = signal(false);
  readonly plantillaPendiente = signal("");
  readonly reemplazoConfirmado = signal(false);
  readonly confirmarGuardar = signal(false);
  readonly confirmarDescartarCambios = signal(false);
  readonly confirmarInactivacion = signal(false);
  readonly snack = this.snackbarCatalogo.open;
  readonly mensajeSnack = this.snackbarCatalogo.message;
  private estadoInicialFormulario = "";
  readonly archivosFiltrados = computed(() =>
    this.archivos().filter(
      (a) =>
        (!this.anioFiltro() || a.anio === this.anioFiltro()) &&
        (!this.codigoFiltro() || a.codigo === this.codigoFiltro()) &&
        (!this.nombreFiltro() || a.nombre.toLocaleLowerCase().includes(this.nombreFiltro().toLocaleLowerCase())) &&
        (!this.tipoFiltro() || a.tipo === this.tipoFiltro()) &&
        (!this.tipoAsignacionFiltro() || a.tipoAsignacion === this.tipoAsignacionFiltro()) &&
        (!this.estadoFiltro() || a.estado === this.estadoFiltro()) &&
        (!this.desdeFiltro() || a.desde === this.desdeFiltro()) &&
        (!this.hastaFiltro() || a.hasta === this.hastaFiltro()) &&
        `${a.codigo} ${a.nombre}`
          .toLowerCase()
          .includes(this.busqueda().toLowerCase()),
    ),
  );
  readonly columnasOrigen = [
    { key: "anio", label: "Año" },
    { key: "codigo", label: "Código" },
    { key: "nombre", label: "Nombre del archivo" },
    { key: "tipo", label: "Tipo" },
    { key: "desde", label: "Fecha desde" },
    { key: "hasta", label: "Fecha hasta" },
  ];
  readonly tipoOrigen = computed(() => this.borrador().tipo || "2 - Anexo");
  readonly origenesFiltrados = computed(() =>
    this.archivos()
      .filter(
        (a) =>
          // El alta por copia siempre se prepara para la programación destino 2027.
          a.anio !== "2027" &&
          a.tipo === this.tipoOrigen() &&
          (!this.anioOrigenFiltro() || a.anio === this.anioOrigenFiltro()) &&
          (!this.estadoOrigenFiltro() || a.estado === this.estadoOrigenFiltro()) &&
          `${a.codigo} ${a.nombre}`
            .toLowerCase()
            .includes(this.busquedaOrigen().toLowerCase()),
      )
      .sort((a, b) => Number(b.anio) - Number(a.anio) || Number(a.codigo) - Number(b.codigo)),
  );
  readonly origenesNoElegibles = computed(() =>
    this.origenesFiltrados()
      .filter((archivo) => this.tipoBloqueado(archivo))
      .map((archivo) => String(archivo.id)),
  );
  readonly errorOrden = computed(() =>
    this.ordenOcupado()
      ? `AE-03: Ya existe un anexo con el orden ${this.orden()} para el año ${this.borrador().anio}.`
      : "",
  );
  readonly tipoSeleccionado = computed(() => Boolean(this.borrador().tipo));
  readonly esAnexo = computed(() => this.borrador().tipo === "2 - Anexo");
  readonly tipoAsignacionHabilitado = computed(() =>
    ["1 - APM de Gastos", "2 - Anexo"].includes(this.borrador().tipo),
  );
  readonly prefijoEsObligatorio = computed(() => this.tipoAsignacionHabilitado());
  readonly archivoEnConsulta = computed(
    () => !this.esNuevo() && this.borrador().estado === "Inactivo",
  );
  constructor() {
    this.estadoCatalogo.inicializarUnaVez(
      structuredClone(BASE).map(limpiarFirmantesMockIniciales),
    );
    const mensajeExito = this.snackbarCatalogo.consumeForTray();
    if (mensajeExito) this.mostrarSnackbarExito(mensajeExito);
    if (location.pathname.endsWith("/nuevo")) this.seleccionandoModo.set(true);
  }
  ngAfterViewInit(): void {
    if (this.snack()) this.enfocarCierreSnackbar();
  }
  ngOnDestroy(): void {
    // Durante Grabar la instancia puede destruirse antes de que la bandeja
    // consuma el mensaje diferido. No se descarta esa única notificación.
    if (!this.snackbarCatalogo.hasPendingForTray()) this.snackbarCatalogo.dismiss();
  }
  iniciarAlta() {
    // La vista se activa antes de navegar. Así sigue siendo visible aun si el
    // enrutador reutiliza esta instancia para la ruta /nuevo.
    this.editando.set(false);
    this.modoAlta.set("nuevo");
    this.origenSeleccionado.set(null);
    this.seleccionandoModo.set(true);
    void this.router.navigateByUrl("/procesos/catalogo-archivos-apm/nuevo");
  }
  cancelarModo() {
    this.seleccionandoModo.set(false);
    void this.router.navigateByUrl("/procesos/catalogo-archivos-apm");
  }
  seleccionarModo(modo: "nuevo" | "copia") {
    this.modoAlta.set(modo);
    this.panelOrigen.set(false);
    this.origenSeleccionado.set(null);
  }
  abrirPanelOrigen() {
    if (this.modoAlta() !== "copia") return;
    this.origenSeleccionado.set(null);
    this.busquedaOrigen.set("");
    this.anioOrigenFiltro.set("");
    this.estadoOrigenFiltro.set("");
    this.panelOrigen.set(true);
  }
  seleccionarOrigen(a: Archivo) {
    if (!this.tipoBloqueado(a)) this.origenSeleccionado.set(a);
  }
  seleccionarOrigenPorId(ids: string[]) {
    const id = Number(ids[0]);
    const archivo = this.origenesFiltrados().find((origen) => origen.id === id);
    if (archivo) this.seleccionarOrigen(archivo);
  }
  cancelarOrigen() {
    this.panelOrigen.set(false);
  }
  limpiarFiltrosOrigen() {
    this.anioOrigenFiltro.set("");
    this.estadoOrigenFiltro.set("");
  }
  abrirFiltrosOrigen(): void {
    this.filtrosOrigenBorrador.set({ anio: this.anioOrigenFiltro(), estado: this.estadoOrigenFiltro() });
    this.panelFiltrosOrigen.set(true);
  }
  actualizarFiltroOrigen(campo: 'anio' | 'estado', valor: string): void {
    this.filtrosOrigenBorrador.update((filtros) => ({ ...filtros, [campo]: valor }));
  }
  aplicarFiltrosOrigen(): void {
    const filtros = this.filtrosOrigenBorrador();
    this.anioOrigenFiltro.set(filtros.anio);
    this.estadoOrigenFiltro.set(filtros.estado);
    this.panelFiltrosOrigen.set(false);
  }
  alternarFiltroAnioOrigen() {
    this.abrirFiltrosOrigen();
  }
  aceptarOrigen() {
    if (!this.origenSeleccionado()) return;
    this.panelOrigen.set(false);
    this.continuarAlta();
  }
  tipoBloqueado(a: Archivo) {
    return (
      ["1 - APM de Gastos", "3 - Pie de Página"].includes(a.tipo) &&
      this.archivos().some(
        (destino) => destino.anio === "2027" && destino.tipo === a.tipo,
      )
    );
  }
  duplicadoTipoActivo(archivo = this.borrador()) {
    return (
      ["1 - APM de Gastos", "3 - Pie de Página"].includes(archivo.tipo) &&
      this.archivos().some(
        (existente) =>
          existente.id !== archivo.id &&
          existente.anio === archivo.anio &&
          existente.tipo === archivo.tipo &&
          existente.estado === "Activo",
      )
    );
  }
  motivoBloqueo(a: Archivo) {
    return `El año destino 2027 ya tiene un ${a.tipo}.`;
  }
  continuarAlta() {
    if (this.modoAlta() === "nuevo") {
      this.nuevo();
      return;
    }
    const origen = this.origenSeleccionado();
    if (!origen) return;
    this.esNuevo.set(true);
    this.reemplazoConfirmado.set(false);
    const copia = structuredClone(origen);
    copia.id = Date.now();
    copia.anio = "2027";
    copia.codigo = String(this.siguienteCodigo("2027"));
    copia.estado = "Activo";
    copia.desde = "";
    copia.hasta = "";
    copia.reporte = "";
    // RN-GEN-006: un padre histórico no puede apuntar al registro nuevo de
    // otro año. La regla se conserva, pero queda pendiente de una selección
    // válida para el año destino antes de grabarse.
    copia.reglas = copia.reglas.map((regla) => ({ ...regla, archivoPadre: '' }));
    // RN-FIR: una copia no hereda documentos ya firmados.
    copia.firmantes = copia.firmantes.map((firmante, indice) => ({
      ...this.normalizarFirmante(firmante, indice),
      documentoFirmado: false,
    }));
    this.borrador.set(copia);
    this.reiniciarEdicionFirmantes();
    this.erroresReferencias.set({});
    this.archivoPlantilla.set(null);
    this.cargaPlantillaAbierta.set(false);
    this.tipoAsignacion.set(origen.tipoAsignacion ?? "");
    this.prefijo.set(origen.prefijo ?? "");
    this.documentoReporte.set("");
    this.orden.set(origen.orden ?? String(this.siguienteOrden()));
    this.pestana.set("atributos");
    this.seleccionandoModo.set(false);
    this.editando.set(true);
    this.capturarEstadoInicialFormulario();
  }
  siguienteOrden() {
    const ordenesActivos = this.archivos()
      .filter(
        (archivo) =>
          archivo.anio === this.borrador().anio &&
          archivo.tipo === "2 - Anexo" &&
          archivo.estado === "Activo",
      )
      .map((archivo) => Number(archivo.orden))
      .filter((orden) => Number.isInteger(orden) && orden > 0);

    return Math.max(0, ...ordenesActivos) + 1;
  }
  siguienteCodigo(anio: string) {
    return (
      Math.max(
        0,
        ...this.archivos()
          .filter((archivo) => archivo.anio === anio)
          .map((archivo) => Number(archivo.codigo) || 0),
      ) + 1
    );
  }
  ordenOcupado() {
    return this.ordenDuplicado();
  }
  puedeGrabar() {
    const b = this.borrador();
    return Boolean(
      b.codigo &&
      b.nombre &&
      b.tipo &&
      (!this.prefijoEsObligatorio() || this.prefijo()) &&
      b.plantilla &&
      (!this.tipoAsignacionHabilitado() || this.tipoAsignacion()) &&
      (!this.esAnexo() || this.orden()) &&
      !this.archivos().some(
        (a) =>
          a.id !== b.id &&
          a.anio === b.anio &&
          a.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase(),
      ),
    );
  }
  errorCampo(campo: string) {
    return this.camposConError().includes(campo)
      ? "CO-02: Este campo es obligatorio."
      : "";
  }
  limpiarErrorCampo(campo: string) {
    const pendientes = this.camposConError().filter((item) => item !== campo);
    this.camposConError.set(pendientes);
    if (!pendientes.length) this.alertaFormulario.set("");
  }
  camposObligatoriosInvalidos() {
    const b = this.borrador();
    const campos: string[] = [];
    if (!b.nombre.trim()) campos.push("nombre");
    if (!b.tipo) campos.push("tipo");
    if (this.tipoAsignacionHabilitado() && !this.tipoAsignacion()) {
      campos.push("tipoAsignacion");
    }
    if (this.esAnexo() && !this.orden()) campos.push("orden");
    if (this.prefijoEsObligatorio() && !this.prefijo()) campos.push("prefijo");
    if (!b.plantilla) campos.push("plantilla");
    return campos;
  }
  validarAntesDeGrabar() {
    const obligatorios = this.camposObligatoriosInvalidos();
    if (obligatorios.length) {
      this.camposConError.set(obligatorios);
      this.alertaFormulario.set(
        "CO-01: Complete los campos obligatorios para grabar el archivo.",
      );
      return false;
    }
    const b = this.borrador();
    if (this.codigoDuplicado(b)) {
      this.alertaFormulario.set(
        `AE-02: Ya existe un archivo con el código ${b.codigo} para el año ${b.anio}.`,
      );
      return false;
    }
    if (this.ordenDuplicado(b)) {
      this.camposConError.set(["orden"]);
      this.alertaFormulario.set(
        `AE-03: Ya existe un anexo con el orden ${this.orden()} para el año ${b.anio}.`,
      );
      return false;
    }
    if (this.prefijoDuplicado(b)) {
      this.camposConError.set(["prefijo"]);
      this.alertaFormulario.set(
        `AE-04: Ya existe un archivo con el prefijo ${this.prefijo()} para el año ${b.anio}.`,
      );
      return false;
    }
    if (this.referenciaFilaAbierta()) {
      this.alertaFormulario.set("Finalice o cancele la edición de la referencia cruzada antes de grabar el archivo.");
      return false;
    }
    if (this.firmanteFilaAbierta()) {
      this.alertaFormulario.set("Finalice o cancele la edición del firmante antes de grabar el archivo.");
      return false;
    }
    if (this.referenciasConCatalogoRelacionalDuplicado()) {
      this.alertaFormulario.set(this.mensajeMsg008(this.catalogoRelacionalDuplicado()));
      return false;
    }
    if (this.panelAtributoConCambiosPendientes()) {
      this.alertaFormulario.set("Finalice o cancele la edición del atributo antes de grabar el archivo.");
      return false;
    }
    if (this.panelReglaConCambiosPendientes()) {
      this.alertaFormulario.set("Finalice o cancele la edición de la regla sumarizada antes de grabar el archivo.");
      return false;
    }
    if (this.reglasConAtributosComunesInvalidos()) {
      // El proyecto no contiene un mensaje institucional específico para RN-SUM-008.
      this.alertaFormulario.set('RN-SUM-008');
      return false;
    }
    if (!this.configuracionFirmantesValida()) {
      this.alertaFormulario.set("Los firmantes deben tener todos un orden secuencial o todos permanecer sin orden. No se permiten órdenes duplicados.");
      return false;
    }
    if (this.duplicadoTipoActivo(b)) {
      this.alertaFormulario.set(
        `AE-01: Ya existe un archivo activo de tipo ${b.tipo} para el año ${b.anio}.`,
      );
      return false;
    }
    this.camposConError.set([]);
    this.alertaFormulario.set("");
    return true;
  }
  nuevo() {
    this.esNuevo.set(true);
    this.reemplazoConfirmado.set(false);
    this.archivoPlantilla.set(null);
    this.cargaPlantillaAbierta.set(false);
    this.borrador.set({
      id: Date.now(),
      anio: "2027",
      codigo: String(this.siguienteCodigo("2027")),
      nombre: "",
      tipo: "",
      plantilla: "",
      estado: "Activo",
      desde: "",
      hasta: "",
      atributos: [],
      reglas: [],
      referencias: [],
    // El escenario inicial 2027 no precarga firmantes: se agregan desde la grilla.
    firmantes: [],
    });
    this.reiniciarEdicionFirmantes();
    this.erroresReferencias.set({});
    this.orden.set("");
    this.tipoAsignacion.set("");
    this.prefijo.set("");
    this.documentoReporte.set("");
    this.pestana.set("atributos");
    this.seleccionandoModo.set(false);
    this.editando.set(true);
    this.capturarEstadoInicialFormulario();
  }
  abrir(a: Archivo) {
    this.esNuevo.set(false);
    this.reemplazoConfirmado.set(false);
    this.borrador.set(structuredClone(a));
    this.reiniciarEdicionFirmantes();
    this.erroresReferencias.set({});
    this.tipoAsignacion.set(a.tipoAsignacion ?? "");
    this.prefijo.set(a.prefijo ?? "");
    this.orden.set(a.orden ?? "");
    this.documentoReporte.set(a.reporte ?? "");
    this.pestana.set("atributos");
    this.editando.set(true);
    this.capturarEstadoInicialFormulario();
  }
  solicitarCancelarFormulario() {
    if (this.hayCambiosSinGuardar() || (this.esNuevo() && this.modoAlta() === 'copia')) {
      this.confirmarDescartarCambios.set(true);
      return;
    }
    this.salirFormulario();
  }
  confirmarSalidaSinGuardar() {
    this.confirmarDescartarCambios.set(false);
    this.salirFormulario();
  }
  private salirFormulario() {
    this.confirmarGuardar.set(false);
    this.reiniciarEdicionFirmantes();
    this.referenciaEsNueva.set(false);
    this.borradoresReferencias.set({});
    this.erroresReferencias.set({});
    this.cerrarAtributo();
    this.cerrarRegla();
    this.editando.set(false);
    const volverAModalidad = this.esNuevo() && this.modoAlta() === 'copia';
    this.esNuevo.set(false);
    this.seleccionandoModo.set(volverAModalidad);
    void this.router.navigateByUrl(volverAModalidad ? "/procesos/catalogo-archivos-apm/nuevo" : "/procesos/catalogo-archivos-apm");
  }
  private capturarEstadoInicialFormulario(): void {
    this.codigoMaximoReglaHistorico = Math.max(0, ...this.reglasVista().map((regla) => regla.codigo ?? 0));
    this.estadoInicialFormulario = this.serializarEstadoFormulario();
  }
  hayCambiosSinGuardar(): boolean {
    return this.serializarEstadoFormulario() !== this.estadoInicialFormulario ||
      this.referenciaFilaAbierta() || this.firmanteFilaAbierta() ||
      this.panelAtributoConCambiosPendientes() || this.panelReglaConCambiosPendientes();
  }
  private serializarEstadoFormulario(): string {
    return JSON.stringify({
      archivo: this.borrador(),
      tipoAsignacion: this.tipoAsignacion(),
      prefijo: this.prefijo(),
      orden: this.orden(),
      documentoReporte: this.documentoReporte(),
    });
  }
  panelAtributoConCambiosPendientes(): boolean {
    if (!this.panelAtributoAbierto()) return false;
    const borrador = this.atributoBorrador();
    if (!this.editandoAtributo()) {
      return Boolean(borrador.orden || borrador.columnas.length || borrador.nombre || borrador.destino || borrador.tipoDato || borrador.clasificador || borrador.nivelMinimo || borrador.nivelMaximo || borrador.obligatorio || borrador.multianual || borrador.autogenerado || borrador.derivadoPor);
    }
    const original = this.atributosVista().find((atributo) => atributo.id === borrador.id);
    return !original || JSON.stringify(original) !== JSON.stringify(borrador);
  }
  panelReglaConCambiosPendientes(): boolean {
    if (!this.panelReglaAbierto()) return false;
    const borrador = this.reglaBorrador();
    if (!this.editandoRegla()) {
      return Boolean(borrador.archivoPadre || borrador.nivelAgregacion || borrador.operador || borrador.atributosComunes?.length || borrador.montosARevisar?.length);
    }
    const original = this.reglasVista().find((regla) => regla.id === borrador.id);
    return !original || JSON.stringify(original) !== JSON.stringify(borrador);
  }
  actualizar(
    key: "anio" | "codigo" | "nombre" | "tipo" | "estado",
    value: string,
  ) {
    this.borrador.update((a) => ({ ...a, [key]: value }) as Archivo);
    this.limpiarErrorCampo(key);
  }
  solicitarCambioEstado(estado: Estado): void {
    if (estado !== "Inactivo") {
      this.actualizar("estado", estado);
      return;
    }

    if (this.borrador().estado === "Inactivo") return;
    if (this.archivoEsPadreDeReglaActiva(this.borrador())) {
      this.alertaFormulario.set(
        "AE-12: No es posible inactivar el archivo porque es Archivo Padre de una regla sumarizada activa.",
      );
      return;
    }

    this.alertaFormulario.set("");
    this.confirmarInactivacion.set(true);
  }
  confirmarInactivacionArchivo(): void {
    this.confirmarInactivacion.set(false);
    this.actualizar("estado", "Inactivo");
  }
  cancelarInactivacion(): void {
    this.confirmarInactivacion.set(false);
  }
  cambiarTipo(tipo: string) {
    this.actualizar("tipo", tipo);
    this.tipoAsignacion.set(tipo === "1 - APM de Gastos" ? "Techo" : "");
    this.prefijo.set("");
    this.orden.set(tipo === "2 - Anexo" ? String(this.siguienteOrden()) : "");
    this.limpiarErrorCampo("tipoAsignacion");
    this.limpiarErrorCampo("prefijo");
    this.limpiarErrorCampo("orden");
  }
  cambiarTipoAsignacion(value: string) {
    this.tipoAsignacion.set(value);
    this.limpiarErrorCampo("tipoAsignacion");
  }
  cambiarOrden(value: string) {
    this.orden.set(value);
    this.limpiarErrorCampo("orden");
  }
  cambiarPrefijo(value: string) {
    this.prefijo.set(value);
    this.limpiarErrorCampo("prefijo");
  }
  adjuntarPlantilla() {
    if (!this.tipoSeleccionado() || this.borrador().plantilla) return;
    this.cargaPlantillaAbierta.set(true);
  }
  cancelarCargaPlantilla() {
    this.cargaPlantillaAbierta.set(false);
  }
  confirmarCargaPlantilla(archivo: File) {
    this.archivoPlantilla.set(archivo);
    this.borrador.update((actual) => ({ ...actual, plantilla: archivo.name }));
    this.limpiarErrorCampo("plantilla");
    this.cargaPlantillaAbierta.set(false);
  }
  retirarPlantilla() {
    this.solicitarCambioPlantilla("");
  }
  adjuntarReporte() {
    if (!this.tipoSeleccionado() || this.documentoReporte()) return;
    this.cargaReporteAbierta.set(true);
  }
  cancelarCargaReporte() {
    this.cargaReporteAbierta.set(false);
  }
  confirmarCargaReporte(archivo: File) {
    this.documentoReporte.set(archivo.name);
    this.borrador.update((actual) => ({ ...actual, reporte: archivo.name }));
    this.cargaReporteAbierta.set(false);
  }
  cambiarPlantilla(value: string) {
    if (value === this.borrador().plantilla) return;
    this.solicitarCambioPlantilla(value);
  }
  confirmarCambioPlantilla() {
    this.aplicarCambioPlantilla(this.plantillaPendiente());
    this.confirmarPlantilla.set(false);
  }
  cancelarCambioPlantilla() {
    this.plantillaPendiente.set("");
    this.confirmarPlantilla.set(false);
  }
  private solicitarCambioPlantilla(plantilla: string): void {
    this.plantillaPendiente.set(plantilla);
    if (this.tieneDatosDependientesDePlantilla()) {
      this.confirmarPlantilla.set(true);
      return;
    }
    this.aplicarCambioPlantilla(plantilla);
  }
  private tieneDatosDependientesDePlantilla(): boolean {
    const archivo = this.borrador();
    return Boolean(
      archivo.atributos.length ||
      archivo.reglas.length ||
      archivo.referencias.length ||
      archivo.reporte ||
      this.documentoReporte(),
    );
  }
  /** RN-GEN-015: la dependencia se limpia en el borrador y no afecta Firmantes. */
  private aplicarCambioPlantilla(plantilla: string): void {
    this.archivoPlantilla.set(null);
    this.documentoReporte.set("");
    this.borrador.update((archivo) => ({
      ...archivo,
      plantilla,
      atributos: [],
      reglas: [],
      referencias: [],
      reporte: "",
    }));
    this.reemplazoConfirmado.set(false);
    this.plantillaPendiente.set("");
  }
  agregarAtributo() {
    if (!this.borrador().plantilla) return;
    this.editandoAtributo.set(false);
    this.atributosSeleccionados.set(new Set());
    this.errorOrdenAtributo.set('');
    this.errorNombreAtributo.set('');
    this.atributoBorrador.set(this.nuevoAtributo());
    this.panelAtributoAbierto.set(true);
  }
  nuevoAtributo(): Atributo { return {id:Date.now(),codigo:this.atributosVista().length + 1,orden:'',columnas:[],nombre:'',destino:'',tipoDato:'',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''}; }
  normalizarAtributo(valor: string | Atributo, indice: number): Atributo { return typeof valor === 'string' ? {id:-(indice+1),codigo:indice+1,orden:String(indice+1),columnas:[],nombre:valor,destino:'2 - Detalle JSON',tipoDato:'Texto',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''} : valor; }
  actualizarAtributo(campo: keyof Atributo, valor: string | boolean) {
    if (campo === 'orden') this.errorOrdenAtributo.set('');
    if (campo === 'nombre') this.errorNombreAtributo.set('');
    this.atributoBorrador.update(a => ({...a,[campo]:valor} as Atributo));
  }
  nivelesDelClasificador() {
    return this.nivelesPorClasificador[this.atributoBorrador().clasificador] ?? [];
  }
  opcionesConSeleccionar(opciones: ReadonlyArray<{ value: string; label: string }>) {
    return [
      { value: '', label: 'Seleccionar' },
      ...opciones.filter((opcion) => opcion.value !== ''),
    ];
  }
  cambiarClasificador(clasificador: string) {
    const niveles = this.nivelesPorClasificador[clasificador] ?? [];
    const contiene = (nivel: string) => !nivel || niveles.some((opcion) => opcion.value === nivel);
    this.atributoBorrador.update((atributo) => ({
      ...atributo,
      clasificador,
      nivelMinimo: contiene(atributo.nivelMinimo) ? atributo.nivelMinimo : '',
      nivelMaximo: contiene(atributo.nivelMaximo) ? atributo.nivelMaximo : '',
    }));
  }
  etiquetasColumnas(columnas: string[]): string {
    return columnas.map((columna) => this.columnaLegible(columna)).join(', ');
  }

  /**
   * Capa única de presentación para identificadores técnicos. Los valores del
   * modelo nunca se normalizan aquí: se conservan para edición y persistencia.
   */
  identificadorTecnico(valor: string): string {
    const tecnico = CatalogoArchivosApmComponent.IDENTIFICADORES_TECNICOS[valor] ?? valor;
    const anio = /^ANO_([123])$/.exec(tecnico);
    if (anio) return `Anio_${anio[1]}`;
    return CatalogoArchivosApmComponent.IDENTIFICADORES_TECNICOS_VALIDOS.has(tecnico)
      ? tecnico.toLowerCase()
      : tecnico;
  }

  etiquetasAtributos(valores: string[]): string {
    return valores.map((valor) => this.identificadorTecnico(valor)).join(', ');
  }

  etiquetasAtributosEnLineas(valores: string[]): string {
    return valores.map((valor) => this.identificadorTecnico(valor)).join('\n');
  }

  etiquetasColumnasOrdenadas(columnas: string[]): string {
    return this.columnasEnOrdenPlantilla(columnas).map((columna) => this.columnaLegible(columna)).join(', ');
  }

  etiquetasColumnasEnLineas(columnas: string[]): string {
    return this.columnasEnOrdenPlantilla(columnas).map((columna) => this.columnaLegible(columna)).join('\n');
  }

  etiquetasColumnasComoTags(columnas: string[]): string[] {
    return this.columnasEnOrdenPlantilla(columnas).map((columna) => this.columnaLegible(columna));
  }

  etiquetaDerivadoPor(valor: string): string {
    return this.derivados.find((opcion) => opcion.value === valor)?.label ?? valor;
  }

  seleccionarColumnas(valor: string[]) {
    this.atributoBorrador.update((atributo) => ({
      ...atributo,
      columnas: valor,
      nombre: atributo.nombre || this.nombreTecnicoDeColumnas(valor),
    }));
  }

  actualizarNombreAtributo(valor: string): void {
    const candidato = valor.trim().toUpperCase();
    this.actualizarAtributo(
      'nombre',
      CatalogoArchivosApmComponent.IDENTIFICADORES_TECNICOS_VALIDOS.has(candidato) ? candidato : valor,
    );
  }

  private columnaLegible(valor: string): string {
    return this.columnasPlantilla.find((opcion) => opcion.value === valor)?.label ?? valor.replace(/_/g, ' ');
  }
  private nombreTecnicoDeColumnas(columnas: string[]): string {
    if (columnas.length && columnas.every((columna) => /^ANO_[123]$/.test(columna))) return 'ASIGNACION';
    return columnas.join(', ');
  }
  private columnasEnOrdenPlantilla(columnas: string[]): string[] {
    const indicePorColumna = new Map(this.columnasPlantilla.map((opcion, indice) => [opcion.value, indice]));
    return columnas
      .map((columna, indice) => ({ columna, indice, orden: indicePorColumna.get(columna) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.orden - b.orden || a.indice - b.indice)
      .map(({ columna }) => columna);
  }
  atributoEstaSeleccionado(id: number): boolean { return this.atributosSeleccionados().has(id); }
  alternarSeleccionAtributo(id: number, seleccionado: boolean) {
    const seleccion = new Set(this.atributosSeleccionados());
    seleccionado ? seleccion.add(id) : seleccion.delete(id);
    this.atributosSeleccionados.set(seleccion);
  }
  seleccionarTodosAtributos(seleccionar: boolean) {
    this.atributosSeleccionados.set(seleccionar ? new Set(this.atributosVista().map((atributo) => atributo.id)) : new Set());
  }
  opcionesColumnasAtributo() {
    const atributoActual = this.atributoBorrador();
    const columnasOcupadas = new Set(
      this.atributosVista()
        .filter((atributo) =>
          atributo.id !== atributoActual.id &&
          (atributo as Atributo & { estado?: Estado }).estado !== 'Inactivo',
        )
        .flatMap((atributo) => atributo.columnas),
    );
    return this.columnasPlantilla.filter((columna) => !columnasOcupadas.has(columna.value));
  }
  atributoValido() {
    const a=this.atributoBorrador();
    return !!(a.orden && a.nombre.trim() && a.destino && a.tipoDato && this.rangoDeNivelesValido(a));
  }
  private rangoDeNivelesValido(atributo: Atributo): boolean {
    if (!atributo.nivelMinimo || !atributo.nivelMaximo) return true;
    const orden = (nivel: string) => Number.parseInt(nivel, 10);
    return orden(atributo.nivelMaximo) >= orden(atributo.nivelMinimo);
  }
  cerrarAtributo() {
    this.panelAtributoAbierto.set(false);
    this.editandoAtributo.set(false);
    this.atributosSeleccionados.set(new Set());
    this.errorOrdenAtributo.set('');
    this.errorNombreAtributo.set('');
  }
  guardarAtributo() {
    if (!this.atributoValido()) return;
    const atributo = this.atributoBorrador();
    if (this.ordenAtributoDuplicado(atributo)) {
      this.errorOrdenAtributo.set(`Ya existe un atributo con el orden ${atributo.orden} en este archivo`);
      return;
    }
    if (this.nombreAtributoDuplicado(atributo)) {
      this.errorNombreAtributo.set(`Ya existe un atributo con el nombre de campo ${atributo.nombre} en este archivo`);
      return;
    }
    const columnaDuplicada = this.columnaAtributoDuplicada(atributo);
    if (columnaDuplicada) {
      return;
    }
    const estabaEditando = this.editandoAtributo();
    this.borrador.update((archivo) => ({
      ...archivo,
      atributos: estabaEditando
        ? archivo.atributos.map((valor, indice) => this.normalizarAtributo(valor, indice).id === atributo.id ? atributo : valor)
        : [...archivo.atributos, atributo],
    }));
    this.sincronizarReferenciasConAtributosElegibles();
    this.sincronizarReglasConAtributosComunesElegibles();
    this.cerrarAtributo();
    if (estabaEditando) this.mostrarSnackbarExito("El registro de atributo se modificó con éxito.");
  }
  private ordenAtributoDuplicado(atributo: Atributo): boolean {
    const orden = atributo.orden.trim();
    return Boolean(orden) && this.atributosVista().some((existente) =>
      existente.id !== atributo.id &&
      (existente as Atributo & { estado?: Estado }).estado !== 'Inactivo' &&
      existente.orden.trim() === orden,
    );
  }
  private nombreAtributoDuplicado(atributo: Atributo): boolean {
    const nombre = atributo.nombre.trim();
    return Boolean(nombre) && this.atributosVista().some((existente) =>
      existente.id !== atributo.id &&
      (existente as Atributo & { estado?: Estado }).estado !== 'Inactivo' &&
      existente.nombre.trim() === nombre,
    );
  }
  private columnaAtributoDuplicada(atributo: Atributo): string | undefined {
    const columnasOcupadas = new Set(
      this.atributosVista()
        .filter((existente) =>
          existente.id !== atributo.id &&
          (existente as Atributo & { estado?: Estado }).estado !== 'Inactivo',
        )
        .flatMap((existente) => existente.columnas),
    );
    return atributo.columnas.find((columna) => columnasOcupadas.has(columna));
  }
  editarAtributo() { const [id] = this.atributosSeleccionados(); const a=this.atributosVista().find(x=>x.id===id); if(!a)return; this.errorOrdenAtributo.set(''); this.errorNombreAtributo.set(''); this.editandoAtributo.set(true); this.atributoBorrador.set(structuredClone(a)); this.panelAtributoAbierto.set(true); }
  eliminarAtributo() { const ids=this.atributosSeleccionados(); this.borrador.update(x=>({...x,atributos:x.atributos.filter((v,i)=>!ids.has(this.normalizarAtributo(v,i).id))})); this.sincronizarReferenciasConAtributosElegibles(); this.sincronizarReglasConAtributosComunesElegibles(); this.atributosSeleccionados.set(new Set()); this.confirmarEliminarAtributo.set(false); }
  agregarRegla() {
    this.editandoRegla.set(false);
    this.reglasSeleccionadas.set(new Set());
    this.reglaBorrador.set({ id: Date.now(), codigo: this.siguienteCodigoRegla(), archivoPadre: '', nivelAgregacion: '', operador: '', atributosComunes: [], montosARevisar: [] });
    this.panelReglaAbierto.set(true);
  }
  reglaEstaSeleccionada(id: number): boolean { return this.reglasSeleccionadas().has(id); }
  alternarSeleccionRegla(id: number, seleccionada: boolean): void {
    const seleccion = new Set(this.reglasSeleccionadas());
    seleccionada ? seleccion.add(id) : seleccion.delete(id);
    this.reglasSeleccionadas.set(seleccion);
  }
  seleccionarTodasReglas(seleccionar: boolean): void {
    this.reglasSeleccionadas.set(seleccionar ? new Set(this.reglasVista().map((regla) => regla.id)) : new Set());
  }
  eliminarReglasSeleccionadas(): void {
    const ids = this.reglasSeleccionadas();
    if (!ids.size) {
      this.confirmarEliminarReglas.set(false);
      return;
    }
    const codigosEliminados = this.reglasVista()
      .filter((regla) => ids.has(regla.id))
      .map((regla) => regla.codigo ?? 0);
    this.codigoMaximoReglaHistorico = Math.max(this.codigoMaximoReglaHistorico, ...codigosEliminados);
    this.borrador.update((archivo) => ({
      ...archivo,
      reglas: archivo.reglas.filter((regla, indice) => !ids.has(this.normalizarRegla(regla, indice).id)),
    }));
    this.reglasSeleccionadas.set(new Set());
    this.confirmarEliminarReglas.set(false);
  }
  editarReglaSeleccionada(): void {
    const [id] = this.reglasSeleccionadas();
    const regla = this.reglasVista().find((item) => item.id === id);
    if (!regla) return;
    this.editandoRegla.set(true);
    this.reglaBorrador.set(this.normalizarAtributosComunesRegla(structuredClone(regla)));
    this.panelReglaAbierto.set(true);
  }
  actualizarRegla(campo: keyof Omit<Regla, 'id'>, valor: string | string[]): void {
    this.reglaBorrador.update((regla) => this.normalizarAtributosComunesRegla({ ...regla, [campo]: valor }));
  }
  reglaValida(): boolean {
    const regla = this.reglaBorrador();
    return Boolean(
      regla.archivoPadre && regla.nivelAgregacion && regla.operador &&
      regla.atributosComunes?.length && regla.montosARevisar?.length &&
      this.configuracionComunReglaEsValida(regla),
    );
  }
  cerrarRegla(): void {
    this.panelReglaAbierto.set(false);
    this.editandoRegla.set(false);
    this.reglasSeleccionadas.set(new Set());
  }
  guardarRegla(): void {
    if (!this.reglaValida()) return;
    const regla = this.reglaBorrador();
    const estabaEditando = this.editandoRegla();
    this.codigoMaximoReglaHistorico = Math.max(this.codigoMaximoReglaHistorico, regla.codigo ?? 0);
    this.borrador.update((archivo) => ({
      ...archivo,
      reglas: estabaEditando
        ? archivo.reglas.map((item) => item.id === regla.id ? regla : item)
        : [...archivo.reglas, regla],
    }));
    this.cerrarRegla();
    this.mostrarSnackbarExito(
      estabaEditando
        ? 'El registro de regla sumarizada se modificó con éxito.'
        : 'El registro de regla sumarizada se agregó con éxito',
    );
  }
  readonly reglasVista = computed(() => this.borrador().reglas
    .map((regla, indice) => this.normalizarRegla(regla, indice))
    .sort((primera, segunda) => (primera.codigo ?? 0) - (segunda.codigo ?? 0)));
  opcionesArchivoPadre() {
    return this.archivos()
      .filter((archivo) => archivo.anio === this.borrador().anio && archivo.id !== this.borrador().id)
      .map((archivo) => ({ value: String(archivo.id), label: `${archivo.codigo} - ${archivo.nombre}` }));
  }
  opcionesAtributosComunesReferencia() {
    // RN-REF-004: las referencias cruzadas usan únicamente atributos de texto
    // del archivo que se está configurando. `atributosVista` procede del
    // borrador, por lo que incluye cambios aún no grabados en la cabecera.
    return this.atributosVista()
      .filter((atributo) => atributo.tipoDato === 'Texto')
      .map((atributo) => ({ value: atributo.nombre, label: this.identificadorTecnico(atributo.nombre) }));
  }
  opcionesAtributosComunesRegla(regla = this.reglaBorrador()) {
    return this.opcionesAtributosComunesReglaParaArchivo(regla.archivoPadre ?? '', this.borrador());
  }
  opcionesMontosARevisarRegla(regla = this.reglaBorrador()) {
    return this.opcionesMontosARevisarReglaParaArchivo(regla.archivoPadre ?? '', this.borrador());
  }
  /** Mantiene la consulta del archivo actual para las verificaciones existentes. */
  opcionesMontosARevisar() {
    return this.atributosMontoActivos(this.borrador())
      .map((atributo) => ({ value: atributo.nombre, label: this.identificadorTecnico(atributo.nombre) }));
  }
  opcionesNivelesAgregacionRegla() {
    return this.hayOpcionesCompatiblesRegla() ? this.nivelesAgregacion : [];
  }
  mostrarAlertaCompatibilidadRegla(): boolean {
    return Boolean(this.reglaBorrador().archivoPadre) &&
      (!this.opcionesAtributosComunesRegla().length || !this.opcionesMontosARevisarRegla().length);
  }
  tituloAlertaCompatibilidadRegla(): string {
    return 'No se encontraron atributos compatibles.';
  }
  descripcionAlertaCompatibilidadRegla(): string {
    const sinAtributos = !this.opcionesAtributosComunesRegla().length;
    const sinMontos = !this.opcionesMontosARevisarRegla().length;
    if (sinAtributos && !sinMontos) {
      return 'El archivo padre seleccionado no tiene atributos comunes compatibles con el archivo actual. Seleccione otro archivo padre para continuar con el registro de la regla sumarizada.';
    }
    if (!sinAtributos && sinMontos) {
      return 'El archivo padre seleccionado no tiene montos compatibles con el archivo actual. Seleccione otro archivo padre para continuar con el registro de la regla sumarizada.';
    }
    return 'El archivo padre seleccionado no tiene atributos comunes ni montos compatibles con el archivo actual. Seleccione otro archivo padre para continuar con el registro de la regla sumarizada.';
  }
  private hayOpcionesCompatiblesRegla(regla = this.reglaBorrador()): boolean {
    return this.opcionesAtributosComunesRegla(regla).length > 0 || this.opcionesMontosARevisarRegla(regla).length > 0;
  }
  etiquetaArchivoPadre(regla: Regla): string {
    if (regla.archivoPadre) return this.opcionesArchivoPadre().find((opcion) => opcion.value === regla.archivoPadre)?.label ?? regla.archivoPadre;
    return regla.origen ?? '';
  }
  valoresEnLineas(valores: string[]): string { return valores.join('\n'); }
  referenciaFilaAbierta(): boolean {
    return this.referenciaEsNueva() || Object.keys(this.borradoresReferencias()).length > 0;
  }
  agregarReferencia(): void {
    if (this.referenciaFilaAbierta()) return;
    this.referenciaBorrador.set({ id: Date.now(), codigo: this.siguienteCodigoReferencia(), catalogoRelacional: '', atributosComunes: [] });
    this.referenciaEsNueva.set(true);
  }
  referenciaFila(referencia: ReferenciaCruzada): ReferenciaCruzada {
    return this.borradoresReferencias()[referencia.id] ?? referencia;
  }
  referenciaTieneCambios(referencia: ReferenciaCruzada): boolean {
    const borrador = this.borradoresReferencias()[referencia.id];
    return !!borrador && !this.referenciasSonIguales(borrador, referencia);
  }
  actualizarReferenciaFila(referencia: ReferenciaCruzada, campo: 'catalogoRelacional' | 'atributosComunes', valor: string | string[]): void {
    if (campo === 'catalogoRelacional') this.limpiarErrorReferencia(referencia.id);
    const siguiente = { ...this.referenciaFila(referencia), [campo]: valor };
    this.borradoresReferencias.update((borradores) => {
      if (this.referenciasSonIguales(siguiente, referencia)) {
        const { [referencia.id]: _descartado, ...restantes } = borradores;
        return restantes;
      }
      return { ...borradores, [referencia.id]: siguiente };
    });
  }
  actualizarReferenciaNueva(campo: 'catalogoRelacional' | 'atributosComunes', valor: string | string[]): void {
    if (campo === 'catalogoRelacional') this.limpiarErrorReferencia(this.referenciaBorrador().id);
    this.referenciaBorrador.update((referencia) => ({ ...referencia, [campo]: valor }));
  }
  errorCatalogoRelacionalFila(referencia: ReferenciaCruzada): string {
    return '';
  }
  errorCatalogoRelacionalNueva(): string {
    return '';
  }
  mensajeAlertaReferenciaDuplicada(): string {
    return Object.values(this.erroresReferencias()).find(Boolean) ?? '';
  }
  tieneErrorCatalogoRelacionalFila(referencia: ReferenciaCruzada): boolean {
    return Boolean(this.erroresReferencias()[referencia.id]);
  }
  tieneErrorCatalogoRelacionalNueva(): boolean {
    return Boolean(this.erroresReferencias()[this.referenciaBorrador().id]);
  }
  referenciaFilaValida(referencia: ReferenciaCruzada): boolean {
    const fila = this.referenciaFila(referencia);
    return Boolean(fila.catalogoRelacional && fila.atributosComunes.length) && !this.tieneErrorCatalogoRelacionalFila(referencia);
  }
  referenciaNuevaValida(): boolean {
    const referencia = this.referenciaBorrador();
    return Boolean(referencia.catalogoRelacional && referencia.atributosComunes.length) && !this.tieneErrorCatalogoRelacionalNueva();
  }
  aceptarCambiosReferencia(referencia: ReferenciaCruzada): void {
    if (!this.referenciaTieneCambios(referencia) || !this.referenciaFilaValida(referencia)) return;
    const actualizada = structuredClone(this.referenciaFila(referencia));
    if (!this.validarCatalogoRelacionalUnico(actualizada)) return;
    this.borrador.update((archivo) => ({
      ...archivo,
      referencias: archivo.referencias.map((valor, indice) => this.normalizarReferencia(valor, indice).id === referencia.id ? actualizada : valor),
    }));
    this.cancelarCambiosReferencia(referencia.id);
    this.mostrarSnackbarExito('El registro de referencia cruzada se modificó con éxito.');
  }
  aceptarReferenciaNueva(): void {
    if (!this.referenciaNuevaValida()) return;
    const referencia = structuredClone(this.referenciaBorrador());
    if (!this.validarCatalogoRelacionalUnico(referencia)) return;
    this.borrador.update((archivo) => ({ ...archivo, referencias: [...archivo.referencias, referencia] }));
    this.cancelarReferenciaNueva();
  }
  cancelarCambiosReferencia(id: number): void {
    this.borradoresReferencias.update((borradores) => {
      const { [id]: _descartado, ...restantes } = borradores;
      return restantes;
    });
    this.limpiarErrorReferencia(id);
  }
  cancelarReferenciaNueva(): void {
    this.limpiarErrorReferencia(this.referenciaBorrador().id);
    this.referenciaEsNueva.set(false);
    this.referenciaBorrador.set({ id: 0, codigo: this.siguienteCodigoReferencia(), catalogoRelacional: '', atributosComunes: [] });
  }
  solicitarEliminarReferencia(referencia: ReferenciaCruzada): void {
    if (!this.referenciaFilaAbierta()) this.confirmarEliminarReferencia.set(referencia.id);
  }
  eliminarReferencia(): void {
    const id = this.confirmarEliminarReferencia();
    if (id === null) return;
    this.borrador.update((archivo) => ({
      ...archivo,
      referencias: archivo.referencias.filter((valor, indice) => this.normalizarReferencia(valor, indice).id !== id),
    }));
    this.cancelarCambiosReferencia(id);
    this.confirmarEliminarReferencia.set(null);
  }
  firmanteFilaAbierta(): boolean {
    return this.firmanteEsNuevo() || this.firmanteEditandoId() !== null || Object.keys(this.borradoresFirmantes()).length > 0;
  }
  firmanteFila(firmante: Firmante): Firmante {
    return this.borradoresFirmantes()[firmante.id] ?? firmante;
  }
  firmanteTieneCambios(firmante: Firmante): boolean {
    const borrador = this.borradoresFirmantes()[firmante.id];
    return !!borrador && !this.firmantesSonIguales(borrador, firmante);
  }
  actualizarFirmanteFila(firmante: Firmante, campo: 'firmante' | 'orden', valor: string): void {
    if (firmante.documentoFirmado) return;
    this.limpiarErrorFirmante(firmante.id, campo);
    const siguiente = { ...this.firmanteFila(firmante), [campo]: valor };
    this.borradoresFirmantes.update((borradores) => {
      if (this.firmantesSonIguales(siguiente, firmante)) {
        const { [firmante.id]: _descartado, ...restantes } = borradores;
        return restantes;
      }
      return { ...borradores, [firmante.id]: siguiente };
    });
  }
  errorFirmanteFila(firmante: Firmante): string {
    return this.errorFirmantePorCampo(firmante.id, 'firmante');
  }
  errorOrdenFirmanteFila(firmante: Firmante): string {
    const fila = this.firmanteFila(firmante);
    const orden = fila.orden.trim();
    if (!orden) return '';
    if (!this.ordenFirmanteValido(orden)) return 'Ingrese un número entero mayor que cero.';
    return this.errorFirmantePorCampo(firmante.id, 'orden');
  }
  firmanteFilaValida(firmante: Firmante): boolean {
    const fila = this.firmanteFila(firmante);
    return Boolean(fila.firmante && (!fila.orden.trim() || this.ordenFirmanteValido(fila.orden.trim())));
  }
  aceptarCambiosFirmante(firmante: Firmante): void {
    if (!this.firmanteTieneCambios(firmante) || !this.firmanteFilaValida(firmante)) return;
    const actualizado = structuredClone(this.firmanteFila(firmante));
    if (!this.validarDuplicidadFirmante(actualizado)) return;
    this.borrador.update((archivo) => ({
      ...archivo,
      firmantes: archivo.firmantes.map((valor, indice) => this.normalizarFirmante(valor, indice).id === firmante.id ? actualizado : valor),
    }));
    this.cancelarCambiosFirmante(firmante.id);
    this.mostrarSnackbarExito('El registro de firmante se modificó con éxito.');
  }
  cancelarCambiosFirmante(id: number): void {
    this.borradoresFirmantes.update((borradores) => {
      const { [id]: _descartado, ...restantes } = borradores;
      return restantes;
    });
    this.limpiarErroresFirmante(id);
  }
  private reiniciarEdicionFirmantes(): void {
    this.firmanteEsNuevo.set(false);
    this.firmanteEditandoId.set(null);
    this.borradoresFirmantes.set({});
    this.erroresFirmantes.set({});
    this.confirmarEliminarFirmante.set(null);
    this.firmanteBorrador.set({
      id: 0,
      codigo: this.siguienteCodigoFirmante(),
      firmante: '',
      orden: '',
      documentoFirmado: false,
    });
  }
  agregarFirmante(): void {
    if (this.firmanteFilaAbierta()) return;
    this.firmanteBorrador.set({
      id: Date.now(),
      codigo: this.siguienteCodigoFirmante(),
      firmante: '',
      orden: '',
      documentoFirmado: false,
    });
    this.firmanteEsNuevo.set(true);
  }
  editarFirmante(firmante: Firmante): void {
    if (firmante.documentoFirmado || this.firmanteFilaAbierta()) return;
    this.firmanteBorrador.set(structuredClone(firmante));
    this.limpiarErroresFirmante(firmante.id);
    this.firmanteEditandoId.set(firmante.id);
  }
  actualizarFirmante(campo: 'firmante' | 'orden', valor: string): void {
    this.limpiarErrorFirmante(this.firmanteBorrador().id, campo);
    this.firmanteBorrador.update((firmante) => ({ ...firmante, [campo]: valor }));
  }
  errorFirmante(): string {
    return this.errorFirmantePorCampo(this.firmanteBorrador().id, 'firmante');
  }
  errorOrdenFirmante(): string {
    const orden = this.firmanteBorrador().orden.trim();
    if (!orden) return '';
    if (!this.ordenFirmanteValido(orden)) return 'Ingrese un número entero mayor que cero.';
    return this.errorFirmantePorCampo(this.firmanteBorrador().id, 'orden');
  }
  firmanteValido(): boolean {
    const firmante = this.firmanteBorrador();
    return Boolean(firmante.firmante && (!firmante.orden.trim() || this.ordenFirmanteValido(firmante.orden.trim())));
  }
  aceptarFirmante(): void {
    if (!this.firmanteValido()) return;
    const firmante = structuredClone(this.firmanteBorrador());
    const editandoId = this.firmanteEditandoId();
    if (!this.validarDuplicidadFirmante(firmante)) return;
    this.borrador.update((archivo) => ({
      ...archivo,
      firmantes: this.firmanteEsNuevo()
        ? [...archivo.firmantes, firmante]
        : archivo.firmantes.map((valor, indice) => this.normalizarFirmante(valor, indice).id === editandoId ? firmante : valor),
    }));
    const estabaEditando = editandoId !== null;
    this.cancelarFirmante();
    if (estabaEditando) this.mostrarSnackbarExito('El registro de firmante se modificó con éxito.');
  }
  cancelarFirmante(): void {
    this.limpiarErroresFirmante(this.firmanteBorrador().id);
    this.firmanteEsNuevo.set(false);
    this.firmanteEditandoId.set(null);
    this.firmanteBorrador.set({ id: 0, codigo: this.siguienteCodigoFirmante(), firmante: '', orden: '', documentoFirmado: false });
  }
  solicitarEliminarFirmante(firmante: Firmante): void {
    if (!firmante.documentoFirmado && !this.firmanteFilaAbierta()) this.confirmarEliminarFirmante.set(firmante.id);
  }
  eliminarFirmante(): void {
    const id = this.confirmarEliminarFirmante();
    const firmante = this.firmantesVista().find((item) => item.id === id);
    if (id === null || firmante?.documentoFirmado) {
      this.confirmarEliminarFirmante.set(null);
      return;
    }
    this.borrador.update((archivo) => ({
      ...archivo,
      firmantes: archivo.firmantes.filter((valor, indice) => this.normalizarFirmante(valor, indice).id !== id),
    }));
    this.cancelarCambiosFirmante(id);
    this.confirmarEliminarFirmante.set(null);
  }
  configuracionFirmantesValida(): boolean {
    const firmantes = this.firmantesVista();
    const conOrden = firmantes.filter((firmante) => firmante.orden.trim());
    if (conOrden.length > 0 && conOrden.length !== firmantes.length) return false;
    return conOrden.every((firmante, indice) =>
      this.ordenFirmanteValido(firmante.orden) &&
      conOrden.findIndex((otro) => Number(otro.orden) === Number(firmante.orden)) === indice,
    );
  }
  /** RN-REF-006: solo puede existir una referencia activa por catálogo relacional. */
  private validarCatalogoRelacionalUnico(referencia: ReferenciaCruzada): boolean {
    const duplicada = Boolean(referencia.catalogoRelacional) && this.referenciasVista().some((otra) =>
      otra.id !== referencia.id &&
      (otra as ReferenciaCruzada & { estado?: Estado }).estado !== 'Inactivo' &&
      this.identificadorCatalogoRelacional(otra.catalogoRelacional) === this.identificadorCatalogoRelacional(referencia.catalogoRelacional),
    );
    if (!duplicada) return true;
    this.erroresReferencias.update((errores) => ({
      ...errores,
      [referencia.id]: this.mensajeMsg008(referencia.catalogoRelacional),
    }));
    this.enfocarCatalogoRelacional(referencia.id);
    return false;
  }
  private referenciasConCatalogoRelacionalDuplicado(): boolean {
    return Boolean(this.catalogoRelacionalDuplicado());
  }
  private catalogoRelacionalDuplicado(): string {
    const vistos = new Set<string>();
    const duplicada = this.referenciasVista()
      .filter((referencia) => (referencia as ReferenciaCruzada & { estado?: Estado }).estado !== 'Inactivo')
      .find((referencia) => {
        const identificador = this.identificadorCatalogoRelacional(referencia.catalogoRelacional);
        if (!identificador) return false;
        if (vistos.has(identificador)) return true;
        vistos.add(identificador);
        return false;
      });
    return duplicada?.catalogoRelacional ?? '';
  }
  /** MSG-008 — A14_V3.3, numeral 4.11 / RN-REF-006. */
  private mensajeMsg008(catalogoRelacional: string): string {
    return `Ya existe una referencia cruzada con el catálogo relacional ${catalogoRelacional} en este archivo.`;
  }
  private identificadorCatalogoRelacional(catalogo: string): string {
    return catalogo.trim().match(/^(\d+)\s*-/)?.[1] ?? catalogo.trim();
  }
  private limpiarErrorReferencia(id: number): void {
    if (!this.erroresReferencias()[id]) return;
    this.erroresReferencias.update((errores) => {
      const { [id]: _descartado, ...restantes } = errores;
      return restantes;
    });
  }
  private enfocarCatalogoRelacional(id: number): void {
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const fila = document.querySelector(`[data-referencia-id="${id}"]`)
        ?? document.querySelector('[data-referencia-id="nueva"]');
      (fila?.querySelector<HTMLElement>('[data-catalogo-relacional-field] [aria-haspopup="listbox"]') ?? null)?.focus();
    });
  }
  private siguienteCodigoFirmante(): number {
    return Math.max(0, ...this.firmantesVista().map((firmante) => firmante.codigo)) + 1;
  }
  private siguienteCodigoReferencia(): number {
    return Math.max(0, ...this.referenciasVista().map((referencia) => referencia.codigo)) + 1;
  }
  private ordenFirmanteValido(orden: string): boolean {
    return /^\d+$/.test(orden) && Number(orden) > 0;
  }
  private validarDuplicidadFirmante(fila: Firmante): boolean {
    const otrosFirmantesActivos = this.firmantesVista().filter((firmante) =>
      firmante.id !== fila.id && (firmante as Firmante & { estado?: string }).estado !== 'Inactivo',
    );
    const errores = {
      firmante: fila.firmante && otrosFirmantesActivos.some((otro) => otro.firmante === fila.firmante)
        ? `El usuario ${fila.firmante} ya figura como firmante de este archivo`
        : '',
      orden: fila.orden.trim() && otrosFirmantesActivos.some((otro) =>
        otro.orden.trim() && Number(otro.orden) === Number(fila.orden.trim()),
      ) ? `Ya existe un firmante con el orden ${fila.orden.trim()} en este archivo` : '',
    };
    if (!errores.firmante && !errores.orden) return true;
    this.erroresFirmantes.update((anteriores) => ({ ...anteriores, [fila.id]: errores }));
    this.enfocarErrorFirmante(fila.id, Boolean(errores.firmante));
    return false;
  }
  private errorFirmantePorCampo(id: number, campo: 'firmante' | 'orden'): string {
    return this.erroresFirmantes()[id]?.[campo] ?? '';
  }
  private limpiarErrorFirmante(id: number, campo: 'firmante' | 'orden'): void {
    const actual = this.erroresFirmantes()[id];
    if (!actual?.[campo]) return;
    const siguiente = { ...actual, [campo]: '' };
    this.erroresFirmantes.update((errores) => ({ ...errores, [id]: siguiente }));
  }
  private limpiarErroresFirmante(id: number): void {
    this.erroresFirmantes.update((errores) => {
      const { [id]: _descartado, ...restantes } = errores;
      return restantes;
    });
  }
  private enfocarErrorFirmante(id: number, priorizarFirmante: boolean): void {
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const fila = document.querySelector(`[data-firmante-id="${id}"]`)
        ?? document.querySelector('[data-firmante-id="nuevo"]');
      const selector = priorizarFirmante
        ? '[data-firmante-field] [role="combobox"], [data-firmante-field] input'
        : '[data-orden-field] input, [data-orden-field] [role="combobox"]';
      (fila?.querySelector<HTMLElement>(selector) ?? null)?.focus();
    });
  }
  private firmantesSonIguales(a: Firmante, b: Firmante): boolean {
    return a.id === b.id && a.codigo === b.codigo && a.firmante === b.firmante && a.orden === b.orden && a.documentoFirmado === b.documentoFirmado;
  }
  private normalizarFirmante(valor: string | Firmante, indice: number): Firmante {
    return typeof valor === 'string'
      ? { id: -(indice + 1), codigo: indice + 1, firmante: valor, orden: '', documentoFirmado: false }
      : valor;
  }
  private normalizarReferencia(valor: string | ReferenciaCruzada, indice: number): ReferenciaCruzada {
    return typeof valor === 'string'
      ? { id: -(indice + 1), codigo: indice + 1, catalogoRelacional: valor, atributosComunes: [] }
      : valor;
  }
  /** Evita que una referencia conserve atributos eliminados o ya no elegibles. */
  private sincronizarReferenciasConAtributosElegibles(): void {
    this.borrador.update((archivo) => {
      const elegibles = new Set(
        archivo.atributos
          .map((atributo, indice) => this.normalizarAtributo(atributo, indice))
          .filter((atributo) => atributo.tipoDato === 'Texto')
          .map((atributo) => atributo.nombre),
      );
      return {
        ...archivo,
        referencias: archivo.referencias.map((referencia) => {
          if (typeof referencia === 'string') return referencia;
          return {
            ...referencia,
            atributosComunes: referencia.atributosComunes.filter((atributo) => elegibles.has(atributo)),
          };
        }),
      };
    });
  }
  /** RN-SUM-008: conserva solo atributos comunes vigentes entre archivo y padre. */
  private sincronizarReglasConAtributosComunesElegibles(): void {
    this.borrador.update((archivo) => ({
      ...archivo,
      reglas: archivo.reglas.map((regla) => this.normalizarAtributosComunesRegla(regla, archivo)),
    }));
  }
  private normalizarAtributosComunesRegla(regla: Regla, archivoActual = this.borrador()): Regla {
    const atributosElegibles = new Set(
      this.opcionesAtributosComunesReglaParaArchivo(regla.archivoPadre ?? '', archivoActual)
        .map((atributo) => atributo.value),
    );
    const montosElegibles = new Set(
      this.opcionesMontosARevisarReglaParaArchivo(regla.archivoPadre ?? '', archivoActual)
        .map((atributo) => atributo.value),
    );
    return {
      ...regla,
      atributosComunes: (regla.atributosComunes ?? []).filter((atributo) => atributosElegibles.has(atributo)),
      montosARevisar: (regla.montosARevisar ?? []).filter((monto) => montosElegibles.has(monto)),
      nivelAgregacion: atributosElegibles.size || montosElegibles.size ? regla.nivelAgregacion : '',
    };
  }
  private configuracionComunReglaEsValida(regla: Regla, archivoActual = this.borrador()): boolean {
    const atributosElegibles = new Set(
      this.opcionesAtributosComunesReglaParaArchivo(regla.archivoPadre ?? '', archivoActual)
        .map((atributo) => atributo.value),
    );
    const montosElegibles = new Set(
      this.opcionesMontosARevisarReglaParaArchivo(regla.archivoPadre ?? '', archivoActual)
        .map((monto) => monto.value),
    );
    return (regla.atributosComunes ?? []).every((atributo) => atributosElegibles.has(atributo)) &&
      (regla.montosARevisar ?? []).every((monto) => montosElegibles.has(monto));
  }
  private reglasConAtributosComunesInvalidos(): boolean {
    return this.reglasVista().some((regla) => !this.configuracionComunReglaEsValida(regla));
  }
  private opcionesAtributosComunesReglaParaArchivo(archivoPadre: string, archivoActual: Archivo) {
    const padre = this.archivos().find((archivo) => archivo.id === Number(archivoPadre));
    if (!padre) return [];
    const atributosPadre = new Set(
      this.atributosTextoActivos(padre).map((atributo) => this.claveAtributoComun(atributo)),
    );
    return this.atributosTextoActivos(archivoActual)
      .filter((atributo) => atributosPadre.has(this.claveAtributoComun(atributo)))
      .map((atributo) => ({ value: atributo.nombre, label: this.identificadorTecnico(atributo.nombre) }));
  }
  private opcionesMontosARevisarReglaParaArchivo(archivoPadre: string, archivoActual: Archivo) {
    const padre = this.archivos().find((archivo) => archivo.id === Number(archivoPadre));
    if (!padre) return [];
    const montosPadre = new Set(
      this.atributosMontoActivos(padre).map((atributo) => this.claveAtributoComun(atributo)),
    );
    return this.atributosMontoActivos(archivoActual)
      .filter((atributo) => montosPadre.has(this.claveAtributoComun(atributo)))
      .map((atributo) => ({ value: atributo.nombre, label: this.identificadorTecnico(atributo.nombre) }));
  }
  private atributosTextoActivos(archivo: Archivo): Atributo[] {
    return archivo.atributos
      .map((atributo, indice) => this.normalizarAtributo(atributo, indice))
      .filter((atributo) =>
        atributo.tipoDato === 'Texto' && (atributo as Atributo & { estado?: Estado }).estado !== 'Inactivo',
      );
  }
  private atributosMontoActivos(archivo: Archivo): Atributo[] {
    return archivo.atributos
      .map((atributo, indice) => this.normalizarAtributo(atributo, indice))
      .filter((atributo) =>
        atributo.tipoDato === 'Monto' && (atributo as Atributo & { estado?: Estado }).estado !== 'Inactivo',
      );
  }
  private claveAtributoComun(atributo: Atributo): string {
    return `${atributo.nombre.trim()}|${atributo.clasificador.trim()}`;
  }
  private referenciasSonIguales(a: ReferenciaCruzada, b: ReferenciaCruzada): boolean {
    return a.id === b.id && a.codigo === b.codigo && a.catalogoRelacional === b.catalogoRelacional && a.atributosComunes.length === b.atributosComunes.length && a.atributosComunes.every((valor, indice) => valor === b.atributosComunes[indice]);
  }
  private siguienteCodigoRegla(): number {
    return Math.max(this.codigoMaximoReglaHistorico, ...this.reglasVista().map((regla) => regla.codigo ?? 0)) + 1;
  }
  private normalizarRegla(regla: Regla, indice: number): Regla {
    return {
      ...regla,
      codigo: regla.codigo ?? indice + 1,
      archivoPadre: regla.archivoPadre ?? '',
      nivelAgregacion: regla.nivelAgregacion ?? regla.nivel ?? '',
      atributosComunes: regla.atributosComunes ?? [],
      montosARevisar: regla.montosARevisar ?? [],
    };
  }
  private mostrarSnackbarExito(mensaje: string): void {
    if (!this.snack()) {
      const activo = typeof document === 'undefined' ? null : document.activeElement;
      this.focoAntesSnackbar = typeof HTMLElement !== 'undefined' && activo instanceof HTMLElement ? activo : null;
    }
    this.snackbarCatalogo.show(mensaje);
    this.enfocarCierreSnackbar();
  }
  cerrarSnackbar(): void {
    this.snackbarCatalogo.dismiss();
    const foco = this.focoAntesSnackbar;
    this.focoAntesSnackbar = null;
    setTimeout(() => {
      if (foco?.isConnected) foco.focus();
    });
  }
  private enfocarCierreSnackbar(): void {
    setTimeout(() => {
      this.snackbarHost?.nativeElement.querySelector<HTMLElement>('button[aria-label="Cerrar mensaje"]')?.focus();
    });
  }
  solicitarGrabar() {
    if (this.validarAntesDeGrabar()) this.confirmarGuardar.set(true);
  }
  grabar() {
    if (!this.validarAntesDeGrabar()) {
      this.confirmarGuardar.set(false);
      return;
    }
    const esRegistroNuevo = this.esNuevo();
    const esCopia = esRegistroNuevo && this.modoAlta() === "copia";
    const b = structuredClone(this.borrador());
    b.tipoAsignacion = this.tipoAsignacion();
    b.prefijo = this.prefijo();
    b.orden = this.esAnexo() ? this.orden() : "";
    if (this.reemplazoConfirmado()) {
      b.atributos = [];
      b.reglas = [];
      b.referencias = [];
    }
    this.actualizarFechasAlGrabar(b);
    this.archivos.update((xs) =>
      this.esNuevo() ? [...xs, b] : xs.map((x) => (x.id === b.id ? b : x)),
    );
    this.confirmarGuardar.set(false);
    this.editando.set(false);
    this.seleccionandoModo.set(false);
    const mensajeExito = esRegistroNuevo
      ? esCopia ? "Configuración copiada con éxito" : "Registro agregado con éxito"
      : "Registro actualizado con éxito";
    this.snackbarCatalogo.prepareForTray(mensajeExito);
    void this.router.navigateByUrl("/procesos/catalogo-archivos-apm").then(() => {
      const mensajePendiente = this.snackbarCatalogo.consumeForTray();
      if (mensajePendiente) this.mostrarSnackbarExito(mensajePendiente);
    });
  }
  /** RN-GEN-022: las fechas de vigencia se sellan solo después de validar y confirmar el guardado. */
  private actualizarFechasAlGrabar(archivo: Archivo): void {
    if (this.esNuevo()) {
      archivo.desde = this.fechaActualSistema();
      archivo.hasta = "";
      return;
    }

    const original = this.archivos().find((existente) => existente.id === archivo.id);
    if (!original) return;

    if (original.estado === "Activo" && archivo.estado === "Inactivo") {
      archivo.desde = original.desde;
      archivo.hasta = this.fechaHastaEstaVacia(original.hasta)
        ? this.fechaActualSistema()
        : original.hasta;
      return;
    }

    if (original.estado === "Inactivo" && archivo.estado === "Activo") {
      archivo.desde = this.fechaActualSistema();
      archivo.hasta = "";
      return;
    }

    // Sin transición de estado, las fechas históricas no se recalculan.
    archivo.desde = original.desde;
    archivo.hasta = original.hasta;
  }
  private fechaHastaEstaVacia(fecha: string): boolean {
    return !fecha || fecha === "-";
  }
  private fechaActualSistema(fecha = new Date()): string {
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }
  private codigoDuplicado(archivo: Archivo): boolean {
    return this.archivos().some(
      (existente) =>
        existente.id !== archivo.id &&
        existente.anio === archivo.anio &&
        existente.codigo === archivo.codigo,
    );
  }
  private ordenDuplicado(archivo = this.borrador()): boolean {
    const orden = this.orden().trim();
    return Boolean(
      archivo.tipo === "2 - Anexo" &&
        archivo.estado === "Activo" &&
        orden &&
        this.archivos().some(
          (existente) =>
            existente.id !== archivo.id &&
            existente.anio === archivo.anio &&
            existente.tipo === "2 - Anexo" &&
            existente.estado === "Activo" &&
            existente.orden?.trim() === orden,
        ),
    );
  }
  private prefijoDuplicado(archivo: Archivo): boolean {
    const prefijo = this.prefijo().trim().toLocaleUpperCase();
    return Boolean(
      prefijo &&
        this.archivos().some(
          (existente) =>
            existente.id !== archivo.id &&
            existente.anio === archivo.anio &&
            existente.estado === "Activo" &&
            existente.prefijo?.trim().toLocaleUpperCase() === prefijo,
        ),
    );
  }
  private archivoEsPadreDeReglaActiva(archivo: Archivo): boolean {
    const idArchivoPadre = String(archivo.id);
    return this.archivos().some(
      (archivoRelacionado) =>
        archivoRelacionado.id !== archivo.id &&
        archivoRelacionado.estado === "Activo" &&
        archivoRelacionado.reglas.some(
          (regla) => regla.archivoPadre === idArchivoPadre,
        ),
    );
  }
  limpiarFiltros() {
    this.anioFiltro.set("");
    this.codigoFiltro.set("");
    this.nombreFiltro.set("");
    this.tipoFiltro.set("");
    this.tipoAsignacionFiltro.set("");
    this.estadoFiltro.set("");
    this.desdeFiltro.set("");
    this.hastaFiltro.set("");
    this.filtros.set(false);
  }
  abrirFiltros(): void {
    this.filtrosBorrador.set({ anio: this.anioFiltro(), codigo: this.codigoFiltro(), nombre: this.nombreFiltro(), tipo: this.tipoFiltro(), tipoAsignacion: this.tipoAsignacionFiltro(), estado: this.estadoFiltro(), desde: this.desdeFiltro(), hasta: this.hastaFiltro() });
    this.filtros.set(true);
  }
  actualizarFiltroBorrador(campo: keyof ReturnType<typeof this.filtrosBorrador>, valor: string): void {
    this.filtrosBorrador.update((filtros) => ({ ...filtros, [campo]: valor }));
  }
  aplicarFiltros(): void {
    const filtros = this.filtrosBorrador();
    this.anioFiltro.set(filtros.anio);
    this.codigoFiltro.set(filtros.codigo.trim());
    this.nombreFiltro.set(filtros.nombre.trim());
    this.tipoFiltro.set(filtros.tipo);
    this.tipoAsignacionFiltro.set(filtros.tipoAsignacion);
    this.estadoFiltro.set(filtros.estado);
    this.desdeFiltro.set(filtros.desde.trim());
    this.hastaFiltro.set(filtros.hasta.trim());
    this.filtros.set(false);
  }
  cancelarFiltros(): void { this.filtros.set(false); }
  hayFiltrosActivos(): boolean {
    return Boolean(this.anioFiltro() || this.codigoFiltro() || this.nombreFiltro() || this.tipoFiltro() || this.tipoAsignacionFiltro() || this.estadoFiltro() || this.desdeFiltro() || this.hastaFiltro());
  }
  manejarMasOpciones(opcion: string): void {
    if (opcion === 'columnas') {
      this.abrirPanelColumnas();
      return;
    }
    if (opcion === 'reiniciar-demo') this.confirmarReinicioDemo.set(true);
  }
  abrirPanelColumnas(): void {
    this.borradorColumnasGeneralesVisibles.set(new Set(this.columnasGeneralesVisibles()));
    this.borradorSeccionesVisibles.set(new Set(this.seccionesVisibles()));
    this.borradorCamposInternosVisibles.set(new Set(this.camposInternosVisibles()));
    this.panelColumnas.set(true);
  }
  cerrarPanelColumnas(): void { this.panelColumnas.set(false); }
  readonly seccionColumnasSeleccionada = (seccion: ColumnVisibilityPanelSection): boolean =>
    seccion.columns.length > 0 && seccion.columns.every((columna) => this.borradorCamposInternosVisibles().has(columna.key));
  readonly seccionColumnasIndeterminada = (seccion: ColumnVisibilityPanelSection): boolean => {
    const cantidad = seccion.columns.filter((columna) => this.borradorCamposInternosVisibles().has(columna.key)).length;
    return cantidad > 0 && cantidad < seccion.columns.length;
  };
  todasLasColumnasSeleccionadas(): boolean {
    return this.borradorColumnasGeneralesVisibles().size === this.columnasGenerales.length &&
      this.borradorCamposInternosVisibles().size === this.seccionesColumnas.flatMap((seccion) => seccion.columns).length;
  }
  columnasIndeterminadas(): boolean {
    const total = this.borradorColumnasGeneralesVisibles().size + this.borradorCamposInternosVisibles().size;
    return total > 0 && !this.todasLasColumnasSeleccionadas();
  }
  alternarTodasLasColumnas(evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.borradorColumnasGeneralesVisibles.set(marcado ? new Set(this.columnasGenerales.map((columna) => columna.key)) : new Set());
    this.borradorCamposInternosVisibles.set(marcado ? new Set(this.seccionesColumnas.flatMap((seccion) => seccion.columns.map((columna) => columna.key))) : new Set());
  }
  alternarColumnaPanel(evento: { key: string; event: Event }): void {
    const esGeneral = this.columnasGenerales.some((columna) => columna.key === evento.key);
    const siguiente = new Set(esGeneral ? this.borradorColumnasGeneralesVisibles() : this.borradorCamposInternosVisibles());
    (evento.event.target as HTMLInputElement).checked ? siguiente.add(evento.key) : siguiente.delete(evento.key);
    esGeneral ? this.borradorColumnasGeneralesVisibles.set(siguiente) : this.borradorCamposInternosVisibles.set(siguiente);
  }
  alternarSeccionPanel(evento: { section: ColumnVisibilityPanelSection; event: Event }): void {
    const marcado = (evento.event.target as HTMLInputElement).checked;
    const siguiente = new Set(this.borradorCamposInternosVisibles());
    for (const columna of evento.section.columns) marcado ? siguiente.add(columna.key) : siguiente.delete(columna.key);
    this.borradorCamposInternosVisibles.set(siguiente);
  }
  restablecerColumnas(): void {
    this.borradorColumnasGeneralesVisibles.set(new Set(this.columnasGenerales.map((columna) => columna.key)));
    this.borradorSeccionesVisibles.set(new Set());
    this.borradorCamposInternosVisibles.set(new Set());
  }
  aplicarColumnas(): void {
    this.columnasGeneralesVisibles.set(new Set(this.borradorColumnasGeneralesVisibles()));
    this.camposInternosVisibles.set(new Set(this.borradorCamposInternosVisibles()));
    this.seccionesVisibles.set(new Set(this.seccionesColumnas
      .filter((seccion) => seccion.columns.some((columna) => this.borradorCamposInternosVisibles().has(columna.key)))
      .map((seccion) => this.idSeccionColumnas(seccion))));
    if (!this.haySeccionesVisibles()) this.archivosExpandidos.set(new Set());
    this.panelColumnas.set(false);
  }
  columnasPendientesDeAplicar(): boolean {
    return !this.mismosValores(this.columnasGeneralesVisibles(), this.borradorColumnasGeneralesVisibles()) ||
      !this.mismosValores(this.camposInternosVisibles(), this.borradorCamposInternosVisibles());
  }
  private mismosValores<T>(primero: ReadonlySet<T>, segundo: ReadonlySet<T>): boolean {
    return primero.size === segundo.size && [...primero].every((valor) => segundo.has(valor));
  }
  columnaBandejaVisible(columna: string): boolean { return this.columnasGeneralesVisibles().has(columna); }
  anchoBandeja(): number {
    const anchos: Record<string, number> = {
      anio: 85, codigo: 85, nombre: 380, prefijo: 90, tipo: 170,
      tipoControl: 160, plantilla: 200, reporte: 200, estado: 130, desde: 125, hasta: 125,
    };
    return (this.haySeccionesVisibles() ? 40 : 0) + [...this.columnasGeneralesVisibles()]
      .reduce((total, columna) => total + (anchos[columna] ?? 0), 0);
  }
  cantidadColumnasBandejaVisibles(): number { return this.columnasGeneralesVisibles().size; }
  seccionVisible(seccion: SeccionDetalleArchivo): boolean { return this.seccionesVisibles().has(seccion); }
  haySeccionesVisibles(): boolean { return this.seccionesVisibles().size > 0; }
  reiniciarDemo(): void {
    this.estadoCatalogo.restablecer(structuredClone(BASE).map(limpiarFirmantesMockIniciales));
    this.archivosExpandidos.set(new Set());
    this.seccionesExpandidas.set(new Set());
    this.columnasGeneralesVisibles.set(new Set(this.columnasGenerales.map((columna) => columna.key)));
    this.borradorColumnasGeneralesVisibles.set(new Set(this.columnasGenerales.map((columna) => columna.key)));
    this.seccionesVisibles.set(new Set());
    this.borradorSeccionesVisibles.set(new Set());
    this.camposInternosVisibles.set(new Set());
    this.borradorCamposInternosVisibles.set(new Set());
    this.anioFiltro.set('2027');
    this.codigoFiltro.set('');
    this.nombreFiltro.set('');
    this.tipoFiltro.set('');
    this.tipoAsignacionFiltro.set('');
    this.estadoFiltro.set('Activo');
    this.desdeFiltro.set('');
    this.hastaFiltro.set('');
    this.busqueda.set('');
    this.confirmarReinicioDemo.set(false);
  }
  archivoExpandido(id: number): boolean { return this.archivosExpandidos().has(id); }
  alternarArchivoExpandido(id: number): void {
    const siguiente = new Set(this.archivosExpandidos());
    siguiente.has(id) ? siguiente.delete(id) : siguiente.add(id);
    this.archivosExpandidos.set(siguiente);
  }
  seccionDetalleExpandida(archivoId: number, seccion: SeccionDetalleArchivo): boolean {
    return this.seccionesExpandidas().has(`${archivoId}:${seccion}`);
  }
  alternarSeccionDetalle(archivoId: number, seccion: SeccionDetalleArchivo): void {
    const clave = `${archivoId}:${seccion}`;
    const siguiente = new Set(this.seccionesExpandidas());
    siguiente.has(clave) ? siguiente.delete(clave) : siguiente.add(clave);
    this.seccionesExpandidas.set(siguiente);
  }
  cantidadSeccionDetalle(archivo: Archivo, seccion: SeccionDetalleArchivo): number {
    return archivo[seccion].length;
  }
  atributosDeArchivo(archivo: Archivo): Atributo[] {
    return archivo.atributos.map((atributo, indice) => this.normalizarAtributo(atributo, indice));
  }
  reglasDeArchivo(archivo: Archivo): Regla[] {
    return archivo.reglas.map((regla, indice) => this.normalizarRegla(regla, indice));
  }
  referenciasDeArchivo(archivo: Archivo): ReferenciaCruzada[] {
    return archivo.referencias.map((referencia, indice) => this.normalizarReferencia(referencia, indice));
  }
  firmantesDeArchivo(archivo: Archivo): Firmante[] {
    return archivo.firmantes.map((firmante, indice) => this.normalizarFirmante(firmante, indice));
  }
  private idSeccionColumnas(seccion: ColumnVisibilityPanelSection): SeccionDetalleArchivo {
    return ({ ATRIBUTOS: 'atributos', 'REGLAS SUMARIZADAS': 'reglas', 'REFERENCIAS CRUZADAS': 'referencias', FIRMANTES: 'firmantes' } as const)[seccion.label] ?? 'atributos';
  }
  quitarFiltro(filtro: 'anio' | 'codigo' | 'nombre' | 'tipo' | 'tipoAsignacion' | 'estado' | 'desde' | 'hasta') {
    if (filtro === 'anio') this.anioFiltro.set('');
    else if (filtro === 'codigo') this.codigoFiltro.set('');
    else if (filtro === 'nombre') this.nombreFiltro.set('');
    else if (filtro === 'tipo') this.tipoFiltro.set('');
    else if (filtro === 'tipoAsignacion') this.tipoAsignacionFiltro.set('');
    else if (filtro === 'estado') this.estadoFiltro.set('');
    else if (filtro === 'desde') this.desdeFiltro.set('');
    else this.hastaFiltro.set('');
  }
}
