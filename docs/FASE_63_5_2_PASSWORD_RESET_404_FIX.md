# FASE 63.5.2 - Password reset 404 fix

## Objetivo

Corregir y validar el flujo de reset de contraseña desde la UI administrativa para que use el `User.id` real del usuario objetivo y no muestre éxito cuando el backend responde error.

## Diagnóstico

Se revisó el flujo frontend en:

- `apps/web/src/app/users/page.tsx`
- `apps/web/src/app/users/[id]/page.tsx`
- `apps/web/src/lib/api-client.ts`

El listado de usuarios navega con `user.id` y el detalle ejecuta `resetUserPassword(user.id, payload)`. El cliente API llama correctamente:

```text
PATCH /users/:id/password
```

Se validó en base de datos que:

- `juan.agudelo@bitacora.local` existe.
- Su `User.id` real es `b0b5fbf6-ea64-4875-a439-67977893f292`.
- El ID no corresponde a `ProjectUser.id`, `Role.id` ni `Project.id`.

La respuesta 404 reproducida venía del proceso API viejo que estaba escuchando en `3001` sin la ruta `PATCH /api/v1/users/:id/password` cargada. Al validar contra el build actual, Nest mapeó correctamente:

```text
Mapped {/api/v1/users/:id/password, PATCH} route
```

Durante la validación apareció un bloqueo adicional: la base local tenía migraciones pendientes y el enum `audit_action` todavía no incluía `USER_PASSWORD_RESET`. Se aplicaron las migraciones pendientes de forma no destructiva con `npx.cmd prisma migrate dev`.

## Ajuste aplicado

Se mejoró el mensaje de error 404 en la UI de reset:

```text
No se encontró el usuario o no tienes alcance para modificarlo.
```

Esto evita mostrar un mensaje ambiguo cuando el usuario no existe o el backend oculta el recurso por alcance.

## Backend validado

El endpoint `PATCH /api/v1/users/:id/password`:

- Busca por `User.id`.
- Devuelve 404 real si el usuario no existe.
- Devuelve 403 si el usuario existe pero el actor no tiene alcance.
- Permite a `SUPER_ADMIN` operar con alcance global.
- Incrementa `tokenVersion`.
- Registra auditoría `USER_PASSWORD_RESET` sin contraseña, hash, base64, rutas internas ni payload sensible.

## Validaciones ejecutadas

### Base de datos

- `juan.agudelo@bitacora.local` encontrado con `User.id = b0b5fbf6-ea64-4875-a439-67977893f292`.
- El ID sospechoso no corresponde a relación de proyecto, rol ni proyecto.

### Endpoint

```text
PATCH /api/v1/users/b0b5fbf6-ea64-4875-a439-67977893f292/password
```

Payload:

```json
{
  "newPassword": "Password123!",
  "confirmPassword": "Password123!"
}
```

Resultado:

```text
200 OK
```

### Login

- Login con `juan.agudelo@bitacora.local` y `Password123!`: OK.
- Login con contraseña incorrecta: 401.

### Auditoría

Último evento:

```text
USER_PASSWORD_RESET
```

Payload seguro:

```json
{
  "oldValue": {
    "tokenVersion": 2
  },
  "newValue": {
    "resetById": "a287d76b-a684-4e67-862d-b5113a324009",
    "tokenVersion": 3,
    "sessionsInvalidated": true
  }
}
```

No contiene contraseña, `passwordHash`, hash, base64, `data:image`, `storagePath` ni `uploads/`.

## Comandos ejecutados

```text
npm.cmd run api:build
npx.cmd prisma migrate status
npx.cmd prisma migrate dev
npm.cmd run web:build
```

## Resultado

APROBADO.

El reset de contraseña funciona con el `User.id` real, el backend actual responde 200, el nuevo password permite login, un password incorrecto falla y la auditoría queda registrada sin datos sensibles.
