# FASE 56 - QA visual frontend auditoria

## Objetivo

Validar en navegador la seccion **Auditoria** del detalle de una bitacora diaria, confirmando estados visuales, legibilidad, seguridad del payload renderizado y comportamiento general sin cambiar la logica de auditoria.

## Ambiente usado

- API local: `http://127.0.0.1:3001/api/v1`
- Web local: `http://localhost:3000`
- Navegador: Codex in-app browser
- Usuario de prueba: administrador local autenticado
- Fecha de validacion: 2026-05-26

## URL validada

- `http://localhost:3000/daily-logs/3b328019-00a3-466c-b897-8c1cb22a4a4a`

## Caso con auditoria

Bitacora validada:

- DailyLog ID: `3b328019-00a3-466c-b897-8c1cb22a4a4a`
- Estado: `CLOSED`
- Endpoint usado por frontend: `GET /api/v1/daily-logs/3b328019-00a3-466c-b897-8c1cb22a4a4a/audit`

Resultado observado:

- La seccion **Auditoria** carga correctamente.
- Se muestra el subtitulo: `Linea de tiempo de eventos de la bitacora.`
- Se muestra `Total: 7`.
- Se muestra `Orden: createdAt:asc`.
- La lista se renderiza como timeline vertical.
- Las fechas se muestran en formato legible local.
- Las acciones relevantes aparecen con badge:
  - Envio a revision
  - Aprobacion
  - Cierre
  - Firma aplicada
- Cada evento muestra entidad, usuario resumido, valor anterior y valor posterior.

## Caso vacio / error

Durante la validacion inicial se observo el estado de error:

- Mensaje: `No fue posible cargar la auditoria.`

Causa operativa encontrada:

- El proceso API local que estaba corriendo en `3001` era una instancia anterior sin la ruta `/daily-logs/:id/audit`, por lo que respondia `404`.
- Adicionalmente, la carga de auditoria estaba acoplada al `Promise.all` de firmas. Si fallaba la carga de firmas o de firma de usuario, tambien se ocultaba la auditoria.

Ajuste realizado:

- La carga de firmas y la carga de auditoria quedaron separadas en el frontend. La auditoria ahora puede mostrarse aunque falle la seccion de firmas, manteniendo el mismo manejo de `401`.

Estado vacio:

- No se forzo un cambio de datos para fabricar una bitacora sin auditoria.
- La rama de UI existente muestra: `Aun no hay eventos de auditoria registrados.`

## Hallazgos visuales

- La seccion es legible en escritorio.
- Los badges de total, orden, accion relevante y fecha/hora permiten escanear la linea de tiempo.
- El resumen de `oldValue` y `newValue` evita JSON crudo grande y limita la cantidad de campos visibles.
- Los identificadores tecnicos de usuario se muestran abreviados.
- No se observaron solapamientos visuales en la seccion auditada.
- El scroll vertical mantiene la auditoria integrada con las secciones previas de evidencia documental y firmas digitales.

## Seguridad visual revisada

Se reviso el DOM renderizado de la pantalla y no se encontraron cadenas prohibidas:

- `base64`
- `data:image`
- `storagePath`
- `uploads/`
- `C:\`
- `/mnt/`
- `apps/api`
- hashes SHA256 completos de 64 caracteres hexadecimales

## Ajustes realizados

Archivo ajustado:

- `apps/web/src/app/daily-logs/[id]/page.tsx`

Cambio:

- Se desacoplo la carga de auditoria respecto a firmas y firma maestra del usuario.
- La auditoria conserva `loading`, `error`, `empty state` y manejo `401` con redireccion a login.
- No se modifico backend.
- No se modifico la logica del endpoint de auditoria.

## Evidencia

Evidencia documentada por navegacion real:

- Login local realizado correctamente.
- Pantalla de detalle abierta en navegador.
- Seccion **Auditoria** observada con `Total: 7` y `Orden: createdAt:asc`.
- Endpoint validado directamente con token y respuesta `200`.
- Barrido de cadenas sensibles ejecutado sobre el DOM renderizado.

Nota: la captura automatica de screenshot del navegador fallo por timeout del motor de captura, por lo que la evidencia queda documentada como observacion reproducible.

## Comandos ejecutados

```powershell
netstat -ano | findstr :3001
Get-Content api-fase56.out.log -Tail 120
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3001/api/v1/auth/login' -ContentType 'application/json' -Body '{"email":"admin@bitacora.local","password":"Password123!"}'
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3001/api/v1/daily-logs/3b328019-00a3-466c-b897-8c1cb22a4a4a/audit'
npm.cmd run web:build
```

## Resultado final

- QA visual de auditoria completado.
- UI ajustada para evitar falso error de auditoria por fallos laterales de firmas.
- Endpoint de auditoria confirmado con respuesta `200`.
- Payload visual revisado sin cadenas sensibles.
- Backend no fue modificado.
- Build web ejecutado como validacion final.
