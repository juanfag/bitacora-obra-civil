# FASE 60.3 - Backend actividad reciente dashboard

## Objetivo

Crear un endpoint optimizado para consultar la actividad reciente del dashboard ejecutivo sin depender de listados amplios como `GET /daily-logs?limit=100`.

## Endpoint

`GET /api/v1/dashboard/recent-activity`

Query opcional:

- `limit`: cantidad maxima de elementos a retornar. Valor por defecto: `20`. Maximo aplicado: `50`.

## Respuesta

Cada item retorna:

- `id`
- `type`
- `title`
- `description`
- `projectId`
- `projectName`
- `userId`
- `userName`
- `createdAt`

## Fuentes de datos

El endpoint consolida actividad reciente desde tablas con relacion directa al proyecto mediante `DailyLog`:

- `DailyLog`: creacion de bitacoras.
- `DailyLogStatusHistory`: aprobaciones, rechazos y cierres.
- `DailyLogPdfVersion`: generacion de PDF documental.
- `DailyLogSignature`: firmas aplicadas.
- `DailyLogEvent`: eventos recientes relevantes.

## Seguridad y alcance

- Requiere JWT.
- Requiere permiso `daily-logs:read`.
- Respeta acceso por proyecto usando `ProjectAccessPolicy.getAccessibleProjectIds`.
- Si el usuario no tiene proyectos accesibles, retorna lista vacia.
- No expone rutas internas, storage paths, base64, checksums ni hashes completos.

## Estrategia de consultas

- Se usan consultas directas con `include/select` controlado para evitar N+1.
- Cada fuente consulta hasta `limit` registros ordenados descendente por su fecha relevante.
- El servicio consolida, ordena por `createdAt DESC` y recorta al limite final.
- No se infiere el alcance de proyecto desde JSON de auditoria.

## Tipos de actividad

- `DAILY_LOG_CREATED`
- `DAILY_LOG_APPROVED`
- `DAILY_LOG_REJECTED`
- `DAILY_LOG_CLOSED`
- `DAILY_LOG_PDF_GENERATED`
- `DAILY_LOG_SIGNATURE_APPLIED`
- `DAILY_LOG_EVENT_REPORTED`

## Validacion

Comando requerido:

```powershell
npm.cmd run api:build
```

Resultado obtenido:

- OK. `npm.cmd run api:build` finalizo correctamente.

## Pendientes

- Integrar el dashboard frontend con este endpoint en una fase posterior si se requiere reemplazar la actividad calculada localmente.
