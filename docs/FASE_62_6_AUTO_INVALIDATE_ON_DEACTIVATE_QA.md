# FASE 62.6 - Auto-invalidacion al desactivar usuario

## Objetivo

Invalidar automaticamente todas las sesiones activas de un usuario cuando su estado pasa de `ACTIVE` a un estado no activo, incrementando `tokenVersion` y dejando auditoria trazable.

## Archivos modificados

- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`

## Implementacion

- `PATCH /api/v1/users/:id/status` ahora recibe contexto de auditoria.
- `UsersService.updateStatus()` detecta la transicion:
  - `status ACTIVE -> status no ACTIVE`
- Solo en esa transicion incrementa `tokenVersion` en `+1`.
- No incrementa `tokenVersion` cuando:
  - el usuario ya estaba en el mismo estado.
  - se reactiva un usuario.
  - se actualizan campos no relacionados.
- Cuando invalida sesiones por desactivacion registra auditoria `UPDATE` sobre `User` con:
  - `oldValue.status`
  - `oldValue.isActive`
  - `oldValue.tokenVersion`
  - `newValue.status`
  - `newValue.isActive`
  - `newValue.tokenVersion`
  - `newValue.sessionsInvalidated = true`
  - `newValue.reason = USER_DEACTIVATED`

## Casos QA

| Caso | Resultado |
| --- | --- |
| A. Login usuario objetivo activo y obtener token | OK |
| B. Confirmar token funciona | OK |
| C. Admin desactiva usuario | OK |
| D. Validar que `tokenVersion` aumento `+1` | OK |
| E. Token anterior devuelve 401 | OK |
| F. Usuario desactivado no puede hacer login | OK |
| G. Reactivar usuario no incrementa `tokenVersion` automaticamente | OK |
| H. Actualizar campos no relacionados no incrementa `tokenVersion` | OK |
| I. Desactivar usuario ya `INACTIVE` no incrementa dos veces | OK |
| J. Auditoria registra `sessionsInvalidated: true` y `reason: USER_DEACTIVATED` | OK |
| K. Usuario sin permisos recibe 403 | OK |
| L. Sin token recibe 401 | OK |

## Evidencia de ejecucion

Se levanto temporalmente la API compilada en `http://127.0.0.1:3001/api/v1`, se uso un usuario QA controlado y se restauro su metadata no sensible al finalizar. El `tokenVersion` se mantuvo incrementado como efecto correcto de invalidacion.

Salida resumida:

```text
OK API health OK
OK Admin login OK (HTTP 201)
OK A. Login usuario objetivo activo OK (HTTP 201)
OK B. Token objetivo funciona (HTTP 200)
OK C. Admin desactiva usuario (HTTP 200)
OK D. tokenVersion aumento +1
OK E. Token anterior devuelve 401 (HTTP 401)
OK F. Usuario desactivado no puede hacer login (HTTP 403)
OK I. Desactivar usuario ya INACTIVE responde OK (HTTP 200)
OK I. Usuario ya INACTIVE no incrementa dos veces
OK G. Reactivar usuario responde OK (HTTP 200)
OK G. Reactivar no incrementa tokenVersion
OK H. Actualizar campo no relacionado responde OK (HTTP 200)
OK H. Campo no relacionado no incrementa tokenVersion
OK J. Auditoria registra sessionsInvalidated true
OK J. Auditoria registra reason USER_DEACTIVATED
OK Usuario objetivo activo vuelve a iniciar sesion para prueba 403 (HTTP 201)
OK K. Usuario sin permisos recibe 403 (HTTP 403)
OK L. Sin token recibe 401 (HTTP 401)
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

Desactivar un usuario cierra sus sesiones activas automaticamente por `tokenVersion`, evita incrementos duplicados o innecesarios, bloquea login/JWT para usuarios no activos y deja auditoria segura de la invalidacion.
