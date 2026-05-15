# DAILY_LOG_ERD_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\erd\DAILY_LOG_ERD_V1.md
```

---

# 1. Objetivo

Definir el modelo entidad-relación (ERD) inicial del módulo Daily Log para la plataforma de Bitácora diaria de Obra Civil.

Este documento servirá como base para:

- Prisma schema.
- PostgreSQL.
- Relaciones backend.
- Diseño workflow.
- Auditoría.
- Adjuntos.
- Escalabilidad futura.

---

# 2. Principios del modelo

## 2.1 Multi-proyecto

La solución debe soportar múltiples proyectos independientes.

---

## 2.2 Trazabilidad completa

Toda entidad crítica debe registrar:

- createdAt,
- updatedAt,
- createdBy,
- updatedBy.

---

## 2.3 Soft delete recomendado

Para entidades críticas:

```text
deletedAt
deletedBy
```

---

## 2.4 UUID recomendado

Todas las entidades deben usar:

```text
UUID
```

como identificador principal.

---

# 3. Entidades principales

| Entidad | Objetivo |
|---|---|
| Organization | Organización dueña |
| User | Usuarios plataforma |
| Project | Proyecto de obra |
| ProjectMember | Relación usuario-proyecto |
| DailyLog | Bitácora diaria |
| DailyLogEvent | Eventos registrados |
| EventType | Catálogo tipos evento |
| Attachment | Archivos adjuntos |
| Signature | Firmas |
| AuditLog | Auditoría |
| WorkflowTransition | Historial workflow |

---

# 4. Modelo conceptual relaciones

```text
Organization
  └── Projects
        └── DailyLogs
              └── DailyLogEvents
                    └── Attachments

DailyLogs
  └── WorkflowTransitions

DailyLogs
  └── Signatures

DailyLogEvents
  └── Signatures

Users
  └── ProjectMembers
