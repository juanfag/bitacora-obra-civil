# DAILY_LOG_BACKEND_ARCHITECTURE_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\DAILY_LOG_BACKEND_ARCHITECTURE_V1.md
```

---

# 1. Objetivo

Definir la arquitectura backend inicial del módulo Daily Log para la plataforma de Bitácora diaria de Obra Civil.

Este documento servirá como guía para:

- NestJS modules.
- Organización backend.
- Prisma models.
- Servicios de workflow.
- Seguridad.
- Auditoría.
- Integraciones futuras.
- Escalabilidad técnica.

---

# 2. Stack tecnológico definido

| Componente | Tecnología |
|---|---|
| Backend API | NestJS |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | JWT |
| Documentación API | Swagger |
| Storage adjuntos | Google Drive (fase inicial) |
| Validaciones | class-validator |
| Logs | Pino o Winston |
| Queue futura | BullMQ (fase futura) |

---

# 3. Principios arquitectónicos

## 3.1 Modularidad

Cada dominio debe vivir en su propio módulo NestJS.

---

## 3.2 Clean Architecture ligera

Separar:

- controllers,
- services,
- workflow,
- repositories,
- DTOs,
- validators,
- policies.

---

## 3.3 Reglas centralizadas

El workflow no debe implementarse en controllers.

Toda transición debe pasar por:

```text
DailyLogWorkflowService
```

---

## 3.4 Backend como fuente de verdad

Toda validación crítica debe ejecutarse en backend.

Nunca depender únicamente del frontend.

---

# 4. Estructura sugerida módulos NestJS

```text
src/
  modules/
    auth/
    users/
    organizations/
    projects/
    daily-log/
    attachments/
    audit/
    workflow/
    notifications/
```

---

# 5. Estructura interna módulo DailyLog

```text
daily-log/
  controllers/
  services/
  workflow/
  dto/
  validators/
  guards/
  policies/
  repositories/
  mappers/
  events/
  interfaces/
  constants/
```

---

# 6. Controllers sugeridos

## 6.1 DailyLogController

Endpoints sugeridos:

```text
POST   /daily-logs
POST   /daily-logs/:id/open
POST   /daily-logs/:id/submit
POST   /daily-logs/:id/approve
POST   /daily-logs/:id/reject
POST   /daily-logs/:id/close
POST   /daily-logs/:id/reopen
POST   /daily-logs/:id/cancel
GET    /daily-logs/:id
GET    /daily-logs
```

---

## 6.2 DailyLogEventController

Endpoints sugeridos:

```text
POST   /daily-log-events
PATCH  /daily-log-events/:id
DELETE /daily-log-events/:id
GET    /daily-log-events/:id
GET    /daily-log-events
```

---

## 6.3 AttachmentsController

Endpoints sugeridos:

```text
POST   /attachments/upload
DELETE /attachments/:id
GET    /attachments/:id/download
```

---

# 7. Servicios backend

## 7.1 DailyLogService

Responsabilidades:

- CRUD DailyLog.
- Consultas.
- Listados.
- Filtros.

No debe manejar workflow complejo.

---

## 7.2 DailyLogWorkflowService

Responsabilidades:

- Transiciones estado.
- Validaciones workflow.
- Guards funcionales.
- Auditoría workflow.
- Eventos dominio.
- Orquestación PDF.

Métodos sugeridos:

```text
openDailyLog()
submitForApproval()
approveDailyLog()
rejectDailyLog()
closeDailyLog()
reopenDailyLog()
cancelDailyLog()
```

---

## 7.3 DailyLogEventService

Responsabilidades:

- CRUD eventos.
- Validaciones eventos.
- Adjuntos evento.
- Firmas evento.

---

## 7.4 AttachmentService

Responsabilidades:

- Upload archivos.
- Validación MIME.
- Integración storage.
- Metadata archivos.
- Descarga segura.

---

## 7.5 AuditService

Responsabilidades:

- Registrar auditoría.
- Snapshots.
- Request IDs.
- Metadata técnica.

---

# 8. Workflow architecture

## Recomendación

Separar workflow completamente del CRUD.

Estructura sugerida:

```text
workflow/
  workflow.service.ts
  workflow.constants.ts
  workflow.validators.ts
  workflow.guard.ts
  workflow.events.ts
