# CODEX_DEVELOPMENT_CONVENTIONS_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\06-codex\conventions\CODEX_DEVELOPMENT_CONVENTIONS_V1.md
```

---

# 1. Objetivo

Definir las convenciones oficiales de desarrollo para el proyecto Bitácora diaria de Obra Civil.

Este documento servirá para:

- mantener consistencia técnica,
- evitar deuda técnica,
- alinear prompts Codex,
- homogenizar backend/frontend,
- facilitar mantenimiento.

---

# 2. Principios generales

## 2.1 Arquitectura modular

Cada dominio debe vivir en su propio módulo.

---

## 2.2 Backend como autoridad

Toda regla crítica debe validarse en backend.

---

## 2.3 Workflow centralizado

Las transiciones workflow deben pasar por:

```text
DailyLogWorkflowService
```

---

## 2.4 Código explícito

Preferir claridad sobre magia.

---

# 3. Stack oficial

| Capa | Tecnología |
|---|---|
| Backend | NestJS |
| ORM | Prisma |
| DB | PostgreSQL |
| Frontend | Next.js |
| UI | TailwindCSS |
| Forms | React Hook Form |
| Validation | Zod |
| Auth | JWT |

---

# 4. Convenciones backend

## 4.1 Estructura módulos

```text
module/
  controllers/
  services/
  workflow/
  dto/
  validators/
  guards/
  policies/
  repositories/
  interfaces/
  constants/
```

---

## 4.2 Naming controllers

Formato:

```text
<Entity>Controller
```

Ejemplos:

```text
DailyLogController
AttachmentController
ProjectController
```

---

## 4.3 Naming services

Formato:

```text
<Entity>Service
```

Ejemplos:

```text
DailyLogService
AuditService
AttachmentService
```

---

## 4.4 Workflow services

Formato:

```text
<Entity>WorkflowService
```

Ejemplo:

```text
DailyLogWorkflowService
```

---

## 4.5 DTO naming

Formato:

```text
Create<Entity>Dto
Update<Entity>Dto
```

Ejemplos:

```text
CreateDailyLogDto
UpdateDailyLogEventDto
```

---

# 5. Convenciones Prisma

## 5.1 Model names

Usar PascalCase.

Ejemplo:

```prisma
model DailyLog
```

---

## 5.2 Campos IDs

Todos los IDs:

```text
UUID
```

---

## 5.3 Campos auditoría obligatorios

```text
createdAt
updatedAt
createdBy
updatedBy
```

---

## 5.4 Soft delete recomendado

```text
deletedAt
deletedBy
```

---

# 6. Convenciones workflow

## 6.1 Estados

Usar uppercase.

Ejemplo:

```text
DRAFT
OPEN
APPROVED
CLOSED
```

---

## 6.2 Actions

Formato:

```text
VERB_ENTITY
```

Ejemplo:

```text
APPROVE_DAILY_LOG
OPEN_DAILY_LOG
```

---

## 6.3 Eventos dominio

Formato:

```text
entity.action
```

Ejemplo:

```text
daily-log.approved
attachment.uploaded
```

---

# 7. Convenciones API

## 7.1 Base URL

```text
/api/v1
```

---

## 7.2 Resource naming

Usar plural kebab-case.

Ejemplos:

```text
/daily-logs
/daily-log-events
/attachments
```

---

## 7.3 Responses estándar

Éxito:

```json
{
  "success": true,
  "data": {}
}
```

---

Error:

```json
{
  "success": false,
  "message": "",
  "errorCode": ""
}
```

---

# 8. Convenciones frontend

## 8.1 Components

Usar PascalCase.

Ejemplo:

```text
DailyLogCard.tsx
WorkflowStatusBadge.tsx
```

---

## 8.2 Hooks

Formato:

```text
use<Entity>
```

Ejemplo:

```text
useDailyLogs
useProjectMembers
```

---

## 8.3 Pages

Formato:

```text
page.tsx
```

según App Router Next.js.

---

# 9. Convenciones Tailwind

## Recomendaciones

- evitar inline styles,
- usar utility classes,
- mantener spacing consistente.

---

# 10. Convenciones validaciones

## Backend

Usar:

```text
class-validator
```

---

## Frontend

Usar:

```text
Zod
```

---

# 11. Convenciones errores

## Business exceptions

Usar:

```text
ConflictException
BadRequestException
ForbiddenException
```

---

## Nunca retornar

```text
throw new Error()
```

directamente en controllers.

---

# 12. Convenciones auditoría

Toda acción crítica debe registrar:

- usuario,
- timestamp,
- requestId,
- entidad,
- acción.

---

# 13. Convenciones uploads

## Naming seguro

Nunca usar nombre original.

Formato:

```text
uuid_timestamp.ext
```

---

## Validaciones

Obligatorias:

- MIME,
- tamaño,
- permisos.

---

# 14. Convenciones PDF

## PDFs oficiales

Deben ser:

```text
Inmutables
```

---

## Naming recomendado

```text
PROJECTCODE_YYYY-MM-DD_v1.pdf
```

---

# 15. Convenciones Git

## Branch naming

```text
feature/*
bugfix/*
hotfix/*
```

---

## Ejemplos

```text
feature/daily-log-workflow
feature/pdf-generation
```

---

# 16. Convenciones commits

Formato recomendado:

```text
type(scope): description
```

---

## Ejemplos

```text
feat(workflow): add approval transitions
fix(attachments): validate mime types
```

---

# 17. Convenciones testing

## Backend

- unit tests,
- validators,
- workflow tests.

---

## Frontend

- forms,
- workflow visibility,
- permissions.

---

# 18. Convenciones logs

Logs deben incluir:

- requestId,
- usuario,
- endpoint,
- resultado.

---

# 19. Convenciones seguridad

Nunca exponer:

- secrets,
- credentials,
- JWT keys,
- storage credentials.

---

# 20. Riesgos si no se siguen convenciones

- código inconsistente,
- prompts IA incompatibles,
- arquitectura fragmentada,
- deuda técnica.

---

# 21. Recomendación V1

Todos los prompts Codex deben alinearse a este documento antes de generar código nuevo.