```

---

# 5. Organization

## Objetivo

Entidad raíz organizacional.

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| name | String |
| code | String |
| status | Enum |
| createdAt | Timestamp |
| updatedAt | Timestamp |

---

# 6. User

## Objetivo

Usuarios autenticados plataforma.

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| firstName | String |
| lastName | String |
| email | String |
| passwordHash | String |
| status | Enum |
| createdAt | Timestamp |
| updatedAt | Timestamp |

---

# 7. Project

## Objetivo

Representa un proyecto de obra.

---

## Relaciones

```text
Organization 1:N Project
```

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| organizationId | UUID |
| code | String |
| name | String |
| description | Text |
| startDate | Date |
| endDate | Date |
| status | Enum |
| createdAt | Timestamp |
| updatedAt | Timestamp |

---

# 8. ProjectMember

## Objetivo

Usuarios asignados al proyecto.

---

## Relaciones

```text
Project N:M User
```

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| projectId | UUID |
| userId | UUID |
| role | Enum |
| joinedAt | Timestamp |
| isActive | Boolean |

---

# 9. DailyLog

## Objetivo

Bitácora diaria oficial.

---

## Relaciones

```text
Project 1:N DailyLog
```

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| projectId | UUID |
| logDate | Date |
| status | Enum |
| openedById | UUID |
| submittedById | UUID |
| approvedById | UUID |
| closedById | UUID |
| openedAt | Timestamp |
| submittedAt | Timestamp |
| approvedAt | Timestamp |
| closedAt | Timestamp |
| finalPdfUrl | String |
| finalPdfHash | String |
| comments | Text |
| createdAt | Timestamp |
| updatedAt | Timestamp |

---

# 10. DailyLogEvent

## Objetivo

Eventos registrados durante el día.

---

## Relaciones

```text
DailyLog 1:N DailyLogEvent
```

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| dailyLogId | UUID |
| eventTypeId | UUID |
| activity | String |
| executionDescription | Text |
| reportedById | UUID |
| reportedAt | Timestamp |
| signatureId | UUID |
| createdAt | Timestamp |
| updatedAt | Timestamp |

---

# 11. EventType

## Objetivo

Catálogo tipos de evento.

---

## Ejemplos

- Avance obra
- Incidente
- Seguridad
- Reunión
- Suspensión
- Observación

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| code | String |
| name | String |
| description | Text |
| isActive | Boolean |

---

# 12. Attachment

## Objetivo

Archivos asociados.

---

## Relaciones

Puede asociarse a:

- DailyLog,
- DailyLogEvent,
- otros módulos futuros.

---

## Estrategia recomendada

Entidad genérica polimórfica.

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| entityType | String |
| entityId | UUID |
| fileName | String |
| mimeType | String |
| fileSize | Integer |
| storageProvider | String |
| storagePath | String |
| uploadedById | UUID |
| uploadedAt | Timestamp |

---

# 13. Signature

## Objetivo

Firmas funcionales.

---

## Relaciones

Puede asociarse a:

- DailyLog,
- DailyLogEvent.

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| entityType | String |
| entityId | UUID |
| signedById | UUID |
| signedAt | Timestamp |
| signatureData | Text |
| signatureType | Enum |

---

# 14. AuditLog

## Objetivo

Trazabilidad sistema.

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| entity | String |
| entityId | UUID |
| action | String |
| fromStatus | String |
| toStatus | String |
| performedById | UUID |
| performedAt | Timestamp |
| requestId | String |
| metadata | JSONB |

---

# 15. WorkflowTransition

## Objetivo

Historial workflow DailyLog.

---

## Relaciones

```text
DailyLog 1:N WorkflowTransition
```

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| dailyLogId | UUID |
| fromStatus | String |
| toStatus | String |
| action | String |
| performedById | UUID |
| performedAt | Timestamp |
| comments | Text |

---

# 16. Relaciones principales

| Relación | Cardinalidad |
|---|---|
| Organization → Projects | 1:N |
| Project → DailyLogs | 1:N |
| DailyLog → DailyLogEvents | 1:N |
| DailyLog → WorkflowTransitions | 1:N |
| User → DailyLogEvents | 1:N |
| User → ProjectMembers | 1:N |
| DailyLogEvent → Attachments | 1:N |
| DailyLog → Attachments | 1:N |

---

# 17. Índices recomendados

## DailyLog

```text
(projectId, logDate)
status
```

---

## DailyLogEvent

```text
dailyLogId
reportedById
reportedAt
```

---

## AuditLog

```text
entityId
performedAt
requestId
```

---

# 18. Restricciones importantes

## DailyLog único por fecha/proyecto

Restricción recomendada:

```text
UNIQUE(projectId, logDate)
```

---

## Workflow controlado

No permitir:

```text
status arbitrario
```

Todas las transiciones deben pasar por workflow service.

---

# 19. Estrategia JSONB

## Recomendación PostgreSQL

Usar JSONB para:

- metadata,
- snapshots,
- auditoría extendida.

---

# 20. Estrategia archivos

## Recomendación

Guardar en DB únicamente:

- metadata,
- paths,
- hashes.

NO guardar archivos binarios directamente.

---

# 21. Estrategia soft delete

## Recomendación inicial

Aplicar soft delete a:

- DailyLog,
- DailyLogEvent,
- Attachments.

---

# 22. Estrategia multi-tenant futura

Actualmente:

```text
Organization → Project
```

Ya deja preparada escalabilidad multiempresa.

---

# 23. Riesgos si no se modela correctamente

- relaciones inconsistentes,
- auditoría incompleta,
- problemas workflow,
- archivos huérfanos,
- duplicidad DailyLogs,
- deuda técnica alta.

---

# 24. Recomendación V1

Implementar desde inicio:

- UUID,
- auditabilidad,
- workflow transitions,
- attachments genéricos,
- índices básicos,
- relaciones normalizadas.

Evitar inicialmente:

- event sourcing,
- versionado complejo entidades,
- herencia excesiva,
- multi-schema PostgreSQL.
