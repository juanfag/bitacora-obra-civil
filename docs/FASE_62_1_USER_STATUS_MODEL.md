# FASE 62.1 - Modelo de estado de usuarios

## Objetivo

Agregar administracion formal de estado de usuarios a nivel de modelo, dejando la base preparada para endpoints y UI posteriores.

## Cambios en Prisma

Se agrego el enum:

```prisma
enum UserStatus {
  ACTIVE
  INACTIVE
  BLOCKED
  PENDING_ACTIVATION

  @@map("user_status")
}
```

Se actualizaron campos del modelo `User`:

- `status UserStatus @default(ACTIVE)`
- `statusChangedAt DateTime?`
- `statusChangedById String?`
- `blockedReason String?`
- `tokenVersion Int @default(0)`

## Migracion creada

Archivo:

`prisma/migrations/20260527000000_add_user_status_model/migration.sql`

La migracion:

- Crea el tipo PostgreSQL `user_status`.
- Convierte `users.status` desde `record_status` hacia `user_status`.
- Mapea cualquier valor historico `DELETED` a `INACTIVE`.
- Agrega columnas de trazabilidad de estado y version de token.

## Backend actualizado

Archivos ajustados:

- `apps/api/src/users/dto/create-user.dto.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/auth/auth.service.ts`

Cambios:

- DTOs y filtros de usuarios usan `UserStatus`.
- Login valida `UserStatus.ACTIVE`.
- Soft delete de usuario sigue dejando al usuario como `INACTIVE`, ahora usando `UserStatus`.
- No se cambiaron endpoints ni logica de roles/RBAC.

## Seed

No fue necesario cambiar `prisma/seed.ts`.

Los usuarios seed no establecen `status` manualmente, por lo que quedan con el default `ACTIVE`.

## Validaciones ejecutadas

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
```

Resultados:

- `prisma validate` OK
- `prisma generate` OK
- `api:build` OK

## Estado de migrate dev

Se ejecuto:

```powershell
npx.cmd prisma migrate dev --name add-user-status-model
```

Resultado:

Prisma bloqueo la ejecucion porque detecto que una migracion aplicada previamente fue modificada:

```text
The migration `20260522153654_attachment_metadata_standardization` was modified after it was applied.
We need to reset the "public" schema at "localhost:5432"
```

No se ejecuto reset de base de datos para evitar perdida de datos locales. La migracion de esta fase quedo creada en el repositorio y el cliente Prisma fue regenerado para validar compilacion.

## Restricciones respetadas

- No se modifico frontend.
- No se implementaron endpoints nuevos.
- No se cambio la logica de roles/RBAC.
- No se reseteo la base de datos.
