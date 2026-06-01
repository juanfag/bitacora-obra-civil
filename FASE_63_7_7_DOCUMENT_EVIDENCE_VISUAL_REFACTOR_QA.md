# FASE 63.7.7 - Refactor visual bloque Evidencia Documental

## Objetivo

Rediseñar visualmente la sección "Evidencia documental" del detalle de bitácora diaria para convertirla en un centro documental operacional, priorizando el PDF final, el estado documental, las acciones principales, la trazabilidad resumida y la metadata secundaria.

## Alcance

Cambio frontend-only sobre la pantalla de detalle de DailyLog.

No se modificaron:

- Backend
- Prisma
- Migraciones
- Contratos API
- Endpoints
- RBAC
- Workflow
- Auditoría backend
- PDF backend
- Dependencias

## Archivos modificados

- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/app/globals.css`

## Componentes creados

- `apps/web/src/components/daily-log/daily-log-document-evidence.tsx`

## Mejoras visuales aplicadas

- Se reemplazó la vista de metadata técnica por un bloque documental centrado en el PDF principal.
- Se agregó una presentación dominante del documento final con icono PDF, nombre amigable, estado documental y fecha de generación.
- Se agruparon las acciones principales:
  - Descargar PDF
  - Verificación pública
- Se ocultó el MIME técnico `application/pdf` y se muestra como `Documento PDF`.
- Se mantuvieron código de verificación y hash corto, pero como metadata secundaria y compacta.
- Se agregó una grilla de información documental con versión, formato, tamaño, generado por, código y hash corto.
- Se transformó el resumen de auditoría en una timeline documental resumida con descripciones amigables.
- Se evitaron términos crudos como `DailyLogPdfVersion`, `CREATE`, `CLOSE`, UUIDs, rutas internas, `storagePath`, MIME crudo y JSON técnico.
- Se añadieron estados visuales controlados para:
  - Cargando evidencia documental
  - Error
  - Bitácora no cerrada
  - Snapshot pendiente
  - Evidencia documental disponible
- Se agregaron estilos responsive para que acciones, documento principal, metadata y timeline colapsen sin overflow en mobile.

## Refinamiento FASE 63.7.7.1

Se aplicó un refinamiento adicional sobre metadata y trazabilidad documental:

- El campo `Hash corto` se integró dentro de la misma grilla documental como `Código hash`.
- La grilla de metadata se compactó con columnas responsive uniformes para evitar filas huérfanas y tarjetas visualmente aisladas.
- La metadata documental ahora mantiene una densidad más enterprise, con menor gap, radio más controlado y mejor alineación.
- La trazabilidad dejó de renderizarse como timeline vertical y ahora se presenta como tabla documental compacta.
- La tabla usa columnas:
  - Evento
  - Fecha/hora
  - Usuario
- Los eventos mantienen labels amigables como `Bitácora creada`, `Bitácora aprobada`, `Bitácora cerrada` y `PDF generado`.
- En mobile, la tabla se convierte en filas apiladas tipo mini-card para evitar overflow horizontal.
- Si la traza no incluye usuario, se usa fallback seguro `Sistema`.

## Validaciones ejecutadas

### Build frontend

Comando ejecutado:

```powershell
npm.cmd run web:build
```

Resultado:

```text
OK
```

El build de Next.js compiló correctamente, finalizó TypeScript y generó las páginas estáticas sin errores.

Build repetido después del refinamiento 63.7.7.1:

```text
OK
```

### Validación visual básica

Se abrió la ruta:

```text
http://localhost:3000/daily-logs/test-layout-id
```

Resultado observado:

- La aplicación cargó el shell autenticado.
- No se detectó overflow horizontal en el viewport desktop probado.
- No se observaron errores visuales inmediatos del layout base.

Limitación:

- La API local no estaba escuchando en `localhost:3001`, por lo que la pantalla quedó en estado de carga y no fue posible validar con datos reales el bloque completo de Evidencia documental.
- La validación responsive con PDF disponible, timeline real y URL pública debe repetirse cuando backend y sesión local estén disponibles.

## Pruebas responsive

Validación implementada a nivel CSS:

- Desktop: layout documental con documento principal, acciones y metadata alineada.
- Mobile: el bloque principal colapsa a una columna, las acciones ocupan ancho completo y la timeline evita overflow horizontal.
- Desktop refinado: la trazabilidad usa tabla compacta alineada.
- Mobile refinado: la tabla documental oculta encabezados y muestra fecha/usuario como campos apilados.

Validación visual real pendiente con API activa.

## Riesgos y observaciones

- Si backend agrega nuevos tipos de eventos de auditoría, el mapeo visual puede extenderse en `daily-log-document-evidence.tsx`.
- Si `generatedBy` llega sin nombre o email, la UI muestra fallback seguro: `Usuario del sistema`.
- El componente no expone rutas internas, storagePath, hashes completos, MIME crudo ni IDs técnicos completos.
- La sección depende de la estructura segura ya entregada por `GET /daily-logs/:id/document-evidence`; no cambia contratos ni agrega requests.

## Resultado final

APROBADO CON OBSERVACIONES.

La fase quedó implementada como refactor visual frontend-only, con build web OK. La observación pendiente es repetir validación visual completa con API local activa y una bitácora cerrada con evidencia documental real.
