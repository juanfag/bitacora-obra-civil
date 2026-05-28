# FASE 62.2 - Endpoint administrativo para cambio de estado de usuarios

## Objetivo

Crear un endpoint administrativo para cambiar el estado de usuarios de forma segura, sin modificar frontend, sin implementar auditoria todavia y sin implementar invalidacion completa de JWT en guards.

## Endpoint

```http
PATCH /api/v1/users/:id/status
```

Body:

```json
{
  "status": "INACTIVE",
  "reason": "Usuario retirado del proyecto"
}
```

## DTO

Archivo:

`apps/api/src/users/dto/update-user-status.dto.ts`

Campos:

- `status`: requerido, enum `UserStatus`
- `reason`: opcional, string, maximo 500 caracteres

## Seguridad

El endpoint usa:

- `JwtAuthGuard`
- `PermissionsGuard`

Permisos aceptados:

- `users:update`
- `users:manage`
- `organizations:update`
- `organizations:create`

Se usa `users:update` como permiso formal y se mantienen equivalentes administrativos existentes para compatibilidad con el RBAC actual.

## Validaciones implementadas

- El usuario objetivo debe existir.
- El actor autenticado debe existir.
- El actor no puede cambiar su propio estado.
- Si el usuario pasa desde `ACTIVE` hacia un estado no activo, no se permite bloquear/inactivar el ultimo `SUPER_ADMIN` activo.
- Si el usuario pasa desde `ACTIVE` hacia un estado no activo, no se permite bloquear/inactivar el ultimo administrador activo de una organizacion segun el modelo actual.
- Se respeta el alcance de proyectos accesibles mediante `ProjectAccessPolicy`.

## Manejo idempotente

Si el estado actual del usuario ya es igual al estado solicitado:

- Responde `200 OK`.
- No modifica `statusChangedAt`.
- No modifica `statusChangedById`.
- No modifica `blockedReason`.
- No incrementa `tokenVersion`.
- No ejecuta cambios destructivos.

## Cambio real de estado

Cuando el estado cambia:

- Actualiza `status`.
- Actualiza `statusChangedAt` con la fecha/hora actual.
- Actualiza `statusChangedById` con el actor autenticado.
- Si el nuevo estado es `BLOCKED`, guarda `blockedReason = reason`.
- Si el nuevo estado no es `BLOCKED`, limpia `blockedReason`.
- Incrementa `tokenVersion` en 1.

## Respuesta

Devuelve `UserReadDto` sanitizado.

Incluye:

- `status`
- `tokenVersion`
- datos visibles de usuario, roles y proyectos

No expone:

- `passwordHash`
- tokens
- secretos
- hashes
- rutas internas

## Swagger

El endpoint documenta:

- body
- `200 OK`
- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`

## Exclusiones de esta fase

- No se modifico frontend.
- No se implemento auditoria para cambio de estado. Queda para FASE 62.4.
- No se implemento invalidacion completa de JWT/tokenVersion en guards. Queda para FASE 62.3.

## Archivos modificados

- `apps/api/src/users/dto/update-user-status.dto.ts`
- `apps/api/src/users/dto/user-read-response.dto.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `docs/FASE_62_2_USER_STATUS_ENDPOINTS.md`

## Validaciones

Comandos requeridos:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
```

Resultado final: OK.
