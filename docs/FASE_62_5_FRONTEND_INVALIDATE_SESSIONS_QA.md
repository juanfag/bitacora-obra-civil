# FASE 62.5 - Frontend accion Invalidar sesiones

## Objetivo

Agregar en la vista de detalle de usuario una accion administrativa para invalidar todas las sesiones activas del usuario, consumiendo el endpoint existente:

```http
POST /api/v1/users/:id/invalidate-sessions
```

## Archivos modificados

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/users/[id]/page.tsx`

## Implementacion

- Se agrego `invalidateUserSessions(userId: string)` en `api-client`.
- Se agrego una seccion de UI llamada `Administracion de sesiones`.
- La seccion solo se muestra cuando el usuario actual tiene capacidad administrativa en frontend, reutilizando el patron existente de `getAssignableRoles()` y `canEditRoles`.
- La accion muestra confirmacion antes de llamar al API.
- La accion maneja:
  - loading: `Invalidando...`
  - exito: `Sesiones invalidadas correctamente.`
  - `401`: logout y redireccion a `/login`
  - `403`: `No tienes permisos para invalidar sesiones.`
  - `404`: `Usuario no encontrado.`
  - error generico: `No se pudieron invalidar las sesiones.`

## Casos QA

| Caso | Resultado |
| --- | --- |
| A. Boton visible para admin | OK, condicionado a `canEditRoles === true` |
| B. Boton no visible para usuario sin permisos | OK, `getAssignableRoles()` 403 deja `canEditRoles === false` |
| C. Confirmacion aparece antes de ejecutar | OK, se usa `window.confirm` |
| D. Cancelar confirmacion no llama API | OK, retorna antes de `invalidateUserSessions()` |
| E. Confirmar ejecuta POST correctamente | OK, `invalidateUserSessions(user.id)` |
| F. Mensaje de exito visible | OK |
| G. Token anterior del usuario objetivo queda invalido | Cubierto por backend FASE 62.4 |
| H. Usuario objetivo puede hacer login nuevamente | Cubierto por backend FASE 62.4 |
| I. 403 muestra mensaje correcto | OK |
| J. 404 muestra mensaje correcto | OK |
| K. 401 mantiene patron logout/login | OK |
| L. Build web OK | OK |

## Validaciones tecnicas

```powershell
npm.cmd run web:build
npm.cmd run api:build
```

Resultado:

- `web:build`: OK
- `api:build`: OK

## Resultado final

La vista de detalle de usuario permite a un administrador invalidar sesiones con confirmacion y feedback claro. Usuarios sin permisos administrativos no ven la accion, y el backend conserva la autoridad final sobre permisos y alcance.
