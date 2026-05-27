# FASE 56.1 - UX polish auditoria

## Objetivo

Elevar la calidad visual de la seccion **Auditoria** en el detalle de bitacora diaria, sin modificar contratos API, reglas de negocio, backend ni seguridad.

## Mejoras realizadas

### Auditoria

- Se ocultaron las filas `Antes: Sin datos` y `Despues: Sin datos` cuando ambos valores estan vacios.
- Se compacto la timeline para reducir espacios vacios.
- Se agregaron marcadores visuales por accion:
  - `+` para creacion.
  - `UP` para actualizacion.
  - `-` para eliminacion.
  - `S` para firma.
  - `PDF` para PDF/snapshot documental.
  - `SR`, `OK`, `CL`, `RJ`, `AN` para transiciones de workflow.
- Se agregaron variantes de color por tipo de accion.
- Se mejoro el contraste de fechas, entidades y textos secundarios.
- El resumen de cambios ahora se muestra en bloques compactos, no como parrafos largos.
- Se filtraron IDs tecnicos innecesarios dentro del resumen visible (`dailyLogId`, `projectId`, `documentId`, `signerUserId`, etc.).

### Usuario auditoria

- Se dejo de mostrar el ID truncado como texto principal.
- Si el payload trae `signerName`, se muestra el nombre.
- Si no hay nombre disponible pero existe `userId`, se muestra `Usuario registrado`.
- Si no hay usuario asociado, se muestra `Sistema`.

### Estados visuales

- Loading state mejorado con bloque contextual: `Consultando trazabilidad`.
- Error state mejorado con mensaje y boton `Reintentar`.
- Empty state mejorado con mensaje explicativo sobre futuros cambios, firmas o snapshots.

### Firmas digitales

- Se ajusto la tarjeta de firma para evitar overflow.
- El boton `Firmar con mi firma registrada` ahora permite salto de linea y ocupa el ancho disponible en movil.
- Se ajusto el header de tarjeta para que responda mejor en pantallas pequenas.

### Responsive y accesibilidad ligera

- Se agregaron reglas responsive para la timeline de auditoria y tarjetas de firma en `max-width: 720px`.
- Se mejoro `overflow-wrap` para textos de auditoria.
- Se mantuvieron tamanos legibles y contrastes mas claros en metadatos secundarios.

## Issues corregidos

- Ruido visual por eventos sin `oldValue` ni `newValue`.
- IDs tecnicos expuestos como senal principal de usuario.
- Timeline demasiado plana visualmente.
- Boton de firma con riesgo de corte en anchos reducidos.
- Estados de auditoria demasiado austeros para loading/error/empty.

## Validacion visual

URL validada:

- `http://localhost:3000/daily-logs/3b328019-00a3-466c-b897-8c1cb22a4a4a`

Resultado observado en navegador:

- La seccion **Auditoria** carga con `Total: 7` y `Orden: createdAt:asc`.
- Los eventos sin cambios ya no muestran `Antes: Sin datos` / `Despues: Sin datos`.
- Las acciones se distinguen con marcadores visuales compactos.
- Las firmas aplicadas muestran nombre cuando esta disponible.
- No se observaron cadenas sensibles en el DOM renderizado:
  - `base64`
  - `data:image`
  - `storagePath`
  - `uploads/`
  - `C:\`
  - `/mnt/`
  - `apps/api`
- No se detectaron hashes SHA256 completos en el texto renderizado.

Nota: la validacion responsive se hizo mediante revision de reglas CSS y comprobacion visual basica en navegador local. La captura automatica de screenshot no se adjunta porque el motor de captura del navegador local presento timeout en esta sesion.

## Archivos modificados

- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/app/globals.css`

## Comandos ejecutados

```powershell
npm.cmd run web:build
```

## Resultado final

- Polish UX aplicado.
- No se modifico backend.
- No se modificaron contratos API.
- No se modifico la logica de auditoria.
- Build web OK.
