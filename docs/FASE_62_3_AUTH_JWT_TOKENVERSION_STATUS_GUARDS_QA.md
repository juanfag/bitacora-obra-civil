# FASE 62.3 - Auth/JWT/tokenVersion/status guards QA

## Objetivo

Endurecer la validacion de sesiones JWT para que un token autenticado deje de ser valido cuando el usuario no existe, no esta en estado `ACTIVE` o el `tokenVersion` del JWT no coincide con el valor actual guardado en base de datos.

## Archivos modificados

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/decorators/current-user.decorator.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`

## Cambios implementados

- El login incluye en el JWT:
  - `sub`
  - `email`
  - `fullName`
  - `status`
  - `tokenVersion`
- `CurrentUserPayload` incluye `tokenVersion`.
- `JwtStrategy.validate()` valida en cada request autenticado:
  - que el JWT tenga `tokenVersion`.
  - que el usuario exista.
  - que `user.status === ACTIVE`.
  - que `payload.tokenVersion === user.tokenVersion`.
- Las sesiones invalidas responden con error generico:
  - `Invalid or expired session.`
- No se modifico RBAC ni permisos existentes.

## Casos probados

| Caso | Resultado |
| --- | --- |
| A. Login usuario activo OK | OK |
| B. GET autenticado con token valido OK | OK |
| C. Cambiar `user.status` a `INACTIVE` invalida token vigente | OK |
| D. Restaurar `ACTIVE` permite acceso con tokenVersion correcto | OK |
| E. Incrementar `tokenVersion` invalida token anterior | OK |
| F. Login nuevo despues de actualizar `tokenVersion` genera token valido | OK |
| G. Endpoint sin token devuelve 401 | OK |
| H. Usuario autenticado sin permisos sigue devolviendo 403 | OK |

## Evidencia de comandos

Se ejecuto una prueba local reproducible levantando temporalmente la API compilada en `http://127.0.0.1:3001/api/v1`.

Resumen de salida:

```text
OK API health OK
OK A. Login usuario activo OK (HTTP 201)
OK JWT incluye tokenVersion y status
OK B. Endpoint autenticado con token valido OK (HTTP 200)
OK G. Endpoint sin token devuelve 401 (HTTP 401)
OK D. Usuario ACTIVE con tokenVersion correcto OK (HTTP 200)
OK C. Usuario INACTIVE devuelve 401 (HTTP 401)
OK D. Restaurar ACTIVE vuelve a permitir acceso (HTTP 200)
OK E. Token anterior queda invalido por tokenVersion (HTTP 401)
OK F. Login nuevo tras tokenVersion actualizado OK (HTTP 201)
OK F. Token nuevo funciona con tokenVersion actual (HTTP 200)
OK H. Usuario autenticado sin permisos devuelve 403 (HTTP 403)
QA_RESULT OK
```

Al finalizar la prueba se detuvo el proceso temporal de API y se confirmo que no quedo ningun proceso escuchando en el puerto `3001`.

## Validaciones tecnicas

Comandos requeridos:

```powershell
npm.cmd run api:build
npm.cmd run web:build
```

Resultado:

- `api:build`: OK
- `web:build`: OK

## Resultado final

La autenticacion ahora invalida tokens antiguos por `tokenVersion`, bloquea usuarios no activos en cada request protegida y conserva el comportamiento RBAC esperado: usuarios autenticados sin permiso reciben `403`, no `401`.
