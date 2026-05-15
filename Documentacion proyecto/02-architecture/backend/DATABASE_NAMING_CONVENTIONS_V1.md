# DATABASE_NAMING_CONVENTIONS_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\DATABASE_NAMING_CONVENTIONS_V1.md
```

---

# 1. Objetivo

Definir las convenciones oficiales de naming y modelado para base de datos y Prisma ORM.

Este documento servirá para:

- mantener consistencia,
- facilitar mantenimiento,
- reducir deuda técnica,
- alinear desarrollo backend,
- mejorar legibilidad del modelo.

---

# 2. Principios generales

## 2.1 Consistencia

Todos los nombres deben seguir reglas homogéneas.

---

## 2.2 Claridad

Los nombres deben ser explícitos y entendibles.

---

## 2.3 Escalabilidad

Las convenciones deben soportar crecimiento futuro.

---

# 3. Convenciones Prisma

## 3.1 Model names

Usar:

```text
PascalCase
```

---

## Ejemplos

```prisma
model DailyLog
model DailyLogEvent
model Attachment
model WorkflowTransition
```

---

# 4. Table naming PostgreSQL

## Recomendación

Usar:

```text
snake_case plural
```

---

## Ejemplos

```text
daily_logs
daily_log_events
attachments
workflow_transitions
```

---

# 5. Prisma mapping recomendado

## Ejemplo

```prisma
model DailyLog {
  @@map("daily_logs")
}
```

---

# 6. Primary keys

## Regla oficial

Todos los IDs deben ser:

```text
UUID
```

---

## Ejemplo Prisma

```prisma
id String @id @default(uuid())
```

---

# 7. Foreign keys

## Convención

Formato:

```text
<entity>Id
```

---

## Ejemplos

```text
projectId
dailyLogId
uploadedById
approvedById
```

---

# 8. Campos auditoría obligatorios

## Todas las entidades críticas

```text
createdAt
updatedAt
createdBy
updatedBy
```

---

# 9. Soft delete

## Recomendación

```text
deletedAt
deletedBy
```

---

# 10. Timestamps

## Convención

Usar UTC.

---

## Prisma recomendado

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

---

# 11. Status fields

## Convención

Formato:

```text
status
```

---

## Valores

Usar:

```text
UPPERCASE ENUMS
```

---

## Ejemplo

```text
OPEN
APPROVED
CLOSED
```

---

# 12. Enum naming

## Prisma enums

Usar:

```text
PascalCase
```

---

## Valores enum

Usar:

```text
UPPERCASE
```

---

## Ejemplo

```prisma
enum DailyLogStatus {
  DRAFT
  OPEN
  APPROVED
}
```

---

# 13. Boolean fields

## Convención

Prefijos:

```text
is
has
can
```

---

## Ejemplos

```text
isActive
hasAttachments
canApprove
```

---

# 14. JSON fields

## Convención

Usar:

```text
metadata
payload
snapshot
```

---

## Tipo recomendado PostgreSQL

```text
JSONB
```

---

# 15. Índices naming

## Recomendación

```text
idx_<table>_<field>
```

---

## Ejemplo

```text
idx_daily_logs_project_id
```

---

# 16. Unique constraints naming

## Recomendación

```text
uq_<table>_<field>
```

---

## Ejemplo

```text
uq_daily_logs_project_date
```

---

# 17. Foreign key naming

## Recomendación

```text
fk_<table>_<reference>
```

---

## Ejemplo

```text
fk_daily_logs_project
```

---

# 18. Pivot tables

## Convención

```text
<entity>_<entity>
```

---

## Ejemplo

```text
project_members
user_roles
```

---

# 19. File-related fields

## Convenciones

| Campo | Uso |
|---|---|
| fileName | Nombre interno |
| originalFileName | Nombre original |
| mimeType | MIME |
| storagePath | Ruta storage |
| checksum | SHA256 |

---

# 20. Workflow-related fields

## Convenciones

| Campo | Uso |
|---|---|
| fromStatus | Estado origen |
| toStatus | Estado destino |
| action | Acción workflow |
| performedAt | Timestamp |
| performedById | Usuario |

---

# 21. Naming relaciones Prisma

## Convención

Explícitas y legibles.

---

## Ejemplo

```prisma
project Project @relation(fields: [projectId], references: [id])
```

---

# 22. Riesgos si no existen convenciones

- tablas inconsistentes,
- queries difíciles,
- mantenimiento complejo,
- deuda técnica,
- prompts Codex incompatibles.

---

# 23. Recomendación V1

Aplicar estas convenciones desde el inicio del proyecto y evitar cambios posteriores masivos en naming.
