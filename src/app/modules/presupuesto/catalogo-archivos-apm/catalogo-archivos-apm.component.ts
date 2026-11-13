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
import { TabsComponent, TabItem } from "../../../shared/ui/tabs/tabs.component";
import { TextFieldComponent } from "../../../shared/ui/text-field/text-field.component";
import { UploadSideNavComponent } from "../../../shared/ui/upload-side-nav/upload-side-nav.component";

type Estado = "Activo" | "Inactivo";
type Regla = {
  id: number;
  origen: string;
  nivel: string;
  operador: string;
  valor: string;
};
type Atributo = {
  id: number; codigo: number; orden: string; columnas: string[]; nombre: string;
  destino: string; tipoDato: string; clasificador: string; nivelMinimo: string;
  nivelMaximo: string; obligatorio: boolean; multianual: boolean;
  autogenerado: boolean; derivadoPor: string;
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
  referencias: string[];
  firmantes: string[];
  /** Datos de cabecera que se conservan al tomar un archivo como origen. */
  tipoAsignacion?: string;
  prefijo?: string;
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
    desde: "02/02/2026",
    hasta: "-",
    atributos: [],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
  },
  {
    id: 102,
    anio: "2027",
    codigo: "2",
    nombre:
      "Asignación presupuestaria por unidad ejecutora y específica de gasto",
    tipo: "2 - Anexo",
    plantilla: "Plantilla_Anexo_2.xlsx",
    estado: "Activo",
    desde: "02/02/2026",
    hasta: "-",
    atributos: [],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
  },
  {
    id: 103,
    anio: "2027",
    codigo: "3",
    nombre: "Asignación presupuestaria multianual de gastos",
    tipo: "1 - APM de Gastos",
    plantilla: "APM de Gastos.xlsx",
    estado: "Activo",
    desde: "02/02/2026",
    hasta: "-",
    atributos: [],
    reglas: [],
    referencias: [],
    firmantes: ["Responsable de presupuesto"],
  },
  {
    id: 104,
    anio: "2027",
    codigo: "4",
    nombre: "Pie de página",
    tipo: "3 - Pie de Página",
    plantilla: "Pie de Página.xlsx",
    estado: "Activo",
    desde: "02/02/2026",
    hasta: "-",
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
    TabsComponent,
    TextFieldComponent,
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
                <span class="inline-flex h-8 items-center gap-siaf-xxs rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] bg-surface px-siaf-xs py-siaf-xxs text-sm leading-normal text-text">
                  Año
                  <button type="button" class="inline-flex size-5 items-center justify-center rounded-siaf-sm text-[var(--sys-color-icon-states-enabled)]" aria-label="Quitar filtro Año" (click)="quitarFiltro('anio')">
                    <siaf-icon name="close" [size]="20" />
                  </button>
                </span>
              }
              @if (estadoFiltro()) {
                <span class="inline-flex h-8 items-center gap-siaf-xxs rounded-siaf-md border border-[var(--sys-color-border-states-enabled)] bg-surface px-siaf-xs py-siaf-xxs text-sm leading-normal text-text">
                  Estado
                  <button type="button" class="inline-flex size-5 items-center justify-center rounded-siaf-sm text-[var(--sys-color-icon-states-enabled)]" aria-label="Quitar filtro Estado" (click)="quitarFiltro('estado')">
                    <siaf-icon name="close" [size]="20" />
                  </button>
                </span>
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
                ><siaf-button variant="accent" (click)="solicitarGrabar()"
                  >Grabar</siaf-button
                >
              </div>
            </header>
            @if (alertaFormulario()) {
              <siaf-alert tone="error" [title]="alertaFormulario()" />
            }
            <section class="grid gap-siaf-md px-siaf-md pb-siaf-md pt-0">
              <h3 class="m-0 text-sm font-bold uppercase">Datos del archivo</h3>
              <div class="grid gap-siaf-md md:grid-cols-6">
                <siaf-input
                  class="md:col-span-1"
                  label="Año"
                  [autoSuccess]="false"
                  [value]="borrador().anio"
                  (valueChange)="actualizar('anio', $any($event))"
                /><siaf-input
                  class="md:col-span-1"
                  label="Código"
                  [autoSuccess]="false"
                  [value]="borrador().codigo"
                  (valueChange)="actualizar('codigo', $any($event))"
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
                  [options]="opcionesTipoArchivo()"
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
                  [options]="opcionesTipoAsignacion"
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
                  [required]="tipoSeleccionado()"
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
          <section class="apm-configuration rounded-siaf-md bg-surface p-siaf-md">
            <div class="mb-siaf-md flex items-center gap-siaf-xs">
              <h3 class="m-0 text-sm font-bold uppercase">
                Configuración de archivo
              </h3>
              <siaf-button
                class="ml-auto"
                variant="text"
                icon="search"
                [iconOnly]="true"
                [disabled]="true"
                ariaLabel="Buscar configuración"
              />
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
                      <table class="min-w-[1500px] w-full border-collapse text-sm">
                        <colgroup><col class="apm-attribute-selection-column" /><col span="13" /></colgroup>
                        <thead class="bg-surface-high text-[10px] font-bold uppercase"><tr><th class="apm-attribute-selection-column p-0"></th><th class="p-siaf-sm">Código</th><th class="p-siaf-sm">Orden</th><th class="p-siaf-sm">Columna del Excel</th><th class="p-siaf-sm">Nombre del campo</th><th class="p-siaf-sm">Destino del dato</th><th class="p-siaf-sm">Clasificador</th><th class="p-siaf-sm">Nivel mínimo</th><th class="p-siaf-sm">Nivel máximo</th><th class="p-siaf-sm">Autogenerado</th><th class="p-siaf-sm">Derivado por</th><th class="p-siaf-sm">Tipo de dato</th><th class="p-siaf-sm">Obligatorio</th><th class="p-siaf-sm">Multianual</th></tr></thead>
                        <tbody>@for (a of atributosVista(); track a.id) {<tr class="border-b border-[var(--sys-color-divider-default)]" [class.bg-[var(--sys-color-bg-states-light-selected)]]="atributoEstaSeleccionado(a.id)"><td class="apm-attribute-selection-column p-0 text-center align-middle"><input type="checkbox" [checked]="atributoEstaSeleccionado(a.id)" (change)="alternarSeleccionAtributo(a.id, $any($event.target).checked)" aria-label="Seleccionar fila atributo" /></td><td class="p-siaf-sm">{{a.codigo}}</td><td class="p-siaf-sm">{{a.orden}}</td><td class="p-siaf-sm">{{etiquetasColumnas(a.columnas)}}</td><td class="p-siaf-sm">{{a.nombre}}</td><td class="p-siaf-sm">{{a.destino}}</td><td class="p-siaf-sm">{{a.clasificador}}</td><td class="p-siaf-sm">{{a.nivelMinimo}}</td><td class="p-siaf-sm">{{a.nivelMaximo}}</td><td class="p-siaf-sm">{{a.autogenerado ? 'Sí' : 'No'}}</td><td class="p-siaf-sm">{{a.derivadoPor}}</td><td class="p-siaf-sm">{{a.tipoDato}}</td><td class="p-siaf-sm">{{a.obligatorio ? 'Sí' : 'No'}}</td><td class="p-siaf-sm">{{a.multianual ? 'Sí' : 'No'}}</td></tr>}</tbody>
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
                      variant="text"
                      icon="add"
                      [iconOnly]="true"
                      ariaLabel="Agregar regla"
                      (click)="agregarRegla()"
                    />
                  </div>
                  @if (borrador().reglas.length) {
                    <div class="overflow-x-auto">
                      <table class="w-full min-w-[700px] border-collapse">
                        <thead class="bg-surface-high text-[10px] uppercase">
                          <tr>
                            <th class="p-siaf-sm">Origen</th>
                            <th class="p-siaf-sm">Nivel</th>
                            <th class="p-siaf-sm">Operador</th>
                            <th class="p-siaf-sm">Valor</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody
                          class="text-[length:var(--sys-typography-size-body-2,14px)] font-normal leading-normal"
                        >
                          @for (r of borrador().reglas; track r.id) {
                            <tr
                              class="border-b border-[var(--sys-color-divider-default)]"
                            >
                              <td class="p-siaf-sm">{{ r.origen }}</td>
                              <td class="p-siaf-sm">{{ r.nivel }}</td>
                              <td class="p-siaf-sm">{{ r.operador }}</td>
                              <td class="p-siaf-sm">{{ r.valor }}</td>
                              <td>
                                <siaf-button
                                  variant="text"
                                  icon="edit"
                                  [iconOnly]="true"
                                  ariaLabel="Editar regla"
                                  (click)="editarRegla(r.id)"
                                />
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  } @else {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      No hay reglas sumarizadas configuradas.
                    </p>
                  }
                </div>
              }
              @if (pestana() === "referencias") {
                <div class="p-siaf-md">
                  <h3 class="m-0 mb-siaf-md text-sm font-bold">
                    Referencia cruzada
                  </h3>
                  @for (x of borrador().referencias; track x) {
                    <p class="border-b p-siaf-sm">{{ x }}</p>
                  } @empty {
                    <p
                      class="m-0 rounded-siaf-sm bg-[var(--sys-color-bg-surfaces-surface-low)] px-siaf-md py-siaf-sm text-sm text-text-muted"
                    >
                      No hay referencias cruzadas configuradas.
                    </p>
                  }
                </div>
              }
              @if (pestana() === "firmantes") {
                <div class="p-siaf-md">
                  <h3 class="m-0 mb-siaf-md text-sm font-bold">Firmantes</h3>
                  @for (x of borrador().firmantes; track x) {
                    <p class="border-b p-siaf-sm">{{ x }}</p>
                  } @empty {
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
                (valueChange)="actualizar('estado', $any($event))"
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
                [value]="
                  borrador().estado === 'Inactivo'
                    ? 'Se asignará al grabar'
                    : borrador().hasta
                "
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
    <siaf-side-panel [open]="panelAtributoAbierto()" [title]="editandoAtributo() ? 'Editar atributo del archivo' : 'Agregar atributo del archivo'" [confirmDisabled]="!atributoValido()" (closed)="cerrarAtributo()" (confirmed)="guardarAtributo()">
      <div class="flex flex-col gap-siaf-lg">
        <section><h3 class="mb-siaf-md text-sm font-bold uppercase">Columna</h3><div class="grid min-w-0 grid-cols-1 gap-siaf-md lg:grid-cols-4">
          <siaf-input class="min-w-0" label="Código" [value]="atributoBorrador().codigo.toString()" [disabled]="true" />
          <siaf-input class="min-w-0" label="Orden" type="number" [required]="true" [value]="atributoBorrador().orden" (valueChange)="actualizarAtributo('orden', $any($event))" />
          <siaf-input class="min-w-0" label="Columna Excel" type="select-multiple" [options]="columnasPlantilla" [value]="atributoBorrador().columnas" (valueChange)="seleccionarColumnas($any($event))" />
          <siaf-input class="min-w-0" label="Nombre del campo" [required]="true" [value]="atributoBorrador().nombre" (valueChange)="actualizarAtributo('nombre', $any($event))" />
          <siaf-input class="min-w-0 lg:col-span-2" label="Destino del dato" type="select" [required]="true" [options]="destinosAtributo" [value]="atributoBorrador().destino" (valueChange)="actualizarAtributo('destino', $any($event))" />
          <siaf-input class="min-w-0 lg:col-span-2" label="Tipo de dato" type="select" [required]="true" [options]="tiposDato" [value]="atributoBorrador().tipoDato" (valueChange)="actualizarAtributo('tipoDato', $any($event))" />
        </div></section>
        <section><h3 class="mb-siaf-md text-sm font-bold uppercase">Datos del clasificador</h3><div class="grid min-w-0 grid-cols-1 gap-siaf-md lg:grid-cols-3">
          <siaf-input class="min-w-0" label="Clasificador" type="select" [disabled]="atributoBorrador().tipoDato === 'Monto'" [options]="clasificadores" [value]="atributoBorrador().clasificador" (valueChange)="cambiarClasificador($any($event))" />
          <siaf-input class="min-w-0" label="Nivel mínimo" type="select" [disabled]="atributoBorrador().tipoDato === 'Monto' || !atributoBorrador().clasificador" [options]="nivelesDelClasificador()" [value]="atributoBorrador().nivelMinimo" (valueChange)="actualizarAtributo('nivelMinimo', $any($event))" />
          <siaf-input class="min-w-0" label="Nivel máximo" type="select" [disabled]="atributoBorrador().tipoDato === 'Monto' || !atributoBorrador().clasificador" [options]="nivelesDelClasificador()" [value]="atributoBorrador().nivelMaximo" (valueChange)="actualizarAtributo('nivelMaximo', $any($event))" />
        </div></section>
        <section><h3 class="mb-siaf-md text-sm font-bold uppercase">Características</h3><div class="grid min-w-0 grid-cols-1 items-center gap-siaf-md text-sm lg:grid-cols-4"><label class="inline-flex min-w-0 items-center gap-siaf-xs"><input type="checkbox" [checked]="atributoBorrador().obligatorio" (change)="actualizarAtributo('obligatorio',$any($event.target).checked)" /> Obligatorio</label><label class="inline-flex min-w-0 items-center gap-siaf-xs"><input type="checkbox" [checked]="atributoBorrador().multianual" (change)="actualizarAtributo('multianual',$any($event.target).checked)" /> Multianual</label><label class="inline-flex min-w-0 items-center gap-siaf-xs"><input type="checkbox" [checked]="atributoBorrador().autogenerado" (change)="actualizarAtributo('autogenerado',$any($event.target).checked)" /> Autogenerado</label><siaf-input class="min-w-0" label="Derivado por" type="select" [disabled]="!atributoBorrador().autogenerado" [options]="derivados" [value]="atributoBorrador().derivadoPor" (valueChange)="actualizarAtributo('derivadoPor',$any($event))" /></div></section>
      </div>
    </siaf-side-panel>
    <siaf-modal [open]="confirmarEliminarAtributo()" title="¿Eliminar atributo?" description="El atributo seleccionado se retirará del formulario." (confirmed)="eliminarAtributo()" (closed)="confirmarEliminarAtributo.set(false)" />
    <siaf-modal
      [open]="confirmarPlantilla()"
      variant="custom"
      title="¿Reemplazar documento plantilla?"
      description="Al grabar se eliminarán Atributos, Reglas sumarizadas y Referencia cruzada. Se conservarán los Firmantes."
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
    <siaf-snackbar
      [open]="snack()"
      tone="success"
      [message]="mensajeSnack()"
      (closed)="snack.set(false)"
    />
  </main>`,
})
export class CatalogoArchivosApmComponent {
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
    { id: "referencias", label: "REFERENCIA CRUZADA" },
    { id: "firmantes", label: "FIRMANTES" },
  ];
  readonly estados = [
    { label: "Activo", value: "Activo" },
    { label: "Inactivo", value: "Inactivo" },
  ];
  readonly opcionesTipoArchivo = computed(() => [
    { value: "", label: "Seleccione" },
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
    { value: "", label: "Seleccione" },
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
  readonly columnasPlantilla = [
    ['PLIEGO', 'Pliego'],
    ['UNIDAD_EJECUTORA', 'Unidad Ejecutora'],
    ['FUENTE', 'Fuente'],
    ['CATEGORIA_GASTO', 'Categoría de gasto'],
    ['ANO_1', 'Año 1'],
    ['ANO_2', 'Año 2'],
    ['ANO_3', 'Año 3'],
  ].map(([value, label]) => ({ value, label }));
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
      ? `Este orden ya está en uso para el año ${this.borrador().anio}`
      : "",
  );
  readonly tipoSeleccionado = computed(() => Boolean(this.borrador().tipo));
  readonly esAnexo = computed(() => this.borrador().tipo === "2 - Anexo");
  readonly tipoAsignacionHabilitado = computed(() =>
    ["1 - APM de Gastos", "2 - Anexo"].includes(this.borrador().tipo),
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
    return (
      this.archivos().filter((a) => a.anio === "2027" && a.tipo === "2 - Anexo")
        .length + 1
    );
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
  siguienteCodigoDesdeGrilla() {
    return (
      Math.max(
        0,
        ...this.archivosFiltrados().map(
          (archivo) => Number(archivo.codigo) || 0,
        ),
      ) + 1
    );
  }
  ordenOcupado() {
    return (
      this.esNuevo() &&
      this.borrador().tipo === "2 - Anexo" &&
      Number(this.orden()) < this.siguienteOrden()
    );
  }
  puedeGrabar() {
    const b = this.borrador();
    return Boolean(
      b.codigo &&
      b.nombre &&
      b.tipo &&
      this.prefijo() &&
      b.plantilla &&
      (!this.tipoAsignacionHabilitado() || this.tipoAsignacion()) &&
      (!this.esAnexo() || this.orden()) &&
      !this.errorOrden() &&
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
    if (this.tipoSeleccionado() && !this.prefijo()) campos.push("prefijo");
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
    if (this.errorOrden()) {
      this.camposConError.set(["orden"]);
      this.alertaFormulario.set(
        "No se puede grabar el archivo. Corrija el orden para continuar.",
      );
      return false;
    }
    const b = this.borrador();
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
      codigo: String(this.siguienteCodigoDesdeGrilla()),
      nombre: "",
      tipo: "",
      plantilla: "",
      estado: "Activo",
      desde: "",
      hasta: "-",
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
  cambiarTipo(tipo: string) {
    this.actualizar("tipo", tipo);
    this.tipoAsignacion.set("");
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
    this.atributoBorrador.set(this.nuevoAtributo());
    this.panelAtributoAbierto.set(true);
  }
  nuevoAtributo(): Atributo { return {id:Date.now(),codigo:this.atributosVista().length + 1,orden:'',columnas:[],nombre:'',destino:'',tipoDato:'',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''}; }
  normalizarAtributo(valor: string | Atributo, indice: number): Atributo { return typeof valor === 'string' ? {id:-(indice+1),codigo:indice+1,orden:String(indice+1),columnas:[],nombre:valor,destino:'2 - Detalle JSON',tipoDato:'Texto',clasificador:'',nivelMinimo:'',nivelMaximo:'',obligatorio:false,multianual:false,autogenerado:false,derivadoPor:''} : valor; }
  actualizarAtributo(campo: keyof Atributo, valor: string | boolean) { this.atributoBorrador.update(a => ({...a,[campo]:valor} as Atributo)); }
  nivelesDelClasificador() {
    return this.nivelesPorClasificador[this.atributoBorrador().clasificador] ?? [];
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

  seleccionarColumnas(valor: string[]) {
    this.atributoBorrador.update((atributo) => ({
      ...atributo,
      columnas: valor,
      nombre: atributo.nombre || this.etiquetasColumnas(valor),
    }));
  }

  private columnaLegible(valor: string): string {
    return this.columnasPlantilla.find((opcion) => opcion.value === valor)?.label ?? valor.replace(/_/g, ' ');
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
  cerrarAtributo() { this.panelAtributoAbierto.set(false); }
  guardarAtributo() { if(!this.atributoValido()) return; const a=this.atributoBorrador(); const estabaEditando=this.editandoAtributo(); this.borrador.update(x=>({...x,atributos:estabaEditando?x.atributos.map((v,i)=>this.normalizarAtributo(v,i).id===a.id?a:v):[...x.atributos,a]})); this.atributosSeleccionados.set(estabaEditando ? new Set([a.id]) : new Set()); this.panelAtributoAbierto.set(false); }
  editarAtributo() { const [id] = this.atributosSeleccionados(); const a=this.atributosVista().find(x=>x.id===id); if(!a)return; this.editandoAtributo.set(true); this.atributoBorrador.set(structuredClone(a)); this.panelAtributoAbierto.set(true); }
  eliminarAtributo() { const ids=this.atributosSeleccionados(); this.borrador.update(x=>({...x,atributos:x.atributos.filter((v,i)=>!ids.has(this.normalizarAtributo(v,i).id))})); this.atributosSeleccionados.set(new Set()); this.confirmarEliminarAtributo.set(false); }
  agregarRegla() {
    this.borrador.update((a) => ({
      ...a,
      reglas: [
        ...a.reglas,
        {
          id: Date.now(),
          origen: "Anexo 1",
          nivel: "Unidad ejecutora",
          operador: "Mayor o igual (≥)",
          valor: "0",
        },
      ],
    }));
  }
  editarRegla(id: number) {
    this.borrador.update((a) => ({
      ...a,
      reglas: a.reglas.map((r) =>
        r.id === id ? { ...r, valor: r.valor === "0" ? "1" : "0" } : r,
      ),
    }));
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
    if (this.reemplazoConfirmado()) {
      b.atributos = [];
      b.reglas = [];
      b.referencias = [];
    }
    if (b.estado === "Inactivo" && b.hasta === "-") b.hasta = "11/11/2026";
    if (!b.desde) b.desde = "11/11/2026";
    this.archivos.update((xs) =>
      this.esNuevo() ? [...xs, b] : xs.map((x) => (x.id === b.id ? b : x)),
    );
    this.confirmarGuardar.set(false);
    this.editando.set(false);
    this.mensajeSnack.set("Archivo de la APM grabado correctamente.");
    this.snack.set(true);
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
