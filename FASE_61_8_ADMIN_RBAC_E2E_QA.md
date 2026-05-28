# FASE 61.8 - QA RBAC administrativo end-to-end

## Objetivo

Validar seguridad, UI y comportamiento funcional del modulo de administracion de usuarios y roles, incluyendo listado, detalle, catalogo de roles asignables, asignacion/remocion de roles, restricciones RBAC y auditoria.

## Ambiente usado

- API local: `http://localhost:3001/api/v1`
- Web local: `http://localhost:3000`
- Usuario seed administrador: `admin@bitacora.local`
- Usuario objetivo de prueba: `juan.agudelo@bitacora.local`
- Proyecto demo: `Proyecto Demo Bitacora de Obra`

No se documentan tokens reales.

## Comandos ejecutados

```powershell
npm.cmd run api:build
npm.cmd run web:build
```

Resultado:

- `api:build` OK
- `web:build` OK

## Validaciones backend/API

### Health

`GET /api/v1/health`

Resultado obtenido:

- `200 OK`
- `status: ok`

### Login administrador

`POST /api/v1/auth/login`

Resultado obtenido:

- Login OK con token JWT valido.

### Listado de usuarios

`GET /api/v1/users?page=1&limit=5`

Resultado obtenido:

- `200 OK`
- Se recibieron usuarios sanitizados.
- No se observaron `passwordHash`, tokens ni secretos en la respuesta.

### Catalogo de roles asignables

`GET /api/v1/roles/assignable`

Resultado obtenido con usuario administrador:

- `200 OK`
- Roles activos retornados: `AUDITOR`, `CONTRACTOR`, `DIRECTOR`, `INSPECTOR`, `ORG_ADMIN`, `PROJECT_ADMIN`, `PROJECT_MANAGER`, `RESIDENT_ENGINEER`, `SUPER_ADMIN`, `SUPERVISOR`, `VIEWER`.
- La respuesta incluye metadata segura: `id`, `code`, `name`, `description`, `scope`, `permissions`.

Resultado obtenido sin token:

- `401 Unauthorized`

Resultado obtenido con token valido de usuario sin permisos administrativos:

- `403 Forbidden`

### Asignacion/remocion de roles permitidos

Prueba reversible ejecutada:

1. Asignar rol `VIEWER` al usuario objetivo en el proyecto demo.
2. Confirmar respuesta `200 OK` y rol visible en la respuesta.
3. Remover el rol enviando asignaciones vacias.
4. Confirmar respuesta `200 OK` y usuario sin roles finales.

Resultado obtenido:

- `addStatus: 200`
- `addedRoles: VIEWER`
- `removeStatus: 200`
- `finalRolesCount: 0`

### Proteccion contra auto-remocion del ultimo rol administrativo

Prueba ejecutada:

`PATCH /api/v1/users/:adminId/roles` con `assignments: []`

Resultado obtenido:

- `409 Conflict`
- Se bloquea que el administrador se quite a si mismo su ultimo rol administrativo.

### Auditoria

Consulta local a `AuditLog` para el usuario objetivo.

Resultado obtenido:

- Se encontraron eventos `UPDATE` sobre entidad `User`.
- Los eventos contienen `oldValue.roles` y `newValue.roles`.
- No se observaron imagenes, `base64`, `data:image`, rutas internas ni hashes completos en el payload resumido revisado.

## Validaciones frontend/UI

### `/users`

Validacion en navegador local:

- La ruta carga con sesion administrativa.
- Se muestra titulo `Usuarios`.
- Se muestra busqueda por nombre/email.
- No se observaron cadenas sensibles visibles.

### `/users/[id]`

Validacion en navegador local:

- La ruta carga detalle de usuario.
- Se muestran datos basicos, roles y proyectos visibles.
- Se muestra seccion `Administracion de roles`.
- Si el usuario objetivo no tiene proyectos visibles, se muestra estado controlado: `Este usuario no tiene proyectos visibles donde administrar roles.`
- La pantalla no renderiza `passwordHash`, tokens, secretos, `storagePath`, `uploads/`, `base64` ni `data:image`.

### 401 y 403 frontend

- `401` esta cubierto por `apiRequest` + manejo en paginas con `logout()` y redireccion a `/login`.
- `403` en catalogo de roles se muestra como mensaje claro de permisos insuficientes y no habilita edicion.

## Bug critico encontrado y corregido

Durante la prueba reversible se detecto un `500 Internal Server Error` al re-agregar un rol previamente removido.

Causa:

- La actualizacion de roles buscaba solo asignaciones activas dentro del alcance.
- Si existia una fila historica inactiva con la misma combinacion `projectId/userId/roleId`, el servicio intentaba crear una nueva fila y chocaba con la restriccion unica.

Fix aplicado:

- En `apps/api/src/users/users.service.ts`, la transaccion de actualizacion ahora consulta asignaciones activas e inactivas dentro del alcance del proyecto para poder reactivar la existente.
- Las vistas y respuestas siguen mostrando solo asignaciones activas.

Validacion del fix:

- Re-asignar `VIEWER` despues de removerlo: `200 OK`.
- Remover nuevamente: `200 OK`.
- Estado final del usuario objetivo: sin roles aplicados.

## Seguridad revisada

Checklist:

- [x] `/users` requiere permisos validos.
- [x] `/users/[id]` carga detalle sanitizado con usuario autorizado.
- [x] `/roles/assignable` requiere JWT y permisos administrativos.
- [x] Usuario sin permisos administrativos recibe `403`.
- [x] UI no habilita edicion si no hay permisos/catologo.
- [x] Administrador puede agregar/remover roles permitidos.
- [x] No se permite quitarse el ultimo rol administrativo propio.
- [x] Asignacion respeta alcance por proyecto visible.
- [x] La prueba reversible no dejo roles aplicados al usuario objetivo.
- [x] Auditoria registra cambios de roles.
- [x] `401` sin token confirmado en API.
- [x] `403` confirmado para usuario sin permisos administrativos.
- [x] No se observaron `passwordHash`, tokens, secretos, `base64`, rutas internas, `uploads/` ni hashes completos en respuestas/UI revisadas.
- [x] Layout desktop validado en navegador local.
- [x] Responsive basico cubierto por build y estilos CSS existentes; pendiente captura manual dedicada si se requiere evidencia visual formal.

## Pendientes/riesgos

- Para probar "no asignar roles con permisos superiores al actor" con evidencia completa, se recomienda crear un usuario administrativo intermedio con permisos menores que `SUPER_ADMIN` y repetir `PATCH /users/:id/roles` intentando asignar `SUPER_ADMIN`.
- Para probar "no alterar roles fuera del alcance visible del actor" con evidencia completa, se recomienda preparar dos proyectos y un actor con acceso solo a uno de ellos.
- La validacion visual responsive fue basica; no se generaron capturas persistentes en esta fase.

## Resultado final

FASE 61.8 completada con builds OK, validaciones API/UI principales OK y un bug critico de reactivacion de roles corregido.
