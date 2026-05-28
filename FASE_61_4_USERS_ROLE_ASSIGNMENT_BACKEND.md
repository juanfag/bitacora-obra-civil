# FASE 61.4 - Backend asignacion de roles a usuarios

## Objetivo

Permitir asignar y remover roles de usuarios desde backend con control estricto de permisos, alcance por proyecto y auditoria.

## Endpoint implementado

`PATCH /api/v1/users/:id/roles`

Payload:

```json
{
  "assignments": [
    {
      "projectId": "uuid-del-proyecto",
      "roleId": "uuid-del-rol"
    }
  ]
}
```

La operacion reemplaza las asignaciones activas del usuario dentro del alcance de proyectos administrable por el usuario autenticado.

## Archivos modificados

- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`

## Archivos creados

- `apps/api/src/users/dto/assign-user-roles.dto.ts`
- `FASE_61_4_USERS_ROLE_ASSIGNMENT_BACKEND.md`

## Seguridad

- Usa `JwtAuthGuard`.
- Usa `PermissionsGuard`.
- Permisos aceptados:
  - `users:manage`
  - equivalente administrativo existente `organizations:update`
  - equivalente administrativo existente `organizations:create`

## Reglas implementadas

- Valida que el usuario objetivo exista.
- Valida que todos los proyectos enviados existan.
- Valida que el usuario autenticado tenga acceso a los proyectos enviados.
- Valida que los roles enviados existan y esten activos.
- Evita duplicados en `assignments`.
- No permite asignar roles con permisos superiores a los permisos del actor.
- No permite que un usuario se quite a si mismo su ultimo rol administrativo.
- No modifica asignaciones fuera del alcance de proyectos del actor.
- Si el actor no tiene acceso global, una asignacion vacia solo puede remover roles visibles existentes.

## Auditoria

Se registra auditoria `UPDATE` sobre entidad `User` con:

- roles anteriores visibles
- roles nuevos visibles
- `actorId`
- IP/user-agent si vienen desde `AuditContext`

La auditoria no incluye:

- `passwordHash`
- tokens
- secretos
- rutas internas
- base64
- hashes completos

## Respuesta

Retorna el usuario sanitizado usando el mismo DTO seguro de lectura:

- `id`
- `name`
- `email`
- `status`
- `isActive`
- `roles`
- `organization`
- `organizations`
- `projects`
- `createdAt`
- `updatedAt`

## Validacion

Comando ejecutado:

```powershell
npm.cmd run api:build
```

Resultado:

- OK. Build finalizado correctamente.

## Restricciones cumplidas

- No se modifico Prisma.
- No se crearon migraciones.
- No se expone informacion sensible.
