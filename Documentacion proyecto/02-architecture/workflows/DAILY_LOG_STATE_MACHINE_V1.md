# DAILY_LOG_STATE_MACHINE_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\workflows\DAILY_LOG_STATE_MACHINE_V1.md
```

---

# 1. Objetivo

Definir la máquina de estados oficial del módulo Daily Log.

Este documento será utilizado como base técnica para:

- Workflow backend.
- Validaciones de transición.
- Guards y policies.
- Auditoría.
- Reglas de concurrencia.
- Eventos de dominio.
- Integraciones futuras.
- Generación de PDF.
- Notificaciones.
- Frontend state handling.

---

# 2. Estados oficiales

| Estado | Descripción |
|---|---|
| DRAFT | Bitácora creada pero aún no abierta oficialmente. |
| OPEN | Bitácora habilitada para registrar eventos. |
| PENDING_APPROVAL | Bitácora enviada a revisión y aprobación. |
| APPROVED | Bitácora aprobada y lista para cierre. |
| CLOSED | Bitácora cerrada oficialmente e inmutable. |
| REOPENED | Bitácora reabierta bajo excepción autorizada. |
| CANCELLED | Bitácora anulada administrativamente. |

---

# 3. Diagrama lógico simplificado

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

PENDING_APPROVAL → OPEN (Reject)
CLOSED → REOPENED
REOPENED → PENDING_APPROVAL

DRAFT → CANCELLED
OPEN → CANCELLED
```

---

# 4. Transiciones válidas

| Estado origen | Acción | Estado destino |
|---|---|---|
| DRAFT | OPEN_DAILY_LOG | OPEN |
| OPEN | SUBMIT_FOR_APPROVAL | PENDING_APPROVAL |
| PENDING_APPROVAL | REJECT_DAILY_LOG | OPEN |
| PENDING_APPROVAL | APPROVE_DAILY_LOG | APPROVED |
| APPROVED | CLOSE_DAILY_LOG | CLOSED |
| CLOSED | REOPEN_DAILY_LOG | REOPENED |
| REOPENED | SUBMIT_FOR_APPROVAL | PENDING_APPROVAL |
| DRAFT | CANCEL_DAILY_LOG | CANCELLED |
| OPEN | CANCEL_DAILY_LOG | CANCELLED |

---

# 5. Transiciones inválidas

| Transición inválida | Motivo |
|---|---|
| DRAFT → CLOSED | Debe pasar por OPEN y APPROVED. |
| OPEN → CLOSED | Debe aprobarse previamente. |
| OPEN → APPROVED | Falta revisión/aprobación formal. |
| PENDING_APPROVAL → CLOSED | Debe generarse aprobación formal. |
| CLOSED → OPEN | Debe manejarse mediante REOPENED. |
| CANCELLED → OPEN | No debe reactivarse directamente. |
| APPROVED → OPEN | Debe manejarse mediante rechazo antes de aprobación o reapertura controlada. |

---

# 6. Validators / Guards por transición

## 6.1 OPEN_DAILY_LOG

Validaciones:

- El proyecto debe existir.
- El usuario debe tener permiso.
- No debe existir otra bitácora para la misma fecha.
- El día anterior obligatorio debe estar CLOSED.
- El calendario operativo debe permitir apertura.

---

## 6.2 SUBMIT_FOR_APPROVAL

Validaciones:

- Estado actual OPEN.
- Debe existir al menos un evento.
- Todos los eventos obligatorios completos.
- Adjuntos válidos.
- Usuario autorizado.

---

## 6.3 APPROVE_DAILY_LOG

Validaciones:

- Estado actual PENDING_APPROVAL.
- Usuario aprobador.
- Eventos revisados.
- Firma válida del aprobador.

---

## 6.4 CLOSE_DAILY_LOG

Validaciones:

- Estado actual APPROVED.
- PDF final generado.
- Firma final registrada.
- Usuario autorizado.

---

## 6.5 REOPEN_DAILY_LOG

Validaciones:

- Estado actual CLOSED.
- Solo Admin Proyecto o Admin Sistema.
- Motivo obligatorio.
- Registro de auditoría obligatorio.

---

