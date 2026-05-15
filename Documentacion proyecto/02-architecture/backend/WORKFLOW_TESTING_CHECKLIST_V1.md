# WORKFLOW_TESTING_CHECKLIST_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\WORKFLOW_TESTING_CHECKLIST_V1.md
```

---

# 1. Objetivo

Definir el checklist de pruebas funcionales y técnicas para validar el workflow DailyLog sobre el backend existente.

Este documento debe usarse después de implementar o modificar:

- DailyLogWorkflowService.
- Workflow endpoints.
- Guards.
- Permissions.
- Audit.
- DailyLogEvent restrictions.
- Attachment restrictions.

---

# 2. Principio de pruebas

Antes de probar workflow, validar que el backend existente sigue funcionando.

Orden recomendado:

```text
Health → Auth → Swagger → DailyLog → Workflow → Invalid transitions → Permissions → Audit
```

---

# 3. Datos base conocidos

## Backend local

```text
http://127.0.0.1:3000
```

---

## Swagger

```text
http://localhost:3000/swagger
```

---

## Usuario admin demo

```text
Email: admin@bitacora.local
Password: Password123!
```

---

# 4. Checklist rápido

| Prueba | Resultado esperado |
|---|---|
| Health endpoint | status ok |
| Swagger carga | UI visible |
| Login admin | token JWT |
| Crear DailyLog | status DRAFT |
| Open DailyLog | status OPEN |
| Crear evento | evento creado |
| Submit approval | status PENDING_APPROVAL |
| Approve | status APPROVED |
| Generate PDF | PDF generado |
| Close | status CLOSED |
| Editar CLOSED | error |
| Transición inválida | error |

---

# 5. Prueba 1 — Health endpoint

## Request

```http
GET /api/v1/health
```

---

## cURL

```bash
curl -X GET "http://127.0.0.1:3000/api/v1/health"
```

---

## Respuesta esperada

```json
{
  "status": "ok",
  "service": "bitacora-api"
}
```

---

# 6. Prueba 2 — Swagger

Abrir:

```text
http://localhost:3000/swagger
```

Validar:

- Swagger carga.
- Endpoints DailyLog visibles.
- Endpoints workflow visibles.
- Auth Bearer disponible.

---

# 7. Prueba 3 — Login

## Request

```http
POST /api/v1/auth/login
```

---

## Body

```json
{
  "email": "admin@bitacora.local",
  "password": "Password123!"
}
```

---

## Resultado esperado

Debe retornar:

```text
accessToken
```

Guardar token para pruebas siguientes.

---

# 8. Prueba 4 — Crear DailyLog

## Request

```http
POST /api/v1/daily-logs
```

---

## Headers

```text
Authorization: Bearer <TOKEN>
```

---

## Body ejemplo

```json
{
  "projectId": "<PROJECT_ID>",
  "logDate": "2026-05-15"
}
```

---

## Resultado esperado

```json
{
  "status": "DRAFT"
}
```

---

# 9. Prueba 5 — Open DailyLog

## Request

```http
POST /api/v1/daily-logs/{id}/open
```

---

## Resultado esperado

```json
{
  "status": "OPEN"
}
```

---

## Validaciones internas esperadas

- DailyLog estaba en DRAFT.
- Usuario autorizado.
- Proyecto válido.
- Día anterior obligatorio cerrado, si regla ya está implementada.

---

# 10. Prueba 6 — Crear DailyLogEvent

## Request

```http
POST /api/v1/daily-log-events
```

---

## Body ejemplo

```json
{
  "dailyLogId": "<DAILY_LOG_ID>",
  "eventTypeId": "<EVENT_TYPE_ID>",
  "activity": "Vaciado de concreto",
  "executionDescription": "Se ejecuta vaciado en el frente norte."
}
```

---

## Resultado esperado

Evento creado correctamente.

---

## Regla esperada

Solo debe permitir creación si:

```text
DailyLog.status = OPEN
```

---

# 11. Prueba 7 — Submit For Approval

## Request

```http
POST /api/v1/daily-logs/{id}/submit
```

---

## Resultado esperado

```json
{
  "status": "PENDING_APPROVAL"
}
```

---

## Validaciones esperadas

- DailyLog estaba OPEN.
- Existen eventos, si regla aplica.
- No hay eventos incompletos.
- Usuario autorizado.

---

# 12. Prueba 8 — Reject DailyLog

## Request

```http
POST /api/v1/daily-logs/{id}/reject
```

---

## Body

```json
{
  "reason": "Faltan evidencias fotográficas",
  "comments": "Por favor adjuntar fotos del avance."
}
```

---

## Resultado esperado

```json
{
  "status": "OPEN"
}
```

---

## Validación esperada

`reason` debe ser obligatorio.

---

# 13. Prueba 9 — Approve DailyLog

Primero enviar nuevamente a aprobación:

```http
POST /api/v1/daily-logs/{id}/submit
```

Luego aprobar.

---

## Request

```http
POST /api/v1/daily-logs/{id}/approve
```

---

## Body

```json
{
  "comments": "Bitácora aprobada."
}
```

---

## Resultado esperado

```json
{
  "status": "APPROVED"
}
```

---

# 14. Prueba 10 — Generate PDF

## Request

```http
POST /api/v1/daily-logs/{id}/generate-pdf
```

---

## Resultado esperado

Debe generarse PDF o metadata asociada:

```json
{
  "finalPdfHash": "...",
  "finalPdfUrl": "..."
}
```

---

## Regla esperada

Solo permitido si:

```text
DailyLog.status = APPROVED
```

---

# 15. Prueba 11 — Close DailyLog

## Request

```http
POST /api/v1/daily-logs/{id}/close
```

---

## Resultado esperado

```json
{
  "status": "CLOSED"
}
```

---

## Validaciones esperadas

- DailyLog está APPROVED.
- PDF existe.
- Usuario autorizado.

---

# 16. Prueba 12 — Bloqueo edición CLOSED

Intentar editar un evento del DailyLog cerrado.

---

## Request

```http
PATCH /api/v1/daily-log-events/{id}
```

---

## Resultado esperado

Error:

```json
{
  "success": false,
  "errorCode": "DAILY_LOG_CLOSED"
}
```

---

# 17. Prueba 13 — Transición inválida OPEN → CLOSED

Crear otro DailyLog, abrirlo y luego intentar cerrarlo sin aprobar.

---

## Request inválido

```http
POST /api/v1/daily-logs/{id}/close
```

---

## Resultado esperado

```json
{
  "success": false,
  "errorCode": "WORKFLOW_INVALID_TRANSITION"
}
```

---

# 18. Prueba 14 — Transición inválida DRAFT → APPROVED

## Request inválido

```http
POST /api/v1/daily-logs/{id}/approve
```

---

## Resultado esperado

```json
{
  "success": false,
  "errorCode": "WORKFLOW_INVALID_TRANSITION"
}
```

---

# 19. Prueba 15 — Reopen CLOSED

## Request

```http
POST /api/v1/daily-logs/{id}/reopen
```

---

## Body

```json
{
  "reason": "Corrección administrativa requerida",
  "comments": "Se debe corregir una descripción."
}
```

---

## Resultado esperado

```json
{
  "status": "REOPENED"
}
```

---

## Validaciones esperadas

- Solo Admin Project o Admin System.
- Reason obligatorio.
- Auditoría obligatoria.

---

# 20. Prueba 16 — Attachments

## Crear adjunto en OPEN

Debe permitir upload.

---

## Intentar adjunto en CLOSED

Debe bloquear modificación.

Resultado esperado:

```json
{
  "success": false,
  "errorCode": "DAILY_LOG_CLOSED"
}
```

---

# 21. Prueba 17 — Auditoría workflow

Validar que cada transición registre:

```text
WorkflowTransition
AuditLog
```

---

## Request sugerido

```http
GET /api/v1/daily-logs/{id}/workflow-history
```

o

```http
GET /api/v1/daily-logs/{id}/audit
```

---

## Resultado esperado

Debe existir registro para:

- open,
- submit,
- reject,
- approve,
- generate-pdf,
- close,
- reopen.

---

# 22. Prueba 18 — Permisos

## Casos mínimos

| Rol | Acción | Resultado |
|---|---|---|
| VIEWER | approve | Error |
| INSPECTOR | close | Error |
| RESIDENT_ENGINEER | submit | OK |
| DIRECTOR | approve | OK |
| ADMIN_PROJECT | reopen | OK |

---

# 23. Validación base de datos

Verificar en DB:

| Tabla | Qué validar |
|---|---|
| daily_logs | status correcto |
| daily_log_events | dailyLogId correcto |
| workflow_transitions | transiciones registradas |
| audit_logs | auditoría registrada |
| pdf_documents | PDF registrado |
| attachments | metadata correcta |

---

# 24. Validación Swagger

Cada endpoint workflow debe mostrar:

- descripción,
- request body,
- responses,
- error responses,
- bearer auth.

---

# 25. Validación build

Ejecutar:

```bash
npm run build
```

Resultado esperado:

```text
sin errores
```

---

# 26. Validación Prisma

Ejecutar:

```bash
npx prisma generate
```

Si hubo cambios schema:

```bash
npx prisma migrate dev
```

---

# 27. Validación backend runtime

Ejecutar:

```bash
npm run start:dev
```

Validar:

- no errores bootstrap,
- Swagger carga,
- health responde,
- login responde.

---

# 28. Checklist final

| Validación | OK |
|---|---|
| Backend levanta |  |
| Swagger carga |  |
| Login funciona |  |
| DailyLog crea DRAFT |  |
| Open funciona |  |
| Event crea en OPEN |  |
| Submit funciona |  |
| Reject funciona |  |
| Approve funciona |  |
| PDF genera |  |
| Close funciona |  |
| CLOSED bloquea edición |  |
| Invalid transitions fallan |  |
| Audit registra |  |
| Permissions aplican |  |

---

# 29. Criterio de aceptación

El workflow queda aceptado cuando:

```text
El flujo DRAFT → OPEN → PENDING_APPROVAL → APPROVED → CLOSED funciona completo
```

y además:

```text
Las transiciones inválidas son bloqueadas.
Los permisos se respetan.
La auditoría se registra.
Los DailyLogs CLOSED son inmutables.
```
