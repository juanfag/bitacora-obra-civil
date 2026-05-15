# DAILY_LOG_PERMISSIONS_MATRIX_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\security\DAILY_LOG_PERMISSIONS_MATRIX_V1.md
```

---

# 1. Objetivo

Definir la matriz inicial de permisos para el módulo Daily Log.

Este documento será base para:

- Guards en NestJS.
- Policies de autorización.
- Validaciones por rol.
- Control de acciones en frontend.
- Auditoría.
- Pruebas funcionales.
- Reglas de aprobación y cierre.

---

# 2. Roles funcionales propuestos

| Rol | Descripción |
|---|---|
| ADMIN_SYSTEM | Administrador global de la plataforma. |
| ADMIN_PROJECT | Administrador del proyecto de obra. |
| DIRECTOR | Director de obra o aprobador principal. |
| RESIDENT_ENGINEER | Residente de obra. |
| INSPECTOR | Inspector o usuario operativo de campo. |
| VIEWER | Usuario de solo consulta. |
| AUDITOR | Usuario auditor con acceso de revisión. |

---

# 3. Principio de seguridad

El sistema debe aplicar el principio de mínimo privilegio.

Esto significa:

```text
Cada usuario solo puede ejecutar las acciones estrictamente necesarias para su rol.
```

La visibilidad en frontend no reemplaza la validación backend.

Toda acción crítica debe validarse en backend.

---

# 4. Matriz general de permisos

| Acción | ADMIN_SYSTEM | ADMIN_PROJECT | DIRECTOR | RESIDENT_ENGINEER | INSPECTOR | VIEWER | AUDITOR |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ver proyectos asignados | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Crear DailyLog | Sí | Sí | Sí | Sí | No | No | No |
| Abrir DailyLog | Sí | Sí | Sí | Sí | No | No | No |
| Ver DailyLog | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Editar DailyLog en DRAFT | Sí | Sí | Sí | Sí | No | No | No |
| Crear evento | Sí | Sí | Sí | Sí | Sí | No | No |
| Editar evento propio | Sí | Sí | Sí | Sí | Sí | No | No |
| Editar evento de otro usuario | Sí | Sí | Sí | No | No | No | No |
| Adjuntar archivos | Sí | Sí | Sí | Sí | Sí | No | No |
| Eliminar adjuntos propios | Sí | Sí | Sí | Sí | Sí | No | No |
| Eliminar adjuntos de otro usuario | Sí | Sí | Sí | No | No | No | No |
| Enviar a aprobación | Sí | Sí | Sí | Sí | No | No | No |
| Aprobar DailyLog | Sí | Sí | Sí | No | No | No | No |
| Rechazar DailyLog | Sí | Sí | Sí | No | No | No | No |
| Generar PDF final | Sí | Sí | Sí | No | No | No | No |
| Cerrar DailyLog | Sí | Sí | Sí | No | No | No | No |
| Reabrir DailyLog cerrado | Sí | Sí | No | No | No | No | No |
| Cancelar DailyLog | Sí | Sí | No | No | No | No | No |
| Consultar auditoría | Sí | Sí | Sí | No | No | No | Sí |

---

# 5. Permisos por estado del DailyLog

## 5.1 Estado DRAFT

| Acción | Permitido para |
|---|---|
| Editar DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, RESIDENT_ENGINEER |
| Abrir DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, RESIDENT_ENGINEER |
| Cancelar DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT |

---

## 5.2 Estado OPEN

| Acción | Permitido para |
|---|---|
| Crear evento | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, RESIDENT_ENGINEER, INSPECTOR |
| Editar evento propio | Usuario creador del evento |
| Editar cualquier evento | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Adjuntar archivos | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, RESIDENT_ENGINEER, INSPECTOR |
| Enviar a aprobación | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, RESIDENT_ENGINEER |
| Cancelar DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT |

---

## 5.3 Estado PENDING_APPROVAL

| Acción | Permitido para |
|---|---|
| Ver eventos | Usuarios autorizados del proyecto |
| Aprobar DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Rechazar DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Editar eventos | No permitido |
| Adjuntar archivos | No permitido |
| Eliminar archivos | No permitido |

---

## 5.4 Estado APPROVED

| Acción | Permitido para |
|---|---|
| Generar PDF final | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Cerrar DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Ver DailyLog | Usuarios autorizados |
| Editar eventos | No permitido |

---

## 5.5 Estado CLOSED

| Acción | Permitido para |
|---|---|
| Ver DailyLog | Usuarios autorizados |
| Ver PDF final | Usuarios autorizados |
| Consultar auditoría | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, AUDITOR |
| Reabrir DailyLog | ADMIN_SYSTEM, ADMIN_PROJECT |
| Editar DailyLog | No permitido |
| Editar eventos | No permitido |

---

## 5.6 Estado REOPENED

| Acción | Permitido para |
|---|---|
| Editar eventos | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Agregar eventos correctivos | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Enviar nuevamente a aprobación | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR |
| Consultar PDF anterior | ADMIN_SYSTEM, ADMIN_PROJECT, DIRECTOR, AUDITOR |

---

## 5.7 Estado CANCELLED

| Acción | Permitido para |
|---|---|
| Ver DailyLog cancelado | ADMIN_SYSTEM, ADMIN_PROJECT, AUDITOR |
| Reactivar DailyLog | No permitido |
| Editar DailyLog | No permitido |
| Editar eventos | No permitido |

---

# 6. Reglas especiales

## 6.1 Propietario del evento

Un usuario puede editar su propio evento únicamente si:

- El DailyLog está en estado OPEN.
- El evento no ha sido aprobado individualmente, si se implementa aprobación por evento.
- El usuario pertenece al proyecto.
- El usuario sigue activo.

---

## 6.2 Aprobador no debería aprobar su propio cierre operativo

Regla recomendada:

```text
El usuario que envía la bitácora a aprobación no debería aprobarla si existe separación de funciones.
```

Para V1 esta regla puede quedar configurable.

Opciones:

1. Permitir aprobación por el mismo usuario.
2. Bloquear aprobación por el mismo usuario.
3. Permitir solo si tiene rol DIRECTOR o ADMIN_PROJECT.

Recomendación:

```text
Para control enterprise, bloquear autoaprobación salvo ADMIN_SYSTEM.
```

---

## 6.3 Viewer

El rol VIEWER nunca debe modificar información.

Puede:

- Ver proyectos asignados.
- Consultar bitácoras.
- Consultar PDF final.
- Descargar documentos si tiene permiso de proyecto.

No puede:

- Crear eventos.
- Adjuntar archivos.
- Aprobar.
- Rechazar.
- Cerrar.
- Cancelar.
- Reabrir.

---

## 6.4 Auditor

El rol AUDITOR debe tener visibilidad ampliada de trazabilidad, pero sin capacidad de modificar registros.

Puede:

- Consultar DailyLogs.
- Consultar eventos.
- Consultar adjuntos.
- Consultar PDFs.
- Consultar auditoría.

No puede:

- Crear.
- Editar.
- Aprobar.
- Cerrar.
- Reabrir.
- Cancelar.

---

# 7. Reglas backend

## 7.1 Validación obligatoria en backend

Toda acción crítica debe validar:

- Usuario autenticado.
- Rol del usuario.
- Pertenencia al proyecto.
- Estado actual del DailyLog.
- Permiso para la acción.
- Restricciones adicionales de negocio.

---

## 7.2 No confiar únicamente en frontend

Aunque el frontend oculte botones, el backend debe rechazar cualquier operación no autorizada.

Ejemplo:

```text
Un INSPECTOR no puede aprobar un DailyLog aunque intente llamar el endpoint directamente.
```

---

## 7.3 Guards sugeridos

Estructura recomendada:

```text
ProjectMembershipGuard
RoleGuard
DailyLogStatusGuard
DailyLogPermissionGuard
```

---

## 7.4 Policies sugeridas

Estructura recomendada:

```text
canCreateDailyLog()
canOpenDailyLog()
canCreateEvent()
canEditEvent()
canSubmitDailyLog()
canApproveDailyLog()
canRejectDailyLog()
canGeneratePdf()
canCloseDailyLog()
canReopenDailyLog()
canCancelDailyLog()
```

---

# 8. Reglas frontend

El frontend debe usar la matriz de permisos para:

- Mostrar u ocultar botones.
- Bloquear campos.
- Mostrar mensajes claros.
- Diferenciar modo edición y modo consulta.
- Evitar acciones inconsistentes.

Ejemplo:

| Estado | Acción visible para DIRECTOR |
|---|---|
| OPEN | Ver eventos, editar, enviar a aprobación |
| PENDING_APPROVAL | Aprobar, rechazar |
| APPROVED | Generar PDF, cerrar |
| CLOSED | Ver PDF |

---

# 9. Mensajes funcionales sugeridos

| Caso | Mensaje |
|---|---|
| Usuario sin permiso | No tienes permisos para ejecutar esta acción. |
| Estado inválido | Esta acción no está permitida en el estado actual de la bitácora. |
| Bitácora cerrada | La bitácora está cerrada y no permite edición. |
| Aprobación no permitida | Tu rol no permite aprobar esta bitácora. |
| Reapertura restringida | Solo un administrador puede reabrir una bitácora cerrada. |

---

# 10. Riesgos si no se controla correctamente

- Usuarios modificando bitácoras cerradas.
- Aprobaciones no autorizadas.
- Eventos manipulados después del cierre.
- PDFs inconsistentes.
- Pérdida de trazabilidad.
- Falta de separación de funciones.
- Riesgos legales o contractuales en la bitácora oficial.

---

# 11. Decisión recomendada para V1

Implementar desde el primer release:

- Roles base.
- Validación backend por rol.
- Validación por estado.
- Validación de pertenencia al proyecto.
- Bloqueo de edición en PENDING_APPROVAL, APPROVED y CLOSED.
- Auditoría de acciones críticas.
- Separación inicial entre operación y aprobación.

Dejar para fase posterior:

- Permisos configurables por cliente.
- Workflows multiaprobador.
- Delegaciones temporales.
- Matriz dinámica administrable desde UI.
