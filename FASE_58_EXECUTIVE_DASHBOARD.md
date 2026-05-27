# FASE 58 - Dashboard ejecutivo

## Objetivo

Crear una pagina frontend de dashboard ejecutivo para presentar una vista inicial del estado general de proyectos, bitacoras y eventos registrados.

## Ruta creada

- `apps/web/src/app/dashboard/page.tsx`
- URL local validada: `http://localhost:3000/dashboard`

Tambien se actualizo:

- Navegacion principal para incluir `Dashboard`.
- Redireccion de home `/` hacia `/dashboard`.
- Link de marca `Bitacora` hacia `/dashboard`.

## Datos mostrados

KPIs principales:

- Proyectos activos.
- Bitacoras abiertas.
- Pendientes de aprobacion.
- Bitacoras cerradas.
- Eventos registrados.

Secciones:

- Accesos rapidos:
  - Ver proyectos.
  - Ver bitacoras.
  - Crear proyecto.
  - Crear bitacora diaria.
- Actividad reciente:
  - Ultimas bitacoras disponibles.
  - Fecha.
  - Estado legible.
  - Comentario/titulo.
  - Proyecto.
  - Acceso al detalle.

## Endpoints usados

- `GET /api/v1/projects`
- `GET /api/v1/daily-logs?limit=100`
- `GET /api/v1/daily-log-events?limit=100`

Todos se consumen con `apiRequest`, reutilizando Authorization Bearer y el manejo existente de `401` con `logout()` y redireccion a `/login`.

## Fallbacks aplicados

- Si no hay proyectos, los KPIs se calculan con `0` y la creacion de bitacora diaria dirige a proyectos.
- Si el endpoint de eventos no esta disponible, el KPI `Eventos registrados` muestra `No disponible` sin tumbar todo el dashboard.
- Si no hay actividad reciente, se muestra empty state claro.
- Si un proyecto no se puede resolver para una bitacora, se muestra `Proyecto no disponible`.
- No se muestran IDs tecnicos como contenido visible de KPIs o actividad reciente.

## Validacion visual

Ambiente local:

- API: `http://localhost:3001/api/v1`
- Web: `http://localhost:3000`

Resultado observado en navegador:

- Header visible: `Dashboard ejecutivo`.
- Subtitulo visible: `Resumen general de proyectos y bitacoras`.
- KPIs visibles en el ambiente local:
  - Proyectos activos: `1`
  - Bitacoras abiertas: `4`
  - Pendientes de aprobacion: `0`
  - Bitacoras cerradas: `7`
  - Eventos registrados: `11`
- Seccion `Accesos rapidos` visible.
- Seccion `Actividad reciente` visible con bitacoras recientes y enlaces al detalle.
- No se observaron cadenas sensibles como `storagePath`, `uploads/`, `data:image`, `base64`, `C:\`, `/mnt/` o `apps/api`.

## Comandos ejecutados

```powershell
npm.cmd run web:build
```

## Resultado final

- Dashboard ejecutivo implementado.
- Build web OK.
- Backend no modificado.
- Prisma no modificado.
- Contratos API no modificados.
