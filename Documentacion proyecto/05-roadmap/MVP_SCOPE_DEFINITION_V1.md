# MVP_SCOPE_DEFINITION_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\05-roadmap\MVP_SCOPE_DEFINITION_V1.md
```

---

# 1. Objetivo

Definir el alcance oficial del MVP (Minimum Viable Product) para la plataforma Bitácora diaria de Obra Civil.

Este documento servirá para:

- controlar alcance,
- priorizar desarrollo,
- evitar sobreingeniería,
- alinear expectativas cliente,
- acelerar salida inicial.

---

# 2. Definición MVP

El MVP debe resolver:

```text
La operación diaria básica y formal de una bitácora digital de obra civil.
```

---

# 3. Objetivos MVP

## Objetivos principales

- Reemplazar bitácoras manuales.
- Centralizar información diaria.
- Controlar workflow operativo.
- Gestionar evidencias.
- Generar PDF oficial.
- Garantizar trazabilidad básica.

---

# 4. Incluido en MVP

| Funcionalidad | Incluida |
|---|---|
| Login JWT | Sí |
| Gestión proyectos | Sí |
| Gestión usuarios básica | Sí |
| DailyLogs | Sí |
| Eventos diarios | Sí |
| Adjuntos | Sí |
| Workflow aprobación | Sí |
| Auditoría básica | Sí |
| PDF oficial | Sí |
| Notificaciones básicas | Sí |
| Roles y permisos | Sí |

---

# 5. NO incluido en MVP

| Funcionalidad | Estado |
|---|---|
| Offline mode | Fase futura |
| Mobile app nativa | Fase futura |
| Firma digital certificada | Fase futura |
| OCR documentos | Fase futura |
| IA clasificación documentos | Fase futura |
| Multi-step approvals | Fase futura |
| Integración SharePoint | Fase futura |
| Push notifications | Fase futura |

---

# 6. Módulos MVP

## Backend

- Auth
- Projects
- DailyLogs
- DailyLogEvents
- Workflow
- Attachments
- Audit
- PDF
- Notifications

---

## Frontend

- Login
- Dashboard proyectos
- DailyLog workspace
- Approval view
- PDF viewer

---

# 7. Workflow MVP

Estados incluidos:

```text
DRAFT
OPEN
PENDING_APPROVAL
APPROVED
CLOSED
CANCELLED
```

---

# 8. Arquitectura MVP

```text
Next.js
NestJS
PostgreSQL
Prisma
Google Drive
JWT
Docker
```

---

# 9. Restricciones MVP

## Técnicas

- Solo online.
- Google Drive storage.
- JWT simple.
- Single approval flow.

---

## Operativas

- Un aprobador principal.
- Workflow lineal.
- Auditoría básica.

---

# 10. Objetivo de estabilidad

El MVP debe priorizar:

- estabilidad,
- trazabilidad,
- seguridad,
- operación simple.

---

# 11. Riesgos si se expande demasiado el MVP

- retrasos,
- deuda técnica,
- complejidad innecesaria,
- bugs workflow,
- retraso salida producción.

---

# 12. Recomendación estratégica

## Importante

NO intentar resolver desde V1:

- todos los escenarios,
- automatizaciones complejas,
- workflows avanzados,
- BI/reporting sofisticado.

---

# 13. Métricas éxito MVP

| Métrica | Objetivo |
|---|---|
| Crear DailyLog | < 1 minuto |
| Registrar evento | < 30 segundos |
| Generar PDF | < 15 segundos |
| Aprobar DailyLog | Flujo simple |
| Adjuntar evidencia | Fácil y rápido |

---

# 14. Entregables MVP

| Entregable | Estado esperado |
|---|---|
| Backend funcional | Completo |
| Frontend operativo | Completo |
| Workflow estable | Completo |
| PDF oficial | Completo |
| Auditoría básica | Completo |
| Docker deployment | Completo |

---

# 15. Recomendación V1

El MVP debe enfocarse en:

```text
Resolver bien el core operativo antes de escalar funcionalidades avanzadas.
```
