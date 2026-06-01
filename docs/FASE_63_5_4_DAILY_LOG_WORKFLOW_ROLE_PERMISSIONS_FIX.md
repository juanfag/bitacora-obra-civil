# FASE 63.5.4 - Fix permisos workflow de bitácora por rol de proyecto

## Objetivo

Corregir los permisos mínimos de roles por proyecto para que las transiciones de workflow de bitácora funcionen según el rol asignado, manteniendo siempre el alcance limitado por `ProjectAccessPolicy`.

## Diagnóstico

El usuario podía leer bitácoras y descargar PDF porque tenía permisos de lectura:

- `projects:read`
- `daily-logs:read`

Pero al ejecutar acciones de workflow recibía:

```text
Insufficient permissions.
```

La revisión confirmó que el problema era funcional, no de alcance: el usuario tenía proyectos asignados, pero su rol no tenía los permisos que exigen los endpoints de workflow.

## Permisos reales del proyecto

El backend usa permisos con guion:

- `daily-logs:read`
- `daily-logs:create`
- `daily-logs:update`
- `daily-logs:delete`

No existen actualmente permisos granulares como:

- `dailylogs:submit`
- `dailylogs:approve`
- `dailylogs:close`
- `dailylogs:void`
- `daily-logs:submit`
- `daily-logs:approve`
- `daily-logs:close`

## Endpoints revisados

Archivo:

- `apps/api/src/daily-logs/daily-logs.controller.ts`

Mapeo actual:

| Acción | Endpoint | Permiso requerido |
| --- | --- | --- |
| Listar/ver bitácoras | `GET /daily-logs`, `GET /daily-logs/:id` | `daily-logs:read` |
| Descargar PDF | `GET /daily-logs/:id/pdf` | `daily-logs:read` |
| Crear bitácora | `POST /daily-logs` | `daily-logs:create` |
| Editar bitácora | `PATCH /daily-logs/:id` | `daily-logs:update` |
| Enviar a revisión | `POST /daily-logs/:id/submit` | `daily-logs:update` |
| Enviar a revisión legacy | `POST /daily-logs/:id/submit-review` | `daily-logs:update` |
| Aprobar | `POST /daily-logs/:id/approve` | `daily-logs:update` |
| Rechazar | `POST /daily-logs/:id/reject` | `daily-logs:update` |
| Cerrar | `POST /daily-logs/:id/close` | `daily-logs:update` |
| Retornar a borrador | `POST /daily-logs/:id/return-to-draft` | `daily-logs:update` |
| Cancelar/anular | `POST /daily-logs/:id/cancel` | `daily-logs:delete` |
| Cancelación legacy | `DELETE /daily-logs/:id` | `daily-logs:delete` |

Los endpoints de workflow que modifican estado también usan `DailyLogProjectAccessGuard`, por lo que el permiso funcional no abre acceso global.

## Cambios implementados

Archivo:

- `prisma/seed.ts`

Se reforzó el rol `PROJECT_ADMIN` con permisos funcionales de workflow y operación del proyecto:

- `projects:read`
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
- `attachments:create`
- `attachments:read`
- `documents:create`
- `documents:read`
- `documents:update`
- `documents:delete`
- `audit:read`

Se mantuvo `AUDITOR` como rol de lectura/auditoría:

- `projects:read`
- `daily-logs:read`
- `events:read`
- `daily-log-events:read`
- `attachments:read`
- `documents:read`
- `audit:read`

Se mantuvo `VIEWER` como rol de lectura básica:

- `projects:read`
- `daily-logs:read`
- `events:read`
- `daily-log-events:read`
- `attachments:read`
- `documents:read`

## Sincronización local

Se ejecutó:

```text
npx.cmd prisma db seed
```

Esto actualizó las relaciones `RolePermission` existentes sin cambiar Prisma schema ni crear migraciones.

## Validaciones ejecutadas

### Matriz RBAC en DB

Se confirmó que:

- `PROJECT_ADMIN` tiene `daily-logs:update` y `daily-logs:delete`.
- `AUDITOR` no tiene `daily-logs:update` ni `daily-logs:delete`.
- `VIEWER` no tiene permisos de modificación de workflow.
- `SUPER_ADMIN` conserva permisos globales.

### Login y alcance de Juan

Usuario:

```text
juan.agudelo@bitacora.local
```

Resultados:

```text
POST /api/v1/auth/login -> 201
GET /api/v1/projects -> 200
```

Proyectos visibles:

- `PRY-000005`
- `PROY-DEMO-001`

No se mostraron proyectos externos.

### Probes de permiso workflow

Con token de Juan:

```text
POST /api/v1/daily-logs/00000000-0000-0000-0000-000000000000/submit -> 404 Daily log not found
POST /api/v1/daily-logs/00000000-0000-0000-0000-000000000000/close -> 404 Daily log not found
```

El resultado esperado para esta prueba es `404`, no `403 Insufficient permissions`, porque el guard de permisos ya permite la operación y la solicitud llega a validación de recurso.

### SUPER_ADMIN

Con `admin@bitacora.local`:

```text
GET /api/v1/projects -> 200
```

SUPER_ADMIN mantiene alcance global.

## Validaciones técnicas

```text
npm.cmd run api:build
npm.cmd run web:build
```

Ambos comandos finalizaron correctamente.

## Pendientes

Si se desea diferenciar permisos finos por transición, una fase posterior podría introducir permisos explícitos como:

- `daily-logs:submit`
- `daily-logs:approve`
- `daily-logs:reject`
- `daily-logs:close`
- `daily-logs:void`

En esta fase se respetó el contrato actual del backend.

## Resultado

APROBADO.

Los roles funcionales por proyecto ahora tienen permisos suficientes para operar el workflow según rol, sin abrir acceso global ni saltarse `ProjectAccessPolicy`.
