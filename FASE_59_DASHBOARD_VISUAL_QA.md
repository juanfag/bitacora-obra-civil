# FASE 59 - QA visual Dashboard ejecutivo

## Objetivo

Validar visualmente en navegador el Dashboard ejecutivo creado en `/dashboard`, revisando layout, KPIs, accesos rapidos, actividad reciente, estados, navegacion, auth y ausencia de informacion sensible.

## Ambiente usado

- Web local: `http://localhost:3000`
- API local: `http://localhost:3001/api/v1`
- Navegador: Codex in-app browser
- Usuario autenticado: administrador local de pruebas
- Fecha de validacion: 2026-05-26

## URL validada

- `http://localhost:3000/dashboard`
- Redireccion validada desde `/` hacia `/dashboard`

## Datos observados

KPIs renderizados en el ambiente local:

- Proyectos activos: `1`
- Bitacoras abiertas: `4`
- Pendientes de aprobacion: `0`
- Bitacoras cerradas: `7`
- Eventos registrados: `11`

Actividad reciente observada:

- Se muestran bitacoras recientes con fecha, estado legible, titulo/comentario, proyecto y enlace a detalle.
- Las fechas se renderizan en formato legible, por ejemplo `23 de may de 2026`.
- No se muestran IDs tecnicos completos en las cards de actividad.

## Validaciones visuales

### Layout general

- Header principal visible.
- Titulo `Dashboard ejecutivo` visible.
- Subtitulo `Resumen general de proyectos y bitacoras` visible.
- Cards KPI alineadas en grilla.
- Secciones separadas con cards limpias y espaciado consistente.
- Estilo visual sobrio tipo enterprise.

### KPIs

- Todos los KPIs requeridos se renderizan.
- Los valores cargan desde endpoints reales.
- No se observaron cadenas sensibles en el DOM:
  - `storagePath`
  - `uploads/`
  - `data:image`
  - `base64`
  - `C:\`
  - `/mnt/`
  - `apps/api`
  - hashes SHA256 completos

### Accesos rapidos

Navegacion validada:

- `Ver proyectos` -> `/projects` muestra `Espacio de proyectos`.
- `Ver bitacoras` -> `/daily-logs` muestra `Registro de bitacoras`.
- `Crear proyecto` -> `/projects/new` muestra `Nuevo proyecto`.
- `Crear bitacora diaria` -> `/daily-logs/new?projectId=...` muestra `Nueva bitacora`.

No se detectaron rutas rotas.

### Actividad reciente

- La seccion `Actividad reciente` aparece correctamente.
- La lista muestra informacion clara y accion `Ver detalle`.
- No expone rutas internas, storage paths, base64 ni hashes.
- El estado vacio esta implementado para ambientes sin bitacoras, aunque el ambiente local validado si contiene datos.

## Estados validados

- Loading state: observado al entrar inicialmente al dashboard, con mensaje `Cargando resumen ejecutivo`.
- Error state: validado deteniendo temporalmente la API local; el dashboard mostro `No fue posible cargar el dashboard`.
- Auth sin sesion: validado usando el flujo real `Cerrar sesion` desde Proyectos y abriendo `/dashboard`; se mostro la pantalla de login.
- Fallback parcial de eventos: revisado en implementacion. Si `GET /daily-log-events?limit=100` falla por un error no-401, el KPI `Eventos registrados` muestra `No disponible` sin tumbar proyectos, bitacoras ni actividad reciente. No se forzo visualmente un fallo exclusivo de ese endpoint para no alterar contratos ni backend.
- Empty state de actividad: revisado en implementacion. No se observo en datos locales porque si existen bitacoras recientes.

## Responsive

- Validacion visual real realizada en el viewport local de escritorio.
- Reglas responsive revisadas en CSS para grillas de KPIs, accesos rapidos y actividad reciente.
- En ancho movil (`max-width: 720px`) las cards y acciones pasan a una sola columna y los botones ocupan ancho disponible.

## Hallazgos

- El dashboard renderiza correctamente los datos reales del ambiente.
- La navegacion principal y accesos rapidos funcionan.
- La redireccion `/` -> `/dashboard` funciona.
- No se observaron datos sensibles en el DOM renderizado.
- No fue necesario aplicar ajustes adicionales durante esta fase.

## Ajustes realizados

- No se realizaron cambios de frontend en FASE 59.
- No se modifico backend.
- No se modifico Prisma.
- No se modificaron contratos API.

## Comandos ejecutados

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
npm.cmd run web:build
```

## Resultado final

- QA visual de Dashboard ejecutivo completado.
- Build web OK.
- Dashboard operativo en `/dashboard`.
- Redireccion desde `/` validada.
- Auth redirect validado.
- Estados principales validados.
