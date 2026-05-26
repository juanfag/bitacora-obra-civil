# FASE 54 - QA endpoint auditoria de bitacora diaria

## 1. Objetivo

Documentar una validacion reproducible para el endpoint interno de auditoria de bitacora diaria, confirmando que devuelve la trazabilidad relacionada con una `DailyLog` especifica, respeta permisos/acceso al proyecto y no expone datos sensibles.

## 2. Alcance

- Endpoint creado en FASE 53.
- Consulta de `AuditLog` relacionada por:
  - `entityId` cuando la entidad auditada es `DailyLog`.
  - `newValue.dailyLogId`.
  - `oldValue.dailyLogId`.
- Orden cronologico ascendente para uso como linea de tiempo.
- Sanitizacion de `oldValue` y `newValue`.
- No cubre cambios de PDF, QR, firmas ni workflow.

## 3. Endpoint validado

```http
GET /api/v1/daily-logs/:id/audit
Authorization: Bearer <JWT_TOKEN>
```

Respuesta esperada:

```json
{
  "dailyLogId": "<DAILY_LOG_ID>",
  "total": 1,
  "order": "createdAt:asc",
  "items": [
    {
      "id": "...",
      "action": "CREATE",
      "entity": "DailyLog",
      "entityId": "<DAILY_LOG_ID>",
      "userId": "...",
      "createdAt": "...",
      "oldValue": null,
      "newValue": {}
    }
  ]
}
```

## 4. Precondiciones

- API levantada en `http://localhost:3001`.
- Usuario autenticado con JWT valido.
- Usuario con permiso `daily-logs:read`.
- Usuario con acceso al proyecto de la bitacora.
- Una bitacora existente, no `VOIDED`.
- Audit logs existentes para esa bitacora.
- Opcional: bitacora con firmas aplicadas para validar `DAILY_LOG_SIGNATURE_APPLIED`.

Variables sugeridas:

```powershell
$env:JWT_TOKEN = "<JWT_TOKEN>"
$env:DAILY_LOG_ID = "<DAILY_LOG_ID>"
```

No guardar tokens reales en este documento ni en control de versiones.

## 5. Casos de prueba

| Caso | Procedimiento | Resultado esperado | Resultado obtenido local |
| --- | --- | --- | --- |
| Bitacora existente retorna 200 | Consultar `GET /daily-logs/:id/audit` con JWT valido. | HTTP 200. | OK. |
| Respuesta incluye estructura base | Revisar `dailyLogId`, `total`, `order`, `items`. | Todos los campos existen. | OK. |
| Orden `createdAt:asc` | Comparar fechas consecutivas en `items`. | Cada `createdAt` es menor o igual al siguiente. | OK por contrato de respuesta `order: createdAt:asc`; ambiente local retorno 1 item. |
| Eventos de firma aparecen si existen | Consultar bitacora con `DAILY_LOG_SIGNATURE_APPLIED`. | Items incluyen eventos donde `newValue.dailyLogId` coincide. | Pendiente de fixture especifico en esta corrida; endpoint filtra `newValue.dailyLogId`. |
| Eventos de cambio de estado aparecen si existen | Consultar bitacora con auditoria de workflow. | Items incluyen eventos relacionados si fueron registrados en `AuditLog`. | Pendiente de fixture especifico en esta corrida. |
| Bitacora inexistente retorna 404 | Consultar UUID inexistente. | HTTP 404. | OK. |
| Usuario sin permiso `daily-logs:read` | Consultar con usuario autenticado sin permiso. | HTTP 403, o 401 si token invalido/ausente. | Pendiente por falta de usuario local sin permiso. |
| Usuario sin acceso al proyecto | Consultar con usuario valido sin acceso al proyecto. | HTTP 403. | Pendiente por usuario demo con acceso amplio. |
| Payload no contiene datos sensibles | Buscar cadenas prohibidas en respuesta. | Sin `base64`, `data:image`, rutas ni hashes completos. | OK. |

## 6. Comandos reproducibles

### Build API

```powershell
npm.cmd run api:build
```

### Login para obtener JWT

Ejemplo con credenciales de entorno local. No documentar tokens reales.

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"<EMAIL>","password":"<PASSWORD>"}'

$env:JWT_TOKEN = $login.accessToken
```

### Consultar auditoria con PowerShell

```powershell
$headers = @{ Authorization = "Bearer $env:JWT_TOKEN" }

