# FASE 62.7 - Bloqueo de auto-desactivacion y ultimo administrador

## Objetivo

Evitar que un usuario administrativo se desactive a si mismo y proteger al sistema para que no quede sin administradores activos dentro del alcance aplicable.

## Archivos modificados

- `apps/api/src/users/users.service.ts`

## Implementacion

En `PATCH /api/v1/users/:id/status`:

- Si `actorUserId === targetUserId` y el nuevo estado no es `ACTIVE`, responde `409 Conflict`.
- El mensaje para auto-desactivacion es:
  - `No puedes desactivar tu propio usuario.`
- Antes de desactivar un usuario activo, se mantienen las validaciones existentes:
  - ultimo `SUPER_ADMIN` activo.
  - ultimo administrador activo por organizacion basado en permisos administrativos.
- Se agrego validacion explicita por codigos de rol administrativo:
  - `SUPER_ADMIN`
  - `ORG_ADMIN`
  - `PROJECT_ADMIN`
- Reglas aplicadas:
  - `SUPER_ADMIN`: debe existir otro `SUPER_ADMIN` activo.
  - `ORG_ADMIN`: debe existir otro administrador activo en la misma organizacion.
  - `PROJECT_ADMIN`: debe existir otro administrador activo en el mismo proyecto.
- Si la desactivacion es valida, se conserva FASE 62.6:
  - incremento automatico de `tokenVersion`.
  - auditoria `USER_DEACTIVATED`.
  - respuesta sanitizada.

## Casos QA

| Caso | Resultado |
| --- | --- |
| A. Admin intenta desactivarse a si mismo y recibe 409 | OK |
| B. Token del admin sigue funcionando despues del intento bloqueado | OK |
| C. Intento bloqueado no incrementa `tokenVersion` | OK |
| D. Intento bloqueado no cambia `status` | OK |
| E. Intento bloqueado auditado como rechazo | No aplica; el patron actual no audita operaciones rechazadas antes de mutacion |
| F. Desactivar ultimo admin activo devuelve 409 | OK |
| G. Desactivar admin cuando existe otro admin activo funciona | OK |
| H. Desactivar usuario no administrativo activo funciona | OK |
| I. Desactivacion permitida mantiene `tokenVersion +1` | OK |
| J. Usuario sin permisos recibe 403 | OK |
| K. Sin token recibe 401 | OK |
| L. Usuario inexistente recibe 404 | OK |
| M. Builds OK | OK |

## Evidencia de ejecucion

Se levanto temporalmente la API compilada en `http://127.0.0.1:3001/api/v1`.
La prueba creo datos temporales de proyecto, usuarios y asignaciones de roles para validar proteccion de ultimo `PROJECT_ADMIN`. Los datos temporales fueron eliminados al finalizar.

Salida resumida:

```text
OK API health OK
OK Admin login OK (HTTP 201)
OK A. Admin no puede desactivarse a si mismo (HTTP 409)
OK D. Intento bloqueado no cambia status
OK C. Intento bloqueado no incrementa tokenVersion
OK B. Token admin sigue funcionando (HTTP 200)
OK Usuario no admin login OK (HTTP 201)
OK J. Usuario sin permisos recibe 403 (HTTP 403)
OK F. Ultimo admin activo de proyecto devuelve 409 (HTTP 409)
OK G. Desactivar admin con otro admin activo si funciona (HTTP 200)
OK I. Desactivacion permitida incrementa tokenVersion +1
OK H. Desactivar usuario no administrativo activo funciona (HTTP 200)
OK I. Usuario no admin desactivado incrementa tokenVersion +1
OK K. Sin token recibe 401 (HTTP 401)
OK L. Usuario inexistente recibe 404 (HTTP 404)
QA_RESULT OK
```

## Validaciones tecnicas

```powershell
npm.cmd run api:build
npm.cmd run web:build
```

Resultado:

- `api:build`: OK
- `web:build`: OK

## Pendientes

- Si se requiere auditoria de intentos rechazados, conviene definir una accion de auditoria especifica para rechazos administrativos. La infraestructura actual audita cambios aplicados, no bloqueos previos a mutacion.

## Resultado final

Ningun administrador puede desactivarse a si mismo, el sistema queda protegido contra la perdida del ultimo administrador activo y las desactivaciones validas siguen cerrando sesiones por `tokenVersion`.
