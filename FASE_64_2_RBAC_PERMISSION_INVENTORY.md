# FASE 64.2 - RBAC Permission Inventory

## Alcance

Inventario tecnico de permisos, roles, guards, policies y validaciones RBAC actualmente usados en backend y frontend.

Esta fase solo documenta. No modifica logica productiva, permisos efectivos, guards, frontend, migraciones ni seeds.

Fuentes revisadas:

- `FASE_64_0_RBAC_MATRIX_V2_ARCHITECTURE.md`
- `FASE_64_1_RBAC_V2_TECHNICAL_MODEL.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- Controladores y servicios backend en `apps/api/src`
- Frontend en `apps/web/src`

## Inventario backend

### Decorators de permisos

| Elemento | Archivo | Funcion |
| --- | --- | --- |
| `@Permissions(...permissions)` | `apps/api/src/auth/decorators/permissions.decorator.ts` | Guarda metadata `permissions` en handler/clase. |
| `@CurrentUser()` | `apps/api/src/auth/decorators/current-user.decorator.ts` | Extrae payload JWT del request. |
| `@AuditContext()` | `apps/api/src/audit/decorators/audit-context.decorator.ts` | Extrae datos de auditoria del request. |

### Guards

| Guard | Archivo | Evalua | Limitacion |
| --- | --- | --- | --- |
| `JwtAuthGuard` | `apps/api/src/auth/guards/jwt-auth.guard.ts` | Autenticacion JWT. | No evalua permisos ni alcance. |
| `PermissionsGuard` | `apps/api/src/auth/guards/permissions.guard.ts` | Permisos por `ProjectUser -> Role -> RolePermission -> Permission`. | No evalua scope, proyecto, organizacion ni propiedad. Autoriza por OR. |
| `DailyLogProjectAccessGuard` | `apps/api/src/daily-logs/guards/daily-log-project-access.guard.ts` | Acceso al proyecto de una bitacora. | No evalua accion workflow; complementa algunos endpoints. |

### Policies

| Policy | Archivo | Funcion | Riesgo |
| --- | --- | --- | --- |
| `ProjectAccessPolicy` | `apps/api/src/projects/project-access.policy.ts` | Lista proyectos accesibles o valida acceso a un proyecto. | Usa `organizations:create` como bypass de acceso plataforma. |

### Bypass SUPER_ADMIN / plataforma

No hay bypass explicito por `SUPER_ADMIN` en `PermissionsGuard`.

El bypass real ocurre en `ProjectAccessPolicy`:

- Si el usuario tiene algun rol activo con permiso `organizations:create`, `getAccessibleProjectIds` devuelve `null`.
- `null` se interpreta en servicios como acceso global a proyectos.

Impacto:

- `SUPER_ADMIN` recibe todos los permisos por seed, incluyendo `organizations:create`, por lo que obtiene acceso global.
- Cualquier rol que reciba `organizations:create` tambien hereda bypass global de proyectos.

### Validaciones manuales de rol

| Archivo | Validacion | Roles/permisos hardcoded |
| --- | --- | --- |
| `apps/api/src/users/users.service.ts` | Proteccion contra remover/desactivar ultimo administrador. | `SUPER_ADMIN`, `ORG_ADMIN`, `PROJECT_ADMIN` |
| `apps/api/src/users/users.service.ts` | Determina rol administrativo por permisos. | `users:manage`, `organizations:create`, `organizations:update` |
| `apps/api/src/users/users.service.ts` | Evita asignar roles con permisos superiores al actor. | Compara permisos del rol objetivo contra permisos del actor. |
| `apps/api/src/daily-logs/daily-log-signatures.service.ts` | Resuelve etiqueta de rol del firmante desde primer `ProjectUser`. | Usa nombre/codigo de rol, no permiso. |

Inconsistencia:

- `ORG_ADMIN` se usa en validaciones, pero no esta en `prisma/seed.ts`.

## Matriz backend endpoint / permiso / guard / policy

### Auth, health y publicos

| Endpoint | Guard | Permiso | Policy/validacion | Observacion |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | Ninguno | Ninguno | Valida credenciales/status en servicio. | Publico esperado. |
| `GET /health` | Ninguno | Ninguno | Ninguna. | Publico esperado. |
| `GET /health/db` | Ninguno | Ninguno | Consulta DB y retorna `rolesCount`. | Publico; sensible bajo hardening. |
| `GET /daily-logs/:id/verification` | Ninguno | Ninguno | Codigo de verificacion PDF. | Publico por diseno. |
| `GET /public/daily-logs/:id/verification` | Ninguno | Ninguno | Codigo de verificacion PDF. | Publico por diseno. |

### Users

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /users/me/signature` | `JwtAuthGuard` | Ninguno | OWN implicito por `user.sub`. |
| `POST /users/me/signature` | `JwtAuthGuard` | Ninguno | OWN implicito; valida archivo/firma. |
| `DELETE /users/me/signature` | `JwtAuthGuard` | Ninguno | OWN implicito. |
| `PATCH /users/me/password` | `JwtAuthGuard` | Ninguno | OWN implicito; valida password. |
| `GET /users` | `JwtAuthGuard`, `PermissionsGuard` | `users:read` | Servicio filtra por alcance visible. |
| `GET /users/:id` | `JwtAuthGuard`, `PermissionsGuard` | `users:read` | Servicio filtra por alcance visible. |
| `PATCH /users/:id/roles` | `JwtAuthGuard`, `PermissionsGuard` | `users:manage` OR `organizations:update` OR `organizations:create` | Valida alcance de proyectos y no quitar ultimo admin. |
| `PATCH /users/:id/status` | `JwtAuthGuard`, `PermissionsGuard` | `users:update` OR `users:manage` OR `organizations:update` OR `organizations:create` | Valida ultimo admin activo. |
| `POST /users/:id/invalidate-sessions` | `JwtAuthGuard`, `PermissionsGuard` | `users:update` OR `users:manage` OR `organizations:update` OR `organizations:create` | Valida alcance. |
| `PATCH /users/:id/password` | `JwtAuthGuard`, `PermissionsGuard` | `users:update` OR `users:password:reset` OR `users:manage` | Valida alcance y password. |
| `POST /users` | `JwtAuthGuard`, `PermissionsGuard` | `users:create` OR `users:manage` | Sin scope explicito. |
| `PATCH /users/:id` | `JwtAuthGuard`, `PermissionsGuard` | `users:update` OR `users:manage` | Sin scope explicito en guard. |
| `DELETE /users/:id` | `JwtAuthGuard`, `PermissionsGuard` | `users:delete` OR `users:manage` | Validaciones de admin en servicio. |

