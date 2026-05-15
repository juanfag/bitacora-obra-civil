# NEXT_DEVELOPMENT_SESSION_PLAN_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\05-roadmap\NEXT_DEVELOPMENT_SESSION_PLAN_V1.md
```

---

# 1. Objetivo de la próxima sesión

Continuar el desarrollo real sobre el backend existente, sin reiniciar el proyecto ni romper lo ya validado.

Objetivo principal:

```text
Analizar brechas del backend actual e iniciar implementación segura del DailyLogWorkflowService.
```

---

# 2. Estado actual protegido

Ya existe y debe conservarse:

- Backend NestJS funcional.
- Swagger funcional.
- Health endpoint funcional.
- Login JWT funcional.
- Seed corregido.
- Roles existentes.
- DailyLog existente.
- DailyLogEvent existente.
- Attachments module validado.
- PostgreSQL/Prisma operativo.

---

# 3. Qué NO hacer

No hacer:

```text
Crear nuevo proyecto NestJS.
Reemplazar schema.prisma sin comparar.
Borrar migraciones existentes.
Duplicar módulos existentes.
Romper endpoints actuales.
Modificar status por PATCH directo.
```

---

# 4. Paso 1 — Levantar backend actual

## Comandos

```bash
npm run start:dev
```

Validar:

```text
http://127.0.0.1:3000/api/v1/health
http://localhost:3000/swagger
```

---

# 5. Paso 2 — Validar login

Usar:

```text
Email: admin@bitacora.local
Password: Password123!
```

Confirmar que retorna token JWT.

---

# 6. Paso 3 — Ejecutar gap analysis con Codex

Usar el prompt:

```text
CODEX_BACKEND_GAP_ANALYSIS_PROMPT_V1.md
```

Ubicación:

```text
Documentation proyecto\06-codex\prompts\
```

Objetivo:

```text
Codex debe analizar antes de modificar.
```

---

# 7. Paso 4 — Revisar resultado gap analysis

Clasificar hallazgos:

| Tipo | Acción |
|---|---|
| Ya existe | No tocar |
| Existe parcial | Completar |
| No existe | Implementar |
| Riesgoso | Revisar manualmente |
| Requiere Prisma | Evaluar migración |

---

# 8. Paso 5 — Implementar DailyLogWorkflowService

Usar el prompt:

```text
CODEX_DAILY_LOG_WORKFLOW_IMPLEMENTATION_PROMPT_V1.md
```

Objetivo:

- agregar workflow sin romper CRUD existente,
- crear endpoints faltantes,
- validar transiciones,
- bloquear transiciones inválidas,
- auditar cambios.

---

# 9. Paso 6 — Validar build

Ejecutar:

```bash
npm run build
```

Debe terminar sin errores.

---

# 10. Paso 7 — Validar Prisma

Ejecutar:

```bash
npx prisma generate
```

Si Codex propone cambios Prisma:

```bash
npx prisma migrate dev
```

Antes de migrar, revisar manualmente el cambio.

---

# 11. Paso 8 — Probar workflow

Usar checklist:

```text
WORKFLOW_TESTING_CHECKLIST_V1.md
```

Validar flujo principal:

```text
DRAFT → OPEN → PENDING_APPROVAL → APPROVED → CLOSED
```

---

# 12. Paso 9 — Probar transiciones inválidas

Validar que fallen:

```text
OPEN → CLOSED
DRAFT → APPROVED
CLOSED → OPEN
```

---

# 13. Paso 10 — Probar inmutabilidad CLOSED

Validar que una bitácora cerrada no permita:

- editar eventos,
- crear eventos,
- modificar adjuntos,
- cambiar status directamente.

---

# 14. Resultado esperado de la sesión

La sesión se considera exitosa si:

- backend sigue levantando,
- Swagger sigue funcionando,
- login sigue funcionando,
- DailyLog actual no se rompe,
- DailyLogWorkflowService existe,
- workflow principal funciona,
- transiciones inválidas fallan,
- CLOSED queda bloqueado,
- auditoría o workflow history queda registrada.

---

# 15. Documentos de apoyo

| Documento | Uso |
|---|---|
| BACKEND_CURRENT_STATE_ALIGNMENT_V1.md | Proteger backend existente |
| DAILY_LOG_WORKFLOW_IMPLEMENTATION_PLAN_V1.md | Plan técnico workflow |
| CODEX_BACKEND_GAP_ANALYSIS_PROMPT_V1.md | Análisis inicial Codex |
| CODEX_DAILY_LOG_WORKFLOW_IMPLEMENTATION_PROMPT_V1.md | Implementación Codex |
| WORKFLOW_TESTING_CHECKLIST_V1.md | Pruebas manuales |

---

# 16. Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Codex duplica módulos | Usar gap analysis primero |
| Prisma rompe DB | Revisar schema antes de migrar |
| Swagger deja de cargar | Validar build y start |
| Login se rompe | Probar auth antes/después |
| DailyLog se rompe | Probar CRUD antes/después |
| Workflow incompleto | Usar checklist |

---

# 17. Decisión operativa

Desde esta sesión, el modo de trabajo debe ser:

```text
Analizar → Implementar poco → Probar → Commit
```

No acumular muchos cambios sin validar.
