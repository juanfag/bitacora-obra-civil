# FASE 64.4 - RBAC v2 catalogo permisos + seeds legacy

## Alcance

Esta fase implementa el catalogo tecnico de permisos RBAC v2 y prepara compatibilidad legacy en seeds.

No se cambia autorizacion efectiva, guards productivos, visibilidad frontend, workflow, migraciones ni permisos finales por rol basados en matriz cliente. RBAC v2 queda sembrado como catalogo pasivo.

Fuentes revisadas:

- `FASE_64_1_RBAC_V2_TECHNICAL_MODEL.md`
- `FASE_64_2_RBAC_PERMISSION_INVENTORY.md`
- `FASE_64_3_RBAC_V2_NORMALIZATION_PLAN.md`
- `prisma/seed.ts`

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `prisma/rbac-v2-permission-catalog.ts` | Nuevo catalogo centralizado de permisos v2 y mapping legacy -> v2. |
| `prisma/seed.ts` | Importa catalogo v2 y fusiona permisos legacy + v2 para sembrarlos sin duplicar codigos. |

## Permisos v2 creados

Catalogo minimo incorporado:

| Modulo | Permisos v2 |
| --- | --- |
| `projects` | `projects:read`, `projects:create`, `projects:update`, `projects:assign_users` |
| `daily_logs` | `daily_logs:read`, `daily_logs:create`, `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `daily_logs:void`, `daily_logs:download_pdf` |
| `daily_log_events` | `daily_log_events:create`, `daily_log_events:update` |
| `attachments` | `attachments:upload`, `attachments:download` |
| `signatures` | `signatures:apply` |
| `audit_logs` | `audit_logs:read` |
| `users` | `users:read`, `users:create`, `users:update`, `users:manage_status` |
| `roles` | `roles:assign` |
| `dashboard` | `dashboard:read` |
| `documents` | `documents:read`, `documents:create`, `documents:update`, `documents:approve`, `documents:download`, `documents:delete` |

Notas:

- Algunos codigos v2 ya existian como permisos legacy compatibles, por ejemplo `projects:read`, `users:read`, `roles:assign` y `documents:read`.
- El seed conserva la primera definicion por codigo. Si un permiso legacy ya existia, se mantiene su metadata legacy y no se duplica.
- Los permisos nuevos snake_case se agregan solo como catalogo `Permission`.

## Permisos legacy conservados

No se elimino ningun permiso actual. Se conservan, entre otros:

- `organizations:create`
- `organizations:read`
- `organizations:update`
- `organizations:delete`
- `projects:create`
- `projects:read`
- `projects:update`
- `projects:delete`
- `daily-logs:create`
- `daily-logs:read`
- `daily-logs:update`
- `daily-logs:delete`
- `events:create`
- `events:read`
- `events:update`
- `events:delete`
- `daily-log-events:create`
- `daily-log-events:read`
- `daily-log-events:update`
- `daily-log-events:delete`
- `event-types:create`
- `event-types:read`
- `event-types:update`
- `event-types:delete`
- `roles:read`
- `roles:assign`
- `users:create`
- `users:read`
- `users:update`
- `users:delete`
- `users:manage`
- `users:password:reset`
- `attachments:create`
- `attachments:read`
- `attachments:delete`
- `documents:create`
- `documents:read`
- `documents:update`
- `documents:delete`
- `audit:read`

## Mapping legacy -> v2

El mapping queda preparado en `prisma/rbac-v2-permission-catalog.ts` como referencia tecnica. No es consumido por guards productivos en esta fase.

| Legacy | V2 |
| --- | --- |
| `organizations:read` | `organizations:read` |
| `organizations:create` | `organizations:create` |
| `organizations:update` | `organizations:update` |
| `organizations:delete` | `organizations:delete` |
| `projects:read` | `projects:read` |
| `projects:create` | `projects:create` |
| `projects:update` | `projects:update` |
| `projects:delete` | `projects:delete` |
| `daily-logs:read` | `daily_logs:read`, `daily_logs:download_pdf` |
| `dailylogs:read` | `daily_logs:read` |
| `daily-logs:create` | `daily_logs:create` |
| `daily-logs:update` | `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `signatures:apply` |
| `dailylogs:approve` | `daily_logs:approve` |
| `daily-logs:delete` | `daily_logs:void` |
| `daily-log-events:create` | `daily_log_events:create` |
| `daily-log-events:update` | `daily_log_events:update` |
| `attachments:create` | `attachments:upload` |
| `attachments:read` | `attachments:download` |
| `documents:read` | `documents:read`, `documents:download` |
| `documents:create` | `documents:create` |
| `documents:update` | `documents:update` |
| `documents:delete` | `documents:delete` |
| `audit:read` | `audit_logs:read` |
| `users:read` | `users:read` |
| `users:create` | `users:create` |
| `users:update` | `users:update`, `users:manage_status` |
| `users:manage` | `users:manage_status`, `roles:assign` |
| `roles:assign` | `roles:assign` |

