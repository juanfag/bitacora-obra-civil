# CODEX_IMPLEMENTATION_PROMPT_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\06-codex\CODEX_IMPLEMENTATION_PROMPT_V1.md
```

---

# 1. Objetivo

Centralizar prompts técnicos listos para ejecutar en Codex o asistentes IA de desarrollo.

Este documento servirá para:

- acelerar desarrollo,
- mantener consistencia arquitectura,
- evitar pérdida contexto técnico,
- traducir arquitectura → implementación.

---

# 2. Reglas generales para Codex

## Importante

Todos los prompts deben respetar:

- NestJS.
- Prisma.
- PostgreSQL.
- Arquitectura modular.
- Workflow centralizado.
- JWT auth.
- RBAC.
- Auditoría obligatoria.

---

# 3. Prompt — Crear módulo DailyLog

## Objetivo

Generar módulo base DailyLog en NestJS.

---

## Prompt

```text
Create a complete NestJS module called DailyLogModule for a construction daily log platform.

Requirements:
- Use Prisma ORM.
- Use PostgreSQL.
- Use UUIDs.
- Follow modular architecture.
- Include:
  - controller
  - service
  - DTOs
  - validators
  - guards
  - repository layer
- DailyLog entity fields:
  - id
  - projectId
  - logDate
  - status
  - openedById
  - submittedById
  - approvedById
  - closedById
  - openedAt
  - submittedAt
  - approvedAt
  - closedAt
  - finalPdfUrl
  - finalPdfHash
  - createdAt
  - updatedAt
- Use Swagger decorators.
- Use class-validator.
- Create CRUD endpoints.
```

---

# 4. Prompt — Workflow Service

## Objetivo

Implementar máquina de estados.

---

## Prompt

```text
Create a DailyLogWorkflowService for a NestJS application.

Requirements:
- Centralized workflow logic.
- Allowed states:
  DRAFT
  OPEN
  PENDING_APPROVAL
  APPROVED
  CLOSED
  REOPENED
  CANCELLED

Implement methods:
- openDailyLog()
- submitForApproval()
- approveDailyLog()
- rejectDailyLog()
- closeDailyLog()
- reopenDailyLog()
- cancelDailyLog()

Requirements:
- Validate transitions.
- Validate permissions.
- Throw business exceptions.
- Register audit logs.
- Use Prisma transactions where required.
```

---

# 5. Prompt — Prisma schema DailyLog

## Objetivo

Generar modelos Prisma.

---

## Prompt

```text
Create Prisma schema models for a construction daily log platform.

Entities:
- Project
- DailyLog
- DailyLogEvent
- Attachment
- AuditLog
- WorkflowTransition

Requirements:
- UUID ids.
- PostgreSQL.
- createdAt and updatedAt.
- Relations correctly implemented.
- Add indexes.
- Add unique constraint:
  UNIQUE(projectId, logDate)
```

---

# 6. Prompt — DailyLog Events

## Objetivo

Implementar eventos diarios.

---

## Prompt

```text
Create a DailyLogEvent module in NestJS.

Requirements:
- CRUD operations.
- Validation rules.
- Attachments support.
- Signature support.
- Event fields:
  - eventTypeId
  - activity
  - executionDescription
  - reportedById
  - reportedAt
- Use DTO validation.
- Use Swagger decorators.
- Validate DailyLog status before modifications.
```

---

# 7. Prompt — Attachments Module

## Objetivo

Implementar uploads y storage.

---

## Prompt

```text
Create an AttachmentsModule for NestJS.

Requirements:
- Upload files.
- Validate MIME types.
- Validate file size.
- Store metadata in PostgreSQL using Prisma.
- Integrate with Google Drive storage.
- Implement upload/download/delete endpoints.
- Use secure generated filenames.
- Generate SHA256 checksum.
- Restrict file access by project membership.
```

---

# 8. Prompt — PDF Generation

## Objetivo

Implementar generación PDF oficial.

---

## Prompt

```text
Create a PdfGenerationService for a construction daily log platform.

Requirements:
- Use HTML templates + Puppeteer.
- Generate official DailyLog PDF.
- Include:
  - project information
  - events
  - images
  - signatures
  - approval metadata
- Generate SHA256 hash.
- Store PDF in Google Drive.
- Save metadata in PostgreSQL.
- Allow generation only if DailyLog status is APPROVED.
```

---

# 9. Prompt — Audit Service

## Objetivo

Implementar auditoría.

---

## Prompt

```text
Create an AuditService in NestJS.

Requirements:
- Register workflow transitions.
- Register CRUD actions.
- Save:
  - entity
  - entityId
  - action
  - fromStatus
  - toStatus
  - performedBy
  - performedAt
  - requestId
  - metadata
- Use Prisma.
- Create reusable methods.
```

---

# 10. Prompt — JWT Authentication

## Objetivo

Implementar autenticación.

---

## Prompt

```text
Create JWT authentication in NestJS.

Requirements:
- Access token.
- Refresh token.
- BCrypt password hashing.
- JwtAuthGuard.
- RolesGuard.
- Role-based access control.
- Swagger integration.
```

---

# 11. Prompt — Frontend DailyLog Workspace

## Objetivo

Construir UI principal.

---

## Prompt

```text
Create a DailyLog Workspace page using Next.js and TailwindCSS.

Requirements:
- Responsive layout.
- Show DailyLog status.
- Show events list.
- Add event modal.
- Upload attachments.
- Submit for approval button.
- Role-based actions.
- Use TanStack Query.
- Use shadcn/ui components.
```

---

# 12. Prompt — Approval View

## Objetivo

Construir pantalla aprobación.

---

## Prompt

```text
Create a DailyLog Approval page in Next.js.

Requirements:
- Show DailyLog details.
- Show events.
- Show attachments.
- Approve button.
- Reject button.
- Comments textarea.
- Workflow status badge.
- Responsive UI.
```

---

# 13. Prompt — API Error Handling

## Objetivo

Estandarizar errores.

---

## Prompt

```text
Create a GlobalExceptionFilter for NestJS.

Requirements:
- Standard API response format.
- Handle:
  - validation errors
  - unauthorized
  - forbidden
  - conflicts
  - internal errors
- Return:
  {
    success: false,
    message,
    errorCode
  }
```

---

# 14. Prompt — RBAC Permissions

## Objetivo

Implementar permisos.

---

## Prompt

```text
Create RBAC authorization for a NestJS construction daily log platform.

Roles:
- ADMIN_SYSTEM
- ADMIN_PROJECT
- DIRECTOR
- RESIDENT_ENGINEER
- INSPECTOR
- VIEWER
- AUDITOR

Requirements:
- Role validation.
- Project membership validation.
- Workflow permission validation.
- Reusable guards and decorators.
```

---

# 15. Prompt — Swagger Documentation

## Objetivo

Documentación API automática.

---

## Prompt

```text
Configure Swagger for NestJS.

Requirements:
- JWT authentication.
- DTO schemas.
- Endpoint descriptions.
- Examples.
- Error responses.
- Tags by module.
```

---

# 16. Recomendación uso Codex

## Estrategia recomendada

NO generar todo el proyecto en un solo prompt.

Trabajar incrementalmente:

```text
Entidad → CRUD → Workflow → Guards → Audit → Frontend
```

---

# 17. Riesgos uso incorrecto IA

- código inconsistente,
- lógica duplicada,
- arquitectura rota,
- permisos incorrectos,
- workflow inseguro.

---

# 18. Recomendación V1

Usar este documento como:

```text
Fuente oficial prompts técnicos
```

Mantenerlo actualizado conforme evolucione la arquitectura.
