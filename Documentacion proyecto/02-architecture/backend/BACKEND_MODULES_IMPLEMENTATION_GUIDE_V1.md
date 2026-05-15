# BACKEND_MODULES_IMPLEMENTATION_GUIDE_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\BACKEND_MODULES_IMPLEMENTATION_GUIDE_V1.md
```

---

# 1. Objetivo

Definir la guía práctica de implementación backend para la plataforma Bitácora diaria de Obra Civil.

Este documento traduce la arquitectura definida en pasos concretos de desarrollo para NestJS, Prisma y PostgreSQL.

Debe servir como guía para:

- Codex.
- Desarrollo backend.
- Validación técnica.
- Control de dependencias.
- Orden correcto de implementación.
- Evitar retrabajo.

---

# 2. Principio clave

No implementar módulos aislados sin respetar dependencias.

El orden correcto debe ser:

```text
Base técnica → Seguridad → Entidades core → Workflow → Adjuntos → PDF → Auditoría → Notificaciones
```

---

# 3. Stack backend oficial

| Componente | Tecnología |
|---|---|
| Framework | NestJS |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | JWT |
| Password hashing | BCrypt |
| API Docs | Swagger |
| Validaciones | class-validator |
| Configuración | @nestjs/config |
| Storage | Google Drive |
| PDF | HTML + Puppeteer |

---

# 4. Estructura backend esperada

```text
backend/
  src/
    common/
      decorators/
      filters/
      guards/
      interceptors/
      pipes/
      utils/
    config/
    modules/
      auth/
      users/
      organizations/
      projects/
      daily-log/
      daily-log-events/
      attachments/
      audit/
      pdf/
      notifications/
    prisma/
  prisma/
    schema.prisma
    migrations/
    seed.ts
```

---

# 5. Orden recomendado de implementación

| Orden | Módulo | Prioridad |
|---:|---|---|
| 1 | ConfigModule / Environment | Alta |
| 2 | PrismaModule | Alta |
| 3 | CommonModule | Alta |
| 4 | AuthModule | Alta |
| 5 | UsersModule | Alta |
| 6 | OrganizationsModule | Alta |
| 7 | ProjectsModule | Alta |
| 8 | ProjectMembers | Alta |
| 9 | DailyLogModule | Alta |
| 10 | DailyLogWorkflowService | Muy alta |
| 11 | DailyLogEventsModule | Alta |
| 12 | AttachmentsModule | Alta |
| 13 | AuditModule | Alta |
| 14 | PdfModule | Alta |
| 15 | NotificationsModule | Media |

---

# 6. Fase 1 — Base técnica

## 6.1 ConfigModule

### Objetivo

Centralizar variables de entorno.

### Archivos sugeridos

```text
src/config/env.validation.ts
src/config/app.config.ts
```

### Variables mínimas

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
PORT
NODE_ENV
```

---

## 6.2 PrismaModule

### Objetivo

Exponer PrismaClient de forma reusable.

### Archivos sugeridos

```text
src/prisma/prisma.module.ts
src/prisma/prisma.service.ts
```

### Reglas

- PrismaService debe extender PrismaClient.
- Conectar al iniciar aplicación.
- Desconectar al cerrar aplicación.

---

## 6.3 CommonModule

### Objetivo

Centralizar recursos comunes.

### Incluir

```text
GlobalExceptionFilter
RequestIdInterceptor
CurrentUser decorator
Roles decorator
ApiResponse helpers
```

---

# 7. Fase 2 — Seguridad base

## 7.1 AuthModule

### Objetivo

Implementar login y JWT.

### Archivos sugeridos

```text
auth.controller.ts
auth.service.ts
jwt.strategy.ts
jwt-auth.guard.ts
roles.guard.ts
dto/login.dto.ts
dto/auth-response.dto.ts
```

### Endpoints

