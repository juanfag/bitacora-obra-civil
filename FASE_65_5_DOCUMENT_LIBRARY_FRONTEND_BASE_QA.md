# FASE 65.5 - Frontend Biblioteca Documental Base

## Resumen ejecutivo

FASE 65.5 implementa la primera version frontend de la biblioteca documental por proyecto en la ruta `apps/web/src/app/projects/[id]/documents/page.tsx`.

La pantalla consume los endpoints documentales existentes y permite listar, filtrar, crear metadata-only, editar metadata, eliminar logicamente, revisar versiones y descargar la version actual cuando existe. No se implemento upload frontend ni visor avanzado.

## Alcance implementado

- Ruta/pantalla `projects/[id]/documents`.
- Acceso conservado desde listado de proyectos mediante boton `Documentos`.
- Titulo principal `Biblioteca documental`.
- Carga de proyecto, categorias y documentos.
- Filtros:
  - busqueda
  - categoria
  - estado
  - visibilidad
- Creacion metadata-only con:
  - titulo
  - codigo
  - categoria
  - estado
  - visibilidad
  - descripcion
- Edicion basica de metadata.
- Soft delete con confirmacion.
- Tabla/listado responsive.
- Badge de version actual.
- Accion `Ver versiones`.
- Accion `Descargar version actual`.
- Estados UI:
  - loading
  - empty state
  - error state
  - success messages

## Endpoints consumidos

- `GET /documents/categories`
- `GET /documents?projectId=`
- `GET /documents/:id`
- `POST /documents`
- `PATCH /documents/:id`
- `DELETE /documents/:id`
- `GET /documents/:id/versions`
- `GET /document-versions/:id/download`

Tambien se mantiene fallback a `GET /documents/:id/download` para documentos legacy sin versiones.

## Archivos modificados

- `apps/web/src/app/projects/[id]/documents/page.tsx`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/globals.css`

## Restricciones confirmadas

- No se implemento upload desde frontend.
- No se creo visor PDF/imagen avanzado.
- No se modifico backend.
- No se modifico RBAC efectivo.
- No se toco workflow `DailyLog`.
- No se expone `storagePath` ni metadata interna sensible en UI.

## Validaciones tecnicas ejecutadas

```bash
npm.cmd run web:build
npm.cmd run api:build
```

Resultados:

- `npm.cmd run web:build`: OK.
- `npm.cmd run api:build`: OK.

## Validacion manual

Se intento levantar API y Web localmente para abrir la biblioteca documental por navegador, pero los procesos dev server no quedaron escuchando en `3000/3001` dentro del entorno de ejecucion de esta sesion. Los logs generados quedaron vacios y fueron retirados.

Validaciones manuales pendientes en navegador local:

- abrir biblioteca documental por proyecto
- listar documentos
- crear documento metadata-only
- filtrar por categoria, estado y visibilidad
- ver versiones
- descargar version actual si existe
- editar metadata
- soft delete
- responsive basico

## Observaciones

- La pantalla carga versiones por documento para pintar el badge actual sin cambiar el contrato backend.
- La descarga de version actual usa `GET /document-versions/:id/download` cuando hay version vigente y fallback legacy solo si no hay versiones.
- La creacion metadata-only asigna `DocumentType` tecnico a partir de la categoria cuando existe equivalencia; si no existe, usa `OTRO`.
- El upload documental frontend queda bloqueado por restriccion expresa de esta fase.

## Resultado de fase

FASE 65.5 queda implementada y validada tecnicamente por build. La validacion manual funcional debe ejecutarse cuando los dev servers puedan levantarse localmente en el entorno interactivo.
