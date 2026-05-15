# DAILY_LOG_FUNCTIONAL_SPECIFICATION_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\01-functional\DAILY_LOG_FUNCTIONAL_SPECIFICATION_V1.md
```

---

# 1. Objetivo

Definir la especificación funcional inicial de la plataforma Bitácora diaria de Obra Civil.

Este documento consolida:

- alcance funcional,
- módulos,
- actores,
- reglas negocio,
- flujos operativos,
- restricciones,
- comportamiento esperado del sistema.

---

# 2. Objetivo del producto

La plataforma permitirá administrar bitácoras digitales de obra civil para múltiples proyectos, garantizando:

- trazabilidad,
- control documental,
- auditoría,
- aprobación formal,
- generación de PDF oficial,
- gestión de evidencias,
- workflow operativo controlado.

---

# 3. Alcance funcional V1

## Incluye

- Administración proyectos.
- Administración usuarios.
- Gestión roles y permisos.
- Daily Logs.
- Eventos diarios.
- Adjuntos.
- Workflow aprobación.
- Auditoría básica.
- Generación PDF.
- Notificaciones básicas.

---

## No incluye inicialmente

- Offline mode.
- Firma digital certificada.
- OCR documentos.
- IA clasificación documentos.
- Multi-step approvals.
- Aplicación móvil nativa.

---

# 4. Actores principales

| Actor | Objetivo |
|---|---|
| ADMIN_SYSTEM | Administración plataforma |
| ADMIN_PROJECT | Administración proyecto |
| DIRECTOR | Aprobación bitácoras |
| RESIDENT_ENGINEER | Operación obra |
| INSPECTOR | Registro eventos |
| VIEWER | Consulta |
| AUDITOR | Revisión trazabilidad |

---

# 5. Módulos funcionales

| Módulo | Objetivo |
|---|---|
| Auth | Autenticación |
| Projects | Gestión proyectos |
| DailyLog | Bitácoras diarias |
| DailyLogEvents | Eventos diarios |
| Attachments | Gestión documental |
| Workflow | Estados y aprobación |
| PDF | Documento oficial |
| Audit | Trazabilidad |
| Notifications | Alertas |

---

# 6. Flujo funcional principal

```text
Crear DailyLog
  ↓
Abrir DailyLog
  ↓
Registrar eventos
  ↓
Adjuntar evidencias
  ↓
Enviar aprobación
  ↓
Aprobar/Rechazar
  ↓
Generar PDF
  ↓
Cerrar DailyLog
```

---

# 7. Reglas funcionales críticas

## 7.1 Secuencia diaria

Un DailyLog no puede abrirse si el día anterior obligatorio no está:

```text
CLOSED
```

---

## 7.2 Workflow obligatorio

Toda transición debe pasar por:

```text
Workflow Service
```

---

## 7.3 PDF oficial

El PDF solo puede generarse cuando:

```text
APPROVED
```

---

## 7.4 Inmutabilidad

Un DailyLog:

```text
CLOSED
```

no debe editarse.

---

# 8. Estados oficiales DailyLog

| Estado | Descripción |
|---|---|
| DRAFT | Creado |
| OPEN | Operativo |
| PENDING_APPROVAL | Revisión |
| APPROVED | Aprobado |
| CLOSED | Cerrado |
| REOPENED | Reabierto |
| CANCELLED | Cancelado |

---

# 9. Gestión eventos

Cada evento debe permitir:

- tipo evento,
- actividad,
- descripción ejecución,
- adjuntos,
- firma,
- usuario reportante,
- fecha/hora.

---

# 10. Tipos evento iniciales sugeridos

| Tipo | Ejemplo |
|---|---|
| Avance obra | Actividades ejecutadas |
| Incidente | Novedad |
| Seguridad | SST |
| Reunión | Comité obra |
| Suspensión | Suspensión parcial/total |
| Observación | Interventoría |

---

# 11. Gestión adjuntos

El sistema debe permitir:

- imágenes,
- PDFs,
- planos,
- documentos Office.

---

# 12. Reglas seguridad

Validar:

- autenticación,
- permisos,
- pertenencia proyecto,
- estado workflow.

---

# 13. Auditoría funcional

Registrar:

- cambios workflow,
- eventos,
- adjuntos,
- generación PDFs,
- reaperturas.

---

# 14. PDF oficial

Debe incluir:

- proyecto,
- fecha,
- eventos,
- imágenes,
- firmas,
- metadata cierre.

---

# 15. Notificaciones funcionales

Eventos recomendados:

- submit approval,
- reject,
- approve,
- close.

---

# 16. Restricciones V1

| Restricción | Motivo |
|---|---|
| Solo online | Simplificar arquitectura |
| Google Drive storage | Rapidez implementación |
| JWT auth | Simplicidad V1 |

---

# 17. Requerimientos no funcionales

| Tipo | Objetivo |
|---|---|
| Seguridad | JWT + RBAC |
| Escalabilidad | Arquitectura modular |
| Auditoría | Obligatoria |
| Disponibilidad | Cloud-ready |
| Performance | Workflow rápido |

---

# 18. Riesgos funcionales

| Riesgo | Impacto |
|---|---|
| Workflow incorrecto | Alto |
| PDFs inconsistentes | Alto |
| Adjuntos inseguros | Alto |
| Permisos incorrectos | Alto |

---

# 19. Recomendación V1

Priorizar:

- estabilidad workflow,
- trazabilidad,
- seguridad,
- operación simple.

Evitar inicialmente:

- features complejas,
- automatizaciones avanzadas,
- dashboards sofisticados.
