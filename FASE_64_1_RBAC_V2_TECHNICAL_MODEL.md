# FASE 64.1 - RBAC v2 Modelo tecnico

## Alcance

Esta fase define el modelo tecnico RBAC v2 sin implementar cambios productivos.

No se modifican permisos efectivos, guards, frontend, migraciones ni logica workflow.

Fuentes revisadas:

- `FASE_64_0_RBAC_MATRIX_V2_ARCHITECTURE.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `apps/api/src/auth/guards/permissions.guard.ts`
- `apps/api/src/auth/decorators/permissions.decorator.ts`
- `apps/api/src/projects/project-access.policy.ts`
- `apps/api/src/daily-logs/guards/daily-log-project-access.guard.ts`
- Controladores API con `@Permissions(...)`
- Servicios de usuarios y roles
- Frontend: workflow, users admin, session context, documents, daily-log detail
- Matriz cliente `RBAC_Enterprise_Matrix_Cliente (1).xlsx` revisada en fase 64.0

## Diagnostico del modelo actual

### Entidades actuales

`Role`

- Catalogo global de roles.
- Campos actuales: `id`, `code`, `name`, `description`, `status`, `createdAt`.
- No tiene tipo funcional, nivel de alcance, prioridad, ni indicador de rol de sistema.

`Permission`

- Catalogo global de permisos.
- Campos actuales: `id`, `code`, `name`, `description`, `status`, `createdAt`.
- El codigo representa modulo y accion en formato actual `modulo:accion`.
- No separa `module`, `action`, `resource`, ni version de permiso.

`RolePermission`

- Relacion N:N entre rol y permiso.
- No contiene alcance.
- Si un rol tiene un permiso, lo tiene para cualquier proyecto al que el usuario acceda por asignacion o por bypass.

`ProjectUser`

- Asigna usuario + proyecto + rol.
- Funciona como asignacion principal de roles.
- No existe asignacion global u organizacional explicita.

`UserRole`

- No existe como tabla actual.
- El frontend y DTOs usan el concepto `UserRole`, pero proviene de `ProjectUser` normalizado.

### Guards, decorators y policies actuales

`@Permissions(...)`

- Decorador simple que guarda una lista de strings.
- Autoriza por OR: si el usuario tiene cualquiera de los permisos requeridos, pasa.

`PermissionsGuard`

- Consulta todos los permisos de todos los roles activos en `ProjectUser`.
- No evalua proyecto, organizacion, propiedad ni estado de recurso.
- No sabe si el permiso aplica al recurso solicitado.

`DailyLogProjectAccessGuard`

- Valida acceso al proyecto de una bitacora.
- No valida accion de workflow.
- Complementa algunos endpoints de bitacora, pero no reemplaza permisos atomicos.

`ProjectAccessPolicy`

- Devuelve todos los proyectos accesibles o `null` para acceso total.
- El acceso total se infiere si el usuario tiene permiso `organizations:create`.
- Esta inferencia debe reemplazarse por scope `GLOBAL` o `ORGANIZATION`.

### Permisos backend actuales

Permisos protegidos por controladores:

- Organizaciones: `organizations:create`, `organizations:read`, `organizations:update`, `organizations:delete`
- Proyectos: `projects:create`, `projects:read`, `projects:update`, `projects:delete`
- Bitacoras: `daily-logs:create`, `daily-logs:read`, `daily-logs:update`, `daily-logs:delete`
- Eventos legacy: `events:create`, `events:read`, `events:update`, `events:delete`
- Eventos de bitacora: `daily-log-events:create`, `daily-log-events:read`, `daily-log-events:update`, `daily-log-events:delete`
- Tipos de evento: `event-types:create`, `event-types:read`, `event-types:update`, `event-types:delete`
- Adjuntos: `attachments:create`, `attachments:read`, `attachments:delete`
- Documentos: `documents:create`, `documents:read`, `documents:update`, `documents:delete`
- Usuarios: `users:create`, `users:read`, `users:update`, `users:delete`, `users:manage`, `users:password:reset`
- Roles: `roles:read`, `roles:assign`, aunque `roles/assignable` usa `users:manage` / `organizations:update` / `organizations:create`
- Auditoria: `audit:read`, aunque auditoria de bitacora hoy usa `daily-logs:read`
- Dashboard: usa `daily-logs:read`

### Permisos frontend actuales

No existe un permission store centralizado para visibilidad.

El frontend usa:

- `AuthGuard` para autenticacion.
- Estado de workflow para mostrar acciones de bitacora.
- Respuestas 403 para ajustar capacidad administrativa en usuarios/documentos.
- Roles visibles desde perfil/session context, pero no permisos efectivos.

Riesgo: la UI puede mostrar acciones que backend luego rechaza. RBAC v2 debe exponer permisos efectivos para visibilidad sin relajar backend.

## Problemas tecnicos que RBAC v2 debe resolver

- Alcance global inferido por permiso `organizations:create`.
- `daily-logs:update` concentra editar, enviar, aprobar, rechazar, cerrar y firmar.
- `daily-logs:read` concentra lectura, PDF, evidencia documental, auditoria y dashboard.
- `RolePermission` no tiene scope.
- `ProjectUser` fuerza asignaciones por proyecto incluso para roles globales u organizacionales.
- `ORG_ADMIN` existe en reglas de servicio, pero no en seed actual.
- Nomenclatura actual mezcla guiones: `daily-logs`, `daily-log-events`, `event-types`.
- La matriz cliente usa acciones funcionales mas finas que el catalogo actual.

## Modelo tecnico RBAC v2 propuesto

### ScopeType

Enum conceptual:

```txt
GLOBAL
ORGANIZATION
PROJECT
OWN
```

Definiciones:

- `GLOBAL`: toda la plataforma.
- `ORGANIZATION`: una organizacion y sus proyectos.
- `PROJECT`: un proyecto especifico.
- `OWN`: recursos propios del usuario autenticado.

Regla tecnica:

- Todo permiso efectivo debe resolverse como `permission + scope + resource`.
- Un permiso sin scope no debe autorizar acciones productivas.

### Role

Representa un perfil funcional.

Campos propuestos:

- `id`
- `code`
- `name`
- `description`
- `roleType`: `SYSTEM`, `CLIENT`, `OPERATIONAL`
- `status`
- `isSystem`
- `createdAt`
- `updatedAt`

Reglas:

- `code` debe ser estable y no depender del nombre visible.
- Roles de sistema como `SUPER_ADMIN` no deben ser eliminables desde UI ordinaria.
- Roles cliente deben poder mapearse a la matriz aprobada.

### Permission

Representa una accion atomica.

Campos propuestos:

- `id`
- `code`
- `module`
- `action`
- `description`
- `status`
- `version`
- `createdAt`
- `updatedAt`

Reglas:

- `code` debe ser unico.
- `module` y `action` deben derivarse del codigo para busqueda, filtros y UI.
- Un permiso debe ser lo suficientemente atomico para workflow y documentos.

### PermissionScope

Define en que scopes puede existir un permiso.

Campos propuestos:

- `id`
- `permissionId`
- `scopeType`
- `status`

Uso:

- Evita asignar permisos incompatibles, por ejemplo `organizations:create` en `OWN`.
- Permite validar semillas y asignaciones antes de guardar.

### RolePermission

Relaciona rol, permiso y scope permitido para ese rol.

Campos propuestos:

- `id`
- `roleId`
- `permissionId`
- `scopeType`
- `status`
- `createdAt`

Reglas:

- Un mismo rol puede tener el mismo permiso en mas de un scope solo si tiene sentido funcional.
- `SUPER_ADMIN` puede tener permisos con `GLOBAL`.
- Roles de proyecto deben tener permisos principalmente `PROJECT`.

### UserRole

Asignacion de rol sin proyecto especifico.

Uso recomendado:

- Roles `GLOBAL`.
- Roles `ORGANIZATION`.
- Roles propios o administrativos que no dependen de un proyecto unico.

Campos propuestos:

- `id`
- `userId`
- `roleId`
- `scopeType`
- `organizationId` nullable
- `status`
- `assignedById`
- `assignedAt`
- `revokedAt` nullable

Reglas:

- Si `scopeType = GLOBAL`, `organizationId` debe ser null.
- Si `scopeType = ORGANIZATION`, `organizationId` debe existir.
- No debe tener `projectId`.

### UserProjectRole

Asignacion de rol a proyecto.

Uso recomendado:

- Reemplazo tecnico o evolucion de `ProjectUser`.
- Mantiene claridad para roles operativos por proyecto.

Campos propuestos:

- `id`
- `userId`
- `projectId`
- `roleId`
- `scopeType` fijo o derivado como `PROJECT`
- `status`
- `assignedById`
- `assignedAt`
- `revokedAt` nullable

Reglas:

- Debe tener unicidad por `userId + projectId + roleId + status activo`.
- Debe validar que el rol tenga permisos compatibles con `PROJECT`.
- Debe poder convivir temporalmente con `ProjectUser` durante migracion.

### Relaciones propuestas

```txt
Role 1..N RolePermission
Permission 1..N RolePermission
Permission 1..N PermissionScope
User 1..N UserRole
User 1..N UserProjectRole
Organization 1..N UserRole
Project 1..N UserProjectRole
Role 1..N UserRole
Role 1..N UserProjectRole
```

### Resolucion de permisos efectivos

Entrada:

- `userId`
- `permissionCode`
- recurso objetivo opcional: `organizationId`, `projectId`, `ownerUserId`

Proceso:

1. Cargar asignaciones activas `UserRole` y `UserProjectRole`.
2. Expandir `RolePermission` activo.
3. Filtrar por `Permission.status = ACTIVE`.
4. Filtrar por scope:
   - `GLOBAL`: permite todo si el permiso coincide.
   - `ORGANIZATION`: permite recursos de esa organizacion.
   - `PROJECT`: permite solo ese proyecto.
   - `OWN`: permite si `ownerUserId = userId`.
5. Aplicar reglas contextuales de dominio:
   - estado de bitacora
   - usuario creador
   - segregacion de funciones
   - recurso eliminado o cerrado

Salida:

- `allowed: boolean`
- `matchedPermission`
- `matchedScope`
- `matchedAssignmentId`
- `reason`

## Nomenclatura tecnica de permisos

Formato obligatorio v2:

```txt
modulo:accion
```

Convencion:

- Usar snake_case en modulos compuestos.
- Usar snake_case en acciones compuestas.
- Evitar guiones en nuevos permisos.
- Mantener aliases temporales para permisos actuales con guion durante compatibilidad.

Ejemplos canonicos:

- `projects:read`
- `projects:create`
- `daily_logs:read`
- `daily_logs:create`
- `daily_logs:update`
- `daily_logs:submit`
- `daily_logs:approve`
- `daily_logs:reject`
- `daily_logs:close`
- `daily_logs:void`
- `daily_logs:return_to_draft`
- `daily_logs:download_pdf`
- `daily_logs:generate_pdf`
- `events:create`
- `events:update`
- `daily_log_events:create`
- `daily_log_events:update`
- `attachments:upload`
- `attachments:download`
- `attachments:delete`
- `signatures:apply`
- `signatures:read`
- `audit_logs:read`
- `users:manage`
- `users:password_reset`
- `users:invalidate_sessions`
- `roles:assign`
- `roles:manage`
- `dashboard:read`
- `documents:manage`
- `documents:download`

## Catalogo v2 inicial sugerido

| Modulo | Permisos v2 |
| --- | --- |
| `organizations` | `organizations:read`, `organizations:create`, `organizations:update`, `organizations:delete`, `organizations:manage` |
| `projects` | `projects:read`, `projects:create`, `projects:update`, `projects:delete`, `projects:manage` |
| `daily_logs` | `daily_logs:read`, `daily_logs:create`, `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `daily_logs:void`, `daily_logs:return_to_draft`, `daily_logs:download_pdf`, `daily_logs:generate_pdf` |
| `events` | `events:read`, `events:create`, `events:update`, `events:delete` |
| `daily_log_events` | `daily_log_events:read`, `daily_log_events:create`, `daily_log_events:update`, `daily_log_events:delete` |
| `attachments` | `attachments:read`, `attachments:upload`, `attachments:download`, `attachments:delete` |
| `signatures` | `signatures:read`, `signatures:apply`, `signatures:manage` |
| `audit_logs` | `audit_logs:read`, `audit_logs:export` |
| `users` | `users:read`, `users:create`, `users:update`, `users:delete`, `users:manage`, `users:password_reset`, `users:invalidate_sessions` |
| `roles` | `roles:read`, `roles:assign`, `roles:manage` |
| `dashboard` | `dashboard:read` |
| `documents` | `documents:read`, `documents:create`, `documents:update`, `documents:delete`, `documents:download`, `documents:manage` |
| `event_types` | `event_types:read`, `event_types:create`, `event_types:update`, `event_types:delete` |