```

---

# 9. Validators sugeridos

## 9.1 Workflow validators

```text
open.validator.ts
submit.validator.ts
approve.validator.ts
reject.validator.ts
close.validator.ts
reopen.validator.ts
cancel.validator.ts
```

---

## 9.2 Event validators

```text
event-required-fields.validator.ts
event-attachments.validator.ts
event-signature.validator.ts
```

---

# 10. Guards sugeridos

| Guard | Objetivo |
|---|---|
| JwtAuthGuard | Usuario autenticado |
| RolesGuard | Validación roles |
| ProjectMembershipGuard | Usuario pertenece al proyecto |
| DailyLogStatusGuard | Estado válido |
| WorkflowPermissionGuard | Permiso acción workflow |

---

# 11. Policies sugeridas

Ejemplos:

```text
canCreateDailyLog()
canOpenDailyLog()
canCreateEvent()
canEditEvent()
canSubmitDailyLog()
canApproveDailyLog()
canRejectDailyLog()
canCloseDailyLog()
canReopenDailyLog()
```

---

# 12. Prisma models sugeridos

## 12.1 DailyLog

Campos iniciales sugeridos:

```text
id
projectId
date
status
openedBy
submittedBy
approvedBy
closedBy
openedAt
submittedAt
approvedAt
closedAt
finalPdfUrl
finalPdfHash
createdAt
updatedAt
```

---

## 12.2 DailyLogEvent

Campos iniciales:

```text
id
dailyLogId
eventTypeId
activity
executionDescription
reportedBy
reportedAt
signatureId
createdAt
updatedAt
```

---

## 12.3 Attachment

Campos iniciales:

```text
id
entityType
entityId
fileName
mimeType
fileSize
storageProvider
storagePath
uploadedBy
uploadedAt
```

---

## 12.4 AuditLog

Campos iniciales:

```text
id
entity
entityId
action
fromStatus
toStatus
performedBy
performedAt
requestId
ipAddress
metadata
```

---

# 13. Estrategia transaccional

## Acciones críticas

Deben ejecutarse en transacción:

- approve,
- close,
- generate PDF,
- reopen.

Objetivo:

Evitar inconsistencias.

---

# 14. Eventos de dominio

Eventos sugeridos:

```text
daily-log.created
daily-log.opened
daily-log.submitted
daily-log.approved
daily-log.closed
daily-log.reopened
daily-log.cancelled
daily-log.pdf-generated
daily-log-event.created
attachment.uploaded
```

---

# 15. Manejo errores

## Recomendación

Usar:

```text
GlobalExceptionFilter
```

Formato estándar:

```json
{
  "success": false,
  "message": "DailyLog is already closed",
  "errorCode": "DAILY_LOG_CLOSED"
}
```

---

# 16. Logging

## Recomendación

Implementar:

- requestId,
- correlationId,
- structured logging.

---

# 17. Swagger

Todos los endpoints deben documentarse.

Incluir:

- DTOs,
- responses,
- auth,
- ejemplos.

---

# 18. Seguridad archivos

## Validaciones mínimas

- MIME type.
- Tamaño máximo.
- Extensiones permitidas.
- Antivirus futuro.
- Descarga autenticada.

---

# 19. Estrategia almacenamiento

## V1

Google Drive.

Guardar:

- metadata DB,
- archivo storage externo.

---

## Futuro

Opciones:

- S3,
- Azure Blob,
- MinIO,
- SharePoint.

---

# 20. Estrategia PDF

Servicio sugerido:

```text
PdfGenerationService
```

Responsabilidades:

- consolidar eventos,
- generar PDF,
- insertar firmas,
- generar hash,
- persistir metadata.

---

# 21. Riesgos si no se implementa correctamente

- lógica duplicada,
- workflow inconsistente,
- permisos inseguros,
- PDFs incorrectos,
- auditoría incompleta,
- deuda técnica alta,
- dificultad escalabilidad.

---

# 22. Recomendación V1

Implementar desde inicio:

- workflow centralizado,
- auditoría,
- guards,
- validators,
- módulos separados,
- requestId,
- structured logging,
- transacciones críticas.

Evitar inicialmente:

- microservicios,
- BPM externo,
- event sourcing completo,
- CQRS complejo,
- multi-tenant avanzado.
