# CODEX_BACKEND_GAP_ANALYSIS_PROMPT_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\06-codex\prompts\CODEX_BACKEND_GAP_ANALYSIS_PROMPT_V1.md
```

---

# 1. Objetivo

Definir un prompt operativo para que Codex analice el backend actual antes de implementar cambios.

Este prompt debe usarse ANTES de pedir implementación de workflow, permisos, auditoría o refactors.

---

# 2. Contexto obligatorio

```text
You are working on an existing NestJS backend project for the Bitácora diaria de Obra Civil application.

The backend already exists and must not be recreated.

Known working items:
- NestJS backend runs.
- Swagger works.
- Health endpoint works.
- JWT login works.
- Prisma is configured.
- PostgreSQL is configured.
- Seed was corrected.
- Roles exist.
- DailyLog exists.
- DailyLogEvent exists.
- Attachments module was validated.

Your task is to analyze the current backend and produce a gap analysis.
Do not modify code yet unless explicitly requested.
```

---

# 3. Prompt principal

```text
Analyze the current NestJS backend codebase.

Do NOT modify files yet.

Review:
1. Project structure.
2. Existing modules.
3. Existing controllers.
4. Existing services.
5. Existing DTOs.
6. Existing guards.
7. Existing Prisma schema.
8. Existing migrations.
9. Existing seed file.
10. Existing Swagger configuration.
11. Existing auth/login implementation.
12. Existing DailyLog implementation.
13. Existing DailyLogEvent implementation.
14. Existing Attachments implementation.

Compare the current implementation against these intended documents:
- BACKEND_CURRENT_STATE_ALIGNMENT_V1.md
- BACKEND_MODULES_IMPLEMENTATION_GUIDE_V1.md
- DAILY_LOG_WORKFLOW_IMPLEMENTATION_PLAN_V1.md
- DAILY_LOG_STATE_MACHINE_V1.md
- DAILY_LOG_PERMISSIONS_MATRIX_V1.md
- WORKFLOW_TESTING_CHECKLIST_V1.md

Return a gap analysis with:

A. What already exists and should not be touched.
B. What exists partially and needs completion.
C. What is missing.
D. What is risky to change.
E. Recommended next implementation order.
F. Exact files that likely need changes.
G. Prisma schema differences, if any.
H. Whether a migration is required.
I. Suggested commands to validate current state.
```

---

# 4. Output esperado

Codex debe responder en este formato:

```text
## Backend Current State

## Existing Modules

## Existing Endpoints

## Existing Prisma Models

## Existing Auth/Security

## Existing DailyLog Capabilities

## Existing Attachments Capabilities

## Gaps vs Target Architecture

## Risks

## Files to Modify

## Prisma Migration Required?

## Recommended Next Steps

## Commands to Run
```

---

# 5. Reglas críticas

## 5.1 No modificar todavía

Codex NO debe cambiar archivos en esta fase.

---

## 5.2 No recrear proyecto

Codex NO debe:

- generar nuevo NestJS app,
- eliminar módulos,
- reemplazar schema completo,
- borrar migraciones.

---

## 5.3 Proteger endpoints existentes

Codex debe identificar endpoints existentes antes de sugerir cambios.

---

# 6. Checklist de análisis esperado

| Área | Debe revisar |
|---|---|
| Auth | login, JWT, guards |
| Users | modelo, service, seed |
| Roles | enums, permisos |
| Projects | modelo y endpoints |
| DailyLog | modelo, CRUD, status |
| DailyLogEvent | modelo, CRUD |
| Attachments | upload, metadata |
| Prisma | schema y migraciones |
| Swagger | decorators, tags |
| Error handling | filters, exceptions |
| Audit | existencia o ausencia |

---

# 7. Preguntas que Codex debe responder

## Preguntas clave

```text
1. ¿Existe ya DailyLogWorkflowService?
2. ¿Existen endpoints /open, /submit, /approve, /close?
3. ¿Se permite actualizar status directamente?
4. ¿Existe WorkflowTransition?
5. ¿Existe AuditLog?
6. ¿Los eventos se bloquean cuando DailyLog no está OPEN?
7. ¿Los adjuntos se bloquean cuando DailyLog está CLOSED?
8. ¿Los roles están integrados con guards?
9. ¿Swagger refleja los endpoints actuales?
10. ¿Se requiere migración Prisma?
```

---

# 8. Comandos de validación sugeridos

Codex debe sugerir ejecutar:

```bash
npm run build
npm run start:dev
npx prisma generate
npx prisma migrate status
```

Si aplica:

```bash
npx prisma studio
```

---

# 9. Resultado aceptable

El análisis es aceptable si permite decidir claramente:

```text
Qué tocar
Qué no tocar
Qué completar
Qué probar
Qué migrar
```

---

# 10. Prompt corto alternativo

```text
Review the existing NestJS backend. Do not modify anything yet. Identify current modules, endpoints, Prisma models, auth, DailyLog, DailyLogEvent and Attachments. Compare against the workflow implementation plan and return a gap analysis, risks, files to modify and whether Prisma migration is needed.
```

---

# 11. Uso recomendado

Ejecutar este prompt inmediatamente antes de:

- implementar workflow,
- tocar Prisma,
- crear guards,
- modificar DailyLog,
- añadir auditoría,
- ajustar permisos.
