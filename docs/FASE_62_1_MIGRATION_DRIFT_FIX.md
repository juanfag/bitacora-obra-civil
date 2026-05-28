# FASE 62.1 - Correccion de drift/checksum de migraciones

## Objetivo

Resolver el bloqueo de Prisma Migrate causado por checksum modificado en una migracion previamente aplicada, sin ejecutar reset, sin borrar migraciones y sin perder datos.

## Causa raiz

`npx.cmd prisma migrate dev` reporto que la migracion aplicada:

`20260522153654_attachment_metadata_standardization`

habia sido modificada despues de aplicarse.

Diagnostico realizado:

- `git diff` no mostro diferencias contra Git para el archivo `migration.sql`.
- `git show HEAD:.../migration.sql` mostro el mismo contenido funcional que el archivo actual.
- La tabla `_prisma_migrations` tenia checksum almacenado:

```text
f9bc51da64f50b85390207003403cb7f190fa32861c49419f91ee39493c20bfa
```

- El checksum SHA256 del archivo actual era:

```text
5586bf3c69c7c1fe1d73400ccb7c894ffc54199ef76c748d5a44debb7d3b1d54
```

La base de datos ya contenia los cambios esperados de esa migracion:

- columnas de metadata en `attachments`
- defaults removidos en `daily_log_events.id`
- defaults removidos en `daily_log_status_history.id`

Conclusion: el drift era de checksum/archivo historico, no de estructura real de base de datos. La causa mas probable es que el archivo fue normalizado o modificado despues de haberse aplicado originalmente.

## Decision tomada

No se ejecuto `prisma migrate reset`.

No se borraron migraciones.

No se alteraron datos de negocio.

Como el contenido actual de la migracion coincide con el estado real de la base y no habia una version historica recuperable desde Git que coincidiera con el checksum aplicado, se sincronizo el checksum de `_prisma_migrations` con el archivo actual verificado.

## Comandos ejecutados

```powershell
npx.cmd prisma migrate status
git diff -- prisma/migrations/20260522153654_attachment_metadata_standardization/migration.sql
Get-Content prisma/migrations/20260522153654_attachment_metadata_standardization/migration.sql
```

Se consulto `_prisma_migrations` y se verifico la estructura real con consultas de solo lectura.

Luego se actualizo solo metadata de Prisma:

```sql
UPDATE _prisma_migrations
SET checksum = '<checksum-del-archivo-actual>'
WHERE migration_name = '20260522153654_attachment_metadata_standardization';
```

Despues se ejecuto:

```powershell
npx.cmd prisma migrate dev
```

Resultado:

```text
Applying migration `20260527000000_add_user_status_model`
Your database is now in sync with your schema.
```

## Migracion aplicada

Se aplico correctamente:

`20260527000000_add_user_status_model`

Esta migracion corresponde al modelo de estado de usuarios de FASE 62.1.

## Estado final de migraciones

Comando:

```powershell
npx.cmd prisma migrate status
```

Resultado:

```text
Database schema is up to date!
```

## Validaciones finales

Comandos ejecutados:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
```

Resultados:

- `prisma validate` OK
- `prisma generate` OK
- `api:build` OK

## Confirmacion explicita

- No se ejecuto `prisma migrate reset`.
- No se borro ninguna migracion.
- No se perdieron datos.
- La migracion `add_user_status_model` quedo aplicada.
- La base de datos quedo sincronizada con Prisma Migrate.
