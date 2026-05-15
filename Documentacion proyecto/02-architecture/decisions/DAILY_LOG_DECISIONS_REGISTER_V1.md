# DAILY_LOG_DECISIONS_REGISTER_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\decisions\DAILY_LOG_DECISIONS_REGISTER_V1.md
```

---

# 1. Objetivo

Mantener un registro centralizado de decisiones arquitectónicas, funcionales y técnicas tomadas durante el desarrollo de la plataforma Bitácora diaria de Obra Civil.

Este documento servirá para:

- evitar pérdida de contexto,
- justificar decisiones,
- alinear desarrollo,
- soportar auditoría técnica,
- facilitar escalabilidad futura.

---

# 2. Convención recomendada

Cada decisión debe incluir:

| Campo | Descripción |
|---|---|
| ID | Identificador único |
| Fecha | Fecha decisión |
| Categoría | Arquitectura / Seguridad / UX / Backend / etc |
| Decisión | Qué se decidió |
| Motivo | Por qué se tomó |
| Impacto | Qué afecta |
| Estado | Activa / Reemplazada / Pendiente |

---

# 3. Registro decisiones iniciales

---

## DEC-001

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Arquitectura |
| Decisión | Uso de arquitectura modular con NestJS |
| Motivo | Facilitar escalabilidad y separación de dominios |
| Impacto | Backend completo |
| Estado | Activa |

---

## DEC-002

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Base de datos |
| Decisión | Uso de PostgreSQL como base de datos principal |
| Motivo | Soporte relacional, JSONB y escalabilidad |
| Impacto | Persistencia |
| Estado | Activa |

---

## DEC-003

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | ORM |
| Decisión | Uso de Prisma ORM |
| Motivo | Productividad y tipado fuerte |
| Impacto | Backend |
| Estado | Activa |

---

## DEC-004

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Workflow |
| Decisión | Workflow centralizado mediante DailyLogWorkflowService |
| Motivo | Evitar lógica distribuida y estados inconsistentes |
| Impacto | Backend workflow |
| Estado | Activa |

---

## DEC-005

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Seguridad |
| Decisión | JWT como mecanismo autenticación inicial |
| Motivo | Simplicidad y compatibilidad frontend/backend |
| Impacto | Seguridad |
| Estado | Activa |

---

## DEC-006

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Documentos |
| Decisión | Archivos almacenados en Google Drive |
| Motivo | Rapidez implementación V1 |
| Impacto | Attachments/PDF |
| Estado | Activa |

---

## DEC-007

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | PDFs |
| Decisión | Generación backend usando HTML + Puppeteer |
| Motivo | Flexibilidad visual y facilidad branding |
| Impacto | PDF engine |
| Estado | Activa |

---

## DEC-008

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Auditoría |
| Decisión | Auditoría obligatoria para acciones workflow |
| Motivo | Trazabilidad legal y operativa |
| Impacto | Seguridad / Backend |
| Estado | Activa |

---

## DEC-009

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Frontend |
| Decisión | Uso de Next.js + TailwindCSS |
| Motivo | Productividad y ecosistema moderno |
| Impacto | Frontend |
| Estado | Activa |

---

## DEC-010

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Identificadores |
| Decisión | Uso de UUID en todas las entidades principales |
| Motivo | Seguridad y escalabilidad |
| Impacto | Base datos / APIs |
| Estado | Activa |

---

## DEC-011

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Workflow |
| Decisión | PDF oficial solo después de APPROVED |
| Motivo | Garantizar consistencia documental |
| Impacto | Workflow / PDF |
| Estado | Activa |

---

## DEC-012

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Seguridad |
| Decisión | No permitir edición de DailyLogs CLOSED |
| Motivo | Integridad documental |
| Impacto | Workflow |
| Estado | Activa |

---

## DEC-013

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Arquitectura |
| Decisión | Separar CRUD de workflow |
| Motivo | Mantener reglas negocio centralizadas |
| Impacto | Backend |
| Estado | Activa |

---

## DEC-014

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Seguridad |
| Decisión | Aplicar RBAC + validación pertenencia proyecto |
| Motivo | Seguridad multiusuario |
| Impacto | Seguridad / APIs |
| Estado | Activa |

---

## DEC-015

| Campo | Valor |
|---|---|
| Fecha | 2026-05-15 |
| Categoría | Auditoría |
| Decisión | Uso de requestId/correlationId |
| Motivo | Trazabilidad troubleshooting |
| Impacto | Logs / Auditoría |
| Estado | Activa |

---

# 4. Decisiones pendientes

| ID | Tema | Estado |
|---|---|---|
| PEND-001 | Firma digital certificada | Pendiente |
| PEND-002 | OCR documentos | Pendiente |
| PEND-003 | Push notifications | Pendiente |
| PEND-004 | Offline mode | Pendiente |
| PEND-005 | Multi-step approvals | Pendiente |
| PEND-006 | Integración SharePoint | Pendiente |
| PEND-007 | Antivirus uploads | Pendiente |

---

# 5. Convención futura ADR

## Recomendación

Si el proyecto crece, migrar a:

```text
ADR - Architecture Decision Records
```

Formato sugerido:

```text
ADR-001
ADR-002
ADR-003
```

---

# 6. Reglas mantenimiento

Cada nueva decisión importante debe:

- documentarse,
- tener responsable,
- indicar impacto,
- indicar si reemplaza otra.

---

# 7. Riesgos si no existe registro decisiones

- pérdida contexto,
- decisiones contradictorias,
- deuda técnica,
- retrabajo,
- inconsistencias arquitectura.

---

# 8. Recomendación V1

Mantener este documento actualizado desde el inicio del proyecto.

Especialmente registrar cambios relacionados con:

- workflow,
- seguridad,
- PDFs,
- storage,
- auditoría,
- integraciones,
- permisos.
