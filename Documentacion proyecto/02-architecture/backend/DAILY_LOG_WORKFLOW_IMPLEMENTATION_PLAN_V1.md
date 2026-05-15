# DAILY_LOG_WORKFLOW_IMPLEMENTATION_PLAN_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\DAILY_LOG_WORKFLOW_IMPLEMENTATION_PLAN_V1.md
```

---

# 1. Objetivo

Definir el plan técnico y funcional para implementar el workflow real de DailyLog sobre el backend existente.

Este documento debe servir como guía directa para:

- Codex,
- desarrollo backend,
- validaciones,
- pruebas,
- auditoría,
- estabilización del módulo DailyLog.

---

# 2. Contexto actual

El backend YA EXISTE y ya tiene:

- NestJS operativo,
- Prisma operativo,
- Swagger operativo,
- Login funcional,
- DailyLog existente,
- DailyLogEvent existente,
- Attachments existentes.

El objetivo NO es reconstruir.

El objetivo es:

```text
Agregar workflow controlado sobre la implementación existente.
```

---

# 3. Objetivo funcional workflow

El workflow debe garantizar:

- control estados,
- integridad documental,
- permisos correctos,
- auditoría,
- transición segura,
- protección DailyLogs cerrados.

---

# 4. Estados oficiales

| Estado | Objetivo |
|---|---|
| DRAFT | Creación inicial |
| OPEN | Operación diaria |
| PENDING_APPROVAL | Revisión |
| APPROVED | Aprobado |
| CLOSED | Cerrado oficial |
| REOPENED | Reapertura controlada |
| CANCELLED | Cancelado |

---

# 5. Flujo objetivo

```text
DRAFT
  ↓
