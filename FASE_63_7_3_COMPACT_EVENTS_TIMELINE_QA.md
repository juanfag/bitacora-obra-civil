# FASE 63.7.3 - Vista compacta de eventos / timeline operacional

## Objetivo

Refactorizar visualmente la sección de eventos del detalle de bitácora diaria para convertirla en una timeline operacional compacta, legible y orientada a obra civil.

## Alcance

Frontend únicamente. No se modificaron backend, Prisma, contratos API, endpoints, RBAC, workflow, PDF ni auditoría.

## Archivos modificados

- `apps/web/src/components/daily-logs/events/DailyLogEventList.tsx`
- `apps/web/src/components/daily-logs/events/DailyLogEventCard.tsx`
- `apps/web/src/components/daily-logs/events/EventAttachmentList.tsx`
- `apps/web/src/app/globals.css`

## Componentes creados

No se crearon componentes nuevos. Se reutilizaron y refactorizaron los componentes existentes para evitar duplicación y conservar handlers actuales.

## Resumen UX aplicado

- La lista de eventos ahora se ordena cronológicamente por `reportedAt` y fallback `createdAt`.
- Se reemplazó la card grande por una card compacta dentro de una timeline lateral.
- Cada evento muestra:
  - badge de tipo de evento,
  - actividad principal,
  - hora amigable,
  - reportante si está disponible,
  - descripción de ejecución,
  - indicador compacto de evidencia,
  - fecha corta.
- Los adjuntos se muestran de forma más densa:
  - nombre legible,
  - tipo funcional: `Imagen`, `PDF` o `Documento`,
  - tamaño,
  - fecha de carga,
  - usuario que subió si viene disponible,
  - acciones existentes `Ver` y `Descargar`.
- Se oculta ruido técnico:
  - no se muestran UUIDs,
  - no se muestran hashes,
  - no se muestra `storagePath`,
  - no se muestra MIME crudo,
  - no se muestran timestamps ISO.
- El upload de adjuntos mantiene el comportamiento actual, pero con contenedor más integrado visualmente.
- Se agregaron ajustes responsive para móvil:
  - cards compactas,
  - adjuntos apilados,
  - botones a ancho completo,
  - sin overflow horizontal.
- Se agregó alineación modular uniforme por evento:
  - encabezado, cuerpo, resumen de evidencia y footer se mantienen como zonas consistentes,
  - adjuntos y acciones quedan siempre en la sección inferior,
  - filas de adjuntos usan columnas estables en desktop,
  - cada card conserva el mismo ancho y crece verticalmente según contenido.

## Validaciones realizadas

### Build frontend

Comando:

```powershell
npm.cmd run web:build
```

Resultado:

- OK.
- Next.js compiló correctamente.
- TypeScript finalizó sin errores.

### Revisión navegador

Ruta intentada:

```text
http://localhost:3000/daily-logs/test-layout-id
```

Resultado:

- La web local respondió en `3000`.
- No se detectó overflow horizontal en el shell cargado.
- La pantalla quedó en estado `Cargando...` porque la API local no estaba escuchando en `3001`.

## Pruebas visuales pendientes

Repetir con API activa y sesión autenticada:

- bitácora sin eventos,
- bitácora con 1 evento,
- bitácora con varios eventos,
- evento con imágenes,
- evento con PDF,
- evento con muchos adjuntos,
- evento con descripción larga,
- permisos con acciones visibles/no visibles,
- responsive en desktop, tablet y mobile.

## Riesgos y observaciones

- Las miniaturas de imagen solo se muestran si el adjunto trae una URL pública segura. Si no existe, se usa etiqueta visual `IMG` sin exponer rutas internas.
- Los adjuntos siguen dependiendo de los endpoints actuales de descarga/visualización autenticada.
- El orden cronológico prioriza `reportedAt`, que es más operacional; si no existe usa `createdAt`.

## Confirmación frontend-only

- Sin cambios backend.
- Sin cambios Prisma.
- Sin cambios API.
- Sin cambios RBAC.
- Sin cambios workflow.
- Sin dependencias nuevas.

## Resultado final

APROBADO CON OBSERVACIÓN.

Build frontend OK. La validación visual completa con datos reales queda pendiente por falta de API local activa en `3001`.