## Mapeo backward de permisos actuales a v2

| Permiso actual | Permiso v2 recomendado |
| --- | --- |
| `organizations:read` | `organizations:read` |
| `organizations:create` | `organizations:create` |
| `organizations:update` | `organizations:update` |
| `organizations:delete` | `organizations:delete` |
| `projects:read` | `projects:read` |
| `projects:create` | `projects:create` |
| `projects:update` | `projects:update` |
| `projects:delete` | `projects:delete` |
| `daily-logs:read` | `daily_logs:read` |
| `daily-logs:create` | `daily_logs:create` |
| `daily-logs:update` | `daily_logs:update`, mas workflow segun rol |
| `daily-logs:delete` | `daily_logs:void` |
| `events:read` | `events:read` |
| `events:create` | `events:create` |
| `events:update` | `events:update` |
| `events:delete` | `events:delete` |
| `daily-log-events:read` | `daily_log_events:read` |
| `daily-log-events:create` | `daily_log_events:create` |
| `daily-log-events:update` | `daily_log_events:update` |
| `daily-log-events:delete` | `daily_log_events:delete` |
| `event-types:read` | `event_types:read` |
| `event-types:create` | `event_types:create` |
| `event-types:update` | `event_types:update` |
| `event-types:delete` | `event_types:delete` |
| `attachments:create` | `attachments:upload` |
| `attachments:read` | `attachments:read`, `attachments:download` |
| `attachments:delete` | `attachments:delete` |
| `documents:create` | `documents:create` |
| `documents:read` | `documents:read`, `documents:download` |
| `documents:update` | `documents:update` |
| `documents:delete` | `documents:delete` |
| `audit:read` | `audit_logs:read` |
| `users:password:reset` | `users:password_reset` |
| `users:manage` | `users:manage` |
| `roles:read` | `roles:read` |
| `roles:assign` | `roles:assign` |