OPEN
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
CLOSED
```

---

## Flujos alternos

```text
PENDING_APPROVAL → OPEN
```

(rechazo)

---

```text
CLOSED → REOPENED → PENDING_APPROVAL
```

(reapertura)

---

# 6. Estado actual esperado backend

Antes de implementar workflow revisar:

| Elemento | Verificar |
|---|---|
| DailyLog model | Existe |
| status field | Existe |
| DailyLog endpoints | Existen |
| DailyLogService | Existe |
| Swagger endpoints | Existen |
| Guards auth | Existen |
| Roles | Existen |

---

# 7. Gap esperado

Probablemente aún NO exista:

- WorkflowService real.
- Transiciones controladas.
- Guards workflow.
- Validaciones estado.
- Auditoría workflow.
- Workflow endpoints dedicados.

---

# 8. Arquitectura recomendada

## Crear carpeta

```text
src/modules/daily-log/workflow/
```

---

## Archivos recomendados

```text
daily-log-workflow.service.ts
workflow.constants.ts
workflow.validators.ts
workflow.errors.ts
workflow.types.ts
workflow.permissions.ts
```

---

# 9. DailyLogWorkflowService

## Responsabilidad

Centralizar TODAS las transiciones.

---

## Métodos requeridos

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

# 10. Regla crítica

## Nunca permitir

```text
PATCH status directamente
```

---

## El status SOLO debe cambiar mediante workflow service

---

# 11. Workflow endpoints requeridos

## Recomendación

Agregar endpoints explícitos.

---

## Endpoints

```http
POST /api/v1/daily-logs/{id}/open
POST /api/v1/daily-logs/{id}/submit
POST /api/v1/daily-logs/{id}/approve
POST /api/v1/daily-logs/{id}/reject
POST /api/v1/daily-logs/{id}/close
POST /api/v1/daily-logs/{id}/reopen
POST /api/v1/daily-logs/{id}/cancel
```

---

# 12. Validaciones obligatorias

## OPEN

Validar:

- usuario autorizado,
- DailyLog en DRAFT,
- proyecto activo.

---

## SUBMIT

Validar:

- DailyLog OPEN,
- eventos mínimos,
- adjuntos requeridos si aplica.

---

## APPROVE

Validar:

- rol aprobador,
- proyecto válido,
- DailyLog íntegro.

---

## CLOSE

Validar:

- DailyLog APPROVED,
- PDF generado.

---

## REOPEN

Validar:

- permisos especiales,
- justificación obligatoria.

---

# 13. Tabla transiciones válidas

| From | To | Permitido |
|---|---|---|
| DRAFT | OPEN | Sí |
| OPEN | PENDING_APPROVAL | Sí |
| PENDING_APPROVAL | APPROVED | Sí |
| PENDING_APPROVAL | OPEN | Sí |
| APPROVED | CLOSED | Sí |
| CLOSED | REOPENED | Sí |
| REOPENED | PENDING_APPROVAL | Sí |
| OPEN | CLOSED | No |
| DRAFT | APPROVED | No |
| CLOSED | OPEN | No |

---

# 14. WorkflowPermissionGuard

## Objetivo

Validar permisos por acción.

---

## Validaciones

- rol,
- pertenencia proyecto,
- transición válida.

---

# 15. Roles esperados

| Rol | Acciones |
|---|---|
| INSPECTOR | Eventos |
| RESIDENT_ENGINEER | Submit |
| DIRECTOR | Approve/Reject |
| ADMIN_PROJECT | Reopen |
| VIEWER | Solo lectura |

---

# 16. DTOs requeridos

## RejectDailyLogDto

```text
reason
comments
```

---

## ReopenDailyLogDto

```text
reason
comments
```

---

## ApproveDailyLogDto

```text
comments opcional
```

---

# 17. Auditoría requerida

Cada transición debe registrar:

- usuario,
- timestamp,
- fromStatus,
- toStatus,
- requestId,
- comentarios,
- motivo.

---

# 18. WorkflowTransition table

## Verificar existencia

Si NO existe:

crear modelo Prisma:

```text
WorkflowTransition
```

---

# 19. AuditLog integración

## Recomendación

Workflow debe registrar:

```text
WorkflowTransition + AuditLog
```

---

# 20. Transacciones Prisma

## Obligatorio usar transacción en

```text
approveDailyLog()
closeDailyLog()
reopenDailyLog()
```

---

# 21. Integración PDF

## CloseDailyLog

Debe validar:

```text
finalPdfHash
```

o:

```text
PdfDocument existente
```

---

# 22. Integración Events

## Restricción

Si DailyLog NO está OPEN:

NO permitir:

- crear eventos,
- editar eventos,
- eliminar eventos.

---

# 23. Integración Attachments

## Restricción

Si DailyLog está:

```text
PENDING_APPROVAL
APPROVED
CLOSED
```

bloquear modificaciones adjuntos.

---

# 24. Swagger requerido

Todos los endpoints workflow deben incluir:

- auth bearer,
- response examples,
- posibles errores,
- descripción transición.

---

# 25. Error codes requeridos

| ErrorCode | Uso |
|---|---|
| WORKFLOW_INVALID_TRANSITION | Transición inválida |
| DAILY_LOG_CLOSED | Bitácora cerrada |
| DAILY_LOG_NOT_APPROVED | No aprobada |
| DAILY_LOG_NOT_OPEN | No OPEN |
| DAILY_LOG_PDF_REQUIRED | PDF faltante |
| INSUFFICIENT_PERMISSIONS | Sin permisos |

---

# 26. Tests mínimos requeridos

## Workflow tests

```text
DRAFT → OPEN
OPEN → PENDING_APPROVAL
PENDING_APPROVAL → APPROVED
APPROVED → CLOSED
```

---

## Invalid transitions

```text
OPEN → CLOSED
DRAFT → APPROVED
CLOSED → OPEN
```

deben fallar.

---

## Permission tests

Validar:

- VIEWER no aprueba.
- INSPECTOR no cierra.
- DIRECTOR aprueba.
- ADMIN_PROJECT reabre.

---

# 27. Estrategia implementación

## Paso 1

Revisar DailyLog existente.

---

## Paso 2

Verificar status actual.

---

## Paso 3

Crear WorkflowService.

---

## Paso 4

Agregar workflow endpoints.

---

## Paso 5

Agregar validaciones.

---

## Paso 6

Agregar auditoría.

---

## Paso 7

Agregar tests.

---

## Paso 8

Validar Swagger.

---

# 28. Riesgos principales

| Riesgo | Impacto |
|---|---|
| Cambiar status vía PATCH | Alto |
| Workflow duplicado | Alto |
| Transiciones inválidas | Alto |
| DailyLogs cerrados editables | Alto |
| Auditoría incompleta | Alto |

---

# 29. Prompt recomendado Codex

```text
Implement DailyLogWorkflowService using the EXISTING NestJS backend project.

Important:
- Do NOT recreate modules.
- Extend the current DailyLog implementation.
- Preserve existing endpoints.
- Add dedicated workflow endpoints.
- Validate transitions.
- Add workflow guards.
- Add AuditLog integration.
- Add WorkflowTransition persistence.
- Prevent direct PATCH status updates.
- Update Swagger.
- Add basic workflow tests.
```

---

# 30. Criterio éxito

La implementación se considera correcta si:

- backend sigue levantando,
- login sigue funcionando,
- Swagger sigue funcionando,
- DailyLog CRUD no se rompe,
- workflow funciona,
- estados inválidos fallan,
- DailyLogs CLOSED son inmutables,
- auditoría registra transiciones.
