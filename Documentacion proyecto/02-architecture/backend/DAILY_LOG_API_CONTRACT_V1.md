# DAILY_LOG_API_CONTRACT_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\backend\DAILY_LOG_API_CONTRACT_V1.md
```

---

# 1. Objetivo

Definir el contrato inicial de APIs REST para el módulo Daily Log.

Este documento servirá como base para:

- implementación backend,
- integración frontend,
- Swagger/OpenAPI,
- pruebas QA,
- validaciones,
- futuras integraciones.

---

# 2. Principios API

## 2.1 RESTful

Usar recursos claros y consistentes.

---

## 2.2 JSON estándar

Todas las respuestas deben usar:

```json
application/json
```

---

## 2.3 UUID

Todos los IDs deben ser UUID.

---

## 2.4 Backend como autoridad

El backend valida:

- permisos,
- workflow,
- reglas negocio,
- estados.

---

# 3. Convención endpoints

Base URL:

```text
/api/v1
```

---

# 4. DailyLog Endpoints

## 4.1 Crear DailyLog

### Endpoint

```http
POST /api/v1/daily-logs
```

---

### Request

```json
{
  "projectId": "uuid",
  "logDate": "2026-05-15"
}
```

---

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DRAFT"
  }
}
```

---

## 4.2 Abrir DailyLog

### Endpoint

```http
POST /api/v1/daily-logs/{id}/open
```

---

### Response

```json
{
  "success": true,
  "data": {
    "status": "OPEN"
  }
}
```

---

## 4.3 Obtener DailyLog

### Endpoint

```http
GET /api/v1/daily-logs/{id}
```

---

## 4.4 Listar DailyLogs

### Endpoint

```http
GET /api/v1/daily-logs
```

---

### Query params sugeridos

| Param | Descripción |
|---|---|
| projectId | Filtrar proyecto |
| status | Filtrar estado |
| fromDate | Fecha inicio |
| toDate | Fecha fin |

---

# 5. Workflow Endpoints

## 5.1 Submit For Approval

### Endpoint

```http
POST /api/v1/daily-logs/{id}/submit
```

---

## 5.2 Approve DailyLog

### Endpoint

```http
POST /api/v1/daily-logs/{id}/approve
```

---

### Request

```json
{
  "comments": "Bitácora aprobada"
}
```

---

## 5.3 Reject DailyLog

### Endpoint

```http
POST /api/v1/daily-logs/{id}/reject
```

---

### Request

```json
{
  "reason": "Faltan evidencias fotográficas"
}
```

---

## 5.4 Close DailyLog

### Endpoint

```http
POST /api/v1/daily-logs/{id}/close
```

---

## 5.5 Reopen DailyLog

### Endpoint

```http
POST /api/v1/daily-logs/{id}/reopen
```

---

### Request

```json
{
  "reason": "Corrección administrativa"
}
```

---

# 6. DailyLog Events Endpoints

## 6.1 Crear evento

### Endpoint

```http
POST /api/v1/daily-log-events
```

---

### Request

```json
{
  "dailyLogId": "uuid",
  "eventTypeId": "uuid",
  "activity": "Vaciado concreto",
  "executionDescription": "Se ejecuta vaciado en torre norte"
}
```

---

## 6.2 Editar evento

### Endpoint

```http
PATCH /api/v1/daily-log-events/{id}
```

---

## 6.3 Eliminar evento

### Endpoint

```http
DELETE /api/v1/daily-log-events/{id}
```

---

## 6.4 Obtener evento

### Endpoint

```http
GET /api/v1/daily-log-events/{id}
```

---

# 7. Attachments Endpoints

## 7.1 Upload attachment

### Endpoint

```http
POST /api/v1/attachments/upload
```

---

### Tipo request

```text
multipart/form-data
```

---

### Campos

| Campo | Tipo |
|---|---|
| file | Binary |
| entityType | String |
| entityId | UUID |

---

## 7.2 Download attachment

### Endpoint

```http
GET /api/v1/attachments/{id}/download
```

---

## 7.3 Delete attachment

### Endpoint

```http
DELETE /api/v1/attachments/{id}
```

---

# 8. PDF Endpoints

## 8.1 Generate PDF

### Endpoint

```http
POST /api/v1/daily-logs/{id}/generate-pdf
```

---

## 8.2 Download PDF

### Endpoint

```http
GET /api/v1/daily-logs/{id}/pdf
```

---

# 9. Audit Endpoints

## 9.1 Obtener auditoría DailyLog

### Endpoint

```http
GET /api/v1/daily-logs/{id}/audit
```

---

## 9.2 Obtener workflow transitions

### Endpoint

```http
GET /api/v1/daily-logs/{id}/workflow-history
```

---

# 10. Response estándar

## Éxito

```json
{
  "success": true,
  "data": {}
}
```

---

## Error

```json
{
  "success": false,
  "message": "DailyLog is already closed",
  "errorCode": "DAILY_LOG_CLOSED"
}
```

---

# 11. HTTP Status Codes

| Código | Uso |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 500 | Internal error |

---

# 12. Validaciones backend

## Obligatorias

- JWT válido.
- Permisos.
- Estado workflow.
- Proyecto asociado.
- Validación DTO.
- MIME type uploads.

---

# 13. Headers recomendados

| Header | Uso |
|---|---|
| Authorization | JWT |
| X-Request-Id | Correlation ID |
| Content-Type | Tipo request |

---

# 14. Estrategia versionamiento

Usar:

```text
/api/v1
```

---

# 15. Swagger/OpenAPI

Todos los endpoints deben documentarse.

Incluir:

- request DTOs,
- responses,
- ejemplos,
- auth,
- errores posibles.

---

# 16. Riesgos si no se define contrato temprano

- frontend desacoplado,
- endpoints inconsistentes,
- duplicidad lógica,
- integración lenta,
- deuda técnica.

---

# 17. Recomendación V1

Implementar inicialmente:

- CRUD DailyLog,
- workflow endpoints,
- uploads,
- PDF,
- auditoría,
- Swagger completo.

Evitar inicialmente:

- GraphQL,
- websocket real-time,
- bulk operations complejas,
- APIs públicas externas.