## Estrategia de compatibilidad backward

### Principios

- Ningun usuario debe perder acceso durante el despliegue inicial.
- Los permisos actuales deben convivir temporalmente con permisos v2.
- Los endpoints pueden seguir usando permisos actuales hasta que guards v2 esten listos.
- La migracion debe ser reversible a nivel de asignacion.

### Compatibilidad por aliases

Crear una tabla conceptual o catalogo de aliases:

```txt
legacyPermissionCode -> v2PermissionCode
```

Ejemplos:

- `daily-logs:read` -> `daily_logs:read`
- `daily-logs:update` -> `daily_logs:update`
- `daily-log-events:create` -> `daily_log_events:create`
- `attachments:create` -> `attachments:upload`
- `users:password:reset` -> `users:password_reset`

Durante compatibilidad:

- El usuario con permiso legacy se considera habilitado para el equivalente v2.
- El usuario con permiso v2 se puede considerar habilitado para endpoint legacy solo cuando se haya validado el mapeo.

### SUPER_ADMIN bypass controlado

El bypass actual por `organizations:create` debe migrar a:

- rol `SUPER_ADMIN`
- scope `GLOBAL`
- permisos explicitos v2

Durante transicion:

- `SUPER_ADMIN` conserva todos los permisos legacy.
- `SUPER_ADMIN` recibe todos los permisos v2 con `GLOBAL`.
- `ProjectAccessPolicy` mantiene bypass legacy solo hasta que exista policy v2.
- La nueva policy debe preguntar por scope `GLOBAL`, no por `organizations:create`.

