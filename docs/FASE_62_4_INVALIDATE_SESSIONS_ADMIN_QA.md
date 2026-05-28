# FASE 62.4 - Logout global / invalidate sessions desde administracion

## Objetivo

Permitir que un usuario administrativo invalide todas las sesiones activas de otro usuario incrementando `tokenVersion`, reutilizando la validacion JWT implementada en FASE 62.3.

## Endpoint implementado

```http
POST /api/v1/users/:id/invalidate-sessions
```

## Seguridad

- Requiere JWT valido.
- Usa `JwtAuthGuard`.
- Usa `PermissionsGuard`.
- Requiere permisos administrativos existentes:
  - `users:update`
  - `users:manage`
  - `organizations:update`
  - `organizations:create`
- Mantiene `401` para sesion invalida o ausente.
- Mantiene `403` para usuario autenticado sin permisos.
- Valida alcance del actor sobre el usuario objetivo mediante `ProjectAccessPolicy`.

## Logica implementada

- Busca el usuario objetivo por `id`.
- Si no existe, responde `404`.
- Incrementa `tokenVersion` en `+1`.
- Retorna el usuario sanitizado con `tokenVersion` actualizado.
- Registra auditoria como `UPDATE` sobre entidad `User` con:
  - `oldValue.tokenVersion`
  - `newValue.tokenVersion`
  - `newValue.sessionsInvalidated = true`

No se registran passwords, tokens, hashes completos, imagenes, base64, `storagePath`, `uploads/` ni rutas internas.

## Archivos modificados

- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.ts`

## Casos QA

| Caso | Resultado |
| --- | --- |
| A. Login usuario objetivo y obtener token valido | OK |
| B. Token funciona en endpoint protegido | OK |
| C. Admin ejecuta `POST /users/:id/invalidate-sessions` | OK |
| D. Token anterior del usuario objetivo devuelve 401 | OK |
| E. Usuario objetivo hace login nuevamente | OK |
| F. Nuevo token funciona | OK |
| G. Usuario sin permisos intenta invalidar sesiones y recibe 403 | OK |
| H. Request sin token recibe 401 | OK |
| I. Usuario inexistente recibe 404 | OK |
| J. Auditoria registra el cambio de `tokenVersion` | OK |

## Evidencia de ejecucion

Se levanto temporalmente la API compilada en `http://127.0.0.1:3001/api/v1`, se ejecutaron los casos y se detuvo el proceso al finalizar.

Salida resumida:

```text
OK API health OK
OK A. Login usuario objetivo/admin OK (HTTP 201)
OK B. Token funciona en endpoint protegido (HTTP 200)
OK C. Admin invalida sesiones incrementando tokenVersion (HTTP 200)
OK D. Token anterior devuelve 401 (HTTP 401)
OK E. Usuario hace login nuevamente (HTTP 201)
OK F. Nuevo token funciona (HTTP 200)
OK G. Usuario sin permisos recibe 403 (HTTP 403)
OK H. Sin token recibe 401 (HTTP 401)
OK I. Usuario inexistente recibe 404 (HTTP 404)
OK J. Auditoria registra invalidacion de sesiones
OK J. Auditoria no contiene datos sensibles
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

- La desactivacion/cambio de estado ya incrementa `tokenVersion` en el flujo actual de `PATCH /users/:id/status`.
- No se implemento UI administrativa para esta accion en esta fase.

## Resultado final

Un administrador puede invalidar todas las sesiones activas de un usuario. Los tokens anteriores quedan invalidados inmediatamente por `tokenVersion`, los nuevos logins funcionan y RBAC conserva correctamente la diferencia entre `401` y `403`.
