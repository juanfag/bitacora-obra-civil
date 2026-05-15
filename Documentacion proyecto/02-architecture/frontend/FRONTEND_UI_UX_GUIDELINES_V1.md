# FRONTEND_UI_UX_GUIDELINES_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\frontend\FRONTEND_UI_UX_GUIDELINES_V1.md
```

---

# 1. Objetivo

Definir los lineamientos oficiales UI/UX para el frontend de la plataforma Bitácora diaria de Obra Civil.

Este documento servirá para:

- mantener consistencia visual,
- mejorar experiencia usuario,
- facilitar desarrollo frontend,
- alinear diseño con operación real de obra.

---

# 2. Principios UX

## 2.1 Simplicidad operativa

El sistema debe ser rápido y simple de usar en campo.

---

## 2.2 Minimizar clics

Reducir pasos innecesarios.

---

## 2.3 Priorizar operación

La interfaz debe enfocarse en:

- registrar información,
- adjuntar evidencias,
- aprobar workflow.

---

## 2.4 Mobile-first recomendado

Muchos usuarios trabajarán desde:

- tablets,
- celulares,
- dispositivos en obra.

---

# 3. Estilo visual recomendado

## Características

- limpio,
- corporativo,
- técnico,
- moderno,
- minimalista.

---

# 4. Stack frontend oficial

| Componente | Tecnología |
|---|---|
| Framework | Next.js |
| UI | React |
| Styling | TailwindCSS |
| Components | shadcn/ui |
| Forms | React Hook Form |
| Validation | Zod |
| Data fetching | TanStack Query |

---

# 5. Layout principal recomendado

```text
Sidebar
Topbar
Content Workspace
Action Toolbar
```

---

# 6. Navegación principal

## Menú recomendado

| Módulo | Visible |
|---|---|
| Dashboard | Sí |
| Projects | Sí |
| DailyLogs | Sí |
| Attachments | Sí |
| Audit | Sí |
| Settings | Opcional |

---

# 7. Workflow visibility

## Obligatorio

El estado del DailyLog debe verse siempre.

---

## Recomendación visual

Usar:

```text
Status Badges
```

---

## Ejemplo

| Estado | Color sugerido |
|---|---|
| DRAFT | Gris |
| OPEN | Azul |
| PENDING_APPROVAL | Amarillo |
| APPROVED | Verde |
| CLOSED | Negro/gris oscuro |

---

# 8. Componentes principales

| Componente | Uso |
|---|---|
| StatusBadge | Estados workflow |
| EventCard | Eventos |
| AttachmentGallery | Imágenes |
| ApprovalPanel | Aprobaciones |
| AuditTimeline | Auditoría |
| PdfViewer | PDFs |

---

# 9. Formularios

## Recomendaciones

- labels visibles,
- validación inmediata,
- errores claros,
- pocos campos por sección.

---

# 10. Inputs

## Recomendación

Usar:

- selects,
- textareas,
- datepickers,
- upload drag-drop.

---

# 11. Eventos DailyLog

## Visualización recomendada

Cards responsive.

---

## Cada evento debe mostrar

- tipo,
- actividad,
- descripción,
- usuario,
- hora,
- adjuntos,
- firma.

---

# 12. Adjuntos

## UX recomendada

- drag & drop,
- preview imágenes,
- progreso upload,
- descarga simple.

---

# 13. PDFs

## Funcionalidades mínimas

- visualizar,
- descargar,
- imprimir.

---

# 14. Responsive design

## Prioridades

Optimizar:

- formularios,
- uploads,
- lectura eventos,
- aprobación workflow.

---

# 15. Tablas

## Recomendación

Evitar tablas complejas en móvil.

Usar:

```text
Cards responsive
```

---

# 16. Estados loading

## Obligatorio

Mostrar feedback visual:

- skeletons,
- spinners,
- loading states.

---

# 17. Estados vacíos

## Recomendación

Mostrar mensajes claros.

Ejemplo:

```text
No hay eventos registrados todavía.
```

---

# 18. Manejo errores

## Recomendación UX

Mensajes claros y accionables.

---

## Ejemplos

| Error | Mensaje |
|---|---|
| Sin permisos | No tienes permisos |
| Workflow inválido | Acción no permitida |
| Upload inválido | Archivo no permitido |

---

# 19. Acciones críticas

## Recomendación

Usar confirmaciones para:

- cerrar DailyLog,
- aprobar,
- eliminar adjuntos,
- cancelar.

---

# 20. Seguridad frontend

## Recomendaciones

- ocultar acciones no autorizadas,
- proteger rutas,
- logout automático,
- validar JWT expirado.

---

# 21. Accesibilidad básica

## Recomendaciones

- labels correctos,
- contraste adecuado,
- navegación teclado básica.

---

# 22. Riesgos UX si no se define estándar

- interfaces inconsistentes,
- errores usuario,
- baja adopción,
- retrabajo frontend.

---

# 23. Recomendación V1

Priorizar:

- claridad,
- rapidez,
- estabilidad,
- responsive básico,
- workflow visible.

Evitar inicialmente:

- animaciones excesivas,
- dashboards complejos,
- drag-drop avanzados,
- visualizaciones pesadas.
