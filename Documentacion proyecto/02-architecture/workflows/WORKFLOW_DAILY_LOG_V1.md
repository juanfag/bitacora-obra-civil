# WORKFLOW_DAILY_LOG_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

Guardar este documento en:

```text
C:\DEV\Bitacora de Obra\docs\WORKFLOW_DAILY_LOG_V1.md
```

## 1. Objetivo del workflow

Definir el flujo funcional y técnico de la bitácora diaria, desde la apertura del día hasta su cierre oficial, incluyendo validaciones, estados, permisos, firmas, adjuntos, aprobación, generación de PDF y trazabilidad.

Este documento servirá como base para:

- Diseño backend.
- Servicios de workflow.
- Validaciones de transición de estado.
- Reglas de permisos.
- Diseño frontend.
- Generación del PDF oficial.
- Auditoría del proceso.

---

## 2. Entidades principales involucradas

### 2.1 Project

Representa una obra o proyecto administrado en la plataforma.

Cada proyecto tiene sus propias bitácoras diarias, usuarios, permisos, calendario operativo y documentos.

### 2.2 DailyLog

Representa la bitácora oficial de un día específico para un proyecto.

Debe controlar:

- Proyecto.
- Fecha de bitácora.
- Estado actual.
- Usuario que abrió la bitácora.
- Usuario que envió a aprobación.
- Usuario aprobador.
- Fecha/hora de apertura.
- Fecha/hora de envío a aprobación.
- Fecha/hora de aprobación.
- Fecha/hora de cierre.
- PDF final.
- Firma de cierre.
- Trazabilidad.

### 2.3 DailyLogEvent

Representa cada evento reportado dentro de una bitácora diaria.

Debe controlar:

- Bitácora diaria asociada.
- Tipo de evento.
- Actividad.
- Descripción de ejecución.
- Usuario reportante.
- Fecha/hora del reporte.
- Adjuntos.
- Firma del reportante.
- Estado del evento, si aplica.

### 2.4 Attachment

Representa archivos cargados como soporte.

Puede asociarse a:

- Proyecto.
- Bitácora diaria.
- Evento de bitácora.
- Documento administrativo.

Ejemplos:

- Fotografías.
- Planos.
- Solicitudes de suspensión.
- Denuncias.
- Demandas.
- Actas.
- Evidencias técnicas.
- Otros soportes.

### 2.5 Signature

Representa una firma funcional o evidencia de aceptación.

Puede aplicar a:

- Firma de evento.
- Firma de cierre diario.
- Firma de aprobación.

---

## 3. Estados del DailyLog

Estados propuestos para la bitácora diaria:

| Estado | Descripción |
|---|---|
| DRAFT | Bitácora creada, aún no abierta formalmente. |
| OPEN | Bitácora activa para registrar eventos. |
| PENDING_APPROVAL | Bitácora enviada a revisión del director/aprobador. |
| APPROVED | Bitácora aprobada para generación del PDF final. |
| CLOSED | Bitácora cerrada oficialmente, bloqueada para edición. |
| REOPENED | Bitácora reabierta por excepción autorizada. |
| CANCELLED | Bitácora anulada por error o decisión administrativa. |

---

## 4. Flujo principal

### 4.1 Crear bitácora diaria

Acción:

```text
Create Daily Log
```

Estado resultante:

```text
DRAFT
```

Validaciones:

- El proyecto debe existir.
- El usuario debe tener permiso para crear bitácoras.
- No debe existir otra bitácora para el mismo proyecto y fecha.
- La fecha debe estar dentro del calendario operativo permitido.

---

### 4.2 Abrir bitácora diaria

Acción:

```text
Open Daily Log
```

Transición:

```text
DRAFT → OPEN
```

Validaciones:

- La bitácora debe estar en estado `DRAFT`.
- El día anterior obligatorio de bitácora debe estar en estado `CLOSED`.
- Se deben considerar domingos, festivos, suspensiones y días no laborables.
- El usuario debe tener permiso para abrir la bitácora.

Regla crítica:

```text
Un día no puede abrirse si el día anterior obligatorio no está CLOSED.
```

---

### 4.3 Registrar eventos

Acción:

```text
Create Daily Log Event
```

Estado requerido del DailyLog:

```text
OPEN
```

Validaciones:

- La bitácora debe estar abierta.
- El usuario debe tener permiso para registrar eventos.
- El tipo de evento debe existir en el catálogo.
- La actividad es obligatoria.
- La descripción de ejecución es obligatoria.
- La firma del reportante debe capturarse según regla funcional.
- Los adjuntos deben cargarse correctamente, si existen.

Campos mínimos del evento:

- Tipo de evento.
- Actividad.
- Descripción de ejecución.
- Adjuntos.
- Firma del reportante.
- Usuario reportante.
- Fecha/hora de registro.

---

### 4.4 Editar eventos

Acción:

```text
Update Daily Log Event
```

Estado requerido del DailyLog:

```text
OPEN
```

Reglas:

