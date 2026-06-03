# FASE 65.4 - Document Versions + Upload Enterprise

## Resumen ejecutivo

FASE 65.4 implementa el versionamiento documental enterprise sobre el modulo backend `documents`, manteniendo compatibilidad con el upload/download existente y sin activar frontend ni cambios RBAC efectivos.

El endpoint `POST /documents/upload` ahora crea versiones reales en `DocumentVersion`. La primera carga crea el `Document` y su version V1; una carga posterior con `documentId` crea una nueva version para el mismo documento, actualiza `currentVersionId`, marca la version nueva como vigente y conserva las versiones anteriores sin sobrescribir archivos fisicos.

## Alcance implementado

- Upload documental basado en `DocumentVersion`.
- Metadata persistida por version:
  - `originalFileName`
  - `mimeType`
  - `extension`
  - `sizeBytes`
  - `storageProvider`
  - `storagePath`
  - `storageKey`
  - `checksumSha256`
- Calculo SHA256 real del archivo cargado.
- Validacion de MIME type permitido.
- Validacion de magic bytes para PDF, PNG, JPEG y ZIP/DOCX/XLSX/PPTX.
- Validacion de tamano maximo.
- Endpoint `GET /documents/:id/versions`.
- Endpoint `GET /document-versions/:id/download`.
- Compatibilidad con `GET /documents/:id/download`, usando la version vigente cuando existe y fallback legacy cuando no existe.
- Auditoria de eventos documentales:
  - `DOCUMENT_CREATED`
  - `DOCUMENT_VERSION_CREATED`
  - `DOCUMENT_DOWNLOADED`
- Migracion Prisma para nuevos campos/version audit actions.
- Prueba e2e especifica para V1/V2, checksum, current version, descarga por version y soft delete sin borrar archivos.

## Archivos modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260603000100_document_versions_enterprise_upload/migration.sql`
- `apps/api/src/audit/audit.types.ts`
- `apps/api/src/documents/documents.module.ts`
- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/document-versions.controller.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/api/src/documents/dto/upload-document.dto.ts`
- `test/e2e/document-versions.e2e-spec.ts`
- `test/e2e/helpers/cleanup.helper.ts`

## Cambios Prisma

### AuditAction

Se agregaron eventos:

- `DOCUMENT_CREATED`
- `DOCUMENT_VERSION_CREATED`
- `DOCUMENT_DOWNLOADED`

### DocumentVersion

Se agregaron campos:

- `originalFileName`
- `extension`
- `storagePath`
- `isCurrentVersion`

Estos campos permiten que cada version mantenga metadata historica independiente y que el documento apunte a una unica version vigente mediante `Document.currentVersionId`.

## Estrategia de versionamiento

### Primera carga

Cuando `POST /documents/upload` se ejecuta sin `documentId`:

- crea `Document`
- almacena archivo local en ruta unica
- crea `DocumentVersion` V1
- asigna `Document.currentVersionId`
- marca V1 como `isCurrentVersion = true`
- sincroniza campos legacy del `Document` para mantener compatibilidad

### Nueva version

Cuando `POST /documents/upload` recibe `documentId`:

- valida que el documento exista y no este eliminado
- valida acceso por proyecto con `ProjectAccessPolicy`
- calcula el siguiente `versionNumber`
- desmarca versiones anteriores como no vigentes
- crea una nueva `DocumentVersion`
- actualiza `Document.currentVersionId`
- conserva archivos anteriores sin eliminarlos ni sobrescribirlos

## Endpoints documentales

### `POST /documents/upload`

Permite:

- crear documento + V1
- crear nueva version si se envia `documentId`

Mantiene compatibilidad con el upload existente y devuelve la respuesta de `Document`.

### `GET /documents/:id/versions`

Lista las versiones del documento, ordenadas por version descendente.

### `GET /document-versions/:id/download`

Descarga una version especifica del documento.

### `GET /documents/:id/download`

Mantiene compatibilidad legacy:

- si existe `currentVersionId`, descarga la version vigente
- si no existe, usa los campos legacy del documento

## Auditoria

Se registran eventos:

- `DOCUMENT_CREATED`: al crear un documento por upload inicial.
- `DOCUMENT_VERSION_CREATED`: al crear V1 o cualquier version posterior.
- `DOCUMENT_DOWNLOADED`: al descargar documento vigente o version especifica.

La metadata auditada incluye document id, version id, version number, file name, MIME, storage provider y checksum cuando aplica.

## Validaciones funcionales ejecutadas

Prueba e2e ejecutada:

```bash
npm.cmd run test:e2e -- --runTestsByPath test/e2e/document-versions.e2e-spec.ts
```

Resultado:

- `1` test suite passed.
- `1` test passed.

Escenarios cubiertos:

- Upload inicial crea `DocumentVersion` V1.
- Segunda carga con `documentId` crea V2.
- Solo una version queda como `isCurrentVersion = true`.
- `Document.currentVersionId` apunta a V2.
- SHA256 generado y persistido.
- Metadata de version persistida.
- `GET /documents/:id/versions` devuelve versiones.
- `GET /document-versions/:id/download` descarga version especifica.
- Soft delete del documento no elimina archivos fisicos de versiones.

## Validaciones tecnicas ejecutadas

```bash
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
npm.cmd run web:build
```

Resultados:

- `npx.cmd prisma validate`: OK.
- `npx.cmd prisma generate`: OK.
- `npm.cmd run api:build`: OK.
- `npm.cmd run web:build`: OK.

## Restricciones confirmadas

- No se implemento frontend.
- No se integro Google Drive/S3 real.
- No se modifico workflow `DailyLog`.
- No se cambiaron permisos efectivos RBAC.
- No se eliminaron versiones anteriores fisicamente.
- No se almacenaron binarios en PostgreSQL.

## Riesgos y observaciones

- El almacenamiento sigue siendo local; para produccion enterprise queda pendiente adaptar el provider a S3/Google Drive sin cambiar el contrato de `DocumentVersion`.
- La unicidad de version vigente se garantiza transaccionalmente al desmarcar versiones anteriores antes de crear la nueva version; si se requiere una garantia estricta a nivel base de datos, se recomienda evaluar indice parcial unico por `documentId` + `isCurrentVersion`.
- El endpoint de upload conserva respuesta de `Document`; si el frontend documental futuro necesita datos completos de la version creada, se recomienda extender respuesta de forma controlada.
- La compatibilidad legacy se mantiene sincronizando campos del documento con la version vigente.

## Resultado de fase

FASE 65.4 queda completada como versionamiento documental operativo en backend, con upload enterprise basado en `DocumentVersion`, descarga por version, auditoria documental y QA tecnico/e2e aprobado.