### Roles

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /roles/assignable` | `JwtAuthGuard`, `PermissionsGuard` | `users:manage` OR `organizations:update` OR `organizations:create` | `RolesService` solo devuelve roles cuyos permisos estan contenidos en permisos del actor. |

Observacion:

- Existe permiso seed `roles:read` y `roles:assign`, pero este endpoint no los usa.

### Projects

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /projects` | `JwtAuthGuard`, `PermissionsGuard` | `projects:read` | `ProjectsService` filtra por `ProjectAccessPolicy`. |
| `GET /projects/:id` | `JwtAuthGuard`, `PermissionsGuard` | `projects:read` | `ProjectAccessPolicy.canAccessProject`. |
| `POST /projects` | `JwtAuthGuard`, `PermissionsGuard` | `projects:create` | Sin scope explicito en guard. |
| `PATCH /projects/:id` | `JwtAuthGuard`, `PermissionsGuard` | `projects:update` | Servicio/auditoria. |
| `DELETE /projects/:id` | `JwtAuthGuard`, `PermissionsGuard` | `projects:delete` | Servicio/auditoria. |

### Daily logs, workflow, firmas y PDF

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /daily-logs` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | Filtra por proyectos accesibles. |
| `GET /daily-logs/:id/pdf` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | `DailyLogPdfService` valida proyecto. |
| `GET /daily-logs/:id/document-evidence` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | `DailyLogPdfService` valida proyecto. |
| `GET /daily-logs/:id/signatures` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | `DailyLogSignaturesService` valida proyecto. |
| `GET /daily-logs/:id/audit` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | Servicio valida proyecto. No usa `audit:read`. |
| `POST /daily-logs/:id/signatures` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:update` | Servicio valida proyecto, estado y firma maestra. |
| `GET /daily-logs/:id` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | Servicio valida proyecto. |
| `GET /projects/:projectId/daily-logs` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | Servicio valida proyecto. |
| `POST /daily-logs` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:create` | Servicio valida proyecto y workflow de dia anterior. |
| `PATCH /daily-logs/:id` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:update` | Editable solo en `DRAFT`. |
| `POST /daily-logs/:id/submit` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:update` | Estado `DRAFT`. |
| `POST /daily-logs/:id/submit-review` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:update` | Alias legacy. |
| `POST /daily-logs/:id/approve` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:update` | Estado `IN_REVIEW`. |
| `POST /daily-logs/:id/reject` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:update` | Estado `IN_REVIEW`. |
| `POST /daily-logs/:id/close` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:update` | Estado `APPROVED`; genera PDF. |
| `POST /daily-logs/:id/return-to-draft` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:update` | Estado `REJECTED`. |
| `POST /daily-logs/:id/cancel` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:delete` | Anula con estado `VOIDED`. |
| `DELETE /daily-logs/:id` | `JwtAuthGuard`, `PermissionsGuard`, `DailyLogProjectAccessGuard` | `daily-logs:delete` | Alias legacy de cancelacion. |

Gap principal:

- `daily-logs:update` autoriza acciones workflow criticas: submit, approve, reject, close, return, sign.

### Daily log events

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `POST /daily-log-events` | `JwtAuthGuard`, `PermissionsGuard` | `daily-log-events:create` | Servicio valida proyecto y estado editable de bitacora. |
| `GET /daily-log-events` | `JwtAuthGuard`, `PermissionsGuard` | `daily-log-events:read` | Filtra por proyectos accesibles. |
| `GET /daily-log-events/:id` | `JwtAuthGuard`, `PermissionsGuard` | `daily-log-events:read` | Servicio valida proyecto. |
| `PATCH /daily-log-events/:id` | `JwtAuthGuard`, `PermissionsGuard` | `daily-log-events:update` | Servicio valida proyecto y estado editable. |
| `DELETE /daily-log-events/:id` | `JwtAuthGuard`, `PermissionsGuard` | `daily-log-events:delete` | Servicio valida proyecto y estado editable. |

### Events legacy

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /events` | `JwtAuthGuard`, `PermissionsGuard` | `events:read` | Filtra por proyectos accesibles. |
| `GET /events/:id` | `JwtAuthGuard`, `PermissionsGuard` | `events:read` | Servicio valida proyecto. |
| `GET /daily-logs/:dailyLogId/events` | `JwtAuthGuard`, `PermissionsGuard` | `events:read` | Servicio valida daily log/proyecto. |
| `POST /events` | `JwtAuthGuard`, `PermissionsGuard` | `events:create` | Servicio valida proyecto. |
| `PATCH /events/:id` | `JwtAuthGuard`, `PermissionsGuard` | `events:update` | Servicio valida proyecto. |
| `DELETE /events/:id` | `JwtAuthGuard`, `PermissionsGuard` | `events:delete` | Servicio valida proyecto. |

