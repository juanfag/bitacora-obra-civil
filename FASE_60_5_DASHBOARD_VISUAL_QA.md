# FASE 60.5 - QA visual dashboard completo

## Objetivo

Validar visual y funcionalmente el dashboard ejecutivo con metricas reales y actividad reciente real.

## Ambiente usado

- API local: `http://localhost:3001/api/v1`
- Web local: `http://localhost:3000`
- Usuario QA: `admin@bitacora.local`
- Fecha de validacion: 2026-05-27

## Comandos ejecutados

```powershell
npm.cmd run web:build
npm.cmd run api:build
```

Resultado:

- `web:build`: OK
- `api:build`: OK

## Endpoints validados

### GET /dashboard/metrics

Status observado: `200 OK`

Respuesta observada:

```json
{
  "activeProjects": 1,
  "closedDailyLogs": 9,
  "openDailyLogs": 3,
  "pendingApprovalDailyLogs": 0,
  "totalActiveUsers": 1,
  "totalEvents": 12
}
```

### GET /dashboard/recent-activity?limit=20

Status observado: `200 OK`

Resultado observado:

- `limit`: `20`
- `items`: `20`
- Primer item:

```json
{
  "type": "DAILY_LOG_PDF_GENERATED",
  "title": "PDF generado",
  "projectName": "Proyecto sin code curl 101516",
  "userName": "Administrador Demo"
}
```

## Validacion visual en navegador

Ruta validada:

`http://localhost:3000/dashboard`

### Layout general

Resultado: OK

- Header visible.
- Titulo visible: `Dashboard ejecutivo`.
- Subtitulo visible: `Resumen general de proyectos y bitácoras.`
- Cards KPI alineadas.
- Secciones separadas: KPIs, accesos rapidos y actividad reciente.
- Espaciado consistente.

### KPIs

Resultado: OK

Valores visibles:

- Proyectos activos: `1`
- Bitacoras abiertas: `3`
- Pendientes de aprobacion: `0`
- Bitacoras cerradas: `9`
- Eventos registrados: `12`
- Usuarios activos: `1`

Los valores coinciden con `GET /dashboard/metrics`.

### Actividad reciente

Resultado: OK

La seccion muestra items reales desde `GET /dashboard/recent-activity?limit=20`.

Campos visibles por item:

- tipo: `PDF`, `Cierre`, `Firma`, `Aprobacion`, `Evento`, `Bitacora`
- titulo
- descripcion
- proyecto
- usuario
- fecha/hora

Ejemplos observados:

- `PDF generado`
- `Bitacora cerrada`
- `Firma aplicada`
- `Bitacora aprobada`
- `Evento registrado`

### IDs tecnicos y datos sensibles

Resultado: OK para texto visible.

No se observan IDs completos, rutas internas, `storagePath`, `uploads/`, base64, `data:image` ni hashes completos en el contenido visible del dashboard.

Nota: el enlace tecnico de `Crear bitacora diaria` conserva `projectId` en el `href`, porque el flujo existente requiere navegar a `/daily-logs/new?projectId=<id>`. Ese ID no se muestra como texto visible.

### Accesos rapidos

Resultado: OK

Links visibles:

- `Ver proyectos` -> `/projects`
- `Ver bitácoras` -> `/daily-logs`
- `Crear proyecto` -> `/projects/new`
- `Crear bitácora diaria` -> `/daily-logs/new?projectId=<id>`

No se detectaron rutas visualmente rotas.

### 401 / sesion expirada

Resultado: OK

Se cerro sesion desde UI y luego se abrio `/dashboard`.

Resultado observado:

- redireccion a `http://localhost:3000/login`

### Error state

Resultado: OK

Se detuvo la API local y se abrio `/dashboard` con sesion activa.

Resultado observado:

- Mensaje visible: `No fue posible cargar el dashboard`
- Mensaje secundario: `No fue posible cargar el dashboard.`
- La pagina no rompe layout.

### Loading state

Resultado: OK por implementacion y transicion observada.

El dashboard mantiene estado de carga con:

- `Cargando resumen ejecutivo`
- `Estamos consultando proyectos, bitácoras y actividad reciente.`

En el ambiente local la carga fue breve por respuestas rapidas de API.

### Estado vacio

Resultado: OK por implementacion.

El estado vacio esta cubierto cuando `recentActivity.length === 0`:

- `Sin actividad reciente`
- `Cuando existan bitácoras, firmas, PDFs o eventos, aparecerán aquí como una lista de seguimiento.`

El ambiente validado tenia 20 items, por lo que no se observo estado vacio con datos reales.

### Responsive basico

Resultado: OK por revision visual y CSS existente.

- Desktop: se observo correctamente en navegador.
- Tablet/movil: el CSS mantiene grillas auto-fit y `@media (max-width: 720px)` para apilar actividad y encabezados.
- No se observaron textos cortados en la validacion desktop.

## Evidencia

- Se validaron endpoints con respuestas HTTP reales.
- Se valido el dashboard en navegador usando DOM renderizado real.
- La captura de screenshot del navegador no se adjunto porque el comando de captura agoto tiempo en el plugin; se uso DOM snapshot real como evidencia textual.

## Hallazgos

- Sin bugs criticos.
- La actividad reciente renderiza datos reales y deja de depender de `GET /daily-logs?limit=100`.
- El dashboard mantiene comportamiento correcto ante error de API.

## Ajustes realizados

- No se modifico logica ni UI durante esta fase.

## Resultado final

FASE 60.5 validada correctamente.
