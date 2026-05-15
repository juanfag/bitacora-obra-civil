# DAILY_LOG_FRONTEND_FLOW_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\frontend\DAILY_LOG_FRONTEND_FLOW_V1.md
```

---

# 1. Objetivo

Definir el flujo frontend inicial del módulo Daily Log para la plataforma de Bitácora diaria de Obra Civil.

Este documento servirá como base para:

- UX funcional.
- Navegación frontend.
- Pantallas.
- Componentes.
- Estados visuales.
- Integración backend.
- Validaciones UI.
- Manejo workflow.

---

# 2. Stack frontend previsto

| Componente | Tecnología |
|---|---|
| Frontend | Next.js |
| UI | React |
| Estilos | TailwindCSS |
| Formularios | React Hook Form |
| Validaciones | Zod |
| Data fetching | TanStack Query |
| State management | Zustand (si aplica) |
| Auth | JWT |
| Componentes UI | shadcn/ui |

---

# 3. Principios UX

## 3.1 Simplicidad operativa

El usuario de obra debe registrar información rápidamente.

---

## 3.2 Flujo orientado operación

La interfaz debe minimizar:

- clics,
- navegación innecesaria,
- pantallas complejas.

---

## 3.3 Visibilidad estado workflow

Siempre debe verse claramente:

```text
Estado actual del DailyLog
```

Ejemplo:

- OPEN
- PENDING_APPROVAL
- APPROVED
- CLOSED

---

## 3.4 Mobile first recomendado

Muchos usuarios podrían trabajar desde:

- tablets,
- celulares,
- dispositivos en campo.

---

# 4. Flujo principal usuario

## 4.1 Selección proyecto

Pantalla:

```text
Projects Dashboard
```

Usuario selecciona:

- proyecto,
- fecha,
- bitácora existente o nueva.

---

## 4.2 Crear/Open DailyLog

Pantalla:

```text
DailyLog Detail
```

Acciones:

- crear bitácora,
- abrir bitácora,
- visualizar estado.

---

## 4.3 Registro eventos

Pantalla principal operativa:

```text
DailyLog Events Workspace
```

Funciones:

- listar eventos,
- crear evento,
- editar evento,
- adjuntar imágenes,
- firmar evento.

---

## 4.4 Enviar aprobación

Acción visible según permisos:

```text
Submit For Approval
```

Resultado:

```text
OPEN → PENDING_APPROVAL
```

---

## 4.5 Revisión director

Pantalla:

```text
DailyLog Approval View
```

Funciones:

- revisar eventos,
- revisar adjuntos,
- aprobar,
- rechazar.

---

## 4.6 Generar PDF

Pantalla:

```text
DailyLog Finalization
```

Funciones:

- generar PDF,
- visualizar PDF,
- descargar PDF.

---

## 4.7 Cierre DailyLog

Acción final:

```text
Close DailyLog
```

Resultado:

```text
APPROVED → CLOSED
```

---

# 5. Pantallas principales

| Pantalla | Objetivo |
|---|---|
| Login | Autenticación |
| Dashboard proyectos | Selección proyecto |
| DailyLogs list | Lista bitácoras |
| DailyLog detail | Vista principal bitácora |
| Events workspace | Gestión eventos |
| Event modal/form | Crear/editar evento |
| Approval view | Revisión/aprobación |
| PDF view | Visualización PDF |
| Audit view | Consulta auditoría |
| Attachments viewer | Ver archivos |

---

# 6. DailyLog Detail Layout

## Secciones recomendadas

```text
Header
Workflow status
Project info
DailyLog info
Events section
Attachments summary
Approval section
Audit summary
Actions toolbar
```

---

# 7. Header recomendado

Mostrar:

- nombre proyecto,
- fecha,
- estado,
- responsable,
- aprobador,
- consecutivo.

Ejemplo:

```text
Proyecto: Torre Norte
Fecha: 2026-05-15
Estado: OPEN
```

---

# 8. Toolbar acciones

Acciones visibles según:

- estado,
- permisos,
- rol.

Ejemplo:

| Estado | Acciones |
|---|---|
| DRAFT | Open |
| OPEN | Add Event, Submit |
| PENDING_APPROVAL | Approve, Reject |
| APPROVED | Generate PDF, Close |
| CLOSED | View PDF |

---

# 9. Flujo creación evento

## Modal recomendado

Campos:

| Campo | Tipo |
|---|---|
| Tipo evento | Select |
| Actividad | Input |
| Descripción ejecución | Textarea |
| Adjuntos | Upload |
| Firma | Signature component |

---

# 10. Tipos componente recomendados

| Componente | Recomendación |
|---|---|
| Estado workflow | Badge |
| Eventos | Table/Card |
| Adjuntos | Gallery/List |
| Firma | Canvas |
| PDF | Embedded viewer |
| Auditoría | Timeline |

---

# 11. UX estados workflow

## OPEN

Permitir:

- editar,
- agregar eventos,
- adjuntar archivos.

---

## PENDING_APPROVAL

Bloquear:

- edición,
- eliminación,
- uploads.

Mostrar:

```text
Bitácora en revisión
```

---

## APPROVED

Permitir:

- generar PDF,
- visualizar resumen final.

---

## CLOSED

Modo:

```text
Solo lectura
```

---

# 12. Validaciones frontend

## Validaciones mínimas

- campos requeridos,
- tamaño archivos,
- formato archivos,
- descripción obligatoria,
- tipo evento obligatorio.

---

# 13. Reglas frontend/backend

## Importante

El frontend nunca reemplaza validaciones backend.

El backend sigue siendo:

```text
Fuente oficial de verdad
```

---

# 14. Estrategia manejo estado frontend

## Recomendación inicial

TanStack Query para:

- fetching,
- cache,
- invalidaciones,
- optimistic updates.

---

## Zustand opcional

Solo si aparecen:

- estados compartidos complejos,
- filtros globales,
- wizard multi-step.

---

# 15. Manejo errores

## UX recomendada

Mostrar errores claros.

Ejemplos:

| Caso | Mensaje |
|---|---|
| DailyLog cerrada | La bitácora ya está cerrada |
| Sin permisos | No tienes permisos |
| Archivo inválido | Tipo de archivo no permitido |
| Estado inválido | Acción no permitida en este estado |

---

# 16. Estrategia adjuntos

## Upload recomendado

- drag and drop,
- preview imágenes,
- progreso upload,
- eliminación controlada.

---

## Tipos iniciales

- jpg,
- png,
- pdf,
- docx,
- xlsx.

---

# 17. Estrategia mobile

## Prioridades

Optimizar:

- formularios,
- uploads,
- imágenes,
- lectura eventos.

---

## Recomendación

Evitar tablas complejas en móvil.

Usar:

```text
Cards responsive
```

---

# 18. Componentes críticos

## WorkflowStatusBadge

Muestra estado visual.

---

## EventCard

Renderiza:

- tipo,
- actividad,
- descripción,
- adjuntos,
- usuario,
- timestamp.

---

## ApprovalPanel

Funciones:

- aprobar,
- rechazar,
- comentarios.

---

## PdfViewer

Funciones:

- visualizar,
- descargar,
- imprimir.

---

# 19. Seguridad frontend

## Recomendaciones

- ocultar acciones no permitidas,
- proteger rutas,
- validar JWT,
- logout automático expiración,
- no exponer lógica sensible.

---

# 20. Integración backend

## Recomendación

Centralizar llamadas API:

```text
services/api/
```

Ejemplo:

```text
daily-log.api.ts
daily-log-events.api.ts
attachments.api.ts
audit.api.ts
```

---

# 21. Arquitectura carpetas Next.js sugerida

```text
src/
  app/
  modules/
    daily-log/
      components/
      hooks/
      services/
      types/
      validators/
      pages/
```

---

# 22. Riesgos UX si no se diseña correctamente

- usuarios confundidos,
- errores operativos,
- eventos incompletos,
- rechazos frecuentes,
- workflows inconsistentes,
- pérdida productividad en campo.

---

# 23. Recomendación V1

Implementar desde inicio:

- workflow visible,
- UI simple,
- responsive básico,
- uploads robustos,
- manejo errores claro,
- bloqueo por estados,
- integración auditoría.

Evitar inicialmente:

- dashboards complejos,
- drag-drop avanzado workflow,
- offline mode,
- edición colaborativa real-time,
- notificaciones push complejas.
