# FASE 62.13 - Regression Security & Scope Hardening

## Objetivo

Ejecutar una regresión técnica de seguridad, RBAC y alcance multi-proyecto para confirmar que endpoints críticos respetan autenticación, permisos y `ProjectAccessPolicy`.

## Alcance

Se revisaron y validaron endpoints de:

- `auth`
- `users`
- `roles`
- `projects`
- `organizations`
- `daily-logs`
- `events`
- `daily-log-events`
- `attachments`
- `dashboard`
- auditoría de bitácora
- PDF de bitácora
- firmas
- verificación pública QR
- helpers/listados auxiliares existentes

## Ambiente y datos de prueba

- API local: `http://127.0.0.1:3001/api/v1`
- Usuario admin: `admin@bitacora.local`
- Usuario temporal limitado: `qa62.13.viewer@bitacora.local`
- Proyecto asignado al usuario temporal: `PROY-DEMO-001`
- Proyecto no asignado usado para acceso directo: `PRY-000004`
- Rol usado para usuario limitado: `VIEWER`
- Bitácora usada para PDF/auditoría/firmas: `fa079126-6fd3-46e0-ac06-bd263715c27a`

El usuario temporal fue creado directamente en BD para QA, asignado a `PROY-DEMO-001` y eliminado al finalizar.

## Endpoints revisados

| Área | Endpoints |
| --- | --- |
| Auth | `POST /auth/login` |
| Users | `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`, `PATCH /users/:id/roles`, `POST /users/:id/invalidate-sessions` |
| Roles | `GET /roles/assignable` |
| Projects | `GET /projects`, `GET /projects/:id` |
| Organizations | `GET /organizations`, `GET /organizations/:id` |
| Daily logs | `GET /daily-logs`, `GET /daily-logs/:id`, `GET /projects/:projectId/daily-logs`, workflow actions, PDF, audit, signatures |
| Events | `GET /events`, `GET /events/:id`, `GET /daily-logs/:dailyLogId/events` |
| DailyLogEvents | `GET /daily-log-events`, `GET /daily-log-events/:id`, create/update/delete |
| Attachments | upload, metadata, download, delete; revisión estática confirma uso de `ProjectAccessPolicy` |
| Dashboard | `GET /dashboard/metrics`, `GET /dashboard/recent-activity` |
| Public verify | `GET /public/daily-logs/:id/verification?code=...` |

## Matriz de casos

| Caso | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- |
| Sin token en `/users` | 401 | 401 | OK |
| Token inválido en `/users` | 401 | 401 | OK |
| Sin token en `/roles/assignable` | 401 | 401 | OK |
| Token inválido en `/roles/assignable` | 401 | 401 | OK |
| Sin token en `/projects` | 401 | 401 | OK |
| Token inválido en `/projects` | 401 | 401 | OK |
| Sin token en `/organizations` | 401 | 401 | OK |
| Token inválido en `/organizations` | 401 | 401 | OK |
| Sin token en `/daily-logs` | 401 | 401 | OK |
| Token inválido en `/daily-logs` | 401 | 401 | OK |
| Sin token en `/events` | 401 | 401 | OK |
| Token inválido en `/events` | 401 | 401 | OK |
| Sin token en `/daily-log-events` | 401 | 401 | OK |
| Token inválido en `/daily-log-events` | 401 | 401 | OK |
| Sin token en `/dashboard/metrics` | 401 | 401 | OK |
| Token inválido en `/dashboard/metrics` | 401 | 401 | OK |
| Verificación pública QR sin login | 200 | 200 con código inválido controlado | OK |
| `VIEWER` lista usuarios | 403 | 403 | OK |
| `VIEWER` accede a roles asignables | 403 | 403 | OK |
| `VIEWER` asigna/remueve roles | 403 | 403 | OK |
| `VIEWER` invalida sesiones | 403 | 403 | OK |
| Sin token crea usuario | 401 | 401 | OK |
| Sin token actualiza usuario | 401 | 401 | OK |
| Sin token elimina usuario | 401 | 401 | OK |
| `VIEWER` accede por URL a proyecto no asignado | 404 | 404 | OK |
| `VIEWER` lista proyectos | Solo asignados | 1 proyecto: `PROY-DEMO-001` | OK |
| `VIEWER` lista organizaciones | Solo derivadas de proyectos accesibles | 1 organización: `Organizacion Demo` | OK |
| `VIEWER` lista bitácoras | Solo scope asignado | 2 bitácoras del proyecto asignado | OK |
| `VIEWER` lista eventos | Scope asignado | 200, filtrado por proyecto accesible | OK |
| `VIEWER` lista `daily-log-events` | Scope asignado | 2 eventos del proyecto asignado | OK |
| Dashboard como `VIEWER` | Scope asignado | `activeProjects=1` | OK |
| Auditoría de bitácora asignada como `VIEWER` | 200 | 200 | OK |
| PDF de bitácora asignada como `VIEWER` | 200 | 200 | OK |
| Firmas de bitácora asignada como `VIEWER` | 200 | 200 | OK |
| Remover roles del último `SUPER_ADMIN` | 409 | 409 | OK |
| Auditoría de usuario temporal sin cadenas sensibles | Sin `storagePath`, `uploads/`, `data:image`, `base64`, `checksumSha256` | Sin coincidencias | OK |

## Bugs encontrados

1. `POST /users`, `PATCH /users/:id` y `DELETE /users/:id` no tenían guards explícitos.
2. `GET /users` y `GET /users/:id` aceptaban `organizations:read`, permitiendo a `VIEWER` listar usuarios.
3. `daily-log-events` filtraba por permisos, pero no validaba `ProjectAccessPolicy`.
4. `organizations` listaba globalmente para cualquier rol con `organizations:read`, sin limitar por proyectos accesibles.

## Fixes aplicados

- Se protegieron `POST /users`, `PATCH /users/:id` y `DELETE /users/:id` con `JwtAuthGuard`, `PermissionsGuard` y permisos administrativos.
- Se ajustó `GET /users` y `GET /users/:id` para requerir `users:read` explícito.
- Se agregó `ProjectAccessPolicy` a `daily-log-events` para listados, lectura, creación, actualización y eliminación.
- Se agregó `ProjectAccessPolicy` a `organizations` para listar/ver solo organizaciones derivadas de proyectos accesibles, salvo usuarios con acceso global.

## No exposición de datos sensibles

Se validó que la auditoría consultada para el usuario temporal no contuviera:

- `storagePath`
- `uploads/`
- `data:image`
- `base64`
- `checksumSha256`

Resultado: sin coincidencias.

## Riesgos pendientes

- La prueba de adjuntos se cubrió por revisión estática de `AttachmentsService`, que ya valida acceso contextual por proyecto. No se generó un adjunto nuevo en esta regresión.
- La inspección binaria del PDF no se repitió en esta fase porque ya fue cubierta por fases documentales previas; sí se validó que la descarga autenticada responda 200 para bitácora asignada.
- `event-types` es catálogo global protegido por permisos; no aplica `ProjectAccessPolicy` porque no está modelado por proyecto.

## Validaciones técnicas

- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK

## Puertos/procesos

Durante la QA se levantó API temporal en `3001`.

Al finalizar debe quedar sin proceso `LISTENING` en `3001`. Pueden quedar conexiones transitorias `TIME_WAIT` o `FIN_WAIT` del cierre.

## Resultado final

**APROBADO CON OBSERVACIONES**

La regresión crítica de autenticación, RBAC y alcance multi-proyecto queda aprobada después de aplicar los fixes descritos. Los pendientes restantes son de evidencia adicional, no bloqueantes funcionales.