### Migracion de roles actuales sin perdida

Mapeo inicial:

| Rol actual | Tratamiento recomendado |
| --- | --- |
| `SUPER_ADMIN` | Mantener. Agregar scope `GLOBAL`. |
| `PROJECT_ADMIN` | Mantener. Mapear a `PROJECT_ADMIN` v2 scope `PROJECT`. |
| `PROJECT_MANAGER` | Mantener. Ajustar permisos workflow segun matriz cliente. |
| `SUPERVISOR` | Mantener temporalmente. Decidir si equivale a entidad contratante, director o supervisor interno. |
| `AUDITOR` | Mantener temporalmente. Mapear a auditor/interventor segun decision cliente. |
| `INSPECTOR` | Mantener temporalmente. Mapear a interventor, maestro o inspector tecnico. |
| `VIEWER` | Mantener. Scope `PROJECT`. |
| `ORG_ADMIN` | Agregar en catalogo futuro, porque ya existe en reglas de servicio y matriz cliente. |

Regla de migracion:

- Toda fila `ProjectUser` activa se puede mapear a `UserProjectRole` con `scopeType = PROJECT`.
- Si el rol es `SUPER_ADMIN`, crear ademas o alternativamente `UserRole` con `scopeType = GLOBAL`.
- Si se agrega `ORG_ADMIN`, debe asignarse con `UserRole.scopeType = ORGANIZATION`.