## Seeds de compatibilidad

Cambios realizados en `prisma/seed.ts`:

- Se importa `rbacV2Permissions` desde `prisma/rbac-v2-permission-catalog.ts`.
- Se agrego una fusion `seedPermissions = legacy + v2`, deduplicada por `code`.
- El upsert de permisos ahora usa `seedPermissions`.
- `SUPER_ADMIN` recibe `seedPermissions.map(...)`, por lo que conserva todos los permisos legacy y queda compatible con el catalogo v2.
- Los demas roles mantienen sus permisos legacy actuales. No se asignan permisos v2 finales por matriz cliente.

## SUPER_ADMIN

`SUPER_ADMIN` conserva acceso total porque:

- Sigue recibiendo todos los permisos legacy existentes.
- Tambien recibe los permisos v2 sembrados.
- No se cambia el bypass actual de `ProjectAccessPolicy`.
- No se cambia `PermissionsGuard`.

Confirmacion: esta fase no reemplaza el bypass por `organizations:create`; solo deja preparado el catalogo v2 para fases posteriores.

## Confirmacion RBAC v2 no productivo

RBAC v2 NO quedo activado productivamente.

- No se modificaron guards.
- No se modificaron decorators.
- No se modifico `ProjectAccessPolicy`.
- No se modifico frontend.
- No se cambio workflow.
- No se eliminaron permisos legacy.
- No se cambiaron endpoints protegidos.
- No se crearon migraciones.
- No se cambio la matriz final de permisos por rol cliente.

El unico efecto de datos al ejecutar seed es que nuevos codigos v2 quedan disponibles en el catalogo `Permission` y asociados a `SUPER_ADMIN` por compatibilidad.

## Riesgos

| Riesgo | Estado | Mitigacion |
| --- | --- | --- |
| Sobreinterpretar permisos v2 como activos. | Pendiente para fases siguientes. | Documentar que ningun guard los consume todavia. |
| `SUPER_ADMIN` acumula permisos v2 nuevos. | Aceptado por compatibilidad. | No cambia comportamiento porque conserva permisos legacy y bypass actual. |
| Mapping `daily-logs:update` -> acciones workflow es amplio. | Pendiente de aprobacion cliente. | No asignar a roles operativos hasta fase dedicada. |
| Permisos v2 con codigos ya existentes pueden compartir metadata legacy. | Aceptado. | Se preserva legacy primero para no provocar churn innecesario. |
| No existe tabla persistida de aliases. | Pendiente. | Mapping queda en archivo tecnico; migracion/tabla se definira en fase futura. |

## Validaciones ejecutadas

Ejecutadas correctamente:

- `npx prisma generate` - OK
- `npx prisma validate` - OK
- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK

## Resultado

El catalogo RBAC v2 queda implementado como catalogo tecnico pasivo y compatible. Los permisos legacy siguen intactos, los roles operativos no reciben asignaciones v2 finales y el comportamiento productivo de autorizacion no cambia.
