# FASE 64.5 - RBAC v2 audit trail

## Alcance

Esta fase implementa auditoria enterprise para cambios RBAC y administrativos relacionados, sin activar enforcement RBAC v2.

No se cambiaron permisos efectivos, guards productivos, frontend, workflow ni compatibilidad legacy.

## Arquitectura revisada

Se revisaron:

- Modelo `AuditLog` en `prisma/schema.prisma`.
- `AuditService` y `AuditContext`.
- Auditoria administrativa existente en `UsersService`.
- Flujo de asignacion/remocion de roles via `ProjectUser`.
- Flujo de bloqueo/desbloqueo/cambio de estado de usuario.
- Snapshots historicos existentes:
  - `actorNameSnapshot`
  - `actorEmailSnapshot`
  - snapshots de identidad de bitacora
  - snapshots de firmas/PDF
- Historial workflow `DailyLogStatusHistory`.

## Eventos RBAC auditables

Se agregaron al enum `AuditAction` los eventos:

- `RBAC_ROLE_ASSIGNED`
- `RBAC_ROLE_REMOVED`
- `RBAC_PERMISSION_GRANTED`
- `RBAC_PERMISSION_REVOKED`
- `RBAC_SCOPE_CHANGED`
- `RBAC_PROJECT_ACCESS_GRANTED`
- `RBAC_PROJECT_ACCESS_REMOVED`
- `RBAC_USER_STATUS_CHANGED`
- `RBAC_ROLE_MAPPING_UPDATED`

Eventos implementados en flujos existentes:

| Evento | Flujo actual | Estado |
| --- | --- | --- |
| `RBAC_ROLE_ASSIGNED` | `PATCH /users/:id/roles` cuando aparece una nueva asignacion proyecto + rol | Implementado |
| `RBAC_ROLE_REMOVED` | `PATCH /users/:id/roles` cuando una asignacion activa queda inactiva | Implementado |
| `RBAC_PROJECT_ACCESS_GRANTED` | `PATCH /users/:id/roles` cuando se concede acceso a un proyecto con rol | Implementado |
| `RBAC_PROJECT_ACCESS_REMOVED` | `PATCH /users/:id/roles` cuando se remueve acceso a un proyecto con rol | Implementado |
| `RBAC_USER_STATUS_CHANGED` | `PATCH /users/:id/status` para bloqueo, desbloqueo, inactivacion o reactivacion | Implementado |
| `RBAC_PERMISSION_GRANTED` | Futuro flujo de administracion de permisos de rol | Preparado en enum/tipos |
| `RBAC_PERMISSION_REVOKED` | Futuro flujo de administracion de permisos de rol | Preparado en enum/tipos |
| `RBAC_SCOPE_CHANGED` | Futuro flujo de scopes RBAC v2 | Preparado en enum/tipos |
| `RBAC_ROLE_MAPPING_UPDATED` | Futuro mantenimiento de mapping legacy/v2 | Preparado en enum/tipos |

## Snapshots agregados

Se agregaron columnas nullable JSONB en `audit_logs`:

- `target_user_snapshot`
- `role_snapshot`
- `permission_snapshot`
- `scope_snapshot`
- `project_snapshot`
- `metadata`

Tambien se mantiene:

- `actor_name_snapshot`
- `actor_email_snapshot`

Los snapshots implementados actualmente persisten:

| Snapshot | Contenido |
| --- | --- |
| `targetUserSnapshot` | `id`, `fullName`, `email`, `status` del usuario afectado |
| `roleSnapshot` | `id`, `code`, `name` del rol asignado/removido |
| `scopeSnapshot` | `scopeType=PROJECT`, proyecto y organizacion del acceso actual |
| `projectSnapshot` | `id`, `code`, `name`, `organizationId`, `organizationName` del proyecto |
| `permissionSnapshot` | Preparado para futuros cambios de permisos de rol |

Objetivo: evitar depender unicamente de relaciones vivas si cambian nombres, roles, usuarios o proyectos despues del evento.

## Metadata estandarizada

La estructura aplicada en `AuditLog.metadata` es:

```json
{
  "entityType": "ProjectUser",
  "entityId": "uuid",
  "action": "RBAC_ROLE_ASSIGNED",
  "actor": {
    "id": "uuid"
  },
  "target": {
    "user": {
      "id": "uuid",
      "fullName": "Nombre historico",
      "email": "correo@dominio.com",
      "status": "ACTIVE"
    }
  },
  "metadata": {
    "roleCode": "PROJECT_ADMIN",
    "projectId": "uuid",
    "scopeType": "PROJECT"
  },
  "timestamp": "ISO-8601"
}
```

