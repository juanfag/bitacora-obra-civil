# FASE 65.3 - Documents Backend Module Base QA

## Resumen

Se evoluciono el modulo backend documental existente para soportar el modelo base migrado en FASE 65.2, sin crear frontend, sin modificar guards RBAC, sin cambiar workflow `DailyLog` y sin integrar upload fisico nuevo, Google Drive o S3.

El modulo `apps/api/src/documents` ya existia; esta fase lo mantiene y lo extiende para:

- categorias documentales.
- creacion metadata-only.
- filtros enterprise basicos.
- soft delete con `deletedAt` y `deletedById`.
- respuestas sanitizadas con categoria/visibilidad.

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `apps/api/src/documents/documents.controller.ts` | Agrega `GET /documents/categories`. Mantiene endpoints existentes. |
| `apps/api/src/documents/documents.service.ts` | Agrega categorias accesibles, metadata-only create, filtros nuevos, validacion de categoria y soft delete con actor. |
| `apps/api/src/documents/dto/create-document.dto.ts` | Permite metadata-only y agrega `categoryId`, `code`, `status`, `visibility`. |
| `apps/api/src/documents/dto/update-document.dto.ts` | Hereda nuevos campos desde create DTO. |
| `apps/api/src/documents/dto/find-documents-query.dto.ts` | Agrega filtros `organizationId`, `categoryId`, `visibility`, `search`. |
| `apps/api/src/documents/dto/document-query.dto.ts` | Alias de DTO solicitado para queries documentales. |
| `apps/api/src/documents/entities/document.entity.ts` | Expone campos documentales nuevos sin exponer storage interno. |

## Endpoints disponibles

| Metodo | Endpoint | Permiso |
| --- | --- | --- |
| `GET` | `/api/v1/documents/categories` | `documents:read` |
| `GET` | `/api/v1/documents` | `documents:read` |
| `POST` | `/api/v1/documents` | `documents:create` |
| `GET` | `/api/v1/documents/:id` | `documents:read` |
| `PATCH` | `/api/v1/documents/:id` | `documents:update` |
| `DELETE` | `/api/v1/documents/:id` | `documents:delete` |

Endpoints existentes conservados:

- `POST /api/v1/documents/upload`
- `GET /api/v1/documents/:id/download`

## Creacion metadata-only

`POST /documents` ahora puede crear un documento sin archivo fisico real.

Campos soportados:

- `projectId`
- `dailyLogId`
- `eventId`
- `categoryId`
- `code`
- `type`
- `title`
- `description`
- `fileName` opcional
- `mimeType` opcional
- `sizeBytes` opcional
- `checksumSha256` opcional
- `status`
- `visibility`
- `metadata`

Si no se envia `fileName`, se genera un nombre interno tipo metadata-only basado en el titulo. No se almacena binario en PostgreSQL.

## Filtros implementados

`GET /documents` soporta:

- `projectId`
- `organizationId`
- `categoryId`
- `status`
- `visibility`
- `search`
- filtros legacy existentes: `dailyLogId`, `eventId`, `type`, `page`, `limit`

`search` busca en:

- `title`
- `description`
- `code`
- `fileName`

## Categorias documentales

`GET /documents/categories` devuelve categorias activas accesibles para el usuario:

- Si el usuario tiene acceso global legacy, devuelve categorias activas.
- Si el usuario tiene proyectos asignados, devuelve categorias organizacionales de esas organizaciones y categorias especificas de esos proyectos.
- Si el usuario no tiene proyectos accesibles, devuelve lista vacia.

## ProjectAccessPolicy

Se mantiene la validacion existente:

- `findAll` filtra por proyectos accesibles.
- `findOne`, `create`, `update`, `delete` validan acceso al proyecto con `ProjectAccessPolicy`.
- No se cambio el bypass legacy actual.

## RBAC

Permisos usados:

- `documents:read`
- `documents:create`
- `documents:update`
- `documents:delete`

No se modificaron seeds ni permisos efectivos. Los permisos ya existian en el sistema.

## Auditoria

Se mantiene el mecanismo existente:

- `CREATE_DOCUMENT` en creacion metadata-only.
- `UPDATE_DOCUMENT` en actualizacion.
- `DELETE_DOCUMENT` en soft delete.
- `UPLOAD_DOCUMENT` y `DOWNLOAD_DOCUMENT` siguen disponibles en endpoints existentes.

La auditoria registra metadata segura y no expone rutas internas ni binarios.

## Restricciones confirmadas

- No se creo frontend.
- No se implemento upload fisico nuevo.
- No se integro Google Drive/S3.
- No se modifico workflow `DailyLog`.
- No se modificaron guards RBAC.
- No se cambiaron permisos efectivos.
- No se insertaron documentos reales masivos.
- No se almacenaron binarios en PostgreSQL.

## Validaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `npx.cmd prisma validate` | OK |
| `npx.cmd prisma generate` | OK |
| `npm.cmd run api:build` | OK |
| `npm.cmd run web:build` | OK |

## Observaciones

- El modulo documental ya existia desde fases 63.x; esta fase no lo recrea, lo evoluciona.
- `POST /documents` conserva compatibilidad con metadata de archivo si se envia, pero ya no obliga archivo fisico.
- `/documents/upload` queda como endpoint fisico existente y no fue reemplazado.
- `DocumentVersion` queda preparado en Prisma, pero esta fase no crea versiones fisicas ni backfill de documentos actuales.

## Riesgos

| Riesgo | Mitigacion |
| --- | --- |
| Metadata-only genera `storagePath` interno pendiente para cumplir el schema actual. | No se expone en respuestas; versionamiento real queda para fase futura. |
| `documents:read` sigue cubriendo descarga legacy. | No se cambiaron permisos efectivos; separar `documents:download` queda para RBAC final. |
| Categorias organizacionales dependen de proyectos accesibles para usuarios no globales. | Alineado con `ProjectAccessPolicy`; futuras reglas ORGANIZATION pueden mejorar esto. |

## Resultado

FASE 65.3 completada. El backend documental base queda disponible con endpoints iniciales, categorias, metadata-only, filtros, soft delete y auditoria existente, sin activar funcionalidades de storage externo ni frontend.
