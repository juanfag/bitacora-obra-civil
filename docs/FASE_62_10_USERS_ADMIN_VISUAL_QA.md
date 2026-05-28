# FASE 62.10 - QA visual final de administración de usuarios

## Objetivo

Validar visualmente en navegador el módulo de administración de usuarios, con foco en la pantalla de detalle, la sección "Administración de sesiones", la acción "Invalidar sesiones", confirmación previa, mensajes de éxito/error y visibilidad según permisos.

## Precondiciones

- API disponible en `http://localhost:3001`.
- Web disponible en `http://localhost:3000`.
- Usuario administrador con permisos administrativos.
- Usuario no administrador o con permisos limitados.
- Usuario objetivo activo para pruebas de invalidación.
- Sin proceso viejo en `3001` al finalizar la validación.

## Ambiente usado

- API local levantada desde el build actual.
- Web local en `http://localhost:3000`.
- Navegador integrado de Codex.
- Usuario admin validado: `admin@bitacora.local`.
- Usuario no admin temporal usado para QA: `qa62.10.viewer@bitacora.local`.

## Casos ejecutados

| ID | Caso | Resultado obtenido | Estado |
| --- | --- | --- | --- |
| UI-01 | Lista de usuarios carga correctamente | `/users` cargó después de login. La lista mostró nombre, email, estado y roles. No se observaron datos sensibles ni IDs largos innecesarios. | OK |
| UI-02 | Detalle de usuario carga correctamente | `/users/:id` mostró información del usuario, estado, roles, organización/proyectos y fechas. No se observaron `passwordHash`, tokens ni secretos. | OK |
| UI-03 | Sección Administración de sesiones visible para admin | El admin vio el título "Administración de sesiones", texto auxiliar y botón "Invalidar sesiones". | OK |
| UI-04 | Confirmación antes de invalidar | El click en "Invalidar sesiones" disparó confirmación nativa del navegador. La automatización no permite capturar texto interno del diálogo, pero el bloqueo del flujo confirmó que existe confirmación previa. | OK con observación |
| UI-05 | Cancelar confirmación no ejecuta acción | La limitación del diálogo nativo impidió instrumentar de forma completa el botón Cancelar. El código mantiene `window.confirm` y retorna antes de llamar al API cuando no se confirma. | Pendiente instrumental |
| UI-06 | Confirmar invalidación ejecuta acción | Al aceptar la confirmación, el botón quedó temporalmente en ejecución y apareció el mensaje "Sesiones invalidadas correctamente.". | OK |
| UI-07 | Usuario objetivo debe iniciar sesión nuevamente | La invalidación visual fue ejecutada correctamente. La invalidación efectiva por `tokenVersion` queda cubierta por QA backend 62.4/62.9. | OK por cobertura cruzada |
| UI-08 | Botón no visible para usuario sin permisos | Con usuario `VIEWER`, el detalle cargó sin mostrar "Administración de sesiones" ni "Invalidar sesiones". | OK |
| UI-09 | Manejo visual de 403 | En UI sin permisos la acción queda oculta. No se forzó respuesta 403 directa desde el botón porque el usuario no puede acceder visualmente a la acción. | OK con observación |
| UI-10 | Manejo visual de 404 | Al abrir un usuario fuera del alcance/inexistente se mostró "No fue posible cargar el usuario" y "Usuario no encontrado". | OK |
| UI-11 | Manejo visual de 401 | Sin sesión, `/users` redirigió al login mediante el patrón actual de AuthGuard. | OK |
| UI-12 | Responsive básico | Se validó desktop y viewport móvil. Las cards se apilan, los textos siguen legibles y los botones no se montan. | OK |
| UI-13 | Revisión de textos | Se corrigieron textos visibles sin tilde o con encoding incorrecto en pantallas relacionadas. | OK |

## Capturas / evidencia visual

- Se capturó visualmente `/users` en desktop: lista visible, cards alineadas y texto legible.
- Se capturó visualmente `/users/:id` en desktop: sección "Administración de sesiones" visible para admin.
- Se capturó visualmente `/users/:id` en móvil: layout apilado y legible.
- Las capturas fueron revisadas en la sesión del navegador integrado; no se persistieron archivos de imagen en el repositorio.

## Bugs encontrados

1. Algunos textos visibles no tenían tildes o estaban poco pulidos:
   - "Administracion"
   - "Informacion"
   - "Sin organizacion"
   - "Pagina"
   - "Debera iniciar sesion"
2. `apps/web/src/lib/api-client.ts` quedó temporalmente con encoding no UTF-8 durante el ajuste de texto y Turbopack rechazó el archivo.

## Fixes aplicados

- Se corrigieron textos visibles en administración de usuarios y pantallas relacionadas.
- Se normalizó `apps/web/src/lib/api-client.ts` a UTF-8 y se corrigió el mensaje:
  - "La solicitud al API falló con estado ..."
- Se mantuvo el contrato existente de frontend/backend.
- No se modificó lógica backend durante esta fase.

## Archivos ajustados por UX/texto

- `apps/web/src/app/users/page.tsx`
- `apps/web/src/app/users/[id]/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/projects/page.tsx`
- `apps/web/src/app/daily-logs/page.tsx`
- `apps/web/src/lib/api-client.ts`

## Pendientes / observaciones

- La confirmación usa `window.confirm`. El navegador integrado bloquea la automatización al abrir diálogos nativos, por lo que el texto interno del diálogo y el camino de Cancelar no pudieron capturarse como screenshot automatizado. Se validó que el diálogo existe y que aceptar ejecuta la invalidación correctamente.
- El manejo visual de 403 queda cubierto principalmente por ocultamiento preventivo de la acción para usuarios sin permisos y por validaciones backend previas.

## Validaciones finales

- `npm.cmd run web:build`
- `npm.cmd run api:build`
- Verificacion de puerto `3001` al finalizar para evitar procesos viejos.

## Resultado final

**APROBADO CON OBSERVACIONES**

La pantalla `/users` y el detalle `/users/:id` funcionan visualmente. El administrador ve y puede ejecutar "Invalidar sesiones" con confirmacion y feedback de exito. Un usuario sin permisos no ve la accion. No se observaron datos sensibles expuestos ni regresiones visuales relevantes.
