# API_STANDARDS_GUIDELINES_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\04-api\API_STANDARDS_GUIDELINES_V1.md
```

---

# 1. Objetivo

Definir los estándares oficiales de diseño y desarrollo de APIs para la plataforma Bitácora diaria de Obra Civil.

Este documento servirá como base para:

- consistencia APIs,
- integración frontend,
- integración futura terceros,
- Swagger/OpenAPI,
- validaciones backend,
- manejo errores,
- seguridad.

---

# 2. Principios generales

## 2.1 Backend como fuente oficial

Toda validación crítica debe ejecutarse en backend.

---

## 2.2 APIs RESTful

Las APIs deben seguir principios REST.

---

## 2.3 JSON estándar

Todas las respuestas deben usar:

```json
application/json
```

---

## 2.4 UUID obligatorio

Todas las entidades principales deben usar UUID.

---

# 3. Base URL

## Convención oficial

```text
/api/v1
```

---

# 4. Naming endpoints

## Recomendación

Usar:

```text
plural kebab-case
```

---

## Ejemplos

```text
/api/v1/daily-logs
/api/v1/daily-log-events
/api/v1/project-members
/api/v1/attachments
```

---

# 5. Métodos HTTP

| Método | Uso |
|---|---|
| GET | Consultar |
| POST | Crear |
| PATCH | Actualizar parcial |
| DELETE | Eliminar lógico/físico |

---

# 6. Responses estándar

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

# 7. HTTP Status Codes

| Código | Uso |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Error |

---

# 8. DTO conventions

## Naming

```text
Create<Entity>Dto
Update<Entity>Dto
```

---

## Ejemplos

```text
CreateDailyLogDto
UpdateDailyLogEventDto
```

---

# 9. Swagger conventions

## Todos los endpoints deben documentarse

Incluir:

- request DTO,
- response DTO,
- examples,
- auth,
- posibles errores.

---

# 10. Authentication

## Estrategia oficial

```text
JWT Bearer Token
```

---

## Header obligatorio

```http
Authorization: Bearer <token>
```

---

# 11. Request headers recomendados

| Header | Uso |
|---|---|
| Authorization | JWT |
| X-Request-Id | Correlation ID |
| Content-Type | Tipo request |

---

# 12. Validaciones obligatorias

## Backend debe validar

- JWT,
- permisos,
- workflow,
- DTOs,
- pertenencia proyecto,
- MIME uploads.

---

# 13. Workflow APIs

## Importante

Nunca permitir:

```text
PATCH status directamente
```

---

## Las transiciones deben ejecutarse mediante endpoints workflow

Ejemplo:

```http
POST /daily-logs/{id}/approve
```

---

# 14. Pagination estándar

## Recomendación

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
```

---

# 15. Sorting y filtros

## Query params recomendados

| Param | Uso |
|---|---|
| page | Paginación |
| pageSize | Tamaño página |
| sortBy | Campo |
| sortOrder | asc/desc |
| status | Filtro estado |
| projectId | Filtro proyecto |

---

# 16. Upload APIs

## Tipo request

```text
multipart/form-data
```

---

## Validaciones

- tamaño,
- extensión,
- MIME,
- permisos.

---

# 17. Naming error codes

## Formato recomendado

```text
ENTITY_REASON
```

---

## Ejemplos

```text
DAILY_LOG_CLOSED
WORKFLOW_INVALID_TRANSITION
ATTACHMENT_INVALID_MIME
```

---

# 18. Logging APIs

Logs deben registrar:

- requestId,
- usuario,
- endpoint,
- duración,
- statusCode.

---

# 19. Security recommendations

## Nunca retornar

- stack traces,
- passwords,
- internal secrets,
- raw DB errors.

---

# 20. Rate limiting

## Recomendado

Aplicar especialmente en:

- login,
- uploads,
- generación PDFs.

---

# 21. Versionamiento APIs

## Convención

```text
/api/v1
```

---

## Futuro

```text
/api/v2
```

sin romper compatibilidad anterior.

---

# 22. Riesgos si no se siguen estándares

- APIs inconsistentes,
- frontend roto,
- deuda técnica,
- integraciones difíciles,
- problemas seguridad.

---

# 23. Recomendación V1

Implementar desde inicio:

- Swagger completo,
- responses estándar,
- JWT,
- requestId,
- DTO validation,
- workflow endpoints separados,
- paginación estándar.
