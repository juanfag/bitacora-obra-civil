# WORKFLOW_BUSINESS_RULES_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\01-functional\WORKFLOW_BUSINESS_RULES_V1.md
```

---

# 1. Objetivo

Definir las reglas de negocio oficiales del workflow DailyLog para la plataforma Bitácora diaria de Obra Civil.

Este documento servirá para:

- implementación backend,
- validaciones workflow,
- QA,
- frontend,
- auditoría,
- control operativo.

---

# 2. Principio principal

El workflow DailyLog es:

```text
Controlado, auditable e inmutable.
```

---

# 3. Estados oficiales

| Estado | Descripción |
|---|---|
| DRAFT | Bitácora creada |
| OPEN | Operación habilitada |
| PENDING_APPROVAL | En revisión |
| APPROVED | Aprobada |
| CLOSED | Cerrada oficialmente |
| REOPENED | Reabierta |
| CANCELLED | Cancelada |

---

# 4. Regla — DailyLog único

## Regla obligatoria

Solo puede existir:

```text
1 DailyLog por proyecto y fecha
```

---

# 5. Regla — Secuencia diaria

## Regla obligatoria

No se puede abrir un nuevo DailyLog si el día anterior requerido no está:

```text
CLOSED
```

---

## Consideraciones futuras

- domingos,
- festivos,
- días no operativos.

---

# 6. Regla — Apertura DailyLog

## Permitido desde

```text
DRAFT
```

---

## Resultado

```text
OPEN
```

---

## Validaciones

- usuario autorizado,
- proyecto activo,
- secuencia válida.

---

# 7. Regla — Registro eventos

## Solo permitido cuando

```text
status = OPEN
```

---

## Permitido

- crear eventos,
- editar eventos,
- adjuntar archivos,
- registrar firmas.

---

# 8. Regla — Submit for approval

## Permitido desde

```text
OPEN
```

---

## Resultado

```text
PENDING_APPROVAL
```

---

## Validaciones

- eventos mínimos,
- campos requeridos,
- evidencias obligatorias si aplica.

---

# 9. Regla — PENDING_APPROVAL

## Restricciones

Durante este estado NO se permite:

- editar eventos,
- eliminar eventos,
- modificar adjuntos.

---

# 10. Regla — Approve DailyLog

## Permitido desde

```text
PENDING_APPROVAL
```

---

## Resultado

```text
APPROVED
```

---

## Validaciones

- rol aprobador,
- permisos proyecto,
- DailyLog íntegro.

---

# 11. Regla — Reject DailyLog

## Permitido desde

```text
PENDING_APPROVAL
```

---

## Resultado

```text
OPEN
```

---

## Obligatorio

Motivo rechazo.

---

# 12. Regla — Generate PDF

## Solo permitido cuando

```text
APPROVED
```

---

## Resultado esperado

PDF oficial generado.

---

# 13. Regla — Close DailyLog

## Permitido desde

```text
APPROVED
```

---

## Resultado

```text
CLOSED
```

---

## Efectos

- bitácora inmutable,
- solo lectura,
- PDF oficial definitivo.

---

# 14. Regla — CLOSED

## Restricciones

NO permitir:

- edición,
- eliminación,
- nuevos eventos,
- nuevos adjuntos.

---

# 15. Regla — Reopen DailyLog

## Permitido desde

```text
CLOSED
```

---

## Resultado

```text
REOPENED
```

---

## Obligatorio

- justificación,
- auditoría,
- permisos especiales.

---

# 16. Regla — REOPENED

## Comportamiento

Debe regresar posteriormente a:

```text
PENDING_APPROVAL
```

---

# 17. Regla — Cancel DailyLog

## Permitido desde

```text
DRAFT
OPEN
```

---

## Resultado

```text
CANCELLED
```

---

# 18. Regla — Auditoría obligatoria

Todas las transiciones deben registrar:

- usuario,
- fecha,
- acción,
- estado origen,
- estado destino,
- requestId.

---

# 19. Regla — Permisos workflow

Cada transición debe validar:

- rol usuario,
- pertenencia proyecto,
- estado válido.

---

# 20. Regla — Adjuntos

## Validaciones obligatorias

- MIME type,
- tamaño máximo,
- usuario autenticado.

---

# 21. Regla — PDF oficial

El PDF generado debe:

- ser inmutable,
- tener hash SHA256,
- quedar auditado.

---

# 22. Regla — Integridad documental

NO debe permitirse:

- modificar PDFs oficiales,
- eliminar auditoría,
- eliminar workflow history.

---

# 23. Regla — Backend authority

El frontend NO puede modificar directamente:

```text
status
```

---

# 24. Regla — APIs workflow

Las transiciones deben ejecutarse mediante:

```http
POST workflow endpoints
```

Ejemplo:

```http
POST /daily-logs/{id}/approve
```

---

# 25. Riesgos si no se respetan reglas

- workflow inconsistente,
- pérdida trazabilidad,
- corrupción documental,
- problemas legales,
- auditoría inválida.

---

# 26. Recomendación V1

Implementar estas reglas desde la primera versión del backend y NO dejar validaciones críticas únicamente en frontend.
