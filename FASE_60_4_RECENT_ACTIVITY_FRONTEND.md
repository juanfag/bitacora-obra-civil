# FASE 60.4 - Frontend actividad reciente dashboard

## Objetivo

Conectar el dashboard ejecutivo al endpoint real de actividad reciente:

`GET /api/v1/dashboard/recent-activity?limit=20`

La actividad reciente deja de depender de `GET /daily-logs?limit=100`.

## Alcance

- Frontend Next.js en `apps/web`.
- No se modifico backend.
- No se modifico Prisma.
- No se cambiaron contratos API.

## Cambios implementados

### API client

Se agregaron tipos y cliente en `apps/web/src/lib/api-client.ts`:

- `DashboardRecentActivityItem`
- `DashboardRecentActivity`
- `getDashboardRecentActivity(limit = 20)`

### Dashboard

Se actualizo `apps/web/src/app/dashboard/page.tsx` para:

- consumir `getDashboardRecentActivity(20)`;
- renderizar tipo, titulo, descripcion, proyecto, usuario y fecha;
- mantener loading, error y empty state;
- mantener 401 con `logout()` y redirect a `/login`;
- conservar `GET /projects` solo para accesos rapidos y ruta de crear bitacora;
- no renderizar IDs tecnicos completos.

## Endpoint usado

- `GET /dashboard/recent-activity?limit=20`
- `GET /dashboard/metrics`
- `GET /projects` para accesos rapidos.

## Comando ejecutado

```powershell
npm.cmd run web:build
```

## Resultado

- OK. `npm.cmd run web:build` finalizo correctamente.
