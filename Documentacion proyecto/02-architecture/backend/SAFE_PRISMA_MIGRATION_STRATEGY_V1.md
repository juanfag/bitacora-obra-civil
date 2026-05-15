# SAFE_PRISMA_MIGRATION_STRATEGY_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\SAFE_PRISMA_MIGRATION_STRATEGY_V1.md
```

---

# 1. Objetivo

Definir una estrategia segura para modificar Prisma y ejecutar migraciones sin romper el backend existente, la base de datos local, los datos demo ni los endpoints ya validados.

Este documento debe usarse antes de cualquier cambio en:

```text
backend/prisma/schema.prisma
```

---

# 2. Principio principal

```text
Nunca reemplazar schema.prisma a ciegas.
```

El archivo `PRISMA_SCHEMA_V1.prisma` es una referencia arquitectónica, no debe copiarse directamente sobre el schema actual sin comparar.

---

# 3. Estado actual protegido

Ya existe backend funcional con:

- Prisma operativo.
- PostgreSQL operativo.
- Seed corregido.
- Usuario admin demo.
- Roles existentes.
- DailyLog existente.
- DailyLogEvent existente.
- Attachments module validado.
- Swagger funcionando.
- Login funcionando.

Por eso, cualquier cambio en Prisma debe ser incremental y controlado.

---

# 4. Qué NO hacer

No hacer:

```text
Borrar migraciones existentes.
Resetear la base de datos sin necesidad.
Copiar PRISMA_SCHEMA_V1.prisma completo sobre schema.prisma.
Ejecutar prisma migrate reset sin respaldo.
Cambiar nombres de tablas existentes sin revisar impacto.
Eliminar columnas usadas por endpoints actuales.
```

---

# 5. Estrategia correcta

El flujo seguro es:

```text
1. Revisar schema actual
2. Comparar contra PRISMA_SCHEMA_V1.prisma
3. Identificar brechas
4. Aplicar cambios mínimos
5. Ejecutar prisma format
6. Ejecutar prisma generate
7. Crear migración
8. Probar backend
9. Probar Swagger
10. Probar login
11. Probar DailyLog
```

---

# 6. Comandos de revisión inicial

Desde la raíz del backend:

```bash
npx prisma validate
npx prisma format
npx prisma generate
npx prisma migrate status
npm run build
```

---

# 7. Antes de migrar

## Checklist

| Validación | OK |
|---|---|
| Backend levanta |  |
| Swagger carga |  |
| Login funciona |  |
| Health endpoint funciona |  |
| DailyLog actual funciona |  |
| DailyLogEvent actual funciona |  |
| Seed actual conocido |  |
| Cambios Prisma revisados |  |

---

# 8. Respaldo recomendado

Antes de migraciones importantes, respaldar la DB local.

## Opción PostgreSQL

```bash
pg_dump -U postgres -d bitacora_db > backup_bitacora_before_workflow.sql
```

Ajustar usuario/base según tu configuración local.

---

# 9. Cambios Prisma aceptables en esta etapa

Para implementar workflow, los cambios más probables son:

| Cambio | Riesgo |
|---|---|
| Agregar WorkflowTransition | Bajo |
| Agregar AuditLog | Bajo |
| Agregar índices | Bajo |
| Agregar campos opcionales | Medio |
| Cambiar enums existentes | Medio/Alto |
| Renombrar tablas | Alto |
| Renombrar columnas | Alto |
| Eliminar columnas | Alto |

---

# 10. Regla para cambios seguros

Preferir cambios aditivos:

```text
Agregar tabla.
Agregar columna opcional.
Agregar índice.
Agregar relación opcional.
```

Evitar inicialmente:

```text
Eliminar campos.
Renombrar campos.
Cambiar tipos.
Hacer obligatoria una columna existente con datos.
```

---

# 11. Migración recomendada para workflow

Si faltan tablas, crear migración incremental para:

- WorkflowTransition.
- AuditLog, si no existe.
- PdfDocument, si se implementará PDF ahora.

Nombre sugerido:

```bash
npx prisma migrate dev --name add_daily_log_workflow_support
```

---

# 12. Después de migrar

Ejecutar:

```bash
npx prisma generate
npm run build
npm run start:dev
```

Validar:

```text
/api/v1/health
/swagger
/login
```

---

# 13. Validación funcional post-migración

Probar:

- login admin,
- crear DailyLog,
- consultar DailyLog,
- crear DailyLogEvent,
- upload attachment si aplica,
- Swagger visible.

---

# 14. Manejo de errores comunes

## Error: drift detected

No ejecutar reset automáticamente.

Primero revisar:

```bash
npx prisma migrate status
```

---

## Error: column does not exist

Revisar si el código espera columnas que aún no migraron.

---

## Error: enum mismatch

Revisar valores existentes en DB antes de modificar enum.

---

## Error: seed falla

No asumir que la migración falló. Revisar seed por separado.

---

# 15. Cuándo usar migrate reset

Solo en local y únicamente si:

- no hay datos importantes,
- se entiende el impacto,
- se acepta recrear DB,
- se volverá a ejecutar seed.

Comando:

```bash
npx prisma migrate reset
```

No usar en producción.

---

# 16. Producción futura

En producción se debe usar:

```bash
npx prisma migrate deploy
```

No usar:

```bash
npx prisma migrate dev
```

en producción.

---

# 17. Estrategia con Codex

Cuando Codex proponga cambios Prisma, exigir que entregue:

```text
1. Cambios propuestos
2. Motivo
3. Impacto en datos existentes
4. Si requiere migración
5. Nombre sugerido de migración
6. Comandos de validación
```

---

# 18. Prompt recomendado para Codex

```text
Review the current Prisma schema before making changes.

Do not replace the schema blindly.
Compare the current schema against PRISMA_SCHEMA_V1.prisma and the workflow implementation plan.

Return:
- current models found
- missing models
- required minimal changes
- migration risk
- whether migration is required
- exact schema diff proposal

Do not apply changes until I approve.
```

---

# 19. Criterio de éxito

Una migración se considera segura si:

- Prisma validate pasa.
- Prisma generate pasa.
- npm build pasa.
- Backend levanta.
- Swagger carga.
- Login funciona.
- DailyLog existente funciona.
- No se pierden migraciones existentes.
- No se rompe seed.

---

# 20. Recomendación final

Para la próxima etapa de desarrollo:

```text
Primero gap analysis.
Luego cambios Prisma mínimos.
Después workflow service.
Luego pruebas.
```

No hacer cambios masivos de schema y workflow al mismo tiempo.
