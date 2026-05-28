# FASE 62.11 - Frontend gestión de roles y proyectos del usuario

## Objetivo

Completar desde `/users/:id` la administración operativa de usuarios: ver roles, asignar/remover roles permitidos, ver organizaciones/proyectos asociados, asociar/remover proyectos y conservar reglas RBAC en backend.

## Alcance implementado

- Se reorganizó la pantalla de detalle de usuario en secciones claras:
  - Información general.
  - Roles asignados.
  - Organizaciones asociadas.
  - Proyectos asociados.
  - Acciones administrativas disponibles.
  - Administración de roles.
  - Administración de proyectos.
  - Administración de sesiones.
- Se agregó asociación de usuario a proyecto mediante rol inicial.
- Se agregó remoción de usuario de un proyecto removiendo todos los roles visibles de ese proyecto.
- Se mantuvo modo solo lectura para usuarios sin permisos administrativos.
- Se agregaron mensajes claros para 401, 403, 404 y 409.
- Se corrigieron controles responsive básicos para selects y botones de administración.

## Endpoints usados

- `GET /api/v1/users/:id`
- `GET /api/v1/roles/assignable`
- `GET /api/v1/projects?status=ACTIVE`
- `PATCH /api/v1/users/:id/roles`
- `POST /api/v1/users/:id/invalidate-sessions`

No se creó un endpoint nuevo para asociar proyectos porque el modelo actual representa la asociación mediante `ProjectUser`, que requiere `projectId + roleId`. Por eso la UI asocia un proyecto solicitando un rol inicial y reutiliza `PATCH /users/:id/roles`.

## Validaciones RBAC aplicadas

- `PATCH /users/:id/roles` conserva las validaciones existentes:
  - roles dentro del alcance del actor.
  - no remover último administrador.
  - no auto-remover rol administrativo crítico.
  - no operar usuarios fuera del alcance visible.
- `GET /projects` ahora filtra por `ProjectAccessPolicy`.
- `GET /projects/:id` ahora valida acceso por `ProjectAccessPolicy`.
- `GET /daily-logs`, `GET /projects/:projectId/daily-logs` y `GET /daily-logs/:id` ahora filtran/validan proyectos accesibles.
- `GET /events`, `GET /events/:id` y `GET /daily-logs/:dailyLogId/events` ahora filtran/validan proyectos accesibles.
- Crear/actualizar eventos y bitácoras valida acceso al proyecto antes de modificar datos.

## Archivos modificados

- `apps/web/src/app/users/[id]/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/api-client.ts`
- `apps/api/src/projects/projects.controller.ts`
- `apps/api/src/projects/projects.service.ts`
- `apps/api/src/daily-logs/daily-logs.controller.ts`
- `apps/api/src/daily-logs/daily-logs.service.ts`
- `apps/api/src/events/events.controller.ts`
- `apps/api/src/events/events.module.ts`
- `apps/api/src/events/events.service.ts`

## Validaciones ejecutadas

- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK

## Pendientes / riesgos

- Un usuario sin asignaciones visibles puede seguir sin aparecer para administradores con alcance estrictamente por proyecto; esto viene de la regla actual de visibilidad por asignaciones activas.
- La remoción de proyecto se implementa como remoción de roles visibles del proyecto. Si luego se crea una membresía sin rol, convendrá separar endpoint/modelo.
- No se realizó QA visual en navegador en esta fase; queda recomendado para una fase de validación visual posterior.