- El usuario reportante puede editar su propio evento mientras la bitácora esté `OPEN`.
- El director o administrador puede editar según permisos.
- No se permite editar eventos cuando la bitácora esté `PENDING_APPROVAL`, `APPROVED` o `CLOSED`.
- Toda edición debe quedar auditada.

---

### 4.5 Enviar bitácora a aprobación

Acción:

```text
Submit Daily Log For Approval
```

Transición:

```text
OPEN → PENDING_APPROVAL
```

Validaciones:

- La bitácora debe estar en estado `OPEN`.
- Debe existir al menos un evento registrado, salvo excepción configurada.
- Todos los eventos obligatorios deben estar completos.
- Todos los adjuntos deben estar cargados correctamente.
- No deben existir eventos incompletos.
- El usuario debe tener permiso para enviar a aprobación.

Resultado:

- La bitácora queda bloqueada para edición operativa.
- El aprobador puede revisar los eventos.
- Se registra fecha/hora de envío.

---

### 4.6 Rechazar bitácora

Acción:

```text
Reject Daily Log
```

Transición:

```text
PENDING_APPROVAL → OPEN
```

Validaciones:

- La bitácora debe estar en estado `PENDING_APPROVAL`.
- El usuario debe tener rol aprobador.
- El comentario de rechazo es obligatorio.

Resultado:

- La bitácora vuelve a edición.
- Se registra el motivo del rechazo.
- Se conserva trazabilidad del rechazo.

---

### 4.7 Aprobar bitácora

Acción:

```text
Approve Daily Log
```

Transición:

```text
PENDING_APPROVAL → APPROVED
```

Validaciones:

- La bitácora debe estar en estado `PENDING_APPROVAL`.
- El usuario debe tener rol aprobador.
- Todos los eventos deben estar revisados.
- La firma o aceptación del aprobador debe capturarse según regla funcional.

Resultado:

- La bitácora queda lista para generación de PDF final.
- Se registra usuario aprobador.
- Se registra fecha/hora de aprobación.

---

### 4.8 Generar PDF final

Acción:

```text
Generate Final PDF
```

Estado requerido:

```text
APPROVED
```

Validaciones:

- La bitácora debe estar aprobada.
- El PDF no debe haber sido generado previamente, salvo regeneración autorizada.
- Deben existir eventos consolidados.
- Debe existir firma o aprobación válida.

Resultado:

- Se genera PDF oficial.
- Se almacena referencia del archivo.
- Se registra versión/hash del documento.
- Se crea snapshot de datos usados para el PDF.

---

### 4.9 Cerrar bitácora diaria

Acción:

```text
Close Daily Log
```

Transición:

```text
APPROVED → CLOSED
```

Validaciones:

- La bitácora debe estar aprobada.
- El PDF final debe existir.
- La firma de cierre debe existir.
- El usuario debe tener permiso de cierre.

Resultado:

- La bitácora queda cerrada oficialmente.
- No se permite edición directa.
- Se habilita la apertura del siguiente día obligatorio.
- Se conserva trazabilidad completa.

---

## 5. Transiciones permitidas

| Estado origen | Acción | Estado destino |
|---|---|---|
| DRAFT | Open Daily Log | OPEN |
| OPEN | Submit For Approval | PENDING_APPROVAL |
| PENDING_APPROVAL | Reject | OPEN |
| PENDING_APPROVAL | Approve | APPROVED |
| APPROVED | Close | CLOSED |
| CLOSED | Reopen by Exception | REOPENED |
| REOPENED | Submit For Approval | PENDING_APPROVAL |
| DRAFT | Cancel | CANCELLED |
| OPEN | Cancel | CANCELLED |

---

## 6. Transiciones no permitidas

| Transición | Motivo |
|---|---|
| DRAFT → CLOSED | Debe pasar por apertura, aprobación y cierre. |
| OPEN → CLOSED | Debe pasar por aprobación. |
| PENDING_APPROVAL → CLOSED | Falta aprobación formal y PDF final. |
| CLOSED → OPEN | Debe manejarse como reapertura excepcional. |
| CANCELLED → OPEN | Una bitácora cancelada no debe reactivarse directamente. |

---

## 7. Permisos sugeridos por rol

| Acción | Residente | Inspector | Director/Aprobador | Admin Proyecto | Admin Sistema |
|---|---:|---:|---:|---:|---:|
| Crear DailyLog | Sí | No | Sí | Sí | Sí |
| Abrir DailyLog | Sí | No | Sí | Sí | Sí |
| Crear evento | Sí | Sí | Sí | Sí | Sí |
| Editar evento propio | Sí | Sí | Sí | Sí | Sí |
| Editar evento de otro usuario | No | No | Sí | Sí | Sí |
| Enviar a aprobación | Sí | No | Sí | Sí | Sí |
| Aprobar bitácora | No | No | Sí | Sí | Sí |
| Rechazar bitácora | No | No | Sí | Sí | Sí |
| Generar PDF final | No | No | Sí | Sí | Sí |
| Cerrar bitácora | No | No | Sí | Sí | Sí |
| Reabrir bitácora | No | No | No | Sí | Sí |
| Cancelar bitácora | No | No | No | Sí | Sí |

