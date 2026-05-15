# DAILY_LOG_IMPLEMENTATION_ROADMAP_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\01-project-management\DAILY_LOG_IMPLEMENTATION_ROADMAP_V1.md
```

---

# 1. Objetivo

Definir el roadmap inicial de implementación técnica y funcional para la plataforma Bitácora diaria de Obra Civil.

Este documento servirá como guía para:

- priorización,
- desarrollo,
- entregables,
- control avance,
- planeación técnica,
- fases implementación.

---

# 2. Estrategia recomendada

## Enfoque incremental

Construir el sistema por capas:

```text
Fundación → Workflow → Operación → Documentos → Seguridad → Escalabilidad
```

---

# 3. Fases propuestas

| Fase | Objetivo |
|---|---|
| Fase 0 | Setup técnico |
| Fase 1 | Core backend |
| Fase 2 | Workflow DailyLog |
| Fase 3 | Eventos y adjuntos |
| Fase 4 | PDF oficial |
| Fase 5 | Seguridad y auditoría |
| Fase 6 | Frontend operativo |
| Fase 7 | Integraciones y mejoras |

---

# 4. Fase 0 — Setup técnico

## Objetivo

Preparar fundación técnica proyecto.

---

## Actividades

| Actividad | Estado |
|---|---|
| Crear repositorio | Completado |
| Configurar NestJS | Completado |
| Configurar Prisma | Completado |
| Configurar PostgreSQL | Completado |
| Configurar Swagger | Completado |
| Configurar Auth JWT | En progreso |
| Configurar estructura módulos | En progreso |
| Configurar documentación | Completado |

---

# 5. Fase 1 — Core backend

## Objetivo

Implementar entidades base.

---

## Entidades prioritarias

| Entidad | Prioridad |
|---|---|
| Organization | Alta |
| User | Alta |
| Project | Alta |
| ProjectMember | Alta |
| DailyLog | Alta |
| DailyLogEvent | Alta |

---

## Entregables

- Prisma schema base.
- Migraciones iniciales.
- CRUD básico.
- DTOs.
- Swagger inicial.

---

# 6. Fase 2 — Workflow DailyLog

## Objetivo

Implementar máquina estados.

---

## Actividades

| Actividad | Prioridad |
|---|---|
| DailyLogWorkflowService | Alta |
| Transition validators | Alta |
| Workflow guards | Alta |
| Workflow endpoints | Alta |
| Workflow audit | Alta |

---

## Estados implementar

```text
DRAFT
OPEN
PENDING_APPROVAL
APPROVED
CLOSED
CANCELLED
```

---

# 7. Fase 3 — Eventos y adjuntos

## Objetivo

Permitir operación diaria real.

---

## Actividades

| Actividad | Prioridad |
|---|---|
| CRUD eventos | Alta |
| Upload imágenes | Alta |
| Upload documentos | Alta |
| Preview archivos | Media |
| Google Drive integration | Alta |

---

# 8. Fase 4 — PDF oficial

## Objetivo

Generar documento oficial.

---

## Actividades

| Actividad | Prioridad |
|---|---|
| PdfGenerationService | Alta |
| Template HTML | Alta |
| Hash SHA256 | Media |
| Versionado PDF | Media |
| Download PDF | Alta |

---

# 9. Fase 5 — Seguridad y auditoría

## Objetivo

Fortalecer control operativo.

---

## Actividades

| Actividad | Prioridad |
|---|---|
| RBAC | Alta |
| ProjectMembershipGuard | Alta |
| AuditLog | Alta |
| RequestId | Media |
| Structured logging | Media |

---

# 10. Fase 6 — Frontend operativo

## Objetivo

Construir operación usuario final.

---

## Pantallas prioritarias

| Pantalla | Prioridad |
|---|---|
| Login | Alta |
| Dashboard proyectos | Alta |
| DailyLog detail | Alta |
| Events workspace | Alta |
| Approval view | Alta |
| PDF viewer | Media |

---

# 11. Fase 7 — Integraciones y mejoras

## Objetivo

Preparar escalabilidad futura.

---

## Funcionalidades futuras

| Funcionalidad | Prioridad futura |
|---|---|
| Push notifications | Media |
| OCR documentos | Baja |
| SharePoint | Media |
| Firma digital certificada | Alta |
| Offline mode | Alta |
| Mobile app | Media |

---

# 12. Dependencias críticas

| Dependencia | Impacto |
|---|---|
| Workflow | Bloquea frontend |
| Auth | Bloquea APIs |
| Attachments | Bloquea PDF |
| Audit | Bloquea compliance |

---

# 13. Riesgos principales

| Riesgo | Impacto |
|---|---|
| Workflow mal diseñado | Alto |
| PDFs inconsistentes | Alto |
| Seguridad insuficiente | Alto |
| Adjuntos inseguros | Alto |
| Falta auditoría | Alto |

---

# 14. Orden recomendado desarrollo

```text
1. Auth
2. Project
3. DailyLog
4. Workflow
5. Events
6. Attachments
7. PDF
8. Audit
9. Frontend
10. Notifications
```

---

# 15. Recomendación técnica importante

NO construir:

- frontend completo,
- PDFs,
- notificaciones,

antes de estabilizar:

```text
Workflow + permisos + auditoría
```

---

# 16. Estrategia Git recomendada

## Branches sugeridos

```text
main
develop
feature/*
hotfix/*
```

---

## Ejemplos

```text
feature/daily-log-workflow
feature/attachments-module
feature/pdf-generation
```

---

# 17. Estrategia testing

## Backend

- unit tests,
- validators,
- workflow tests.

---

## Frontend

- form validations,
- workflow UI,
- permissions.

---

# 18. Recomendación V1

Priorizar:

- estabilidad,
- workflow,
- seguridad,
- trazabilidad.

Evitar inicialmente:

- features complejas,
- automatizaciones avanzadas,
- dashboards sofisticados,
- microservicios.
