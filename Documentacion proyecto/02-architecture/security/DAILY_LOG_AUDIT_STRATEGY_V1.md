# DAILY_LOG_AUDIT_STRATEGY_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\security\DAILY_LOG_AUDIT_STRATEGY_V1.md
```

---

# 1. Objetivo

Definir la estrategia de auditoría y trazabilidad para el módulo Daily Log.

La auditoría debe permitir:

- Trazar todas las acciones críticas.
- Identificar quién hizo qué.
- Validar integridad del proceso.
- Soportar revisiones legales o contractuales.
- Detectar modificaciones indebidas.
- Facilitar troubleshooting.
- Soportar futuras integraciones y reporting.

---

# 2. Principios de auditoría

## 2.1 Trazabilidad completa

Toda acción crítica debe quedar registrada.

---

## 2.2 Inmutabilidad lógica

Los registros de auditoría no deben editarse manualmente.

---

## 2.3 Evidencia temporal

Toda acción debe registrar:

- Fecha.
- Hora.
- Usuario.
- Estado origen.
- Estado destino.
- Acción ejecutada.

---

## 2.4 Auditoría backend obligatoria

La auditoría debe ejecutarse desde backend.

Nunca depender únicamente del frontend.

---

# 3. Eventos que deben auditarse

## 3.1 DailyLog

| Acción | Auditar |
|---|---|
| Crear DailyLog | Sí |
| Abrir DailyLog | Sí |
| Editar DailyLog | Sí |
| Enviar a aprobación | Sí |
| Aprobar | Sí |
| Rechazar | Sí |
| Generar PDF | Sí |
| Cerrar DailyLog | Sí |
| Reabrir DailyLog | Sí |
| Cancelar DailyLog | Sí |

---

## 3.2 DailyLogEvent

| Acción | Auditar |
|---|---|
| Crear evento | Sí |
| Editar evento | Sí |
| Eliminar evento | Sí |
| Adjuntar archivo | Sí |
| Eliminar adjunto | Sí |

---

## 3.3 Seguridad

| Acción | Auditar |
|---|---|
| Login | Recomendado |
| Intento fallido | Recomendado |
| Cambio de permisos | Sí |
| Cambio de roles | Sí |
| Reapertura excepcional | Sí |
| Descarga PDF oficial | Recomendado |

---

# 4. Información mínima requerida

Cada registro de auditoría debe contener:

| Campo | Descripción |
|---|---|
| id | Identificador único |
| entity | Entidad afectada |
| entityId | ID de la entidad |
| action | Acción ejecutada |
| fromStatus | Estado origen |
| toStatus | Estado destino |
| performedBy | Usuario ejecutor |
| performedAt | Fecha/hora |
| comment | Comentario opcional |
| reason | Motivo obligatorio cuando aplique |
| requestId | Correlation ID |
| ipAddress | IP origen |
| userAgent | Navegador/dispositivo |
| payloadSnapshot | Snapshot opcional |
| metadata | Información adicional |

---

# 5. Modelo sugerido

## 5.1 Tabla AuditLog

Ejemplo conceptual:

```text
AuditLog
```

Campos sugeridos:

```text
id
entity
entityId
action
fromStatus
toStatus
performedBy
performedAt
comment
reason
requestId
ipAddress
userAgent
payloadSnapshot
metadata
createdAt
```

---

# 6. Ejemplo de auditoría

```json
{
  "entity": "DailyLog",
  "entityId": "uuid",
  "action": "APPROVE_DAILY_LOG",
  "fromStatus": "PENDING_APPROVAL",
  "toStatus": "APPROVED",
  "performedBy": "userId",
  "performedAt": "2026-05-15T16:00:00Z",
  "requestId": "req-123456",
  "ipAddress": "10.0.0.1"
}
```

---

# 7. Estrategia de snapshots

## 7.1 Snapshot recomendado

Para acciones críticas:

- aprobación,
- cierre,
- generación PDF,
- reapertura,

se recomienda almacenar snapshot parcial.

---

## 7.2 Objetivo

Permitir reconstrucción histórica.

Ejemplo:

```text
¿Cómo estaba la bitácora exactamente al momento del cierre?
```

---

## 7.3 Nivel recomendado V1

Guardar snapshot JSON liviano.

No guardar archivos binarios completos en auditoría.

---

# 8. Auditoría de estados

Todas las transiciones del workflow deben auditarse.

| From | Action | To |
|---|---|---|
| DRAFT | OPEN_DAILY_LOG | OPEN |
| OPEN | SUBMIT_FOR_APPROVAL | PENDING_APPROVAL |
| PENDING_APPROVAL | APPROVE_DAILY_LOG | APPROVED |
| APPROVED | CLOSE_DAILY_LOG | CLOSED |

---

# 9. Auditoría de documentos

## 9.1 Adjuntos

Registrar:

- archivo cargado,
- usuario,
- fecha,
- entidad asociada,
- tipo MIME,
- tamaño.

---

## 9.2 PDFs oficiales

Registrar:

- usuario generador,
- versión,
- hash,
- fecha,
- ubicación storage.

---

# 10. Estrategia hash PDF

Recomendación:

Generar hash SHA256 del PDF final.

Objetivo:

- validar integridad,
- detectar modificaciones,
- soportar evidencia legal.

---

# 11. Reglas de retención

## Recomendación inicial

| Tipo | Retención |
|---|---|
| Auditoría DailyLog | Permanente |
| Auditoría seguridad | 5 años mínimo |
| Auditoría errores | 12 meses |
| PDFs oficiales | Permanente |

---

# 12. Reglas de acceso

## 12.1 Lectura auditoría

Permitido para:

- ADMIN_SYSTEM
- ADMIN_PROJECT
- AUDITOR
- DIRECTOR

---

## 12.2 Modificación auditoría

```text
NO PERMITIDA
```

---

# 13. Estrategia técnica NestJS

## 13.1 AuditService

Servicio centralizado:

```text
AuditService
```

Responsabilidades:

- registrar eventos,
- almacenar snapshots,
- manejar metadata,
- persistir auditoría.

---

## 13.2 Interceptors recomendados

Opcionalmente usar:

```text
AuditInterceptor
```

para acciones automáticas.

---

## 13.3 Decorators sugeridos

Ejemplo:

```ts
@AuditAction('APPROVE_DAILY_LOG')
```

---

# 14. Reglas de performance

## Recomendación

La auditoría no debe bloquear operaciones críticas.

Opciones:

- persistencia async,
- cola de eventos,
- background jobs.

Para V1:

```text
Persistencia síncrona controlada.
```

---

# 15. Riesgos si no se implementa

- Pérdida de trazabilidad.
- Riesgos legales.
- Manipulación de información.
- Imposibilidad de investigar incidentes.
- PDFs inconsistentes.
- Falta de evidencia histórica.

---

# 16. Recomendación V1

Implementar obligatoriamente:

- auditoría workflow,
- auditoría eventos,
- auditoría PDFs,
- requestId,
- usuario ejecutor,
- timestamps,
- snapshots básicos.

Dejar para fase posterior:

- SIEM integration,
- analytics avanzados,
- detección anomalías,
- firma criptográfica avanzada,
- event sourcing completo.
