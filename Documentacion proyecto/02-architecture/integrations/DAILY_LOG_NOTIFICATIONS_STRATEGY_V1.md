# DAILY_LOG_NOTIFICATIONS_STRATEGY_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\integrations\DAILY_LOG_NOTIFICATIONS_STRATEGY_V1.md
```

---

# 1. Objetivo

Definir la estrategia inicial de notificaciones para el módulo Daily Log.

Este documento servirá como base para:

- alertas operativas,
- workflow notifications,
- aprobaciones,
- recordatorios,
- eventos críticos,
- futuras integraciones email/push.

---

# 2. Objetivos funcionales

El sistema debe permitir:

- informar cambios workflow,
- alertar aprobaciones pendientes,
- informar rechazos,
- alertar cierres,
- informar errores críticos,
- soportar futuras notificaciones automáticas.

---

# 3. Principios

## 3.1 No saturar usuarios

Enviar únicamente notificaciones relevantes.

---

## 3.2 Basado en workflow

Las notificaciones deben dispararse por:

```text
Eventos de dominio
```

---

## 3.3 Backend-driven

Las notificaciones deben originarse desde backend.

---

# 4. Eventos principales

| Evento | Notificación |
|---|---|
| daily-log.created | Opcional |
| daily-log.opened | Opcional |
| daily-log.submitted | Sí |
| daily-log.rejected | Sí |
| daily-log.approved | Sí |
| daily-log.closed | Sí |
| daily-log.reopened | Sí |
| daily-log.pdf-generated | Opcional |

---

# 5. Tipos de notificación V1

| Tipo | Implementar V1 |
|---|---|
| In-app | Sí |
| Email | Recomendado |
| Push móvil | Futuro |
| SMS | Futuro |
| WhatsApp | Futuro |

---

# 6. Casos principales

## 6.1 Submit for approval

Cuando una bitácora pasa a:

```text
PENDING_APPROVAL
```

Notificar:

- Director,
- aprobadores.

---

## 6.2 Reject DailyLog

Notificar:

- usuario que envió,
- responsables proyecto.

---

## 6.3 Approve DailyLog

Notificar:

- residentes,
- responsables cierre.

---

## 6.4 Close DailyLog

Notificar:

- usuarios proyecto,
- auditoría opcional.

---

# 7. Arquitectura propuesta

```text
Workflow Event
  ↓
Notification Service
  ↓
Channels
  ↓
Email / InApp / Future Push
```

---

# 8. Servicio recomendado

```text
NotificationService
```

Responsabilidades:

- construir mensajes,
- resolver destinatarios,
- enviar notificaciones,
- registrar estado entrega.

---

# 9. Entidad Notification

Campos sugeridos:

| Campo | Tipo |
|---|---|
| id | UUID |
| type | String |
| channel | String |
| title | String |
| message | Text |
| recipientId | UUID |
| entityType | String |
| entityId | UUID |
| status | Enum |
| sentAt | Timestamp |
| readAt | Timestamp |
| metadata | JSONB |

---

# 10. Canales V1

## 10.1 In-app

Mostrar:

- campana,
- badge,
- listado notificaciones.

---

## 10.2 Email

Recomendado para:

- aprobación,
- rechazo,
- cierre.

---

# 11. Estrategia email

## Templates recomendados

```text
daily-log-submitted.html
daily-log-rejected.html
daily-log-approved.html
daily-log-closed.html
```

---

# 12. Contenido mínimo email

- proyecto,
- fecha,
- estado,
- usuario responsable,
- link sistema,
- comentarios relevantes.

---

# 13. Reglas frecuencia

Evitar:

- duplicados,
- spam,
- loops workflow.

---

# 14. Estrategia retry

Para emails fallidos:

- retry automático,
- máximo intentos configurables.

---

# 15. Auditoría notificaciones

Registrar:

- destinatario,
- canal,
- fecha envío,
- estado,
- errores.

---

# 16. Seguridad

Nunca enviar:

- URLs públicas inseguras,
- información sensible sin autenticación.

---

# 17. Frontend UX

Mostrar:

- badge unread,
- timeline eventos,
- notificaciones recientes.

---

# 18. Riesgos si no se implementa

- aprobaciones retrasadas,
- usuarios desinformados,
- workflow detenido,
- baja trazabilidad operativa.

---

# 19. Recomendación V1

Implementar:

- notificaciones in-app,
- emails workflow críticos,
- auditoría básica,
- templates HTML simples.

Evitar inicialmente:

- WhatsApp,
- push móvil,
- reglas complejas,
- notificaciones configurables por usuario.