La estructura conserva el formato solicitado:

- `entityType`
- `entityId`
- `action`
- `actor`
- `target`
- `metadata`
- `timestamp`

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `prisma/schema.prisma` | Agrega eventos RBAC en `AuditAction` y columnas snapshot/metadata en `AuditLog`. |
| `prisma/migrations/20260602000200_rbac_v2_audit_trail/migration.sql` | Migracion aditiva para enum y columnas JSONB. |
| `apps/api/src/audit/audit.types.ts` | Amplia acciones y campos de snapshot/metadata aceptados. |
| `apps/api/src/audit/audit.service.ts` | Persiste snapshots y metadata en `audit_logs`. |
| `apps/api/src/users/users.service.ts` | Registra eventos RBAC para roles, acceso a proyecto y estado usuario. |

## Compatibilidad legacy

La auditoria legacy se mantiene:

- `PATCH /users/:id/roles` sigue registrando el evento legacy `UPDATE` sobre entidad `User` con `oldValue.roles` y `newValue.roles`.
- Los eventos RBAC se agregan como trazas adicionales, no reemplazan los logs existentes.
- No se modifica historial previo.
- Las nuevas columnas son nullable.
- Los nuevos eventos no alteran autorizacion, scopes, guards ni workflow.

## Validaciones funcionales

Flujos cubiertos por implementacion:

| Validacion | Resultado esperado |
| --- | --- |
| Asignar rol | Crea `RBAC_ROLE_ASSIGNED` y `RBAC_PROJECT_ACCESS_GRANTED`. |
| Remover rol | Crea `RBAC_ROLE_REMOVED` y `RBAC_PROJECT_ACCESS_REMOVED`. |
| Bloquear usuario | Crea `RBAC_USER_STATUS_CHANGED` con status anterior/nuevo y snapshots. |
| Asignar proyecto | En el modelo actual ocurre via `ProjectUser`; crea `RBAC_PROJECT_ACCESS_GRANTED`. |

Confirmaciones tecnicas:

- Auditoria creada correctamente por `AuditService.record`.
- Snapshots persistidos en columnas JSONB nuevas.
- Datos historicos visibles desde consultas existentes de `AuditLog`, porque no se cambia el modelo de lectura.

## Riesgos

| Riesgo | Mitigacion |
| --- | --- |
| Duplicacion de eventos en asignacion de rol/proyecto. | Se conserva evento legacy y se agregan eventos RBAC granularizados por trazabilidad enterprise. |
| `RBAC_PERMISSION_*` y `RBAC_SCOPE_CHANGED` aun no tienen flujo productivo. | Quedan preparados para fases donde existan administracion de permisos/scopes. |
| Multiples roles en un mismo proyecto generan multiples eventos de acceso. | Es consistente con el modelo actual `ProjectUser` donde el acceso se materializa por asignacion proyecto + rol. |
| Nuevas columnas requieren migracion DB antes de ejecutar API contra base real. | Se agrego migracion aditiva y validaciones Prisma. |

## Validaciones ejecutadas

Ejecutadas correctamente:

- `npx prisma generate` - OK
- `npx prisma validate` - OK
- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK
- `npx.cmd prisma migrate deploy` - OK en base local de validacion
- `npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-audit.e2e-spec.ts` - OK

La prueba e2e valida:

- Asignar rol: se crean `RBAC_ROLE_ASSIGNED` y `RBAC_PROJECT_ACCESS_GRANTED`.
- Remover rol: se crean `RBAC_ROLE_REMOVED` y `RBAC_PROJECT_ACCESS_REMOVED`.
- Bloquear usuario: se crea `RBAC_USER_STATUS_CHANGED`.
- Asignar proyecto: se valida como alta de acceso via `ProjectUser`.
- Snapshots persistidos:
  - actor
  - target user
  - role
  - scope
  - project
  - metadata estandarizada

## Confirmacion RBAC v2 no productivo

RBAC v2 NO quedo activado productivamente.

- No se modificaron permisos efectivos.
- No se modificaron guards productivos.
- No se modifico frontend.
- No se activo enforcement RBAC v2.
- No se cambio workflow.
- No se elimino compatibilidad legacy.

Esta fase solo agrega auditoria historica y eventos RBAC para cambios administrativos existentes.
