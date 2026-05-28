# FASE 62.2 - Endpoints administrativos para cambio de estado de usuarios

## Objetivo

Permitir a usuarios autorizados cambiar el estado de otros usuarios de forma auditada y segura.

## Endpoint implementado

```http
PATCH /api/v1/users/:id/status
```

Guards:

- `JwtAuthGuard`
- `PermissionsGuard`

Permisos aceptados:

- `users:update`
- `users:manage`
- `organizations:update`
- `organizations:create`

Se conserva compatibilidad con permisos administrativos existentes mientras se formaliza `users:update` en el catalogo RBAC.

## DTO

Archivo:

`apps/api/src/users/dto/update-user-status.dto.ts`

Campos:

- `status`: requerido, enum `UserStatus`
- `reason`: opcional, string, maximo 500 caracteres

## Reglas implementadas

- El usuario objetivo debe existir.
- El actor debe estar autenticado y tener permisos administrativos.
- El actor no puede cambiar su propio estado.
- Si el nuevo estado no es `ACTIVE`, se valida que no sea el ultimo `SUPER_ADMIN` activo.
- Si el nuevo estado no es `ACTIVE`, se valida que no sea el ultimo administrador activo de una organizacion segun el modelo actual de proyectos, roles y permisos administrativos.
- La asignacion respeta el alcance de proyectos accesibles mediante `ProjectAccessPolicy`.

## Actualizacion de estado

Al cambiar el estado se actualizan:

- `status`
- `statusChangedAt`
- `statusChangedById`
- `blockedReason`, solo cuando `status = BLOCKED`
- `tokenVersion`, incrementado en 1 para revocar tokens previos

Si el estado nuevo es distinto de `BLOCKED`, `blockedReason` se limpia.

## Invalidacion de tokens

Se actualizo autenticacion para que el JWT incluya `tokenVersion` y `JwtStrategy` valide:

- que el usuario exista
- que el usuario siga `ACTIVE`
- que `payload.tokenVersion` coincida con `user.tokenVersion`

Esto hace efectiva la invalidacion de tokens al cambiar estado.

## Auditoria

Se registra auditoria `UPDATE` sobre entidad `User`.

Payload auditado:

- estado anterior
- razon de bloqueo anterior
- estado nuevo
- razon de bloqueo nueva
- fecha/cambiador de estado
- version de token

No se auditan password, hashes, tokens, base64, rutas internas ni datos sensibles.

## Respuesta

El endpoint devuelve `UserReadDto`, la misma respuesta sanitizada usada por el detalle de usuarios.

No expone:

- `passwordHash`
- tokens
- secretos
- rutas internas
- hashes completos

## Archivos modificados

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/decorators/current-user.decorator.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/users/dto/update-user-status.dto.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `docs/FASE_62_2_USER_STATUS_ENDPOINTS.md`

## Validacion

Comando ejecutado:

```powershell
npm.cmd run api:build
```

Resultado:

```text
api:build OK
```

## Nota operativa

Este endpoint depende de los campos de FASE 62.1 (`UserStatus`, `statusChangedAt`, `statusChangedById`, `blockedReason`, `tokenVersion`). Debe aplicarse la migracion de FASE 62.1 antes de probarlo contra una base de datos real.
