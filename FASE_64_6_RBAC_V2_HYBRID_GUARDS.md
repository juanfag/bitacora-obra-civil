# FASE 64.6 - RBAC v2 guards hibridos

## Alcance

Esta fase implementa compatibilidad hibrida entre permisos legacy y permisos RBAC v2 en guards/decorators, sin activar enforcement definitivo RBAC v2.

No se cambian permisos finales por rol, workflow, frontend ni reglas finales de matriz cliente.

## Estrategia hibrida implementada

`PermissionsGuard` mantiene el comportamiento actual:

- Lee permisos requeridos desde `@Permissions(...)`.
- Carga permisos activos del usuario desde `ProjectUser -> Role -> RolePermission -> Permission`.
- Autoriza si existe coincidencia por OR.

El cambio es que la comparacion ya no es solo por string exacto. Ahora usa `RbacPermissionResolver` para expandir equivalencias:

- Si el endpoint pide un permiso legacy, un permiso v2 equivalente tambien autoriza.
- Si un endpoint futuro pide un permiso v2, el permiso legacy equivalente tambien autoriza durante transicion.
- Si un permiso no tiene mapping, conserva comportamiento exacto.

RBAC v2 sigue sin enforcement por scope/recurso. Esta fase solo resuelve equivalencias de codigos.

## Mapping legacy/v2 usado

Mapping principal incorporado al resolver:

| Legacy | V2 |
| --- | --- |
| `organizations:*` | `organizations:*` |
| `projects:*` | `projects:*` |
| `daily-logs:read` | `daily_logs:read`, `daily_logs:download_pdf` |
| `dailylogs:read` | `daily_logs:read` |
| `daily-logs:create` | `daily_logs:create` |
| `dailylogs:create` | `daily_logs:create` |
| `daily-logs:update` | `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `signatures:apply` |
| `dailylogs:update` | `daily_logs:update` |
| `dailylogs:approve` | `daily_logs:approve` |
| `daily-logs:delete` | `daily_logs:void` |
| `daily-log-events:*` | `daily_log_events:*` |
| `event-types:*` | `event_types:*` |
| `attachments:create` | `attachments:upload` |
| `attachments:read` | `attachments:read`, `attachments:download` |
| `attachments:delete` | `attachments:delete` |
| `documents:read` | `documents:read`, `documents:download` |
| `documents:create/update/delete` | `documents:create/update/delete` |
| `audit:read` | `audit_logs:read` |
| `users:read/create/update` | `users:read/create/update` |
| `users:update` | `users:update`, `users:manage_status` |
| `users:manage` | `users:manage_status`, `roles:assign` |
| `users:password:reset` | `users:password_reset` |
| `roles:read/assign` | `roles:read/assign` |
| `dashboard:read` | `dashboard:read` |

## ProjectAccessPolicy

Se agrego una estructura preparatoria:

- `ProjectAccessScopeType`: `GLOBAL`, `ORGANIZATION`, `PROJECT`, `OWN`.
- `ProjectAccessResolution`: `scopeType`, `projectIds`, `reason`.
- `resolveAccessibleProjects(userId)`.

El comportamiento actual se conserva:

- El bypass global sigue basado en `organizations:create`.
- `getAccessibleProjectIds` sigue devolviendo `null` para acceso global legacy.
- No se activa enforcement por scope.

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `apps/api/src/auth/permissions/rbac-permission-resolver.ts` | Nuevo resolver centralizado de equivalencias legacy/v2. |
| `apps/api/src/auth/guards/permissions.guard.ts` | Usa el resolver para autorizar por permiso exacto o equivalente. |
| `apps/api/src/auth/auth.module.ts` | Registra y exporta `RbacPermissionResolver`. |
| `apps/api/src/projects/project-access.policy.ts` | Agrega estructura preparatoria de scopes futuros sin cambiar enforcement. |
| `test/e2e/rbac-hybrid-guards.e2e-spec.ts` | Prueba e2e de compatibilidad hibrida. |

## Pruebas realizadas

Ejecutadas correctamente:

- `npx.cmd prisma generate` - OK
- `npx.cmd prisma validate` - OK
- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK
- `npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-hybrid-guards.e2e-spec.ts` - OK

La prueba e2e cubre:

- Permiso legacy permite acceso.
- Permiso v2 equivalente permite acceso.
- Usuario sin permiso recibe 403.
- SUPER_ADMIN mantiene acceso.
- Endpoints criticos:
  - users
  - roles
  - projects
  - daily-logs
  - daily-log-events
  - dashboard

Audit se cubre en mapping `audit:read` -> `audit_logs:read`; no existe endpoint dedicado de auditoria general en el backend actual. La auditoria de bitacora sigue protegida por `daily-logs:read` como inventariado en 64.2.

## Riesgos pendientes

| Riesgo | Mitigacion |
| --- | --- |
| `daily-logs:update` mapea a varias acciones v2 workflow. | No se asignan permisos finales por rol en esta fase; enforcement final queda pendiente. |
| No hay scopes productivos todavia. | `ProjectAccessPolicy` solo prepara estructura; no activa reglas nuevas. |
| Frontend sigue sin permisos efectivos. | Se mantiene para fases futuras de visibility. |
| Mapping puede requerir ajustes cliente. | Resolver centralizado evita duplicar cambios en guards. |

## Confirmacion RBAC v2 no definitivo

RBAC v2 definitivo NO quedo activado.

- No se eliminaron permisos legacy.
- No se cambiaron permisos finales por rol.
- No se modifico workflow.
- No se modifico frontend.
- No se activo enforcement por scopes.
- No se reemplazo el bypass legacy de `SUPER_ADMIN`/plataforma.

La fase solo agrega compatibilidad hibrida de codigos de permiso.
