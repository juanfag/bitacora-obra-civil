# FASE 64.7 - Frontend RBAC hybrid visibility

## Alcance

Esta fase normaliza visibilidad frontend con permisos legacy y RBAC v2 equivalentes.

No se cambia autorizacion backend, guards, workflow, permisos finales por rol, matriz cliente final ni compatibilidad legacy.

## Estrategia frontend hibrida

Se agrego un helper centralizado para resolver equivalencias de permisos:

- Permiso legacy exacto.
- Permiso RBAC v2 equivalente.
- Fallback abierto mientras los permisos cargan o si la lectura de permisos falla.

El fallback abierto evita bloquear acciones nuevas cuando backend aun no las bloquea o cuando la UI no puede cargar permisos. Backend sigue siendo la fuente de verdad.

## Helper creado

Archivo:

- `apps/web/src/lib/rbac-permissions.ts`

Funciones:

- `hasPermission(permissionState, permission)`
- `hasAnyPermission(permissionState, permissions)`
- `expandPermission(permission)`
- `expandPermissions(permissions)`

Hook:

- `apps/web/src/lib/use-current-permissions.ts`

El hook consume `GET /users/me/permissions`, mantiene `permissionCodes`, y expone:

- `can(permission)`
- `canAny(permissions)`
- `permissionState`

## Endpoint de visibilidad agregado

Se agrego lectura de permisos efectivos:

- `GET /users/me/permissions`

Caracteristicas:

- Usa solo `JwtAuthGuard`.
- No cambia autorizacion.
- No modifica guards productivos.
- Devuelve permisos activos derivados de `ProjectUser -> Role -> RolePermission`.

## Componentes modificados

| Archivo | Cambio |
| --- | --- |
| `apps/web/src/components/app-navigation.tsx` | Nueva navegacion cliente filtrada por permisos. |
| `apps/web/src/app/layout.tsx` | Usa `AppNavigation`. |
| `apps/web/src/lib/api-client.ts` | Agrega `getMyPermissions` y tipos de permisos efectivos. |
| `apps/web/src/lib/rbac-permissions.ts` | Resolver hibrido frontend. |
| `apps/web/src/lib/use-current-permissions.ts` | Hook de permisos actuales. |
| `apps/web/src/app/dashboard/page.tsx` | Header actions por permisos de lectura de proyectos/bitacoras. |
| `apps/web/src/app/projects/page.tsx` | CTAs de proyecto, bitacoras y documentos por permisos. |
| `apps/web/src/app/daily-logs/page.tsx` | CTA principal de crear bitacora por permiso. |
| `apps/web/src/app/daily-logs/[id]/page.tsx` | Workflow, crear eventos, adjuntos, firmas y PDF por permisos. |
| `apps/web/src/components/workflow/WorkflowActions.tsx` | Acepta acciones permitidas. |
| `apps/web/src/components/daily-log/daily-log-header.tsx` | Controla workflow y descarga PDF. |
| `apps/web/src/components/daily-log/daily-log-document-evidence.tsx` | Controla descarga PDF. |
| `apps/web/src/components/daily-log/daily-log-signatures-table.tsx` | Controla aplicar firma. |
| `apps/web/src/components/daily-logs/events/DailyLogEventList.tsx` | Propaga permiso de upload adjuntos. |
| `apps/web/src/components/daily-logs/events/DailyLogEventCard.tsx` | Oculta upload adjuntos sin permiso. |
| `apps/web/src/app/projects/[id]/documents/page.tsx` | Crear/editar/eliminar/descargar documentos por permisos. |
| `apps/web/src/app/users/[id]/page.tsx` | Admin de roles/proyectos/sesiones/password combina 403/catalogo con permisos. |

## Acciones normalizadas

| Accion | Permiso UI |
| --- | --- |
| Ver dashboard | `dashboard:read` o fallback legacy segun resolver/nav |
| Ver proyectos | `projects:read` |
| Crear proyecto | `projects:create` |
| Ver bitacoras | `daily-logs:read` |
| Crear bitacora | `daily-logs:create` |
| Enviar aprobacion | `daily_logs:submit` o legacy equivalente |
| Aprobar | `daily_logs:approve` o legacy equivalente |
| Rechazar | `daily_logs:reject` o legacy equivalente |
| Cerrar | `daily_logs:close` o legacy equivalente |
| Descargar PDF | `daily-logs:read` / `daily_logs:download_pdf` |
| Crear evento | `daily-log-events:create` |
| Subir adjuntos | `attachments:create` / `attachments:upload` |
| Aplicar firma | `daily-logs:update` / `signatures:apply` |
| Ver documentos | `documents:read` |
| Descargar documentos | `documents:download` |
| Crear documentos | `documents:create` |
| Editar documentos | `documents:update` |
| Eliminar documentos | `documents:delete` |
| Administrar usuarios/roles | `users:manage`, `roles:assign`, `users:update` |

## Roles hardcoded

No se agregaron chequeos nuevos por rol.

Se mantienen etiquetas funcionales no autorizativas:

- `Responsable / Residente`
- `Director / Aprobador`
- `Interventor / Inspector`

Estas etiquetas aparecen en firmas y PDF como texto operativo, no como decision RBAC.

## Pendientes y riesgos

| Riesgo | Estado |
| --- | --- |
| Auditoria de bitacora sigue visible en detalle si la pagina carga. | Pendiente parcial; backend mantiene proteccion por `daily-logs:read`. |
| CTA secundario de empty state de bitacoras puede seguir visible en un caso puntual. | Pendiente menor; backend sigue bloqueando si no hay permiso. |
| No hay matriz cliente final activa. | Intencional. |
| Fallback abierto puede mostrar acciones si falla carga de permisos. | Intencional para no bloquear flujo durante transicion. |
| No hay frontend test suite dedicada. | Se validara con builds y, si aplica, e2e existente. |

## Validaciones ejecutadas

Ejecutadas correctamente:

- `npm.cmd run web:build` - OK
- `npm.cmd run api:build` - OK

No se detecto una suite frontend dedicada en `package.json`. Las pruebas e2e existentes son backend/API smoke y RBAC guard; no se ejecuto una prueba frontend adicional en esta fase.

## Confirmacion

RBAC v2 final NO quedo activado.

- No se cambiaron guards.
- No se cambio workflow.
- No se eliminaron permisos legacy.
- No se activo matriz cliente final.
- No se modifico autorizacion backend.
- No se bloqueo frontend con enforcement final.
