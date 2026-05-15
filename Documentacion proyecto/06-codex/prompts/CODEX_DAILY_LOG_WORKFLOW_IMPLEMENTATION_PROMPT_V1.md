# CODEX_DAILY_LOG_WORKFLOW_IMPLEMENTATION_PROMPT_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\06-codex\prompts\CODEX_DAILY_LOG_WORKFLOW_IMPLEMENTATION_PROMPT_V1.md
```

---

# 1. Objetivo

Definir un prompt listo para Codex para implementar el workflow real de DailyLog sobre el backend NestJS existente.

Este prompt debe evitar que Codex reinicie el proyecto, duplique módulos o reemplace código funcional.

---

# 2. Contexto obligatorio para Codex

```text
You are working on an existing NestJS backend project for a construction daily log platform.

The project already has:
- NestJS backend running.
- Prisma configured.
- PostgreSQL configured.
- Swagger working.
- JWT login working.
- Existing users/roles.
- Existing DailyLog implementation.
- Existing DailyLogEvent implementation.
- Existing Attachments module.

Do NOT recreate the project.
Do NOT delete existing modules.
Do NOT replace the current Prisma schema blindly.
Do NOT break existing endpoints.
Extend the current implementation safely.
```

---

# 3. Prompt principal

```text
Implement the DailyLog workflow on the existing NestJS backend.

Requirements:

1. Analyze the current DailyLog module first.
2. Identify existing:
   - controllers
   - services
   - DTOs
   - Prisma models
   - guards
   - endpoints
3. Do not duplicate existing code.
4. Create or extend a DailyLogWorkflowService.
5. Add workflow transitions:
   - DRAFT → OPEN
   - OPEN → PENDING_APPROVAL
   - PENDING_APPROVAL → APPROVED
   - PENDING_APPROVAL → OPEN
   - APPROVED → CLOSED
   - CLOSED → REOPENED
   - REOPENED → PENDING_APPROVAL
   - DRAFT → CANCELLED
   - OPEN → CANCELLED
6. Block invalid transitions:
   - OPEN → CLOSED
   - DRAFT → APPROVED
   - CLOSED → OPEN
7. Add dedicated workflow endpoints if missing:
   - POST /api/v1/daily-logs/:id/open
   - POST /api/v1/daily-logs/:id/submit
   - POST /api/v1/daily-logs/:id/approve
   - POST /api/v1/daily-logs/:id/reject
   - POST /api/v1/daily-logs/:id/close
   - POST /api/v1/daily-logs/:id/reopen
   - POST /api/v1/daily-logs/:id/cancel
8. Prevent direct status update through PATCH.
9. Validate project membership and user permissions.
10. Add workflow audit logging.
11. Add WorkflowTransition persistence if the model exists; if not, propose the minimal Prisma change before editing.
12. Use Prisma transactions for:
   - approve
   - close
   - reopen
13. Update Swagger documentation.
14. Add or update tests if the project already has a test structure.
15. Ensure the backend still starts successfully.
```

---

# 4. Reglas de implementación

## 4.1 No romper lo existente

Codex debe preservar:

- login,
- health endpoint,
- Swagger,
- DailyLog CRUD actual,
- DailyLogEvent actual,
- Attachments actual.

---

## 4.2 No cambiar schema sin análisis

Antes de modificar Prisma, Codex debe responder:

```text
Current schema analysis
Required schema changes
Migration impact
```

---

## 4.3 Validación obligatoria

Toda transición debe validar:

- estado actual,
- estado destino,
- rol,
- pertenencia proyecto,
- reglas funcionales.

---

# 5. DTOs esperados

Crear si no existen:

```text
ApproveDailyLogDto
RejectDailyLogDto
ReopenDailyLogDto
CancelDailyLogDto
```

---

# 6. Error codes esperados

```text
WORKFLOW_INVALID_TRANSITION
DAILY_LOG_NOT_FOUND
DAILY_LOG_CLOSED
DAILY_LOG_NOT_OPEN
DAILY_LOG_NOT_APPROVED
DAILY_LOG_PDF_REQUIRED
INSUFFICIENT_PERMISSIONS
USER_NOT_PROJECT_MEMBER
```

---

# 7. Resultado esperado de Codex

Codex debe entregar:

```text
1. Files changed.
2. Files created.
3. Summary of implementation.
4. Commands to run.
5. Tests to execute.
6. Risks or manual checks.
```

---

# 8. Comandos esperados después de implementar

```bash
npm run build
npm run start:dev
npx prisma generate
npx prisma migrate dev
```

Si no hubo cambios Prisma:

```bash
npx prisma generate
npm run build
npm run start:dev
```

---

# 9. Checklist de validación manual

Después de ejecutar Codex, validar:

```text
GET /api/v1/health
Swagger carga
Login funciona
Crear DailyLog
Open DailyLog
Submit DailyLog
Approve DailyLog
Close DailyLog
Intentar transición inválida
Intentar editar CLOSED
```

---

# 10. Prompt corto alternativo

```text
Continue the existing NestJS backend. Do not recreate anything. Implement DailyLogWorkflowService and workflow endpoints safely over the current DailyLog module. Preserve existing endpoints, Swagger, login, DailyLogEvent and Attachments. Validate transitions, permissions and audit. Prevent direct status patching. Return files changed and commands to test.
```

---

# 11. Criterio de aceptación

La implementación es aceptable si:

- no se rompe el backend actual,
- Swagger sigue funcionando,
- login sigue funcionando,
- workflow se ejecuta correctamente,
- transiciones inválidas fallan,
- CLOSED bloquea edición,
- auditoría registra cambios.
