# FASE 63.7.2 - Header inteligente de bitácora

## Objetivo

Refactorizar el encabezado interno del detalle de bitácora diaria para que el estado operativo, fecha, proyecto, responsable, resumen rápido y acciones principales se entiendan en pocos segundos.

## Archivos modificados

- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/app/globals.css`

## Componentes creados

- `apps/web/src/components/daily-log/daily-log-header.tsx`

## Resumen UX aplicado

- Se creó un header ejecutivo dividido en tres bloques:
  - Bloque izquierdo: estado dominante, fecha amigable, proyecto y responsable.
  - Bloque central: indicadores compactos de eventos, adjuntos, firmas y última actualización.
  - Bloque derecho: acciones de workflow existentes, descarga PDF y volver.
- Se eliminaron IDs técnicos del encabezado principal.
- Se mantuvieron los handlers existentes:
  - workflow con `runWorkflowAction`
  - descarga PDF con `downloadPdf`
  - navegación de regreso según `projectId`
- Se movió visualmente la card de acciones al header para evitar duplicación y mejorar lectura operativa.
- Se agregaron estilos por estado:
  - `DRAFT`
  - `IN_REVIEW`
  - `APPROVED`
  - `CLOSED`
  - `REJECTED`
  - `VOIDED`
- Se agregaron fechas amigables:
  - fecha de bitácora con `Intl.DateTimeFormat("es-CO")`
  - última actualización relativa, por ejemplo `actualizada hace 2 h`
- Se agregaron cálculos compactos sin nuevas llamadas:
  - total de eventos desde `dailyLogEvents`
  - total de adjuntos desde `attachments`, `attachmentCount` o `attachmentsCount`
  - total de firmas desde `dailyLogSignatures`
- Se agregaron reglas responsive para tablet y móvil:
  - el header pasa a una columna
  - las métricas se apilan
  - los botones toman ancho completo en móvil

## Validaciones ejecutadas

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
- No se detectó overflow horizontal.
- La ruta quedó en estado de carga porque la API local no estaba escuchando en `3001`.

Limitación:

- No se pudo validar visualmente con datos reales los estados `DRAFT`, `IN_REVIEW`, `APPROVED`, `CLOSED` y `REJECTED` porque la API local no estuvo disponible.
- La implementación sí contiene estilos explícitos para todos esos estados y para `VOIDED`.

## Riesgos encontrados

- El responsable depende de que el detalle entregue `responsible`, `createdBy` o `user`. Si no viene ninguno, el header muestra `Responsable no disponible`.
- El proyecto usa nombre/código si el API los entrega; si no, muestra `Proyecto no disponible` en el header para evitar exponer UUIDs.
- La validación visual completa debe repetirse con una sesión autenticada y API activa.

## Confirmaciones

- Sin cambios backend.
- Sin cambios Prisma.
- Sin cambios de contratos API.
- Sin cambios RBAC.
- Sin cambios workflow.
- Sin dependencias nuevas.

## Resultado final

APROBADO CON OBSERVACIÓN.

Build frontend OK. Queda pendiente la revisión visual completa con datos reales cuando la API local esté activa en `3001`.
