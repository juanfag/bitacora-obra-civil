# FASE 65.2 - Document DB Migration and Seed QA

## Resumen

Se activo en base de datos el modelo documental base definido en FASE 65.1 y se agrego seed idempotente para el catalogo inicial de categorias documentales.

No se crearon endpoints, no se modifico frontend, no se modificaron guards RBAC, no se cambio workflow `DailyLog`, no se cambiaron permisos efectivos y no se insertaron documentos reales.

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `prisma/schema.prisma` | Modelo documental base: enums, `DocumentCategory`, `DocumentVersion`, `DocumentRelation`, campos adicionales en `Document`. |
| `prisma/seed.ts` | Seed idempotente de categorias documentales por organizacion. |
| `prisma/migrations/20260602000300_document_management_base/migration.sql` | Migracion Prisma aditiva para activar el modelo documental base. |

## Migracion Prisma

Migracion creada:

```text
prisma/migrations/20260602000300_document_management_base/migration.sql
```

Incluye:

- enum `document_visibility`
- enum `document_relation_type`
- ampliacion de enum `document_status`
- columnas nuevas en `documents`
- tabla `document_categories`
- tabla `document_versions`
- tabla `document_relations`
- indices y foreign keys documentales

Nota operativa:

- `npx.cmd prisma migrate dev --name document_management_base` fue ejecutado, pero Prisma 7 lo bloqueo por entorno no interactivo.
- Para completar la fase en esta sesion, se genero el SQL con `prisma migrate diff` y se aplico con `npx.cmd prisma migrate deploy`.
- `npx.cmd prisma migrate status` confirma: `Database schema is up to date!`.

## Catalogo documental sembrado

Categorias base:

- `PLANOS`
- `CONTRATOS`
- `ACTAS`
- `SOLICITUDES_SUSPENSION`
- `INFORMES_TECNICOS`
- `LICENCIAS`
- `DENUNCIAS`
- `DEMANDAS`
- `EVIDENCIAS_FOTOGRAFICAS`
- `PDF_OFICIAL`
- `OTROS`

Estrategia:

- Se siembran como categorias organizacionales (`projectId = null`).
- Se crean por cada organizacion existente.
- El seed usa busqueda por `organizationId + projectId null + code`.
- Si existe, actualiza nombre/status.
- Si no existe, crea la categoria.

Resultado validado en base local:

| Organizacion | Categorias |
| --- | --- |
| Constructora Demo S.A.S | 11 |
| Constructora Demo SA | 11 |
| Constructora Demo | 11 |
| Organizacion Demo | 11 |

Idempotencia:

- Se ejecuto `npx.cmd prisma db seed` dos veces.
- El conteo se mantuvo en 11 categorias por organizacion.

## Validaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `npx.cmd prisma validate` | OK |
| `npx.cmd prisma migrate dev --name document_management_base` | Bloqueado por entorno no interactivo antes de aplicar cambios |
| `npx.cmd prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output prisma/migrations/20260602000300_document_management_base/migration.sql` | OK |
| `npx.cmd prisma migrate deploy` | OK |
| `npx.cmd prisma generate` | OK |
| `npx.cmd prisma db seed` | OK |
| `npx.cmd prisma migrate status` | OK |
| `npm.cmd run api:build` | OK |
| `npm.cmd run web:build` | OK |

## Confirmaciones de restricciones

- No se crearon endpoints.
- No se modifico frontend.
- No se modificaron guards RBAC.
- No se modifico workflow `DailyLog`.
- No se cambiaron permisos efectivos.
- No se insertaron documentos reales.
- No se almacenaron binarios en PostgreSQL.

## Observaciones

- `DocumentCategory` es scoped por organizacion; por eso el catalogo aparece repetido por organizacion. Esto es esperado y permite personalizar nombres/categorias por tenant en fases futuras.
- La unicidad `organizationId + projectId + code` en PostgreSQL no impide multiples filas con `projectId = null`; el seed evita duplicados mediante busqueda previa. Si se requiere enforcement estricto para categorias organizacionales, se recomienda una estrategia futura con indice parcial SQL o `scopeType`.
- La migracion agrega indices unicos sobre campos opcionales de `documents` (`current_version_id`, `project_id + code`). Con datos actuales nulos no generaron conflicto.

## Riesgos

| Riesgo | Mitigacion |
| --- | --- |
| `migrate dev` no ejecutable en entorno no interactivo. | Se uso `migrate diff` + `migrate deploy`; documentado en fase. |
| Unicidad con `projectId = null` no garantiza por si sola idempotencia DB-level. | Seed idempotente por consulta; evaluar indice parcial futuro. |
| Estados documentales nuevos no tienen workflow funcional. | No se activaron endpoints ni reglas productivas. |
| `DocumentVersion` existe en DB, pero documentos actuales aun no tienen version 1 migrada. | Backfill queda para fase futura. |

## Resultado

FASE 65.2 completada. El modelo documental base quedo migrado y aplicado en base local, Prisma Client fue regenerado y el catalogo documental base quedo sembrado de forma idempotente por organizacion.
