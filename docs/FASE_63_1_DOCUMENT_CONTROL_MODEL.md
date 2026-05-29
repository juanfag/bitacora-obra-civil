# FASE 63.1 - Modelo base de control documental

## Objetivo

Implementar la base backend del modulo documental enterprise para registrar, clasificar, consultar, actualizar y eliminar logicamente documentos asociados a proyectos, bitacoras diarias y eventos.

## Alcance

Esta fase implementa solamente modelo, relaciones, RBAC, scope por proyecto, auditoria y CRUD de metadata documental.

No se implementa almacenamiento fisico real, descarga, visor, thumbnails, versionamiento, firmas documentales, Google Drive, S3 ni URLs prefirmadas.

## Modelo implementado

Se extendio el modelo `Document` existente para soportar control documental:

- `id`
- `organizationId`
- `projectId`
- `dailyLogId` opcional
- `eventId` opcional
- `type`
- `title`
- `description`
- `fileName`
- `mimeType`
- `sizeBytes`
- `storagePath`
- `checksumSha256`
- `uploadedById`
- `status`
- `metadata`
- `createdAt`
- `updatedAt`
- `deletedAt`

Se agregaron enums:

- `DocumentType`: `PLANO`, `SOLICITUD_SUSPENSION`, `DENUNCIA`, `DEMANDA`, `ACTA`, `SOPORTE_FOTOGRAFICO`, `CONTRATO`, `OTRO`.
- `DocumentStatus`: `ACTIVE`, `ARCHIVED`, `DELETED`.

El catalogo legacy de tipos documentales se mantiene como `DocumentTypeCatalog` para compatibilidad con snapshots PDF existentes.

## Relaciones

`Document` queda relacionado con:

- `Organization`
- `Project`
- `DailyLog` opcional
- `Event` opcional
- `User` como uploader
- relaciones legacy `DailyLogDocument`, `EventDocument` y `DailyLogPdfVersion`

Reglas de coherencia:

- Todo documento pertenece obligatoriamente a un proyecto.
- Si se informa `dailyLogId`, la bitacora debe pertenecer al mismo proyecto.
- Si se informa `eventId`, el evento debe pertenecer al mismo proyecto.
- Si se informan `dailyLogId` y `eventId`, el evento debe pertenecer tambien a esa bitacora.

## Endpoints

Modulo creado en `apps/api/src/documents`.

Endpoints:

- `POST /api/v1/documents`
- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `PATCH /api/v1/documents/:id`
- `DELETE /api/v1/documents/:id`

Filtros de `GET /documents`:

- `projectId`
- `dailyLogId`
- `eventId`
- `type`
- `status`
- `page`
- `limit`

Las respuestas no exponen `storagePath` ni rutas internas.

## RBAC y scope

Todos los endpoints requieren JWT y `PermissionsGuard`.

Permisos agregados al seed:

- `documents:create`
- `documents:read`
- `documents:update`
- `documents:delete`

La autorizacion por proyecto usa `ProjectAccessPolicy`:

- Usuario normal solo accede a documentos de proyectos asignados.
- Usuarios con alcance plataforma conservan acceso global.
- Acceso directo a un documento fuera de alcance devuelve error de permisos.

## Auditoria

Se agregaron acciones de auditoria:

- `CREATE_DOCUMENT`
- `UPDATE_DOCUMENT`
- `DELETE_DOCUMENT`

La auditoria registra metadata segura:

- ids de organizacion/proyecto/bitacora/evento
- tipo documental
- titulo
- nombre de archivo
- MIME
- tamano
- estado
- uploader
- timestamps

No se registran rutas internas ni `storagePath` en el payload de auditoria.

## Validaciones

Comandos ejecutados:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
```

Resultado:

- Prisma schema valido.
- Prisma Client regenerado.
- API build OK.

## Pendientes futuros

- Upload fisico real de documentos.
- Descarga segura.
- Visor documental.
- Versionamiento documental.
- Thumbnails.
- Firmas documentales.
- Integracion con storage externo.
- Politicas de retencion documental.
