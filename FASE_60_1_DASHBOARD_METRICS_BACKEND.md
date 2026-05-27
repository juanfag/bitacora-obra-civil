# FASE 60.1 - Dashboard metrics backend base

## Objetivo

Crear una base backend para las metricas principales del Dashboard ejecutivo usando datos reales, respetando RBAC y el acceso por proyectos.

## Endpoint creado

```http
GET /api/v1/dashboard/metrics
```

Requiere:

- JWT valido.
- Permiso `daily-logs:read`.
- Alcance por proyectos accesibles al usuario autenticado.

## Archivos creados/modificados

Archivos creados:

- `apps/api/src/dashboard/dashboard.module.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/dashboard/dto/dashboard-metrics-response.dto.ts`

Archivos modificados:

- `apps/api/src/app.module.ts`
- `apps/api/src/projects/project-access.policy.ts`

## Respuesta

```json
{
  "activeProjects": 0,
  "openDailyLogs": 0,
  "pendingApprovalDailyLogs": 0,
  "closedDailyLogs": 0,
  "totalEvents": 0,
  "totalActiveUsers": 0
}
```

## Metricas implementadas

- `activeProjects`: proyectos `ACTIVE` visibles para el usuario.
- `openDailyLogs`: bitacoras visibles en estados operativos no cerrados.
- `pendingApprovalDailyLogs`: bitacoras visibles en `IN_REVIEW` o `PENDING_REVIEW`.
- `closedDailyLogs`: bitacoras visibles en `CLOSED`.
- `totalEvents`: eventos de bitacora no eliminados asociados a bitacoras de proyectos visibles.
- `totalActiveUsers`: usuarios activos asignados a proyectos visibles.

## Acceso por proyecto

Se agrego `getAccessibleProjectIds(userId)` en `ProjectAccessPolicy`.

Comportamiento:

- Si el usuario tiene acceso plataforma segun la regla existente, retorna `null` y las metricas consideran todos los proyectos.
- Si no tiene acceso plataforma, retorna los `projectId` activos donde el usuario tiene asignacion activa y rol activo.
- Si no tiene proyectos accesibles, el endpoint responde todos los KPIs en `0`.

## Eficiencia

- Las metricas se calculan con agregaciones Prisma (`count`) y una consulta `distinct` para usuarios activos.
- No se hacen consultas por proyecto.
- Se evita N+1.
- Las consultas principales se ejecutan dentro de una transaccion Prisma.

## Swagger

Se documento:

- Tag `dashboard`.
- Bearer auth.
- Respuestas `200`, `401`, `403`.
- DTO `DashboardMetricsResponseDto`.

## Restricciones respetadas

- No se modifico Prisma schema.
- No se crearon migraciones.
- No se cambiaron contratos existentes.
- No se expusieron datos de proyectos fuera del alcance del usuario.
- No se modifico frontend.

## Validacion ejecutada

```powershell
npm.cmd run api:build
```

Resultado: OK.

## Pendientes

- Integrar el frontend del dashboard para consumir `GET /dashboard/metrics` en una fase posterior.
- Agregar metricas evolutivas por rango de fechas si se requiere analitica historica.