## Estrategia futura de implementacion

### Fase tecnica 64.2 - Migraciones

- Agregar enums y tablas nuevas.
- No eliminar `ProjectUser` aun.
- Crear indices y constraints por scope.
- Crear tabla de alias legacy si se decide persistir alias.

### Fase tecnica 64.3 - Seeds

- Sembrar permisos v2.
- Sembrar scopes permitidos por permiso.
- Sembrar roles v2.
- Sembrar role-permissions v2.
- Backfill seguro desde roles actuales.

### Fase tecnica 64.4 - Policies y guards

- Crear `RbacPolicy` para resolver permisos efectivos.
- Crear guard v2 que reciba permiso, accion y extractor de recurso.
- Mantener `PermissionsGuard` legacy durante transicion.
- Reemplazar bypass de `ProjectAccessPolicy`.

### Fase tecnica 64.5 - Workflow y permisos atomicos

- Cambiar endpoints workflow a permisos v2 dedicados.
- Separar approve/reject/close/void/sign/download_pdf.
- No mezclar autorizacion con reglas de estado.

### Fase tecnica 64.6 - Frontend visibility

- Crear endpoint `me/permissions` o `me/effective-permissions`.
- Exponer permisos por scope y proyecto visible.
- Ocultar acciones por permisos efectivos + estado.
- Mantener backend como autoridad final.

### Fase tecnica 64.7 - QA seguridad

- Matriz rol x accion x scope.
- Pruebas multirol.
- Pruebas multiproyecto.
- Pruebas GLOBAL vs ORGANIZATION vs PROJECT.
- Pruebas de usuario desactivado y sesiones invalidadas.
- Auditoria de cambios RBAC.

## Riesgos

- Cambiar nomenclatura de guion a snake_case puede romper endpoints si se hace sin aliases.
- `daily-logs:update` es demasiado amplio; dividirlo sin backfill puede bloquear usuarios.
- `SUPER_ADMIN` puede perder bypass si se elimina `organizations:create` antes de policy v2.
- `ORG_ADMIN` esta referenciado pero no sembrado; implementarlo sin decision de alcance puede crear huecos de seguridad.
- Multiples roles pueden elevar permisos por union; debe quedar auditado el permiso efectivo que autorizo.
- `OWN` puede ser ambiguo en bitacoras: creador, responsable, firmante y usuario asignado no siempre son lo mismo.
- Frontend puede quedar desalineado si consume roles en vez de permisos efectivos.

## Decisiones pendientes

1. Confirmar si se evoluciona `ProjectUser` o se crea `UserProjectRole` nuevo.
2. Confirmar si `UserRole` sera tabla separada para scopes global/organizacion.
3. Confirmar si los permisos v2 usaran snake_case como estandar definitivo.
4. Confirmar estrategia de alias legacy.
5. Confirmar alcance de `ORG_ADMIN`.
6. Confirmar si `PROJECT_ADMIN (PMO)` es rol separado.
7. Confirmar si `daily_logs:approve` incluye o no `daily_logs:reject`.
8. Confirmar si `daily_logs:close` incluye `daily_logs:generate_pdf`.
9. Confirmar definicion de `OWN`.
10. Confirmar si auditoria RBAC sera obligatoria para cada cambio de rol/permisos.

## Resultado esperado

El modelo tecnico RBAC v2 queda definido como una evolucion compatible del sistema actual. La siguiente fase puede disenar migraciones y seeds sin cambiar aun la autorizacion productiva.