### Attachments

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `POST /attachments/upload` | `JwtAuthGuard`, `PermissionsGuard` | `attachments:create` | Servicio valida proyecto y bitacora editable. |
| `GET /attachments/:id` | `JwtAuthGuard`, `PermissionsGuard` | `attachments:read` | Sin `CurrentUser`; revisar si servicio valida acceso. |
| `GET /daily-log-events/:id/attachments` | `JwtAuthGuard`, `PermissionsGuard` | `attachments:read` | Sin `CurrentUser`; revisar si servicio valida acceso. |
| `GET /attachments/:id/download` | `JwtAuthGuard`, `PermissionsGuard` | `attachments:read` | Servicio valida proyecto con `CurrentUser`. |
| `DELETE /attachments/:id` | `JwtAuthGuard`, `PermissionsGuard` | `attachments:delete` | Servicio valida proyecto y estado editable. |

Gap:

- Metadatos/listado de attachments usan `attachments:read`, pero no siempre reciben usuario para validar alcance en controlador.

### Documents

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `POST /documents/upload` | `JwtAuthGuard`, `PermissionsGuard` | `documents:create` | Servicio valida proyecto/referencias. |
| `POST /documents` | `JwtAuthGuard`, `PermissionsGuard` | `documents:create` | Servicio valida proyecto/referencias. |
| `GET /documents` | `JwtAuthGuard`, `PermissionsGuard` | `documents:read` | Filtra por proyectos accesibles. |
| `GET /documents/:id/download` | `JwtAuthGuard`, `PermissionsGuard` | `documents:read` | Servicio valida acceso por auditoria/actor. |
| `GET /documents/:id` | `JwtAuthGuard`, `PermissionsGuard` | `documents:read` | Servicio valida acceso. |
| `PATCH /documents/:id` | `JwtAuthGuard`, `PermissionsGuard` | `documents:update` | Servicio valida acceso. |
| `DELETE /documents/:id` | `JwtAuthGuard`, `PermissionsGuard` | `documents:delete` | Servicio valida acceso. |

