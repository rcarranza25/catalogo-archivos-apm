# Catálogo de Archivos de la APM · SIAF-RP

## Propósito

Prototipo funcional del **Catálogo de Archivos de la Asignación Presupuestaria Multianual (APM)** del SIAF-RP. Permite consultar y configurar los archivos que forman parte del proceso, utilizando datos de demostración locales.

No se conecta a un backend real. Los datos y las interacciones se resuelven mediante el backend simulado incluido en el proyecto.

## Funcionalidades implementadas

- Bandeja de archivos con búsqueda, filtros, etiquetas de filtros aplicados y paginación.
- Registro y edición de archivos de la APM.
- Gestión de año, código, nombre, tipo, estado y vigencia del archivo.
- Consulta y configuración de atributos, reglas, referencias y firmantes.
- Sidepanels de selección, formularios, modales de confirmación, alertas y mensajes de resultado.
- Carga de archivos y validación de formato y tamaño mediante los componentes del UI Kit SIAF-RP.
- Navegación desde el Panel principal mediante **Procesos → Clasificadores y catálogos → Catálogos → Catálogo de archivos de la APM**.

## Requisitos

- Node.js 24.x.
- npm 10 o superior.
- Google Chrome para ejecutar las pruebas visuales de Angular/Karma.

## Instalación y ejecución local

```bash
npm ci
npm run build -- --configuration development
npm start -- --port 4300
```

El servidor de desarrollo queda disponible en:

- Login: `http://127.0.0.1:4300/login`
- Catálogo: `http://127.0.0.1:4300/procesos/catalogo-archivos-apm`

Si el puerto 4300 está ocupado, use otro puerto disponible e incorpórelo a ambas URLs.

## Usuario de demostración

El login presenta a **Ana Torres Díaz**, con el perfil configurador de Archivos de la APM. Los datos de autenticación son exclusivamente de demostración y no se documentan en este archivo.

## Datos de demostración

El proyecto incluye archivos y plantillas de ejemplo en `src/assets/demo/`. Sirven para validar el flujo visual de selección y carga; no corresponden a información productiva.

## Estructura principal

| Ubicación | Responsabilidad |
| --- | --- |
| `src/app/modules/presupuesto/catalogo-archivos-apm/` | Bandeja, registro, edición y datos de demostración del catálogo. |
| `src/app/modules/presupuesto/presupuesto.routes.ts` | Rutas propias del Catálogo de Archivos APM. |
| `src/app/mock/usuarios-demo.ts` | Usuario de demostración y perfil funcional. |
| `src/app/shared/` | Componentes y utilidades compartidas del UI Kit SIAF-RP. |

Este repositorio es un prototipo funcional para demostración y validación de interfaz.
