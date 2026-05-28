# FASE 61.1 - Backend listado y detalle de usuarios

## Objetivo

Crear/endurecer endpoints backend de solo lectura para administracion de usuarios.

## Endpoints

- `GET /api/v1/users`
- `GET /api/v1/users/:id`

## Archivos modificados

- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/users/users.module.ts`

## Archivos creados

- `apps/api/src/users/dto/user-read-response.dto.ts`
- `FASE_61_1_USERS_READ_BACKEND.md`

## Seguridad

- Los endpoints de lectura usan `JwtAuthGuard` y `PermissionsGuard`.
- Permisos requeridos:
  - `users:read`
  - o equivalente existente `organizations:read`
- No se expone:
  - `passwordHash`
  - tokens
  - secretos
  - rutas internas de firma
  - hashes de firma
  - base64/data URLs

## Alcance por proyecto/organizacion

El modelo actual asocia usuarios a proyectos mediante `ProjectUser`.

La lectura usa `ProjectAccessPolicy.getAccessibleProjectIds()`:

- Si el usuario tiene acceso de plataforma, puede listar todos los usuarios.
- Si el usuario tiene acceso limitado, solo ve usuarios con asignaciones activas en proyectos accesibles.
- El detalle `GET /users/:id` respeta el mismo alcance.

## Respuesta segura

Cada usuario retorna:

- `id`
- `name`
- `fullName`
- `email`
- `status`
- `isActive`
- `roles`
- `organization`
- `organizations`
- `projects`
- `createdAt`
- `updatedAt`

## Paginacion y busqueda

`GET /users` soporta:

- `page`
- `limit`
- `search`
- `status`
- `email`
- `fullName`
- `documentNumber`

Orden:

- `createdAt desc`

Limite maximo:

- `100`

## Eficiencia

- Se usan `select` e includes controlados.
- Se evita exponer campos internos.
- Se evita N+1 cargando roles, proyectos y organizaciones desde `projectAssignments` en la consulta principal.

## Swagger

Se agregaron DTOs y decoradores para:

- respuesta paginada de usuarios
- detalle de usuario
- query params
- respuestas 401/403

## Validacion

Comando ejecutado:

```powershell
npm.cmd run api:build
```

Resultado:

- OK. Build finalizado correctamente.

## Notas

- No se modifico Prisma.
- No se crearon migraciones.
- No se modifico seed de permisos; se acepto `organizations:read` como permiso equivalente existente para esta fase.
