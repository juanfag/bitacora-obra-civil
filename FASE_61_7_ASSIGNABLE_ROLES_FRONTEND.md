# FASE 61.7 - Frontend catalogo real de roles asignables

## Objetivo

Consumir `GET /api/v1/roles/assignable` desde la pantalla administrativa de detalle de usuario para permitir asignar roles reales sin hardcodear el catalogo en frontend.

## Alcance implementado

- Se agrego el cliente `getAssignableRoles()` en `apps/web/src/lib/api-client.ts`.
- Se agregaron tipos frontend para roles asignables y permisos resumidos.
- La pantalla `apps/web/src/app/users/[id]/page.tsx` ahora carga el catalogo real de roles asignables.
- La administracion de roles muestra opciones por proyecto visible del usuario.
- Se permite agregar y remover roles desde la UI usando el catalogo retornado por backend.
- Se mantiene confirmacion antes de guardar cambios.
- Se mantienen estados de carga, guardado, error y exito.
- Se maneja `401` con `logout()` y redireccion a `/login`.
- Se maneja `403` con mensaje claro de permisos insuficientes.
- No se hardcodean roles.
- No se muestran permisos completos sensibles; solo se muestra un resumen por cantidad de permisos activos.

## Endpoint consumido

```http
GET /api/v1/roles/assignable
```

## Comportamiento esperado

- Si el usuario autenticado tiene permisos administrativos, ve el catalogo real de roles asignables.
- Si no tiene permisos, la pantalla conserva el detalle de usuario en modo consulta y muestra aviso de permisos insuficientes.
- Si el catalogo esta vacio, se muestra un estado vacio controlado.
- Al guardar, se envia `PATCH /api/v1/users/:id/roles` con asignaciones `{ projectId, roleId }`.

## Archivos modificados

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/users/[id]/page.tsx`
- `apps/web/src/app/globals.css`
- `FASE_61_7_ASSIGNABLE_ROLES_FRONTEND.md`

## Validacion

Comando ejecutado:

```powershell
npm.cmd run web:build
```

Resultado:

```text
web:build OK
```

## Notas

No se modifico backend, Prisma, migraciones ni contratos API.