$audit = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3001/api/v1/daily-logs/$env:DAILY_LOG_ID/audit" `
  -Headers $headers

$audit | ConvertTo-Json -Depth 20
```

### Consultar auditoria con curl

```powershell
curl.exe `
  -H "Authorization: Bearer <JWT_TOKEN>" `
  "http://localhost:3001/api/v1/daily-logs/<DAILY_LOG_ID>/audit"
```

### Validar orden `createdAt:asc`

```powershell
$items = $audit.items
$isSorted = $true
for ($i = 1; $i -lt $items.Count; $i++) {
  if ([datetime]$items[$i - 1].createdAt -gt [datetime]$items[$i].createdAt) {
    $isSorted = $false
  }
}
$isSorted
```

Resultado esperado:

```text
True
```

### Buscar cadenas sensibles en la respuesta

```powershell
$json = $audit | ConvertTo-Json -Depth 30
$patterns = @(
  "base64",
  "data:image",
  "storagePath",
  "uploads/",
  "C:\",
  "/mnt/",
  "apps/api"
)

$patterns | ForEach-Object {
  if ($json.Contains($_)) {
    "FOUND: $_"
  }
}

if ($json -match "[a-fA-F0-9]{64}") {
  "FOUND: possible SHA256 hash"
}
```

Resultado esperado: sin salida.

### Contrastar AuditLog desde Prisma/Nest

Usar `AppModule` para respetar la configuracion real del proyecto.

```powershell
@'
import { Test } from '@nestjs/testing';
import { AppModule } from './apps/api/src/app.module';
import { PrismaService } from './apps/api/src/prisma/prisma.service';

async function main() {
  const dailyLogId = process.env.DAILY_LOG_ID;
  if (!dailyLogId) {
    throw new Error('DAILY_LOG_ID is required.');
  }

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const prisma = moduleFixture.get(PrismaService);
  const items = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityName: 'DailyLog', entityId: dailyLogId },
        { newValue: { path: ['dailyLogId'], equals: dailyLogId } },
        { oldValue: { path: ['dailyLogId'], equals: dailyLogId } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      action: true,
      entityName: true,
      entityId: true,
      createdAt: true,
    },
  });

  console.log(JSON.stringify({ total: items.length, items }, null, 2));
  await moduleFixture.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@ | npx.cmd ts-node --project apps/api/tsconfig.json
```

## 7. Resultado esperado por caso

- `200 OK` para bitacora existente con JWT valido, permiso `daily-logs:read` y acceso al proyecto.
- Respuesta contiene `dailyLogId`, `total`, `order` e `items`.
- `order` debe ser `createdAt:asc`.
- Eventos de firma deben aparecer cuando `newValue.dailyLogId` coincide.
- Eventos de cambio de estado deben aparecer si existen en `AuditLog` y estan relacionados por `entityId`, `oldValue.dailyLogId` o `newValue.dailyLogId`.
- UUID inexistente devuelve `404`.
- Sin JWT o token invalido devuelve `401`.
- Sin permiso o sin acceso al proyecto devuelve `403`.
- `oldValue` y `newValue` no exponen imagenes, base64, rutas internas ni hashes completos.

## 8. Resultado obtenido en ambiente local

Comando ejecutado:

```powershell
npm.cmd run api:build
```

Resultado: OK.

Validacion con modulo Nest local:

```json
{
  "dailyLogId": "d7006ba1-c847-48b2-b61c-40aee2255587",
  "total": 1,
  "order": "createdAt:asc",
  "firstAction": "CREATE",
  "hasSensitivePayload": false,
  "notFoundStatus": 404
}
```

Interpretacion:

- Bitacora existente retorno `200`.
- Respuesta incluyo `dailyLogId`, `total`, `order` e `items`.
- Orden declarado: `createdAt:asc`.
- Bitacora inexistente retorno `404`.
- No se detectaron cadenas sensibles en la respuesta.

## 9. Pendientes / riesgos

- No se valido `403` con usuario sin acceso al proyecto porque el usuario demo local tiene acceso amplio.
- No se valido `403` por falta de permiso `daily-logs:read` por falta de fixture local de usuario restringido.
- La validacion local retorno una bitacora con un solo evento `CREATE`; conviene agregar fixtures QA con cambios de estado y firmas para cubrir visualmente timeline mas rica.
- Si en el futuro se agregan nuevos eventos con payloads mas complejos, mantener actualizada la lista de claves/cadenas sensibles sanitizadas.
