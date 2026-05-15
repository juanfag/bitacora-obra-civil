# DAILY_LOG_WORKFLOW_DIAGRAMS_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\08-diagrams\DAILY_LOG_WORKFLOW_DIAGRAMS_V1.md
```

---

# 1. Objetivo

Centralizar los diagramas funcionales y técnicos iniciales del workflow DailyLog.

Este documento servirá para:

- visualización arquitectura,
- alineación funcional,
- soporte frontend/backend,
- onboarding técnico,
- futuras presentaciones cliente.

---

# 2. Workflow principal

## Diagrama flujo general

```mermaid
flowchart TD

A[DRAFT] --> B[OPEN]
B --> C[PENDING_APPROVAL]
C --> D[APPROVED]
D --> E[CLOSED]

C -->|Reject| B
E -->|Reopen| F[REOPENED]
F --> C

A --> G[CANCELLED]
B --> G
```

---

# 3. Flujo operativo diario

```mermaid
sequenceDiagram

participant Resident
participant System
participant Director

Resident->>System: Crear DailyLog
System-->>Resident: DRAFT

Resident->>System: Open DailyLog
System-->>Resident: OPEN

Resident->>System: Registrar eventos
Resident->>System: Adjuntar evidencias

Resident->>System: Submit For Approval

System-->>Director: Notification

Director->>System: Approve DailyLog

System->>System: Generate PDF

Director->>System: Close DailyLog

System-->>Resident: CLOSED
```

---

# 4. Workflow aprobación

```mermaid
stateDiagram-v2

[*] --> DRAFT
DRAFT --> OPEN

OPEN --> PENDING_APPROVAL

PENDING_APPROVAL --> OPEN : Reject
PENDING_APPROVAL --> APPROVED : Approve

APPROVED --> CLOSED : Close

CLOSED --> REOPENED : Reopen

REOPENED --> PENDING_APPROVAL

OPEN --> CANCELLED
DRAFT --> CANCELLED
```

---

# 5. Flujo adjuntos

```mermaid
flowchart LR

A[Frontend Upload]
--> B[API Validation]
--> C[MIME Validation]
--> D[Storage Upload]
--> E[Google Drive]
--> F[Metadata DB]
```

---

# 6. Flujo generación PDF

```mermaid
flowchart TD

A[DailyLog APPROVED]
--> B[Collect Data]
--> C[Render HTML]
--> D[Generate PDF]
--> E[Generate SHA256]
--> F[Store Google Drive]
--> G[Save Metadata]
--> H[CLOSED]
```

---

# 7. Arquitectura backend simplificada

```mermaid
flowchart TD

A[Frontend]
--> B[NestJS API]

B --> C[Workflow Service]
B --> D[DailyLog Service]
B --> E[Attachment Service]
B --> F[Audit Service]
B --> G[PDF Service]

C --> H[(PostgreSQL)]
D --> H
E --> H
F --> H
G --> H

E --> I[Google Drive]
G --> I
```

---

# 8. Relación entidades principal

```mermaid
erDiagram

PROJECT ||--o{ DAILY_LOG : contains
DAILY_LOG ||--o{ DAILY_LOG_EVENT : contains
DAILY_LOG ||--o{ WORKFLOW_TRANSITION : tracks
DAILY_LOG_EVENT ||--o{ ATTACHMENT : contains
DAILY_LOG ||--o{ ATTACHMENT : contains
USER ||--o{ PROJECT_MEMBER : belongs
PROJECT ||--o{ PROJECT_MEMBER : has
```

---

# 9. Flujo seguridad

```mermaid
flowchart TD

A[User Login]
--> B[JWT Token]

B --> C[API Request]

C --> D[JwtAuthGuard]
D --> E[RolesGuard]
E --> F[ProjectMembershipGuard]
F --> G[WorkflowPermissionGuard]

G --> H[Controller]
```

---

# 10. Flujo auditoría

```mermaid
sequenceDiagram

participant User
participant API
participant Workflow
participant Audit

User->>API: Approve DailyLog
API->>Workflow: validate transition
Workflow->>Audit: register audit log
Workflow-->>API: APPROVED
API-->>User: success
```

---

# 11. Diagramas futuros recomendados

## Arquitectura

- deployment diagram,
- infrastructure diagram,
- storage diagram.

---

## Workflow

- multi-step approvals,
- notifications flow,
- escalation flow.

---

## Frontend

- UI navigation maps,
- responsive layouts,
- component interaction diagrams.

---

# 12. Recomendación V1

Mantener diagramas sincronizados con:

- workflow real,
- APIs,
- entidades,
- seguridad,
- frontend.

Actualizar diagramas cuando exista:

- nuevo estado workflow,
- nueva integración,
- cambio arquitectura.
