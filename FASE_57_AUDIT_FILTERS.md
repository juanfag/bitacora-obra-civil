# FASE 57 - Filtros auditoria

## Objetivo

Agregar filtros frontend a la seccion **Auditoria** del detalle de bitacora diaria para facilitar la lectura cuando existan muchos eventos, sin modificar backend, Prisma, contratos API ni logica de auditoria.

## Alcance

Archivos modificados:

- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/app/globals.css`

No se modifico:

- Backend
- Prisma
- Migraciones
- DTOs
- Endpoints
- Seguridad de auditoria

## Filtros implementados

### Busqueda de texto libre

- Campo con placeholder: `Buscar en auditoria...`
- Busca de forma case-insensitive sobre:
  - accion tecnica
  - etiqueta legible de accion
  - entidad
  - usuario visible
  - resumen visible de `oldValue`
  - resumen visible de `newValue`
- La busqueda usa el mismo resumen sanitizado que se renderiza en UI.

### Filtro por accion

- Select con opcion inicial: `Todas las acciones`.
- Opciones generadas dinamicamente desde los eventos recibidos.
- Las opciones se muestran con las etiquetas legibles existentes, por ejemplo:
  - `Creacion`
  - `Envio a revision`
  - `Aprobacion`
  - `Cierre`
  - `Firma aplicada`

### Filtro por entidad

- Select con opcion inicial: `Todas las entidades`.
- Opciones generadas dinamicamente desde los eventos recibidos.

### Limpiar filtros

- Boton `Limpiar filtros`.
- Resetea busqueda, accion y entidad.
- Queda deshabilitado cuando no hay filtros activos.

### Contador dinamico

- Se agrego contador:
  - `Mostrando X de Y eventos`

### Empty state filtrado

- Si existen eventos pero ningun resultado coincide con los filtros, se muestra:
  - `No hay eventos que coincidan con los filtros aplicados.`

## Comportamiento esperado

- La timeline conserva el orden `createdAt:asc`.
- Los badges visuales por accion se mantienen.
- No se muestran IDs tecnicos completos en el resumen visible.
- No se renderiza informacion sensible como base64, data:image, storagePath, uploads, rutas locales o hashes completos.
- Los filtros se muestran en una barra compacta.
- En pantallas pequenas, los controles se apilan en una sola columna.

## Validaciones realizadas

Bitacora validada:

- `http://localhost:3000/daily-logs/3b328019-00a3-466c-b897-8c1cb22a4a4a`

Casos probados en navegador:

- Busqueda `firma`:
  - Resultado: `Mostrando 2 de 7 eventos`.
- Limpiar filtros:
  - Resultado: `Mostrando 7 de 7 eventos`.
- Filtro por accion `DAILY_LOG_SIGNATURE_APPLIED`:
  - Resultado: `Mostrando 2 de 7 eventos`.
- Filtro por entidad `DailyLogPdfVersion`:
  - Resultado: `Mostrando 1 de 7 eventos`.
- Busqueda sin coincidencias:
  - Resultado: `Mostrando 0 de 7 eventos`.
  - Empty state filtrado visible.

Comando ejecutado:

```powershell
npm.cmd run web:build
```

## Resultado final

- Filtros de auditoria implementados y validados visualmente.
- Build web OK.
- Backend no modificado.
- Contratos API no modificados.
- Logica de auditoria no modificada.
