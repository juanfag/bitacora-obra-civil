# FASE 61.2 - Frontend listado y detalle de usuarios

## Objetivo

Crear una pantalla administrativa de solo lectura para listar usuarios y consultar detalle basico.

## Rutas creadas

- `/users`
- `/users/[id]`

## Archivos modificados

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`

## Archivos creados

- `apps/web/src/app/users/page.tsx`
- `apps/web/src/app/users/[id]/page.tsx`
- `FASE_61_2_USERS_READ_FRONTEND.md`

## Cliente frontend

Se agregaron tipos y funciones:

- `UserRead`
- `UsersReadResponse`
- `getUsers({ page, limit, search })`
- `getUser(userId)`

Endpoints consumidos:

- `GET /api/v1/users`
- `GET /api/v1/users/:id`

## Funcionalidad implementada

### Listado

- Muestra nombre, email, estado, roles, organizaciones, proyectos asociados, `createdAt` y `updatedAt`.
- Busqueda por nombre/email mediante `search`.
- Paginacion basica con `page` y `limit`.
- Estados de loading, error y vacio.
- Link a detalle de usuario.

### Detalle

- Muestra informacion general del usuario.
- Muestra roles por proyecto.
- Muestra proyectos asociados.
- No permite crear, editar, activar, desactivar ni asignar roles.

## Seguridad visual

No se renderiza:

- `passwordHash`
- tokens
- secretos
- rutas internas
- hashes
- base64
- IDs tecnicos completos de forma innecesaria

## Auth

- Las pantallas usan `AuthGuard`.
- Si la API responde `401`, se ejecuta `logout()` y redireccion a `/login`.

## UI

- Se mantiene estilo consistente con dashboard.
- Se agrego `Usuarios` a la navegacion principal.
- Layout responsive basico con grillas y apilado en movil.

## Validacion

Comando ejecutado:

```powershell
npm.cmd run web:build
```

Resultado:

- OK. Build finalizado correctamente.

## Restricciones cumplidas

- No se modifico backend.
- No se modifico Prisma.
- No se instalaron librerias nuevas.
- No se agregaron acciones mutables de usuarios.