```http
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Validaciones

- Email obligatorio.
- Password obligatorio.
- Usuario activo.
- Password con BCrypt.
- JWT válido.

---

## 7.2 UsersModule

### Objetivo

Gestionar usuarios.

### Endpoints mínimos

```http
POST /api/v1/users
GET  /api/v1/users
GET  /api/v1/users/{id}
PATCH /api/v1/users/{id}
```

### Reglas

- Email único.
- Password nunca se retorna.
- Password siempre hasheado.
- Usuario inactivo no puede iniciar sesión.

---

# 8. Fase 3 — Organización y proyectos

## 8.1 OrganizationsModule

### Objetivo

Gestionar organizaciones.

### Endpoints mínimos

```http
POST /api/v1/organizations
GET  /api/v1/organizations
GET  /api/v1/organizations/{id}
PATCH /api/v1/organizations/{id}
```

---

## 8.2 ProjectsModule

### Objetivo

Gestionar proyectos.

### Endpoints mínimos

```http
POST /api/v1/projects
GET  /api/v1/projects
GET  /api/v1/projects/{id}
PATCH /api/v1/projects/{id}
```

### Reglas

- Código único por organización.
- Proyecto debe estar activo para abrir DailyLogs.
- Usuario debe pertenecer al proyecto para operar.

---

## 8.3 ProjectMembers

### Objetivo

Asignar usuarios a proyectos con rol.

### Endpoints mínimos

```http
POST /api/v1/projects/{projectId}/members
GET  /api/v1/projects/{projectId}/members
PATCH /api/v1/projects/{projectId}/members/{memberId}
DELETE /api/v1/projects/{projectId}/members/{memberId}
```

### Reglas

- Un usuario puede tener más de un rol si se justifica.
- No asignar usuarios inactivos.
- Validar pertenencia proyecto en operaciones críticas.

---

# 9. Fase 4 — DailyLog Core

## 9.1 DailyLogModule

### Objetivo

Implementar la entidad principal DailyLog.

### Archivos sugeridos

```text
daily-log.controller.ts
daily-log.service.ts
daily-log.repository.ts
dto/create-daily-log.dto.ts
dto/update-daily-log.dto.ts
dto/daily-log-response.dto.ts
constants/daily-log-status.enum.ts
```

### Endpoints CRUD mínimos

```http
POST /api/v1/daily-logs
GET  /api/v1/daily-logs
GET  /api/v1/daily-logs/{id}
PATCH /api/v1/daily-logs/{id}
```

### Reglas

- Solo un DailyLog por proyecto y fecha.
- Crear en estado DRAFT.
- No permitir edición si está CLOSED.
- No permitir cambio directo de status por PATCH.

---

# 10. Fase 5 — DailyLog Workflow

## 10.1 DailyLogWorkflowService

### Objetivo

Centralizar todas las transiciones de estado.

### Archivos sugeridos

```text
daily-log/workflow/daily-log-workflow.service.ts
daily-log/workflow/workflow.constants.ts
daily-log/workflow/workflow.validators.ts
daily-log/workflow/workflow.errors.ts
daily-log/workflow/workflow.types.ts
```

### Endpoints workflow

```http
POST /api/v1/daily-logs/{id}/open
POST /api/v1/daily-logs/{id}/submit
POST /api/v1/daily-logs/{id}/approve
POST /api/v1/daily-logs/{id}/reject
POST /api/v1/daily-logs/{id}/generate-pdf
POST /api/v1/daily-logs/{id}/close
POST /api/v1/daily-logs/{id}/reopen
POST /api/v1/daily-logs/{id}/cancel
```

### Reglas obligatorias

- Validar estado origen.
- Validar transición permitida.
- Validar rol.
- Validar pertenencia proyecto.
- Registrar WorkflowTransition.
- Registrar AuditLog.
- Usar transacción Prisma en acciones críticas.

### Acciones críticas transaccionales

```text
approveDailyLog()
generatePdf()
closeDailyLog()
reopenDailyLog()
```

---

# 11. Fase 6 — DailyLog Events

## 11.1 DailyLogEventsModule

### Objetivo

Registrar eventos del día.

### Archivos sugeridos

```text
daily-log-events.controller.ts
daily-log-events.service.ts
daily-log-events.repository.ts
dto/create-daily-log-event.dto.ts
dto/update-daily-log-event.dto.ts
```

### Endpoints

```http
POST   /api/v1/daily-log-events
GET    /api/v1/daily-log-events/{id}
PATCH  /api/v1/daily-log-events/{id}
DELETE /api/v1/daily-log-events/{id}
```

### Reglas

- Solo se pueden crear eventos si DailyLog está OPEN.
- Solo se pueden editar eventos si DailyLog está OPEN.
- Usuario puede editar su propio evento.
- Director/Admin puede editar eventos del proyecto.
- Toda edición debe auditarse.

---

# 12. Fase 7 — Attachments

## 12.1 AttachmentsModule

### Objetivo

Gestionar archivos adjuntos.

### Archivos sugeridos

```text
attachments.controller.ts
attachments.service.ts
storage/storage-provider.interface.ts
storage/google-drive-storage.service.ts
dto/upload-attachment.dto.ts
validators/file.validator.ts
```

### Endpoints

```http
POST   /api/v1/attachments/upload
GET    /api/v1/attachments/{id}/download
DELETE /api/v1/attachments/{id}
```

### Reglas

- Validar MIME.
- Validar tamaño.
- Validar acceso proyecto.
- Generar nombre interno seguro.
- Generar checksum SHA256.
- Guardar metadata en DB.
- No exponer URL pública permanente.

---

# 13. Fase 8 — Audit

## 13.1 AuditModule

### Objetivo

Registrar trazabilidad.

### Archivos sugeridos

```text
audit.service.ts
audit.controller.ts
dto/audit-log-response.dto.ts
```

### Endpoints

```http
GET /api/v1/daily-logs/{id}/audit
GET /api/v1/audit
```

### Reglas

Auditar:

- workflow,
- eventos,
- adjuntos,
- PDFs,
- reaperturas,
- cancelaciones.

---

# 14. Fase 9 — PDF

## 14.1 PdfModule

### Objetivo

Generar PDF oficial.

### Archivos sugeridos

```text
pdf.service.ts
pdf.controller.ts
templates/daily-log.template.html
utils/pdf-hash.util.ts
```

### Endpoints

```http
POST /api/v1/daily-logs/{id}/generate-pdf
GET  /api/v1/daily-logs/{id}/pdf
```

### Reglas

- Solo generar si DailyLog está APPROVED.
- Generar PDF desde backend.
- Calcular hash SHA256.
- Guardar en Google Drive.
- Registrar PdfDocument.
- Registrar auditoría.

---

# 15. Fase 10 — Notifications

## 15.1 NotificationsModule

### Objetivo

Informar eventos workflow.

### Endpoints mínimos

```http
GET   /api/v1/notifications
PATCH /api/v1/notifications/{id}/read
```

### Eventos iniciales

- DailyLog submitted.
- DailyLog rejected.
- DailyLog approved.
- DailyLog closed.

---

# 16. Guards obligatorios

## Lista recomendada

```text
JwtAuthGuard
RolesGuard
ProjectMembershipGuard
DailyLogStatusGuard
WorkflowPermissionGuard
```

---

# 17. Policies obligatorias

## Funciones sugeridas

```text
canCreateDailyLog()
canOpenDailyLog()
canCreateDailyLogEvent()
canEditDailyLogEvent()
canSubmitDailyLog()
canApproveDailyLog()
canRejectDailyLog()
canGeneratePdf()
canCloseDailyLog()
canReopenDailyLog()
canCancelDailyLog()
```

---

# 18. DTOs mínimos por módulo

## DailyLog

```text
CreateDailyLogDto
UpdateDailyLogDto
RejectDailyLogDto
ReopenDailyLogDto
```

---

## DailyLogEvent

```text
CreateDailyLogEventDto
UpdateDailyLogEventDto
```

---

## Attachments

```text
UploadAttachmentDto
AttachmentResponseDto
```

---

## Auth

```text
LoginDto
AuthResponseDto
```

---

# 19. Errores funcionales estándar

| ErrorCode | Uso |
|---|---|
| DAILY_LOG_NOT_FOUND | No existe DailyLog |
| DAILY_LOG_ALREADY_EXISTS | Ya existe para proyecto/fecha |
| DAILY_LOG_CLOSED | Bitácora cerrada |
| WORKFLOW_INVALID_TRANSITION | Transición inválida |
| USER_NOT_PROJECT_MEMBER | Usuario no pertenece al proyecto |
| INSUFFICIENT_PERMISSIONS | Sin permisos |
| ATTACHMENT_INVALID_MIME | MIME no permitido |
| PDF_GENERATION_NOT_ALLOWED | Estado no permite PDF |

---

# 20. Testing mínimo requerido

## Workflow tests

Probar:

- DRAFT → OPEN.
- OPEN → PENDING_APPROVAL.
- PENDING_APPROVAL → APPROVED.
- APPROVED → CLOSED.
- OPEN → CLOSED debe fallar.
- CLOSED no permite edición.

---

## Permission tests

Probar:

- INSPECTOR no aprueba.
- VIEWER no edita.
- DIRECTOR aprueba.
- ADMIN_PROJECT reabre.

---

## Attachment tests

Probar:

- MIME permitido.
- MIME bloqueado.
- tamaño máximo.
- usuario sin proyecto no descarga.

---

# 21. Swagger obligatorio

Cada módulo debe incluir:

- tags,
- DTO schemas,
- auth bearer,
- response examples,
- error examples.

---

# 22. Criterios de terminado por módulo

Un módulo se considera listo si tiene:

- controller,
- service,
- DTOs,
- validaciones,
- Swagger,
- guards si aplica,
- tests mínimos,
- errores estándar,
- auditoría si aplica.

---

# 23. Orden recomendado para Codex

Ejecutar prompts en este orden:

```text
1. Prisma schema alignment
2. Prisma migration
3. AuthModule
4. UsersModule
5. ProjectsModule
6. DailyLogModule CRUD
7. DailyLogWorkflowService
8. DailyLogEventsModule
9. AttachmentsModule
10. AuditModule
11. PdfModule
12. NotificationsModule
```

---

# 24. Recomendación crítica

No avanzar al frontend completo antes de estabilizar:

```text
Auth + Project + DailyLog + Workflow + Permissions
```

---

# 25. Riesgos si se implementa fuera de orden

- Guards sin base de usuarios.
- Workflow sin roles.
- Frontend llamando APIs inestables.
- PDFs sin adjuntos.
- Auditoría incompleta.
- Retrabajo alto.

---

# 26. Recomendación V1

La primera entrega backend real debe incluir:

- Auth funcional.
- Projects funcional.
- DailyLog CRUD.
- Workflow básico.
- Events básico.
- Swagger visible.
- Auditoría inicial.
