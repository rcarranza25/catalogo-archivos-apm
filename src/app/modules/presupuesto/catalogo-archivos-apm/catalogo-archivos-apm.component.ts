import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { BreadcrumbComponent } from "../../../shared/components/breadcrumb/breadcrumb.component";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { PaginationComponent } from "../../../shared/components/pagination/pagination.component";
import { RecordsSearchToolbarComponent } from "../../../shared/components/records-search-toolbar/records-search-toolbar.component";
import { SelectionSideNavComponent } from "../../../shared/components/selection-side-nav/selection-side-nav.component";
import { AlertComponent } from "../../../shared/ui/alert/alert.component";
import { ButtonComponent } from "../../../shared/ui/button/button.component";
import { IconComponent } from "../../../shared/ui/icon/icon.component";
import { ModalComponent } from "../../../shared/ui/modal/modal.component";
import { RadioComponent } from "../../../shared/ui/radio/radio.component";
import { RecordStatusTagComponent } from "../../../shared/ui/record-status-tag/record-status-tag.component";
import { SideNavComponent } from "../../../shared/ui/side-nav/side-nav.component";
import { SidePanelComponent } from "../../../shared/ui/side-panel/side-panel.component";
import { SnackbarComponent } from "../../../shared/ui/snackbar/snackbar.component";
import { TagComponent } from "../../../shared/ui/tag/tag.component";
import { TabsComponent, TabItem } from "../../../shared/ui/tabs/tabs.component";
import { TextFieldComponent } from "../../../shared/ui/text-field/text-field.component";
import { TooltipDirective } from "../../../shared/ui/tooltip/tooltip.directive";
import { UploadSideNavComponent } from "../../../shared/ui/upload-side-nav/upload-side-nav.component";
import { ApmMultiSelectComponent } from "./components/apm-multi-select/apm-multi-select.component";

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
type Archivo = {
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
    atributos: ["Año presupuestal", "Pliego"],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
    tipoAsignacion: "Techo",
    prefijo: "ANX11",
    orden: "1",
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
    atributos: [],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
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
    atributos: [],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
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
    firmantes: ["Responsable de presupuesto"],
  },
];