---

## 8. Reglas de edición por estado

| Estado | Edición de DailyLog | Edición de eventos | Adjuntos | PDF |
|---|---|---|---|---|
| DRAFT | Sí | No aplica | No aplica | No |
| OPEN | Sí | Sí | Sí | No |
| PENDING_APPROVAL | No | No | Solo lectura | No |
| APPROVED | No | No | Solo lectura | Sí |
| CLOSED | No | No | Solo lectura | Solo lectura |
| REOPENED | Limitada | Sí, según permiso | Sí | Regeneración controlada |
| CANCELLED | No | No | No | No |

---

## 9. Auditoría requerida

Cada transición debe registrar:

- Identificador de la bitácora.
- Estado origen.
- Estado destino.
- Acción ejecutada.
- Usuario ejecutor.
- Fecha/hora.
- Comentario, cuando aplique.
- Motivo obligatorio en rechazos, cancelaciones y reaperturas.
- Correlation ID o request ID, si aplica.
- IP o metadata técnica, si se decide implementar.

Ejemplo de evento de auditoría:

```json
{
  "entity": "DailyLog",
  "entityId": "uuid",
  "action": "SUBMIT_FOR_APPROVAL",
  "fromStatus": "OPEN",
  "toStatus": "PENDING_APPROVAL",
  "performedBy": "userId",
  "performedAt": "2026-05-15T10:30:00Z",
  "comment": "Se envía bitácora para revisión"
}
```

---

## 10. Reglas del PDF final

El PDF oficial debe generarse únicamente cuando la bitácora esté en estado:

```text
APPROVED
```

Contenido mínimo sugerido:

- Datos del proyecto.
- Fecha de bitácora.
- Consecutivo o identificador.
- Estado final.
- Listado de eventos del día.
- Tipo de evento.
- Actividad.
- Descripción de ejecución.
- Usuario reportante.
- Fecha/hora del evento.
- Adjuntos o referencias.
- Firma del reportante.
- Firma del aprobador.
- Fecha/hora de aprobación.
- Fecha/hora de cierre.

Reglas:

- El PDF debe ser inmutable una vez la bitácora esté `CLOSED`.
- Si se requiere corrección, debe usarse reapertura o adenda.
- Se recomienda almacenar hash del PDF para control de integridad.

---

## 11. Casos excepcionales

### 11.1 Día sin eventos

Pendiente de definición con cliente.

Opciones:

1. No permitir cierre sin eventos.
2. Permitir cierre con justificación obligatoria.
3. Crear evento automático tipo “Sin actividad”.

Recomendación inicial:

```text
Permitir cierre sin eventos solo con justificación obligatoria y permiso de director/aprobador.
```

### 11.2 Reapertura de bitácora cerrada

Debe ser una acción excepcional.

Reglas:

- Solo Admin Proyecto o Admin Sistema.
- Motivo obligatorio.
- Debe quedar auditada.
- Puede requerir regeneración de PDF.
- Se debe conservar versión anterior del PDF.

### 11.3 Suspensión de obra

Si existe suspensión formal:

- El día puede marcarse como no operativo.
- Debe existir documento soporte.
- No debe bloquear la apertura del siguiente día obligatorio.

### 11.4 Festivos y domingos

No deben asumirse automáticamente iguales para todos los proyectos.

Cada proyecto debe tener un calendario operativo configurable.

---

## 12. Recomendación técnica inicial

Implementar un servicio de workflow centralizado:

```text
DailyLogWorkflowService
```

Responsabilidades:

- Validar transición de estados.
- Validar permisos.
- Ejecutar reglas de negocio.
- Registrar auditoría.
- Orquestar generación de PDF.
- Bloquear operaciones no permitidas.

Métodos sugeridos:

```text
openDailyLog()
submitForApproval()
approveDailyLog()
rejectDailyLog()
generateFinalPdf()
closeDailyLog()
reopenDailyLog()
cancelDailyLog()
```

---

## 13. Pendientes por confirmar con cliente

- Roles finales.
- Catálogo de tipos de evento.
- Formato oficial del PDF.
- Tipo de firma requerida.
- Reglas para días sin actividad.
- Reglas para suspensión de obra.
- Calendario laboral por proyecto.
- Responsables de aprobación.
- Necesidad de notificaciones.
- Reglas legales de inmutabilidad documental.

---

## 14. Decisión recomendada para V1

Para la primera versión del producto, se recomienda implementar:

- Estados: `DRAFT`, `OPEN`, `PENDING_APPROVAL`, `APPROVED`, `CLOSED`, `CANCELLED`.
- Dejar `REOPENED` diseñado pero controlado para una fase posterior.
- PDF solo después de aprobación.
- Cierre solo con PDF generado.
- Auditoría desde el primer release.
- Calendario operativo básico por proyecto.
