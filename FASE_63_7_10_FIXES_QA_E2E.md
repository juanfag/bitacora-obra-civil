# FASE 63.7.10 - Fixes QA Visual E2E

## Objetivo

Estabilizar el detalle de bitacora diaria despues del QA visual E2E, sin agregar funcionalidades nuevas, enfocando la correccion en consistencia visual, trazabilidad historica, eliminacion de placeholders innecesarios y robustez documental.

## Hallazgos y causa raiz

### FIX 1 - "Proyecto no disponible"

Causa raiz:

- El endpoint de detalle de bitacora devolvia el registro sin hidratar la relacion `project`.
- El frontend ya esperaba `project.name` / `project.code`, pero al recibir solo `projectId` caia al fallback visual.
- El panel de metadatos mostraba un ID tecnico truncado como sustituto de proyecto.

Fix aplicado:

- `DailyLogsService.findOne` ahora incluye `project` con `id`, `code` y `name`.
- El listado de bitacoras tambien hidrata `project` de forma liviana.
- El metadata panel del detalle muestra nombre/codigo de proyecto en lugar de UUID truncado.

### FIX 2 - "Responsable no disponible"

Causa raiz:

- La vista dependia solo de relaciones vivas (`createdBy`, `responsible`, `user`) para mostrar responsable.
- No existian campos historicos para preservar el nombre del responsable al momento de aprobar/cerrar.

Fix aplicado:

- Se agregaron snapshots nullable en `daily_logs`:
  - `responsible_name_snapshot`
  - `approved_by_name_snapshot`
- El workflow persiste `responsibleNameSnapshot` al aprobar y cerrar.
- El header prioriza `responsibleNameSnapshot`, luego relacion viva, y solo al final fallback.
- El PDF usa `responsibleNameSnapshot` en informacion general cuando existe.

### FIX 3 - UUIDs visibles en metadatos

Causa raiz:

- Algunos componentes usaban IDs internos como fallback visual cuando faltaban relaciones hidratadas.

Fix aplicado:

- El metadata panel de detalle reemplazo `formatTechnicalId(dailyLog.projectId)` por etiqueta funcional de proyecto.
- Los eventos de bitacora ahora se devuelven con `eventType` y `reportedBy` para evitar mostrar `eventTypeId` si el catalogo frontend no carga.
- La auditoria mantiene `entityId` en contrato tecnico, pero el resumen visual filtra claves `*Id` y prioriza etiquetas de usuario.

### FIX 4 - Mojibake / UTF-8 PDF

Causa raiz:

- El generador PDF normaliza strings, pero si ya existen datos historicos corruptos en base de datos, la corrupcion llega como contenido persistido.
- Tambien existen textos fuente con mojibake heredado en varias pantallas, fuera del alcance de esta fase puntual.

Fix aplicado:

- Se mantuvo la normalizacion `NFC` existente en `sanitizeText`.
- No se oculto ni se reinterpreto contenido historico corrupto desde frontend.

Limitacion historica:

- Si registros existentes contienen valores como `ConstrucciÃ³n`, se requiere una migracion correctiva de datos con revision previa por columna/campo. Esta fase no modifica datos historicos.

### FIX 5 - "Usuario no disponible"

Causa raiz:

- La auditoria devolvia principalmente `performedById`.
- El frontend intentaba inferir usuario desde payloads y caia a fallback cuando no habia nombre en `newValue`.

Fix aplicado:

- Se agregaron snapshots nullable en `audit_logs`:
  - `actor_name_snapshot`
  - `actor_email_snapshot`
- `AuditService.record` captura nombre y correo del actor al crear auditoria.
- `DailyLogsService.getAudit` devuelve `userName`, `userEmail`, `actorNameSnapshot` y `actorEmailSnapshot`.
- La UI de auditoria prioriza snapshot historico antes de relacion viva y fallback.

## Archivos modificados

- `prisma/schema.prisma`
- `prisma/migrations/20260602000100_daily_log_identity_snapshots/migration.sql`
- `apps/api/src/audit/audit.service.ts`
- `apps/api/src/daily-log-events/daily-log-events.service.ts`
- `apps/api/src/daily-logs/daily-log-pdf.service.ts`
- `apps/api/src/daily-logs/daily-log-workflow.service.ts`
- `apps/api/src/daily-logs/daily-logs.service.ts`
- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/components/daily-log/daily-log-document-evidence.tsx`
- `apps/web/src/components/daily-log/daily-log-header.tsx`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/types/daily-log.ts`

## Validaciones ejecutadas

- `npx prisma generate` - OK
- `npx prisma validate` - OK
- `npm run api:build` - OK
- `npm.cmd run web:build` - OK

Nota:

- `npm run web:build` fallo inicialmente por politica local de PowerShell sobre `npm.ps1`; se repitio con `npm.cmd run web:build` y compilo correctamente.

## Validaciones pendientes

Requieren ambiente con base de datos migrada, API levantada, web levantada y datos reales:

- Login real.
- Detalle `DRAFT`.
- Detalle `APPROVED`.
- Detalle `CLOSED`.
- PDF generado.
- PDF snapshot historico.
- Auditoria con usuario activo/desactivado.
- Verificacion publica.
- Proyectos existentes.
- Eventos historicos.

## Riesgos pendientes

- Los snapshots nuevos son nullable; registros antiguos no tendran snapshot hasta que atraviesen nuevas transiciones o se ejecute una migracion/backfill.
- La correccion de mojibake historico requiere una migracion especifica de datos, no un parche visual.
- `approvedByNameSnapshot` preserva aprobador; no se agrego snapshot separado para usuario de cierre porque no estaba solicitado en el alcance.

## Resultado QA final

El detalle de bitacora queda preparado para mostrar proyecto, responsable y auditoria con datos funcionales cuando el backend dispone de relaciones o snapshots. La fase elimina los UUIDs visibles principales del detalle, agrega persistencia historica para responsable/aprobador/actor de auditoria y mantiene el alcance cerrado sin introducir nuevas funcionalidades.
