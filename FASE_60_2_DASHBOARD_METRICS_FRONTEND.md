# FASE 60.2 - Frontend dashboard metrics reales

## Objetivo

Conectar el Dashboard ejecutivo frontend al endpoint real:

```http
GET /api/v1/dashboard/metrics
```

## Archivos modificados

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/dashboard/page.tsx`

## Cambios realizados

### API client

Se agrego el tipo:

```ts
DashboardMetrics
```

Campos:

- `activeProjects`
- `openDailyLogs`
- `pendingApprovalDailyLogs`
- `closedDailyLogs`
- `totalEvents`
- `totalActiveUsers`

Se agrego la funcion:

```ts
getDashboardMetrics()
```

que consume:

```http
/dashboard/metrics
```

### Dashboard frontend

- Los KPIs dejaron de calcularse desde listados frontend.
- Los KPIs ahora usan `getDashboardMetrics()` como fuente real del backend.
- Se mantiene carga de:
  - `GET /projects` para accesos rapidos y nombres de proyectos.
  - `GET /daily-logs?limit=100` para actividad reciente.
- Se agrego KPI visible `Usuarios activos`, usando `totalActiveUsers`.
- Se conserva loading state.
- Se conserva error state.
- Se conserva manejo `401` con `logout()` y redireccion a `/login`.
- Si el backend responde KPIs en `0`, se renderizan como `0` sin empty/error artificial.

## Contratos y restricciones

- No se modifico backend.
- No se modifico Prisma.
- No se cambiaron contratos API.
- No se altero el diseno visual validado en FASE 59.

## Validacion ejecutada

```powershell
npm.cmd run web:build
```

Resultado: OK.

## Resultado final

- Dashboard conectado al endpoint real de metricas.
- KPIs ya no dependen de calculos frontend locales.
- Actividad reciente y accesos rapidos siguen funcionando con endpoints existentes.
