# FASE 63.4 - Frontend documental basico por proyecto

## Objetivo

Crear la primera UI del modulo documental para listar, cargar, editar, eliminar logicamente y descargar documentos asociados a un proyecto.

## Alcance

Se implemento una ruta dedicada por proyecto:

```text
/projects/:id/documents
```

Tambien se agrego acceso desde la tarjeta de cada proyecto en `/projects`.

## Ruta y pantalla implementada

Archivo principal:

- `apps/web/src/app/projects/[id]/documents/page.tsx`

La pantalla incluye:

- Header con contexto del proyecto.
- Filtros por tipo documental y estado.
- Formulario de carga documental.
- Lista de documentos del proyecto.
- Acciones por documento.
- Estados de loading, empty, error y exito.

## Acciones disponibles

- Listar documentos usando `GET /documents?projectId=...`.
- Filtrar por `type` y `status`.
- Subir documento usando `POST /documents/upload`.
- Descargar documento usando `GET /documents/:id/download`.
- Editar metadata basica:
  - `title`
  - `description`
  - `type`
  - `status`
- Eliminar documento mediante soft delete usando `DELETE /documents/:id`.

## Cliente frontend

Se agregaron funciones en `apps/web/src/lib/api-client.ts`:

- `getProject(projectId)`
- `getDocuments(filters)`
- `uploadDocument(formData)`
- `updateDocument(id, payload)`
- `deleteDocument(id)`
- `downloadDocument(id)`

Tambien se agregaron tipos frontend:

- `DocumentType`
- `DocumentStatus`
- `ControlledDocument`
- `DocumentsResponse`
- `DocumentFilters`
- `UpdateDocumentInput`

## Permisos considerados

La pantalla usa `AuthGuard` y todos los requests pasan por `apiRequest` o `fetch` autenticado con Bearer token.

Comportamiento UI:

- Si `documents:read` falla con 403, se muestra error controlado.
- Si `documents:create` falla con 403, se oculta el formulario de carga y se muestra mensaje claro.
- Si `documents:update` falla con 403, se ocultan acciones de edicion posteriores.
- Si `documents:delete` falla con 403, se ocultan acciones de eliminacion posteriores.

El backend sigue siendo la autoridad de permisos y scope.

## Seguridad UI

- No se muestra `storagePath`.
- No se muestra checksum completo.
- No se muestran rutas internas.
- No se muestran IDs largos innecesarios.
- Validacion de ayuda en frontend:
  - tamano maximo 10 MB.
  - MIME types permitidos.
- La validacion final permanece en backend.

## Validaciones

Comandos ejecutados:

```powershell
npm.cmd run web:build
npm.cmd run api:build
```

Resultados:

- Web build OK.
- API build OK.

## Pendientes

- Permisos frontend declarativos desde perfil/sesion para ocultar acciones antes del primer 403.
- Vista documental integrada en detalle de proyecto si se crea una pantalla `/projects/:id`.
- Preview/visor autenticado.
- Paginacion visual.
- Busqueda por texto.
- Asociar documentos desde bitacora/evento en UI.