@Component({
  selector: "siaf-catalogo-archivos-apm",
  standalone: true,
  imports: [
    AlertComponent,
    ApmMultiSelectComponent,
    BreadcrumbComponent,
    ButtonComponent,
    IconComponent,
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
    TagComponent,
    TabsComponent,
    TextFieldComponent,
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

    .apm-multi-value-lines {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow-wrap: anywhere;
      white-space: pre-line;
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
                  (click)="filtros.set(true)" /></ng-container
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
              @if (anioFiltro() || estadoFiltro()) {
                <div class="ml-auto">
                  <siaf-button variant="outline" size="sm" icon="delete" (click)="limpiarFiltros()">Borrar filtros</siaf-button>
                </div>
              }
            </div>
            <div class="mt-siaf-lg overflow-x-auto rounded-siaf-sm">
              <table class="w-full min-w-[900px] border-collapse text-left">
                <thead class="bg-surface-high text-[10px] uppercase">
                  <tr
                    class="h-10 border-b border-[var(--sys-color-divider-default)]"
                  >
                    <th class="px-siaf-md">Año</th>
                    <th class="px-siaf-md">Código</th>
                    <th class="px-siaf-md">Nombre del archivo</th>
                    <th class="px-siaf-md">Tipo</th>
                    <th class="px-siaf-md">Estado</th>
                    <th class="px-siaf-md">Fecha desde</th>
                    <th class="px-siaf-md">Fecha hasta</th>
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
                      <td class="px-siaf-md">{{ a.anio }}</td>
                      <td class="px-siaf-md">{{ a.codigo }}</td>
                      <td class="px-siaf-md">{{ a.nombre }}</td>
                      <td class="px-siaf-md">{{ a.tipo }}</td>
                      <td class="px-siaf-md">
                        <siaf-record-status-tag [status]="a.estado" />
                      </td>
                      <td class="px-siaf-md">{{ a.desde }}</td>
                      <td class="px-siaf-md">{{ a.hasta }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td class="p-siaf-md" colspan="7">
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
                <siaf-button variant="outline" (click)="cancelar()"
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
                  label="Tipo de asignación"
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
                        <colgroup><col class="apm-attribute-selection-column" /><col class="w-[72px]" /><col class="w-[72px]" /><col class="w-[190px]" /><col class="w-[260px]" /><col class="w-[200px]" /><col class="w-[240px]" /><col class="w-[160px]" /><col class="w-[160px]" /><col class="w-[135px]" /><col class="w-[180px]" /><col class="w-[135px]" /><col class="w-[120px]" /><col class="w-[120px]" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="apm-attribute-selection-column p-0"></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Código</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Orden</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Columna del Excel</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nombre del campo</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Destino del dato</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Clasificador</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nivel mínimo</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Nivel máximo</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Autogenerado</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Derivado por</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Tipo de dato</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Obligatorio</span></th><th class="p-siaf-sm"><span class="block truncate" siafTooltip>Multianual</span></th></tr></thead>
                        <tbody>@for (a of atributosVista(); track a.id) {<tr class="border-b border-[var(--sys-color-divider-default)]" [class.bg-[var(--sys-color-bg-states-light-selected)]]="atributoEstaSeleccionado(a.id)"><td class="apm-attribute-selection-column p-0 text-center align-middle"><input type="checkbox" [checked]="atributoEstaSeleccionado(a.id)" (change)="alternarSeleccionAtributo(a.id, $any($event.target).checked)" aria-label="Seleccionar fila atributo" /></td><td class="p-siaf-sm" siafTooltip>{{a.codigo}}</td><td class="p-siaf-sm" siafTooltip>{{a.orden}}</td><td class="apm-multi-value-cell p-siaf-sm"><span class="apm-multi-value-lines" [siafTooltip]="etiquetasColumnasOrdenadas(a.columnas)" tooltipMode="truncated">{{etiquetasColumnasEnLineas(a.columnas)}}</span></td><td class="p-siaf-sm" [siafTooltip]="identificadorTecnico(a.nombre)">{{identificadorTecnico(a.nombre)}}</td><td class="p-siaf-sm" siafTooltip>{{a.destino}}</td><td class="p-siaf-sm" siafTooltip>{{a.clasificador}}</td><td class="p-siaf-sm" siafTooltip>{{a.nivelMinimo}}</td><td class="p-siaf-sm" siafTooltip>{{a.nivelMaximo}}</td><td class="p-siaf-sm" siafTooltip>{{a.autogenerado ? 'Sí' : 'No'}}</td><td class="p-siaf-sm" siafTooltip>{{a.derivadoPor}}</td><td class="p-siaf-sm" siafTooltip>{{a.tipoDato}}</td><td class="p-siaf-sm" siafTooltip>{{a.obligatorio ? 'Sí' : 'No'}}</td><td class="p-siaf-sm" siafTooltip>{{a.multianual ? 'Sí' : 'No'}}</td></tr>}</tbody>
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
                    @if (cantidadReglasSeleccionadas() === 1) {
                      <div class="mt-siaf-sm flex justify-end"><siaf-button variant="text" icon="edit" [iconOnly]="true" ariaLabel="Editar regla" (click)="editarReglaSeleccionada()" /></div>
                    }
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
                  @if (referenciasVista().length || referenciaEsNueva()) {
                    <div class="overflow-x-auto" aria-label="Tabla de referencias cruzadas">
                      <table class="apm-editable-table min-w-[920px] w-full border-collapse text-sm">
                        <colgroup><col class="w-[110px]" /><col class="w-[300px]" /><col class="w-[minmax(360px,1fr)]" /><col class="w-[130px]" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr>
                          <th class="p-siaf-sm text-left">Código</th><th class="p-siaf-sm text-left">Catálogo relacional</th><th class="p-siaf-sm text-left">Atributos comunes</th><th class="apm-editable-actions p-siaf-sm text-center">Accionables</th>
                        </tr></thead>
                        <tbody>
                          @for (referencia of referenciasVista(); track referencia.id) {
                            @let fila = referenciaFila(referencia);
                            <tr class="border-b border-[var(--sys-color-divider-default)]">
                              <td class="p-siaf-sm">{{ fila.codigo }}</td>
                              <td class="p-siaf-sm"><siaf-input label="Catálogo relacional" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(catalogosRelacionales)" [value]="fila.catalogoRelacional" (valueChange)="actualizarReferenciaFila(referencia, 'catalogoRelacional', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-apm-multi-select label="Atributos comunes" [required]="true" [options]="opcionesAtributosComunes()" [value]="fila.atributosComunes" (valueChange)="actualizarReferenciaFila(referencia, 'atributosComunes', $any($event))" /></td>
                              <td class="apm-editable-actions p-siaf-sm"><div class="flex justify-center gap-siaf-xxs">
                                @if (referenciaTieneCambios(referencia)) {
                                  <siaf-button variant="text" icon="close" [iconOnly]="true" ariaLabel="Cancelar cambios de referencia cruzada" (click)="cancelarCambiosReferencia(referencia.id)" />
                                  <siaf-button variant="text" icon="check" [iconOnly]="true" ariaLabel="Aceptar cambios de referencia cruzada" [disabled]="!referenciaFilaValida(referencia)" (click)="aceptarCambiosReferencia(referencia)" />
                                }
                                <siaf-button variant="text" icon="delete" [iconOnly]="true" ariaLabel="Eliminar referencia cruzada" [disabled]="referenciaFilaAbierta()" (click)="solicitarEliminarReferencia(referencia)" />
                              </div></td>
                            </tr>
                          }
                          @if (referenciaEsNueva()) {
                            @let fila = referenciaBorrador();
                            <tr class="border-b border-[var(--sys-color-divider-default)]">
                              <td class="p-siaf-sm">{{ fila.codigo }}</td>
                              <td class="p-siaf-sm"><siaf-input label="Catálogo relacional" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(catalogosRelacionales)" [value]="fila.catalogoRelacional" (valueChange)="actualizarReferenciaNueva('catalogoRelacional', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-apm-multi-select label="Atributos comunes" [required]="true" [options]="opcionesAtributosComunes()" [value]="fila.atributosComunes" (valueChange)="actualizarReferenciaNueva('atributosComunes', $any($event))" /></td>
                              <td class="apm-editable-actions p-siaf-sm"><div class="flex justify-center gap-siaf-xxs"><siaf-button variant="text" icon="close" [iconOnly]="true" ariaLabel="Cancelar nueva referencia cruzada" (click)="cancelarReferenciaNueva()" /><siaf-button variant="text" icon="check" [iconOnly]="true" ariaLabel="Aceptar nueva referencia cruzada" [disabled]="!referenciaNuevaValida()" (click)="aceptarReferenciaNueva()" /></div></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <siaf-pagination class="mt-siaf-md block min-w-0" position="Bottom" [rowPage]="true" [pageSize]="10" [rowsPerPage]="10" [totalItems]="referenciasVista().length" [totalPages]="1" />
                  } @else {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      Aún no se han agregado referencias cruzadas. Haga clic en Añadir para registrar la primera.
                    </p>
                  }
                  <siaf-button class="mt-siaf-md" variant="text" icon="add" [disabled]="referenciaFilaAbierta()" (click)="agregarReferencia()">Añadir</siaf-button>
                </div>
              }
              @if (pestana() === "firmantes") {
                <div class="p-siaf-md">
                  <div class="mb-siaf-md flex items-center gap-siaf-sm">
                    <h3 class="m-0 text-sm font-bold">Firmantes</h3>
                    <siaf-button class="ml-auto" variant="filled" icon="add" [iconOnly]="true" ariaLabel="Añadir firmante" [disabled]="firmanteFilaAbierta()" (click)="agregarFirmante()" />
                  </div>
                  @if (firmantesVista().length || firmanteEsNuevo()) {
                    <div class="overflow-x-auto" aria-label="Tabla de firmantes">
                      <table class="apm-editable-table min-w-[980px] w-full border-collapse text-sm">
                        <colgroup><col class="w-[90px]" /><col class="w-[320px]" /><col class="w-[170px]" /><col class="w-[190px]" /><col class="w-[130px]" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr>
                          <th class="p-siaf-sm text-left">Código</th><th class="p-siaf-sm text-left">Firmante</th><th class="p-siaf-sm text-left">Orden</th><th class="p-siaf-sm text-left">Documento firmado</th><th class="apm-editable-actions p-siaf-sm text-center">Acciones</th>
                        </tr></thead>
                        <tbody>
                          @for (firmante of firmantesVista(); track firmante.id) {
                            @let fila = firmanteFila(firmante);
                            <tr class="border-b border-[var(--sys-color-divider-default)]">
                              <td class="p-siaf-sm">{{ fila.codigo }}</td>
                              <td class="p-siaf-sm"><siaf-input label="Firmante" type="select" [required]="true" [autoSuccess]="false" [disabled]="firmante.documentoFirmado" [options]="opcionesConSeleccionar(firmantesDisponibles)" [value]="fila.firmante" (valueChange)="actualizarFirmanteFila(firmante, 'firmante', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-input label="Orden" type="number" [autoSuccess]="false" [disabled]="firmante.documentoFirmado" [error]="errorOrdenFirmanteFila(firmante)" [value]="fila.orden" (valueChange)="actualizarFirmanteFila(firmante, 'orden', $any($event))" /></td>
                              <td class="p-siaf-sm"><label class="inline-flex items-center gap-siaf-xs"><input type="checkbox" [checked]="fila.documentoFirmado" disabled aria-label="Documento firmado" /> {{ fila.documentoFirmado ? 'Sí' : 'No' }}</label></td>
                              <td class="apm-editable-actions p-siaf-sm"><div class="flex justify-center gap-siaf-xxs">
                                @if (firmanteTieneCambios(firmante)) {
                                  <siaf-button variant="text" icon="close" [iconOnly]="true" ariaLabel="Cancelar cambios de firmante" (click)="cancelarCambiosFirmante(firmante.id)" />
                                  <siaf-button variant="text" icon="check" [iconOnly]="true" ariaLabel="Aceptar cambios de firmante" [disabled]="!firmanteFilaValida(firmante)" (click)="aceptarCambiosFirmante(firmante)" />
                                }
                                <siaf-button variant="text" icon="delete" [iconOnly]="true" ariaLabel="Eliminar firmante" [disabled]="firmante.documentoFirmado || firmanteFilaAbierta()" (click)="solicitarEliminarFirmante(firmante)" />
                              </div></td>
                            </tr>
                          }
                          @if (firmanteEsNuevo()) {
                            @let fila = firmanteBorrador();
                            <tr class="border-b border-[var(--sys-color-divider-default)]">
                              <td class="p-siaf-sm">{{ fila.codigo }}</td>
                              <td class="p-siaf-sm"><siaf-input label="Firmante" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(firmantesDisponibles)" [value]="fila.firmante" (valueChange)="actualizarFirmante('firmante', $any($event))" /></td>
                              <td class="p-siaf-sm"><siaf-input label="Orden" type="number" [autoSuccess]="false" [error]="errorOrdenFirmante()" [value]="fila.orden" (valueChange)="actualizarFirmante('orden', $any($event))" /></td>
                              <td class="p-siaf-sm"><label class="inline-flex items-center gap-siaf-xs"><input type="checkbox" [checked]="false" disabled aria-label="Documento firmado" /> No</label></td>
                              <td class="apm-editable-actions p-siaf-sm"><div class="flex justify-center gap-siaf-xxs"><siaf-button variant="text" icon="close" [iconOnly]="true" ariaLabel="Cancelar nuevo firmante" (click)="cancelarFirmante()" /><siaf-button variant="text" icon="check" [iconOnly]="true" ariaLabel="Aceptar nuevo firmante" [disabled]="!firmanteValido()" (click)="aceptarFirmante()" /></div></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <siaf-pagination class="mt-siaf-md block min-w-0" position="Bottom" [rowPage]="true" [pageSize]="10" [rowsPerPage]="10" [totalItems]="firmantesVista().length" [totalPages]="1" />
                  } @else {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      No hay firmantes configurados.
                    </p>
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
      (confirmed)="filtros.set(false)"
      (canceled)="limpiarFiltros()"
      (closed)="filtros.set(false)"
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
          [value]="anioFiltro()"
          (valueChange)="anioFiltro.set($any($event))"
        /><siaf-input
          label="Estado"
          type="select"
          [autoSuccess]="false"
          [options]="[
            { value: '', label: 'Todos' },
            { value: 'Activo', label: 'Activo' },
            { value: 'Inactivo', label: 'Inactivo' },
          ]"
          [value]="estadoFiltro()"
          (valueChange)="estadoFiltro.set($any($event))"
        /></div
    ></siaf-side-nav>
    <siaf-selection-side-nav
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
        @if (anioOrigenFiltro()) {
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
          <siaf-input class="min-w-0" label="Orden" type="number" [required]="true" [value]="atributoBorrador().orden" (valueChange)="actualizarAtributo('orden', $any($event))" />
          <siaf-apm-multi-select class="min-w-0" label="Columna Excel" [options]="columnasPlantilla" [value]="atributoBorrador().columnas" (valueChange)="seleccionarColumnas($any($event))" />
          <siaf-input class="min-w-0" label="Nombre del campo" [required]="true" [value]="identificadorTecnico(atributoBorrador().nombre)" (valueChange)="actualizarNombreAtributo($any($event))" />
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
      <div class="apm-regla-form grid grid-cols-1 gap-x-siaf-lg gap-y-siaf-md md:grid-cols-2">
        <siaf-input label="Código" [disabled]="true" [autoSuccess]="false" [value]="reglaBorrador().codigo ?? ''" />
        <siaf-input label="Archivo padre" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(opcionesArchivoPadre())" [value]="reglaBorrador().archivoPadre ?? ''" (valueChange)="actualizarRegla('archivoPadre', $any($event))" />
        <siaf-input label="Nivel de agregación" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(nivelesAgregacion)" [value]="reglaBorrador().nivelAgregacion ?? ''" (valueChange)="actualizarRegla('nivelAgregacion', $any($event))" />
        <siaf-input label="Operador" type="select" [required]="true" [autoSuccess]="false" [options]="opcionesConSeleccionar(operadoresRegla)" [value]="reglaBorrador().operador" (valueChange)="actualizarRegla('operador', $any($event))" />
        <siaf-apm-multi-select label="Atributos comunes" [required]="true" [options]="opcionesAtributosComunes()" [value]="reglaBorrador().atributosComunes ?? []" (valueChange)="actualizarRegla('atributosComunes', $any($event))" />
        <siaf-apm-multi-select label="Montos a revisar" [required]="true" [options]="opcionesMontosARevisar()" [value]="reglaBorrador().montosARevisar ?? []" (valueChange)="actualizarRegla('montosARevisar', $any($event))" />
      </div>
    </siaf-side-panel>
    <siaf-modal [open]="confirmarEliminarAtributo()" title="¿Eliminar atributo?" description="El atributo seleccionado se retirará del formulario." (confirmed)="eliminarAtributo()" (closed)="confirmarEliminarAtributo.set(false)" />
    <siaf-modal [open]="confirmarEliminarReferencia() !== null" variant="delete-record" title="¿Eliminar referencia cruzada?" description="La referencia cruzada seleccionada se retirará de la configuración." (confirmed)="eliminarReferencia()" (closed)="confirmarEliminarReferencia.set(null)" />
    <siaf-modal [open]="confirmarEliminarFirmante() !== null" variant="delete-record" title="¿Eliminar firmante?" description="El firmante seleccionado se retirará de la configuración." (confirmed)="eliminarFirmante()" (closed)="confirmarEliminarFirmante.set(null)" />
    <siaf-modal
      [open]="confirmarPlantilla()"
      variant="custom"
      title="¿Reemplazar documento plantilla?"
      description="Al grabar se eliminarán Atributos, Reglas sumarizadas y Referencias cruzadas. Se conservarán los Firmantes."
      illustrationSrc="assets/figma/modals/validate.svg"
      [showIllustration]="true"
      (confirmed)="confirmarCambioPlantilla()"
      (canceled)="confirmarPlantilla.set(false)"
      (closed)="confirmarPlantilla.set(false)"
    />
    <siaf-modal
      [open]="confirmarGuardar()"
      variant="custom"
      title="¿Grabar archivo de la APM?"
      description="Los cambios quedarán guardados."
      illustrationSrc="assets/figma/modals/save_1.svg"
      [showIllustration]="true"
      (confirmed)="grabar()"
      (canceled)="confirmarGuardar.set(false)"
      (closed)="confirmarGuardar.set(false)"
    />
    <siaf-modal
      [open]="confirmarInactivacion()"
      variant="custom"
      title="¿Está seguro(a) de inactivar el archivo?"
      description="El archivo dejará de estar disponible, pero su información no será eliminada."
      (confirmed)="confirmarInactivacionArchivo()"
      (canceled)="cancelarInactivacion()"
      (closed)="cancelarInactivacion()"
    />
    <div class="fixed bottom-siaf-lg left-1/2 z-50 w-[min(430px,calc(100vw-32px))] -translate-x-1/2">
      <siaf-snackbar
        [open]="snack()"
        tone="success"
        [message]="mensajeSnack()"
        (closed)="snack.set(false)"
      />
    </div>
  </main>`,
})
export class CatalogoArchivosApmComponent {
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
  readonly breadcrumbs = [
    { label: "Inicio", href: "/panel" },
    { label: "Clasificadores y catálogos" },
    { label: "Catálogos" },
    { label: "Catálogo de archivos de la APM" },
  ];
  readonly tabs: TabItem[] = [
    { id: "atributos", label: "ATRIBUTOS" },
    { id: "reglas", label: "REGLAS SUMARIZADAS" },
    { id: "referencias", label: "REFERENCIAS CRUZADAS" },
    { id: "firmantes", label: "FIRMANTES" },
  ];
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
  readonly archivos = signal<Archivo[]>(structuredClone(BASE));
  readonly busqueda = signal("");
  // La vista inicial del catálogo parte de la programación vigente.
  // Un string vacío representa un filtro retirado desde los tags aplicados.
  readonly anioFiltro = signal("2027");
  readonly estadoFiltro = signal<Estado | "">("Activo");
  readonly filtros = signal(false);
  readonly editando = signal(false);
  readonly seleccionandoModo = signal(false);
  readonly modoAlta = signal<"nuevo" | "copia">("nuevo");
  readonly panelOrigen = signal(false);
  readonly busquedaOrigen = signal("");
  /** Filtros adicionales del panel; el tipo viene siempre del formulario. */
  readonly anioOrigenFiltro = signal("");
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
  readonly panelReglaAbierto = signal(false);
  readonly editandoRegla = signal(false);
  readonly reglaBorrador = signal<Regla>({ id: 0, codigo: 1, archivoPadre: '', nivelAgregacion: '', operador: '', atributosComunes: [], montosARevisar: [] });
  readonly reglasSeleccionadas = signal<ReadonlySet<number>>(new Set());
  readonly cantidadReglasSeleccionadas = computed(() => this.reglasSeleccionadas().size);
  readonly firmantesDisponibles = [
    'Loli Jhover Chavez',
    'Cinthya Bravo',
    'Sergio Espinoza',
    'Patricia CIME',
    'Peggy Alcón',
    'Cristina Mendoza',
  ].map((value) => ({ value, label: value }));
  readonly firmanteEsNuevo = signal(false);
  readonly firmanteEditandoId = signal<number | null>(null);
  readonly firmanteBorrador = signal<Firmante>({ id: 0, codigo: 1, firmante: '', orden: '', documentoFirmado: false });
  readonly borradoresFirmantes = signal<Readonly<Record<number, Firmante>>>({});
  readonly confirmarEliminarFirmante = signal<number | null>(null);
  readonly referenciaEsNueva = signal(false);
  readonly referenciaBorrador = signal<ReferenciaCruzada>({ id: 0, codigo: 1, catalogoRelacional: '', atributosComunes: [] });
  readonly borradoresReferencias = signal<Readonly<Record<number, ReferenciaCruzada>>>({});
  readonly confirmarEliminarReferencia = signal<number | null>(null);
  readonly catalogosRelacionales = [
    { value: '15 - CR Objeto del Gasto por Fuente', label: '15 - CR Objeto del Gasto por Fuente' },
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
  readonly derivados = ['1 - Corte nivel','2 - Corte nivel'].map(value=>({value,label:value}));
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
  readonly confirmarInactivacion = signal(false);
  readonly snack = signal(false);
  readonly mensajeSnack = signal("");
  readonly archivosFiltrados = computed(() =>
    this.archivos().filter(
      (a) =>
        (!this.anioFiltro() || a.anio === this.anioFiltro()) &&
        (!this.estadoFiltro() || a.estado === this.estadoFiltro()) &&
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
    if (location.pathname.endsWith("/nuevo")) this.seleccionandoModo.set(true);
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
  }
  alternarFiltroAnioOrigen() {
    this.anioOrigenFiltro.set(this.anioOrigenFiltro() ? "" : "2026");
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
    // RN-FIR: una copia no hereda documentos ya firmados.
    copia.firmantes = copia.firmantes.map((firmante, indice) => ({
      ...this.normalizarFirmante(firmante, indice),
      documentoFirmado: false,
    }));
    this.borrador.set(copia);
    this.archivoPlantilla.set(null);
    this.cargaPlantillaAbierta.set(false);
    this.tipoAsignacion.set(origen.tipoAsignacion ?? "");
    this.prefijo.set(origen.prefijo ?? "");
    this.documentoReporte.set("");
    this.orden.set(String(this.siguienteOrden()));
    this.pestana.set("atributos");
    this.seleccionandoModo.set(false);
    this.editando.set(true);
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
      !this.firmanteFilaAbierta() &&
      this.configuracionFirmantesValida() &&
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
    if (this.firmanteFilaAbierta()) {
      this.alertaFormulario.set("Finalice o cancele la edición del firmante antes de grabar el archivo.");
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
      firmantes: [],
    });
    this.orden.set("");
    this.tipoAsignacion.set("");
    this.prefijo.set("");
    this.documentoReporte.set("");
    this.pestana.set("atributos");
    this.seleccionandoModo.set(false);
    this.editando.set(true);
  }
  abrir(a: Archivo) {
    this.esNuevo.set(false);
    this.reemplazoConfirmado.set(false);
    this.borrador.set(structuredClone(a));
    this.tipoAsignacion.set(a.tipoAsignacion ?? "");
    this.prefijo.set(a.prefijo ?? "");
    this.orden.set(a.orden ?? "");
    this.pestana.set("atributos");
    this.editando.set(true);
  }
  cancelar() {
    this.editando.set(false);
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
    this.archivoPlantilla.set(null);
    this.borrador.update((archivo) => ({ ...archivo, plantilla: "", atributos: [] }));
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
    this.cargaReporteAbierta.set(false);
  }
  cambiarPlantilla(value: string) {
    if (value === this.borrador().plantilla) return;
    this.plantillaPendiente.set(value);
    this.confirmarPlantilla.set(true);
  }
  confirmarCambioPlantilla() {
    this.borrador.update((a) => ({
      ...a,
      plantilla: this.plantillaPendiente(),
    }));
    this.reemplazoConfirmado.set(true);
    this.confirmarPlantilla.set(false);
  }
  agregarAtributo() {
    if (!this.borrador().plantilla) return;
    this.editandoAtributo.set(false);
    this.atributosSeleccionados.set(new Set());
    this.atributoBorrador.set(this.nuevoAtributo());
    this.panelAtributoAbierto.set(true);
  }
  nuevoAtributo(): Atributo { return {id:Date.now(),codigo:this.atributosVista().length + 1,orden:'',columnas:[],nombre:'',destino:'',tipoDato:'',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''}; }
  normalizarAtributo(valor: string | Atributo, indice: number): Atributo { return typeof valor === 'string' ? {id:-(indice+1),codigo:indice+1,orden:String(indice+1),columnas:[],nombre:valor,destino:'2 - Detalle JSON',tipoDato:'Texto',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''} : valor; }
  actualizarAtributo(campo: keyof Atributo, valor: string | boolean) { this.atributoBorrador.update(a => ({...a,[campo]:valor} as Atributo)); }
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
  }
  guardarAtributo() {
    if (!this.atributoValido()) return;
    const atributo = this.atributoBorrador();
    const estabaEditando = this.editandoAtributo();
    this.borrador.update((archivo) => ({
      ...archivo,
      atributos: estabaEditando
        ? archivo.atributos.map((valor, indice) => this.normalizarAtributo(valor, indice).id === atributo.id ? atributo : valor)
        : [...archivo.atributos, atributo],
    }));
    this.cerrarAtributo();
    if (estabaEditando) this.mostrarSnackbarExito("El registro de atributo se modificó con éxito.");
  }
  editarAtributo() { const [id] = this.atributosSeleccionados(); const a=this.atributosVista().find(x=>x.id===id); if(!a)return; this.editandoAtributo.set(true); this.atributoBorrador.set(structuredClone(a)); this.panelAtributoAbierto.set(true); }
  eliminarAtributo() { const ids=this.atributosSeleccionados(); this.borrador.update(x=>({...x,atributos:x.atributos.filter((v,i)=>!ids.has(this.normalizarAtributo(v,i).id))})); this.atributosSeleccionados.set(new Set()); this.confirmarEliminarAtributo.set(false); }
  agregarRegla() {
    this.editandoRegla.set(false);
    this.reglasSeleccionadas.set(new Set());
    this.reglaBorrador.set({ id: Date.now(), codigo: this.siguienteCodigoRegla(), archivoPadre: '', nivelAgregacion: '', operador: '', atributosComunes: [], montosARevisar: [] });
    this.panelReglaAbierto.set(true);
  }
  reglaEstaSeleccionada(id: number): boolean { return this.reglasSeleccionadas().has(id); }
  alternarSeleccionRegla(id: number, seleccionada: boolean): void {
    this.reglasSeleccionadas.set(seleccionada ? new Set([id]) : new Set());
  }
  editarReglaSeleccionada(): void {
    const [id] = this.reglasSeleccionadas();
    const regla = this.reglasVista().find((item) => item.id === id);
    if (!regla) return;
    this.editandoRegla.set(true);
    this.reglaBorrador.set(structuredClone(regla));
    this.panelReglaAbierto.set(true);
  }
  actualizarRegla(campo: keyof Omit<Regla, 'id'>, valor: string | string[]): void {
    this.reglaBorrador.update((regla) => ({ ...regla, [campo]: valor }));
  }
  reglaValida(): boolean {
    const regla = this.reglaBorrador();
    return Boolean(regla.archivoPadre && regla.nivelAgregacion && regla.operador && regla.atributosComunes?.length && regla.montosARevisar?.length);
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
    this.borrador.update((archivo) => ({
      ...archivo,
      reglas: estabaEditando
        ? archivo.reglas.map((item) => item.id === regla.id ? regla : item)
        : [...archivo.reglas, regla],
    }));
    this.cerrarRegla();
    if (estabaEditando) this.mostrarSnackbarExito("El registro de regla sumarizada se modificó con éxito.");
  }
  readonly reglasVista = computed(() => this.borrador().reglas.map((regla, indice) => this.normalizarRegla(regla, indice)));
  opcionesArchivoPadre() {
    return this.archivos()
      .filter((archivo) => archivo.anio === this.borrador().anio && archivo.id !== this.borrador().id)
      .map((archivo) => ({ value: String(archivo.id), label: `${archivo.codigo} - ${archivo.nombre}` }));
  }
  opcionesAtributosComunes() {
    return this.atributosVista().map((atributo) => ({ value: atributo.nombre, label: this.identificadorTecnico(atributo.nombre) }));
  }
  opcionesMontosARevisar() {
    return this.atributosVista()
      .filter((atributo) => atributo.tipoDato === 'Monto')
      .filter((atributo, indice, atributos) => atributos.findIndex((candidato) => candidato.nombre === atributo.nombre) === indice)
      .map((atributo) => ({ value: atributo.nombre, label: this.identificadorTecnico(atributo.nombre) }));
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
    this.referenciaBorrador.update((referencia) => ({ ...referencia, [campo]: valor }));
  }
  referenciaFilaValida(referencia: ReferenciaCruzada): boolean {
    const fila = this.referenciaFila(referencia);
    return Boolean(fila.catalogoRelacional && fila.atributosComunes.length);
  }
  referenciaNuevaValida(): boolean {
    const referencia = this.referenciaBorrador();
    return Boolean(referencia.catalogoRelacional && referencia.atributosComunes.length);
  }
  aceptarCambiosReferencia(referencia: ReferenciaCruzada): void {
    if (!this.referenciaTieneCambios(referencia) || !this.referenciaFilaValida(referencia)) return;
    const actualizada = structuredClone(this.referenciaFila(referencia));
    this.borrador.update((archivo) => ({
      ...archivo,
      referencias: archivo.referencias.map((valor, indice) => this.normalizarReferencia(valor, indice).id === referencia.id ? actualizada : valor),
    }));
    this.cancelarCambiosReferencia(referencia.id);
    this.mostrarSnackbarExito('El registro de referencia cruzada se modificó con éxito.');
  }
  aceptarReferenciaNueva(): void {
    if (!this.referenciaNuevaValida()) return;
    this.borrador.update((archivo) => ({ ...archivo, referencias: [...archivo.referencias, structuredClone(this.referenciaBorrador())] }));
    this.cancelarReferenciaNueva();
  }
  cancelarCambiosReferencia(id: number): void {
    this.borradoresReferencias.update((borradores) => {
      const { [id]: _descartado, ...restantes } = borradores;
      return restantes;
    });
  }
  cancelarReferenciaNueva(): void {
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
    const siguiente = { ...this.firmanteFila(firmante), [campo]: valor };
    this.borradoresFirmantes.update((borradores) => {
      if (this.firmantesSonIguales(siguiente, firmante)) {
        const { [firmante.id]: _descartado, ...restantes } = borradores;
        return restantes;
      }
      return { ...borradores, [firmante.id]: siguiente };
    });
  }
  errorOrdenFirmanteFila(firmante: Firmante): string {
    const fila = this.firmanteFila(firmante);
    const orden = fila.orden.trim();
    if (!orden) return '';
    if (!this.ordenFirmanteValido(orden)) return 'Ingrese un número entero mayor que cero.';
    return this.firmantesVista().some((otro) => {
      const candidato = this.firmanteFila(otro);
      return candidato.id !== fila.id && candidato.orden.trim() && Number(candidato.orden) === Number(orden);
    }) ? 'El orden ya fue asignado a otro firmante.' : '';
  }
  firmanteFilaValida(firmante: Firmante): boolean {
    const fila = this.firmanteFila(firmante);
    return Boolean(fila.firmante && !this.errorOrdenFirmanteFila(firmante));
  }
  aceptarCambiosFirmante(firmante: Firmante): void {
    if (!this.firmanteTieneCambios(firmante) || !this.firmanteFilaValida(firmante)) return;
    const actualizado = structuredClone(this.firmanteFila(firmante));
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
    this.firmanteEditandoId.set(firmante.id);
  }
  actualizarFirmante(campo: 'firmante' | 'orden', valor: string): void {
    this.firmanteBorrador.update((firmante) => ({ ...firmante, [campo]: valor }));
  }
  errorOrdenFirmante(): string {
    const orden = this.firmanteBorrador().orden.trim();
    if (!orden) return '';
    if (!this.ordenFirmanteValido(orden)) return 'Ingrese un número entero mayor que cero.';
    return this.ordenFirmanteDuplicado(orden, this.firmanteEditandoId() ?? undefined)
      ? 'El orden ya fue asignado a otro firmante.'
      : '';
  }
  firmanteValido(): boolean {
    return Boolean(this.firmanteBorrador().firmante && !this.errorOrdenFirmante());
  }
  aceptarFirmante(): void {
    if (!this.firmanteValido()) return;
    const firmante = structuredClone(this.firmanteBorrador());
    const editandoId = this.firmanteEditandoId();
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
  private siguienteCodigoFirmante(): number {
    return Math.max(0, ...this.firmantesVista().map((firmante) => firmante.codigo)) + 1;
  }
  private siguienteCodigoReferencia(): number {
    return Math.max(0, ...this.referenciasVista().map((referencia) => referencia.codigo)) + 1;
  }
  private ordenFirmanteValido(orden: string): boolean {
    return /^\d+$/.test(orden) && Number(orden) > 0;
  }
  private ordenFirmanteDuplicado(orden: string, excluirId?: number): boolean {
    return this.firmantesVista().some((firmante) => firmante.id !== excluirId && firmante.orden.trim() && Number(firmante.orden) === Number(orden));
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
  private referenciasSonIguales(a: ReferenciaCruzada, b: ReferenciaCruzada): boolean {
    return a.id === b.id && a.codigo === b.codigo && a.catalogoRelacional === b.catalogoRelacional && a.atributosComunes.length === b.atributosComunes.length && a.atributosComunes.every((valor, indice) => valor === b.atributosComunes[indice]);
  }
  private siguienteCodigoRegla(): number {
    return Math.max(0, ...this.reglasVista().map((regla) => regla.codigo ?? 0)) + 1;
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
    this.mensajeSnack.set(mensaje);
    this.snack.set(true);
  }
  solicitarGrabar() {
    if (this.validarAntesDeGrabar()) this.confirmarGuardar.set(true);
  }
  grabar() {
    if (!this.validarAntesDeGrabar()) {
      this.confirmarGuardar.set(false);
      return;
    }
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
    this.mensajeSnack.set("Archivo de la APM grabado correctamente.");
    this.snack.set(true);
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
    this.estadoFiltro.set("");
    this.filtros.set(false);
  }
  quitarFiltro(filtro: "anio" | "estado") {
    if (filtro === "anio") this.anioFiltro.set("");
    else this.estadoFiltro.set("");
  }
}
