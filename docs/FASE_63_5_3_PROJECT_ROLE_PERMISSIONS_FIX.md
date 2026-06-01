# FASE 63.5.3 - Fix permisos funcionales de roles por proyecto

## Objetivo

Garantizar que los roles funcionales asignados por proyecto otorguen los permisos mínimos necesarios para operar dentro del alcance asignado, sin abrir acceso global accidentalmente.

## Causa raíz

`GET /api/v1/projects` requiere el permiso funcional:

```text
projects:read
```

El alcance de proyecto estaba correcto, pero en la base real los roles `PROJECT_ADMIN` y `AUDITOR` existían activos con cero permisos. Por eso usuarios con proyectos asignados y roles activos recibían:

```text
403 Insufficient permissions
```

El problema no era `ProjectAccessPolicy`; era la relación `Role -> Permission`.

## Revisión realizada

### Endpoint

`apps/api/src/projects/projects.controller.ts`

- `GET /projects` usa `JwtAuthGuard`.
- Usa `PermissionsGuard`.
- Requiere `@Permissions("projects:read")`.
- El servicio filtra por proyectos accesibles usando `ProjectAccessPolicy`.

### Guard

`PermissionsGuard` obtiene permisos desde asignaciones `ProjectUser` activas y roles activos. Si un rol activo no tiene permisos asociados, el usuario tiene alcance pero no permiso funcional.

### Roles encontrados en DB

Antes del fix:

- `PROJECT_ADMIN`: sin permisos.
- `AUDITOR`: sin permisos.
- `VIEWER`: ya tenía `projects:read` y permisos de lectura.

## Cambios implementados

### Seed RBAC

Archivo:

- `prisma/seed.ts`

Se agregaron roles base:

- `PROJECT_ADMIN`
- `AUDITOR`

Se agregó permiso:

- `audit:read`

Se asignaron permisos mínimos:

#### PROJECT_ADMIN

- `organizations:read`
- `projects:read`
- `daily-logs:create`
- `daily-logs:read`
- `events:create`
- `events:read`
- `daily-log-events:create`
- `daily-log-events:read`
- `event-types:read`
- `attachments:create`
- `attachments:read`
- `documents:create`
- `documents:read`

#### AUDITOR

- `organizations:read`
- `projects:read`
- `daily-logs:read`
- `events:read`
- `daily-log-events:read`
- `event-types:read`
- `attachments:read`
- `documents:read`
- `audit:read`

#### VIEWER

Se mantuvo con permisos de lectura existentes, incluyendo:

- `projects:read`
- `daily-logs:read`

> Nota: el código actual usa permisos con guion, por ejemplo `daily-logs:read`, no `dailylogs:read`.

### SUPER_ADMIN bootstrap

Archivo:

- `scripts/bootstrap-superadmin.ts`

Se agregó `audit:read` al catálogo de permisos asegurado por el bootstrap.

## Sincronización local

Se ejecutó:

```text
npx.cmd prisma db seed
```

Esto actualizó catálogos y relaciones `RolePermission` sin crear migraciones ni cambiar schema.

## Validaciones realizadas

### Permisos por rol

Confirmado en DB:

- `PROJECT_ADMIN` ahora tiene `projects:read`, creación/lectura de bitácoras, eventos y documentos.
- `AUDITOR` ahora tiene `projects:read`, lectura de bitácoras, auditoría y documentos.
- `VIEWER` conserva permisos mínimos de lectura.

### Login y proyectos de Juan

Usuario:

```text
juan.agudelo@bitacora.local
```

Resultado:

```text
POST /api/v1/auth/login -> 201
GET /api/v1/projects -> 200
```

Proyectos visibles para Juan:

- `PRY-000005 - Test 29052026`
- `PROY-DEMO-001 - Proyecto Demo Bitacora de Obra`

No se mostraron proyectos fuera de sus asignaciones activas.

### SUPER_ADMIN

Usuario:

```text
admin@bitacora.local
```

Resultado:

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

## Resultado

APROBADO.

Los roles funcionales por proyecto ahora otorgan permisos mínimos reales y el alcance sigue limitado por `ProjectAccessPolicy`.
