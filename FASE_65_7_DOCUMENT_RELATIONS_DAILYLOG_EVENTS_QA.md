# FASE 65.7 - Relaciones Documentales con Bitacoras y Eventos

## Resumen ejecutivo

FASE 65.7 implementa relaciones documentales entre documentos existentes del repositorio documental, bitacoras diarias y eventos de bitacora, usando `DocumentRelation` y sin duplicar archivos fisicos ni crear documentos automaticamente desde bitacora/evento.

La relacion apunta al documento existente y conserva intacto el versionamiento documental. Las descargas siguen usando la version actual del documento cuando existe.

## Backend implementado

Endpoints directos:

- `POST /documents/:id/relations`
- `GET /documents/:id/relations`
- `DELETE /documents/:id/relations/:relationId`

Endpoints inversos:

- `GET /daily-logs/:id/documents`
- `GET /daily-log-events/:id/documents`

Tipos soportados:

- `DAILY_LOG`
- `DAILY_LOG_EVENT`
- `PROJECT`

Validaciones implementadas:

- documento existe
- documento no esta eliminado
- bitacora/evento/proyecto existe
- usuario tiene acceso al proyecto correspondiente
- documento y destino pertenecen al mismo proyecto
- se evita relacion duplicada activa

Auditoria:

- `DOCUMENT_RELATION_CREATED`
- `DOCUMENT_RELATION_DELETED`

## Frontend implementado

En detalle de bitacora:

- seccion `Documentos relacionados`
- listado de documentos relacionados
- selector para asociar documento existente del mismo proyecto
- quitar relacion con confirmacion
- descarga de version actual
- campos amigables:
  - titulo
  - codigo
  - categoria
  - version actual
  - estado
  - fecha actualizacion

En eventos:

- soporte basico para mostrar documentos relacionados cuando existen.
- no se modifica ni rompe el flujo de adjuntos existentes.

## Archivos modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260603000200_document_relations_dailylog_events/migration.sql`
- `apps/api/src/audit/audit.types.ts`
- `apps/api/src/documents/dto/create-document-relation.dto.ts`
- `apps/api/src/documents/document-relations.controller.ts`
- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/documents.module.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/components/daily-logs/events/DailyLogEventCard.tsx`
- `apps/web/src/types/daily-log-event.ts`
- `apps/web/src/app/globals.css`
- `test/e2e/document-relations.e2e-spec.ts`
- `test/e2e/helpers/cleanup.helper.ts`

## Migracion

Se creo y aplico localmente:

```bash
npx.cmd prisma migrate deploy
```

Migracion aplicada:

- `20260603000200_document_relations_dailylog_events`

## Validaciones ejecutadas

```bash
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
npm.cmd run web:build
npm.cmd run test:e2e -- --runTestsByPath test/e2e/document-relations.e2e-spec.ts
```

Resultados:

- `npx.cmd prisma validate`: OK.
- `npx.cmd prisma generate`: OK.
- `npm.cmd run api:build`: OK.
- `npm.cmd run web:build`: OK.
- `document-relations.e2e-spec.ts`: OK.

## Escenarios e2e cubiertos

- asociar documento existente a bitacora
- listar documentos relacionados de bitacora
- evitar relacion duplicada
- quitar relacion
- confirmar listado vacio tras eliminar relacion
- asociar documento existente a evento
- listar documentos relacionados de evento
- confirmar que no se crean versiones por relacion documental
- confirmar auditoria de creacion/eliminacion de relaciones

## Restricciones confirmadas

- No se duplican archivos fisicos.
- No se crean documentos automaticamente desde bitacora/evento.
- No se modifica workflow `DailyLog`.
- No se modifica RBAC efectivo.
- No se implementa upload dentro de bitacora/evento.
- No se crea visor documental avanzado.
- No se expone `storagePath` ni rutas internas en respuestas inversas ni UI.
- No se rompen adjuntos existentes de eventos.

## Observaciones y riesgos

- La creacion/eliminacion de relaciones usa permiso `documents:update`, reutilizando guards existentes sin crear permisos nuevos.
- Los endpoints inversos usan `documents:read`, por lo que la visibilidad documental depende del permiso documental y del acceso por proyecto.
- `DocumentRelation.deletedAt` permite baja logica; no existe `deletedById` en el modelo actual.
- Las relaciones `PROJECT` quedan disponibles en backend, aunque la UI de esta fase se enfoca en bitacoras y eventos.
- La asociacion de documentos a eventos queda soportada por backend; frontend muestra documentos relacionados de eventos si existen, sin formulario de asociacion por evento en esta fase.

## Resultado de fase

FASE 65.7 queda completada con relaciones documentales operativas entre repositorio documental, bitacoras y eventos, con backend validado por e2e y frontend base integrado en detalle de bitacora.