Gap:

- Descarga usa `documents:read`; RBAC v2 deberia separar `documents:download`.

### Event types

| Endpoint | Guard | Permiso |
| --- | --- | --- |
| `GET /event-types` | `JwtAuthGuard`, `PermissionsGuard` | `event-types:read` |
| `GET /event-types/:id` | `JwtAuthGuard`, `PermissionsGuard` | `event-types:read` |
| `POST /event-types` | `JwtAuthGuard`, `PermissionsGuard` | `event-types:create` |
| `PATCH /event-types/:id` | `JwtAuthGuard`, `PermissionsGuard` | `event-types:update` |
| `DELETE /event-types/:id` | `JwtAuthGuard`, `PermissionsGuard` | `event-types:delete` |

### Organizations

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /organizations` | `JwtAuthGuard`, `PermissionsGuard` | `organizations:read` | Filtra por `ProjectAccessPolicy`. |
| `GET /organizations/:id` | `JwtAuthGuard`, `PermissionsGuard` | `organizations:read` | Servicio valida alcance. |
| `POST /organizations` | `JwtAuthGuard`, `PermissionsGuard` | `organizations:create` | Tambien habilita bypass global actual. |
| `PATCH /organizations/:id` | `JwtAuthGuard`, `PermissionsGuard` | `organizations:update` | Servicio/auditoria. |
| `DELETE /organizations/:id` | `JwtAuthGuard`, `PermissionsGuard` | `organizations:delete` | Servicio/auditoria. |

### Dashboard

| Endpoint | Guard | Permiso | Policy/validacion |
| --- | --- | --- | --- |
| `GET /dashboard/metrics` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | DashboardService filtra por proyectos accesibles. |
| `GET /dashboard/recent-activity` | `JwtAuthGuard`, `PermissionsGuard` | `daily-logs:read` | DashboardService filtra por proyectos accesibles. |

Gap:

- No existe `dashboard:read` activo en backend.

## Inventario frontend

### Pantallas protegidas

Todas estas pantallas usan `AuthGuard`, que solo valida presencia local de token:

- `/dashboard`
- `/projects`
- `/projects/new`
- `/projects/[id]/documents`
- `/daily-logs`
- `/daily-logs/new`
- `/daily-logs/[id]`
- `/daily-logs/[id]/verify`
- `/users`
- `/users/[id]`
- `/profile`

Riesgo:

- `AuthGuard` no valida permisos ni expiracion real del JWT; los errores 401/403 se manejan despues por llamadas API.

### Uso de JWT/session

| Elemento | Uso |
| --- | --- |
| `apps/web/src/lib/auth.ts` | Guarda `bitacora.accessToken` en `localStorage`, valida presencia de token, logout. |
| `apps/web/src/lib/api-client.ts` | Lee `bitacora.accessToken` para Authorization header. |
| `SessionContextHeader` | Decodifica JWT localmente para `sub`, `email`, `fullName`; carga `getUser(sub)` para roles visibles. |

Riesgo:

- La decodificacion local del JWT se usa para UI, no para autorizacion. Correcto como display, pero no debe derivar permisos efectivos de ahi.

### Matriz frontend pantalla / accion / control visual

| Pantalla/componente | Accion visible | Control frontend | Permiso backend esperado |
| --- | --- | --- | --- |
| `WorkflowActions` | Enviar revision | `status === DRAFT` | `daily-logs:update` |
| `WorkflowActions` | Aprobar | `status === IN_REVIEW` | `daily-logs:update` |
| `WorkflowActions` | Rechazar | `status === IN_REVIEW` | `daily-logs:update` |
| `WorkflowActions` | Cerrar | `status === APPROVED` | `daily-logs:update` |
| `WorkflowActions` | Volver a borrador | `status === REJECTED` | `daily-logs:update` |
| Daily log detail | Crear evento | `canCreateDailyLogEvent(status)` | `daily-log-events:create` |
| Daily log event card/upload | Subir adjunto | `canUploadEventAttachment(status)` | `attachments:create` |
| Daily log signatures | Firmar | `status APPROVED/CLOSED` + firma maestra | `daily-logs:update` |
| Daily log detail | Descargar PDF | Siempre si hay bitacora | `daily-logs:read` |
| Daily log detail | Auditoria visible | Siempre intenta cargar | `daily-logs:read` |
| Project documents | Cargar documento | `canCreate`, inicia `true`, se apaga con 403 | `documents:create` |
| Project documents | Editar documento | `canUpdate`, inicia `true`, se apaga con 403 | `documents:update` |
| Project documents | Eliminar documento | `canDelete`, inicia `true`, se apaga con 403 | `documents:delete` |
| Project documents | Descargar documento | Siempre visible | `documents:read` |
| User detail | Administrar roles/proyectos/sesiones/password | `canAdministerUser`, se activa si `roles/assignable` y `projects` responden | Varios permisos admin |
| Users list | Ver usuarios | Pantalla visible con AuthGuard; API puede devolver 403 | `users:read` |
| Projects list | Crear/ver documentos/bitacoras | No hay permiso visual fino | `projects:read`, otros segun ruta |
| Dashboard | Ver metricas/actividad | AuthGuard; API puede devolver 403 | `daily-logs:read` |

### Permisos hardcoded frontend

No se detectaron strings de permisos usados para decision visual directa en frontend.

El frontend no contiene chequeos como `hasPermission("...")`.

### Roles hardcoded frontend

No se detectaron chequeos directos de `SUPER_ADMIN`, `PROJECT_ADMIN` u `ORG_ADMIN` para autorizar UI.

Roles hardcoded como etiquetas:

- `Responsable / Residente`
- `Director / Aprobador`
- `Interventor / Inspector`

Estos aparecen en tablas/secciones de firmas, no como autorizacion.

### Condiciones hardcoded por estado

| Funcion | Archivo | Logica |
| --- | --- | --- |
| `isDailyLogEditable` | `apps/web/src/lib/daily-log-workflow.ts` | `DRAFT` o `REJECTED` |
| `canCreateDailyLogEvent` | `apps/web/src/lib/daily-log-workflow.ts` | bitacora editable |
| `canUploadEventAttachment` | `apps/web/src/lib/daily-log-workflow.ts` | bitacora editable |
| `canSubmitDailyLog` | `apps/web/src/lib/daily-log-workflow.ts` | `DRAFT` |
| `canApproveDailyLog` | `apps/web/src/lib/daily-log-workflow.ts` | `IN_REVIEW` |
| `canRejectDailyLog` | `apps/web/src/lib/daily-log-workflow.ts` | `IN_REVIEW` |
| `canCloseDailyLog` | `apps/web/src/lib/daily-log-workflow.ts` | `APPROVED` |

## Inconsistencias detectadas

### Permisos con nombres distintos para accion similar

| Accion | Permiso actual | Observacion RBAC v2 |
| --- | --- | --- |
| Leer auditoria general | `audit:read` | Existe en seed. |
| Leer auditoria de bitacora | `daily-logs:read` | Deberia mapear a `audit_logs:read` o permiso especifico. |
| Descargar documento | `documents:read` | Deberia ser `documents:download`. |
| Descargar PDF bitacora | `daily-logs:read` | Deberia ser `daily_logs:download_pdf`. |
| Firmar bitacora | `daily-logs:update` | Deberia ser `signatures:apply` o `daily_logs:sign`. |
| Enviar/aprobar/rechazar/cerrar | `daily-logs:update` | Deberian ser permisos workflow atomicos. |
| Dashboard | `daily-logs:read` | Deberia ser `dashboard:read`. |
| Upload adjunto | `attachments:create` | V2 propone `attachments:upload`. |

### Acciones frontend visibles sin control visual por permiso

- Workflow completo de bitacora.
- Crear evento.
- Subir adjuntos.
- Descargar PDF.
- Ver auditoria de bitacora.
- Descargar documentos.
- Crear proyecto y crear bitacora en pantallas de navegacion.

Backend protege estas acciones, pero frontend no conoce permisos efectivos.

### Endpoints backend protegidos pero frontend sin control visual

- `daily-logs:update` para approve/reject/close/sign aparece por estado, no por permiso.
- `documents:create/update/delete` se controla por 403 posterior, no por permisos precargados.
- `users:*` admin se controla por disponibilidad de catalogos, no por permisos efectivos.
- `dashboard` se muestra con AuthGuard y depende de 403 backend.

### Permisos duplicados o sobrecargados

- `daily-logs:update` sobrecargado.
- `daily-logs:read` sobrecargado.
- `documents:read` sobrecargado.
- `users:update` y `users:manage` se combinan con OR en varias acciones.
- `organizations:create` se usa como permiso real y como bypass de plataforma.

### Roles usados directamente

Backend:

- `SUPER_ADMIN`, `ORG_ADMIN`, `PROJECT_ADMIN` en validaciones de ultimo administrador.

Frontend:

- No usa roles para autorizacion directa.
- Muestra roles visibles en header y paginas de usuarios.

### Modulos sin permiso definido o no usado

- Dashboard no tiene permiso propio activo.
- PDF no tiene permiso propio.
- Firmas de bitacora no tienen permiso propio.
- Firma maestra del usuario usa solo JWT/OWN implicito.
- Verificacion publica no requiere permiso, por diseno.

### Endpoints sensibles sin `PermissionsGuard`

| Endpoint | Estado | Observacion |
| --- | --- | --- |
| `GET /users/me/signature` | JWT only | Correcto si se modela como OWN. |
| `POST /users/me/signature` | JWT only | Correcto si se modela como `signatures:manage_own` o equivalente. |
| `DELETE /users/me/signature` | JWT only | Correcto si se modela como OWN. |
| `PATCH /users/me/password` | JWT only | Correcto si se modela como `users:change_own_password`. |
| `GET /health/db` | Publico | Exponer `rolesCount` puede ser sensible en hardening. |

## Permisos legacy a mapear en RBAC v2

- `daily-logs:*` -> `daily_logs:*`
- `daily-log-events:*` -> `daily_log_events:*`
- `event-types:*` -> `event_types:*`
- `attachments:create` -> `attachments:upload`
- `attachments:read` -> `attachments:read` + `attachments:download`
- `documents:read` -> `documents:read` + `documents:download`
- `daily-logs:read` -> `daily_logs:read` + `daily_logs:download_pdf` + posible `audit_logs:read` + `dashboard:read`
- `daily-logs:update` -> `daily_logs:update` + `daily_logs:submit` + `daily_logs:approve` + `daily_logs:reject` + `daily_logs:close` + `signatures:apply`
- `daily-logs:delete` -> `daily_logs:void`
- `users:password:reset` -> `users:password_reset`
- `audit:read` -> `audit_logs:read`

## Gaps de seguridad / diseno

1. `organizations:create` como bypass global es fragil.
2. No hay scope explicito en permisos efectivos.
3. `PermissionsGuard` autoriza por OR y no considera recurso.
4. Workflow critico depende de `daily-logs:update`.
5. Frontend no consume permisos efectivos.
6. Algunos endpoints JWT-only requieren modelarse como OWN en RBAC v2.
7. `ORG_ADMIN` hardcoded no existe en seed.
8. Dashboard y PDF no tienen permisos propios.
9. Auditoria de bitacora no usa `audit:read`.
10. Attachments metadata/listado requieren revision de alcance por usuario.

## Recomendaciones para normalizacion RBAC v2

- Crear endpoint de permisos efectivos para frontend: `GET /auth/me/permissions` o `GET /users/me/permissions`.
- Separar permisos de workflow antes de cambiar UI:
  - `daily_logs:submit`
  - `daily_logs:approve`
  - `daily_logs:reject`
  - `daily_logs:close`
  - `daily_logs:void`
  - `daily_logs:return_to_draft`
- Separar permisos documentales:
  - `documents:download`
  - `attachments:download`
  - `daily_logs:download_pdf`
- Crear permisos propios:
  - `dashboard:read`
  - `audit_logs:read`
  - `signatures:apply`
  - `user_signatures:manage_own`
  - `users:change_own_password`
- Reemplazar bypass de `organizations:create` por scope `GLOBAL`.
- Mantener alias legacy durante transicion.
- Documentar endpoints publicos permitidos: login, health basico, verificacion publica.

## Impacto estimado para fases 64.3+

### 64.3 - Catalogo y aliases

Impacto medio:

- Crear catalogo v2 y aliases legacy.
- No cambiar autorizacion aun.

### 64.4 - Policy/guard v2

Impacto alto:

- Resolver permiso + scope + recurso.
- Cambiar `ProjectAccessPolicy` para no depender de `organizations:create`.

### 64.5 - Workflow permissions

Impacto alto:

- Cambiar permisos de endpoints workflow.
- Backfill de roles para no bloquear operaciones existentes.

### 64.6 - Frontend visibility

Impacto medio-alto:

- Consumir permisos efectivos.
- Reemplazar flags por 403 con visibilidad anticipada.
- Mantener estados workflow como condicion complementaria.

### 64.7 - QA seguridad

Impacto alto:

- Probar matriz rol x accion x proyecto.
- Probar multirol, multiproyecto, usuarios inactivos, scopes y acciones publicas.

## Resultado del inventario

El sistema actual tiene autorizacion backend funcional, pero plana y sin scopes explicitos. El frontend no usa permisos efectivos para visibilidad y depende de estados o errores 403. RBAC v2 debe introducir permisos atomicos, scopes, aliases legacy y una policy centralizada antes de modificar guards productivos.
