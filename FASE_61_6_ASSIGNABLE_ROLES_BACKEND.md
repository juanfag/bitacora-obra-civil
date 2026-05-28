# FASE 61.6 - Backend catalogo de roles disponibles

## Objetivo

Crear un endpoint backend de solo lectura para listar los roles activos que el usuario autenticado puede asignar, respetando permisos actuales y evitando escalamiento de privilegios.

## Endpoint implementado

`GET /api/v1/roles/assignable`

El endpoint esta protegido con:

- `JwtAuthGuard`
- `PermissionsGuard`
- Permisos aceptados: `users:manage`, `organizations:update`, `organizations:create`

## Respuesta

La respuesta retorna un arreglo de roles activos:

```json
[
  {
    "id": "role-id",
    "code": "PROJECT_MANAGER",
    "name": "Project Manager",
    "description": "Role description",
    "scope": "PROJECT",
    "permissions": [
      {
        "id": "permission-id",
        "code": "daily-logs:read",
        "name": "Read daily logs",
        "description": "Permission description"
      }
    ]
  }
]
```

## Reglas implementadas

- Solo se retornan roles con `status = ACTIVE`.
- Solo se retornan roles cuyos permisos activos estan contenidos dentro de los permisos activos del usuario autenticado.
- Si el usuario no tiene proyectos accesibles, se retorna una lista vacia.
- El alcance se reporta como `PROJECT`, consistente con el modelo actual de asignaciones mediante `ProjectUser`.
- No se exponen relaciones internas, rutas, secretos, tokens ni informacion sensible.
- La validacion final de proyecto/alcance se mantiene en `PATCH /api/v1/users/:id/roles`.

## Eficiencia

La consulta evita N+1:

- Una consulta obtiene permisos activos del usuario autenticado.
- Una consulta obtiene roles activos con permisos activos relacionados.

## Archivos creados/modificados

- `apps/api/src/roles/roles.controller.ts`
- `apps/api/src/roles/roles.service.ts`
- `apps/api/src/roles/roles.module.ts`
- `apps/api/src/roles/dto/assignable-role-response.dto.ts`
- `apps/api/src/app.module.ts`
- `FASE_61_6_ASSIGNABLE_ROLES_BACKEND.md`

## Validacion

Comando ejecutado:

```powershell
npm.cmd run api:build
```

Resultado:

```text
api:build OK
```

## Notas

No se modifico Prisma, no se crearon migraciones y no se instalaron dependencias nuevas.