# 7. Eventos de dominio

| Evento | Descripción |
|---|---|
| daily-log.created | Bitácora creada. |
| daily-log.opened | Bitácora abierta. |
| daily-log.submitted | Bitácora enviada a aprobación. |
| daily-log.rejected | Bitácora rechazada. |
| daily-log.approved | Bitácora aprobada. |
| daily-log.closed | Bitácora cerrada. |
| daily-log.reopened | Bitácora reabierta. |
| daily-log.cancelled | Bitácora cancelada. |
| daily-log.pdf-generated | PDF final generado. |

---

# 8. Reglas de concurrencia

## 8.1 Evitar doble aprobación

El sistema debe impedir:

```text
APPROVE_DAILY_LOG
```

si la bitácora ya fue aprobada.

---

## 8.2 Evitar doble cierre

No debe ejecutarse:

```text
CLOSE_DAILY_LOG
```

más de una vez.

---

## 8.3 Evitar edición simultánea

Cuando una bitácora esté:

```text
PENDING_APPROVAL
APPROVED
CLOSED
```

los eventos deben quedar bloqueados.

---

## 8.4 Lock transaccional

Se recomienda manejo transaccional para:

- aprobación,
- generación PDF,
- cierre.

Objetivo:

Evitar inconsistencias de estado.

---

# 9. Reglas técnicas backend

## 9.1 Enum centralizado

Recomendación:

```ts
export enum DailyLogStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  CANCELLED = 'CANCELLED',
}
```

---

## 9.2 Transition Map

Recomendación:

```ts
const allowedTransitions = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['OPEN', 'APPROVED'],
  APPROVED: ['CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['PENDING_APPROVAL'],
};
```

---

## 9.3 Workflow Service

Recomendación:

```text
DailyLogWorkflowService
```

Responsabilidades:

- validar transición,
- validar permisos,
- ejecutar auditoría,
- disparar eventos,
- manejar reglas de negocio.

---

## 9.4 Workflow Validators

Separar validaciones por acción:

```text
open.validator.ts
submit.validator.ts
approve.validator.ts
close.validator.ts
reopen.validator.ts
```

---

# 10. Reglas frontend

## 10.1 Botones por estado

Ejemplo:

| Estado | Acciones visibles |
|---|---|
| DRAFT | Open |
| OPEN | Add Event, Submit |
| PENDING_APPROVAL | Approve, Reject |
| APPROVED | Generate PDF, Close |
| CLOSED | View PDF |
| REOPENED | Submit |

---

## 10.2 Read-only dinámico

Estados:

```text
PENDING_APPROVAL
APPROVED
CLOSED
```

deben bloquear edición en frontend y backend.

---

# 11. Auditoría obligatoria

Cada transición debe registrar:

- estado origen,
- estado destino,
- acción,
- usuario,
- fecha/hora,
- comentario,
- motivo si aplica.

Ejemplo:

```json
{
  "entity": "DailyLog",
  "action": "APPROVE_DAILY_LOG",
  "fromStatus": "PENDING_APPROVAL",
  "toStatus": "APPROVED",
  "performedBy": "userId",
  "performedAt": "2026-05-15T15:00:00Z"
}
```

---

# 12. Recomendación arquitectura NestJS

Estructura sugerida:

```text
modules/
  daily-log/
    workflow/
      workflow.service.ts
      workflow.constants.ts
      workflow.validators.ts
      workflow.guard.ts
      workflow.events.ts
```

---

# 13. Riesgos si no se implementa correctamente

- Estados inconsistentes.
- Bitácoras aprobadas sin validación.
- PDFs incorrectos.
- Problemas de auditoría.
- Doble cierre.
- Ediciones no autorizadas.
- Inconsistencia entre frontend y backend.
- Imposibilidad de escalar workflow futuro.

---

# 14. Recomendación V1

Para primera versión:

Implementar obligatoriamente:

- state machine centralizada,
- validaciones backend,
- bloqueo por estado,
- auditoría básica,
- transition map,
- guards de permisos.

Evitar inicialmente:

- workflows configurables dinámicos,
- BPM externo,
- reglas custom por proyecto,
- multi-step approvals complejos.
