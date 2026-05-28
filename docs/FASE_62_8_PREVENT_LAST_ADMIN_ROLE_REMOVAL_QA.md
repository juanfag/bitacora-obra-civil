# FASE 62.8 - Proteccion contra remocion del ultimo rol administrativo

## Objetivo

Impedir que una operacion de asignacion/remocion de roles deje al sistema, una organizacion o un proyecto sin administradores activos.

## Archivos modificados

- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`

## Implementacion

En `PATCH /api/v1/users/:id/roles`:

- Antes de desactivar asignaciones de roles, se detectan las asignaciones activas que saldrian del conjunto deseado.
- Si la asignacion removida corresponde a un rol administrativo protegido, se valida que quede al menos otra asignacion administrativa activa en el alcance correspondiente.
- Roles protegidos:
  - `SUPER_ADMIN`
  - `ORG_ADMIN`
  - `PROJECT_ADMIN`
- Alcances:
  - `SUPER_ADMIN`: global.
  - `ORG_ADMIN`: organizacion.
  - `PROJECT_ADMIN`: proyecto.
- Error de bloqueo:
  - `409 Conflict`
  - `No puedes remover el ultimo rol administrativo activo de este alcance.`
- Se documento `409` en Swagger para el endpoint de roles.
- Si la remocion es valida:
  - se mantiene la auditoria existente de cambio de roles.
  - no se cambia `status`.
  - no se incrementa `tokenVersion`.

## Casos QA

| Caso | Resultado |
| --- | --- |
| A. Intentar remover ultimo `SUPER_ADMIN` activo devuelve 409 | OK |
| B. Intentar remover ultimo `ORG_ADMIN` activo de una organizacion devuelve 409 | OK |
| C. Intentar remover ultimo `PROJECT_ADMIN` activo de un proyecto devuelve 409 | OK |
| D. Remover rol administrativo cuando existe otro admin activo en el mismo alcance funciona | OK |
| E. Remover rol no administrativo funciona | OK |
| F. Intento bloqueado no modifica la asignacion | OK |
| G. Intento bloqueado no cambia `tokenVersion` | OK |
| H. Intento bloqueado no cambia `status` del usuario | OK |
| I. Auditoria de remocion exitosa se mantiene | OK |
| J. Auditoria de bloqueo | Pendiente; el patron actual audita cambios aplicados, no intentos rechazados antes de mutacion |
| K. Usuario sin permisos recibe 403 | OK |
| L. Sin token recibe 401 | OK |
| M. Usuario/rol inexistente recibe 404 | OK |
| N. Builds OK | OK |

## Evidencia de ejecucion

Se levanto temporalmente la API compilada en `http://127.0.0.1:3001/api/v1`.
La prueba creo organizacion, proyectos, usuarios y asignaciones temporales para cubrir `SUPER_ADMIN`, `ORG_ADMIN`, `PROJECT_ADMIN` y roles no administrativos. Los datos temporales fueron eliminados al finalizar.

Salida resumida:

```text
OK API health OK
OK Admin login OK (HTTP 201)
OK A. Remover ultimo SUPER_ADMIN activo devuelve 409 (HTTP 409)
OK G. Bloqueo SUPER_ADMIN no cambia tokenVersion
OK H. Bloqueo SUPER_ADMIN no cambia status
OK B. Remover ultimo ORG_ADMIN de organizacion devuelve 409 (HTTP 409)
OK F. Bloqueo ORG_ADMIN no modifica asignacion
OK G. Bloqueo ORG_ADMIN no cambia tokenVersion
OK H. Bloqueo ORG_ADMIN no cambia status
OK C. Remover ultimo PROJECT_ADMIN de proyecto devuelve 409 (HTTP 409)
OK F. Bloqueo PROJECT_ADMIN no modifica asignacion
OK D. Remover rol admin con otro admin activo funciona (HTTP 200)
OK D. Asignacion admin valida queda inactiva
OK D. Remocion valida no cambia tokenVersion
OK Viewer login OK (HTTP 201)
OK E. Remover rol no administrativo funciona (HTTP 200)
OK E. Asignacion no admin queda inactiva
OK E. Remocion no admin no cambia tokenVersion
OK I. Auditoria de remocion exitosa se mantiene
OK K. Usuario sin permisos recibe 403 (HTTP 403)
OK L. Sin token recibe 401 (HTTP 401)
OK M. Usuario inexistente recibe 404 (HTTP 404)
OK M. Rol inexistente recibe 404 (HTTP 404)
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

## Resultado final

La remocion de roles ya no puede dejar ningun alcance sin administrador activo. Las remociones validas siguen funcionando y se conserva la separacion correcta entre `401`, `403`, `404` y `409`.
