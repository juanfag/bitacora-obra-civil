# FASE 61.5 - Frontend asignacion de roles a usuarios

## Objetivo

Permitir administrar roles visibles de un usuario desde la pantalla de detalle, consumiendo:

`PATCH /api/v1/users/:id/roles`

## Archivos modificados

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/users/[id]/page.tsx`
- `apps/web/src/app/globals.css`

## Cliente frontend

Se agrego:

- `UserRoleAssignmentInput`
- `updateUserRoles(userId, assignments)`

El cliente envia:

```json
{
  "assignments": [
    {
      "projectId": "uuid",
      "roleId": "uuid"
    }
  ]
}
```

## UI implementada

En `/users/[id]` se agrego la seccion:

`Administracion de roles`

La pantalla:

- muestra roles actuales del usuario;
- permite seleccionar/remover roles visibles existentes;
- permite revertir cambios antes de guardar;
- confirma con `window.confirm` antes de guardar;
- muestra loading/saving;
- muestra exito;
- muestra errores;
- maneja `401` con `logout()` y redireccion a `/login`;
- maneja `403` con mensaje claro de permisos insuficientes.

## Control de permisos frontend

La edicion se habilita solo cuando el usuario autenticado tiene un rol visible con codigo:

- `SUPER_ADMIN`
- `PROJECT_MANAGER`

Si no cumple, la seccion queda en modo no editable y muestra mensaje de permisos insuficientes.

La autorizacion definitiva sigue en backend mediante `PermissionsGuard`.

## Catalogo de roles

Se reviso el backend y no existe endpoint de catalogo/listado de roles (`/roles` o equivalente).

Por esa razon:

- no se hardcodearon roles;
- no se permite agregar roles nuevos desde catalogo;
- solo se administran/remueven roles actuales visibles del usuario;
- la ampliacion para agregar roles nuevos queda bloqueada hasta que exista un endpoint real de roles.

## Seguridad visual

No se renderiza:

- `passwordHash`
- tokens
- secretos
- rutas internas
- hashes
- base64

Los IDs necesarios (`projectId`, `roleId`) se usan internamente para el payload del PATCH, pero no se muestran como contenido principal de UI.

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
- No se inventaron datos de roles hardcodeados.
