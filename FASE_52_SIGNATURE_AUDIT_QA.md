# FASE 52 - QA auditoria de firmas

## 1. Objetivo

Documentar una validacion reproducible para confirmar que cada firma aplicada a una bitacora diaria genera auditoria `DAILY_LOG_SIGNATURE_APPLIED` con datos utiles de trazabilidad y sin exponer imagenes, base64, rutas internas ni hashes completos.

## 2. Alcance

- Servicio validado: `apps/api/src/daily-logs/daily-log-signatures.service.ts`.
- Evento de auditoria: `DAILY_LOG_SIGNATURE_APPLIED`.
- Tipos de firma cubiertos:
  - `RESPONSIBLE`
  - `APPROVER`
- Verificacion de payload seguro en `AuditLog.newValue`.
- No incluye cambios de permisos, guards, endpoints, PDF ni QR.

## 3. Precondiciones

- API compilable.
- Base de datos disponible.
- Usuario autenticable con acceso a una bitacora diaria.
- Usuario con firma maestra registrada en `/profile` o mediante endpoint `POST /api/v1/users/me/signature`.
- Bitacora en estado `APPROVED` o `CLOSED`.
- Para probar duplicados, debe existir una firma previa del mismo `signatureType` en la bitacora.

Ambiente local usado:

- DailyLog: `3b328019-00a3-466c-b897-8c1cb22a4a4a`.
- Estado: `CLOSED`.
- Firma auditada localmente: `APPROVER`.
- Usuario firmante: `Administrador Demo`.

## 4. Casos de prueba

| Caso | Procedimiento | Resultado esperado | Resultado obtenido local |
| --- | --- | --- | --- |
| Aplicar firma RESPONSIBLE genera auditoria | Aplicar `POST /daily-logs/:id/signatures` con `signatureType: RESPONSIBLE`. | Se crea registro `AuditLog` con action `DAILY_LOG_SIGNATURE_APPLIED`. | Pendiente en esta corrida: `RESPONSIBLE` ya existia previamente en la bitacora local. |
| Aplicar firma APPROVER genera auditoria | Aplicar firma `APPROVER` en bitacora firmable sin APPROVER. | Se crea auditoria con `dailyLogId`, `projectId`, `signatureType`, `signerUserId`, `signerName`, `signedAt`. | OK. Auditoria creada para `APPROVER`. |
| Intento de firma duplicada retorna 409 | Repetir el mismo `signatureType` en la misma bitacora. | Endpoint responde `409` y no crea firma duplicada. | OK validado en FASE 51 para duplicado de firma. |
| Payload no contiene imagen/base64/data:image | Consultar `AuditLog.newValue` y buscar esas cadenas. | Sin coincidencias. | OK. `sensitivePatternFound: false`. |
| Payload no contiene rutas internas | Buscar `storagePath`, `uploads/`, `C:\`, `/mnt/`, `apps/api`. | Sin coincidencias. | OK. |
| Payload no contiene hashes completos | Buscar `checksumSha256` o patrones hex SHA256 completos. | Sin coincidencias. | OK. |

## 5. Comandos reproducibles

### Build API

```powershell
npm.cmd run api:build
```

Resultado esperado: build TypeScript sin errores.

### Aplicar firma de prueba

Este ejemplo registra una firma maestra temporal JPG y aplica una firma `APPROVER` sobre una bitacora `APPROVED` o `CLOSED` que todavia no tenga ese tipo de firma.

```powershell
@'
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './apps/api/src/app.module';
import { PrismaService } from './apps/api/src/prisma/prisma.service';

async function main() {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const server = app.getHttpServer();
  const prisma = app.get(PrismaService);
  const dailyLog = await prisma.dailyLog.findFirst({
    where: {
      status: { in: ['APPROVED', 'CLOSED'] },
      signatures: { none: { signatureType: 'APPROVER' } },
    },
    select: { id: true, projectId: true, status: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!dailyLog) {
    console.log(JSON.stringify({ skipped: true, reason: 'No signable DailyLog without APPROVER signature found.' }, null, 2));
    await app.close();
    return;
  }

  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@bitacora.local', password: 'Password123!' })
    .expect(201);

  const token = login.body.accessToken;
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);

  await request(server)
    .post('/api/v1/users/me/signature')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', jpegBytes, 'firma-auditoria.jpg')
    .expect(201);

  const signature = await request(server)
    .post(`/api/v1/daily-logs/${dailyLog.id}/signatures`)
    .set('Authorization', `Bearer ${token}`)
    .send({ signatureType: 'APPROVER' })
    .expect(201);

  console.log(JSON.stringify({
    dailyLog,
    signature: {
      id: signature.body.id,
      signatureType: signature.body.signatureType,
      signerName: signature.body.signerName,
    },
  }, null, 2));

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@ | npx.cmd ts-node --project apps/api/tsconfig.json
```

### Consultar auditoria en BD

Usar el `AppModule` para respetar la configuracion real de Prisma/adaptador del proyecto.

```powershell
@'
import { Test } from '@nestjs/testing';
import { AppModule } from './apps/api/src/app.module';
import { PrismaService } from './apps/api/src/prisma/prisma.service';

const sensitivePattern = /base64|data:image|storagePath|uploads\\/|uploads\\\\|C:\\\\|\\/mnt\\/|apps\\/api|signatureSnapshotPath|signatureFileUrl|signatureFileHash|checksumSha256|[a-f0-9]{64}/i;

async function main() {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const prisma = moduleFixture.get(PrismaService);
  const audit = await prisma.auditLog.findFirst({
    where: { action: 'DAILY_LOG_SIGNATURE_APPLIED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      action: true,
      entityName: true,
      entityId: true,
      newValue: true,
      createdAt: true,
    },
  });

  if (!audit) {
    console.log(JSON.stringify({ found: false }, null, 2));
    await moduleFixture.close();
    return;
  }

  const text = JSON.stringify(audit.newValue);
  console.log(JSON.stringify({
    found: true,
    action: audit.action,
    entityName: audit.entityName,
    entityId: audit.entityId,
    createdAt: audit.createdAt,
    newValue: audit.newValue,
    sensitivePatternFound: sensitivePattern.test(text),
  }, null, 2));

  await moduleFixture.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@ | npx.cmd ts-node --project apps/api/tsconfig.json
```

### Validar ausencia de cadenas sensibles

Patrones cubiertos por el script:

- `base64`
- `data:image`
- `storagePath`
- `uploads/`
- `uploads\`
- `C:\`
- `/mnt/`
- `apps/api`
- `signatureSnapshotPath`
- `signatureFileUrl`
- `signatureFileHash`
- `checksumSha256`
- hash hexadecimal completo SHA256 de 64 caracteres

Resultado esperado:

```json
{
  "sensitivePatternFound": false
}
```

## 6. Resultado esperado por caso

- `RESPONSIBLE` y `APPROVER` deben crear auditoria al aplicarse por primera vez.
- El payload debe describir la accion como `operation: CREATED`.
- El payload debe incluir:
  - `dailyLogId`
  - `projectId`
  - `signatureType`
  - `signerUserId`
  - `signerName`
  - `signerRole`
  - `signedAt`
- El payload no debe incluir imagenes, base64, rutas internas ni hashes completos.
- La firma duplicada debe responder `409`.

## 7. Resultado obtenido en ambiente local

Build ejecutado:

```powershell
npm.cmd run api:build
```

Resultado: OK.

Auditoria consultada:

```json
{
  "found": true,
  "action": "DAILY_LOG_SIGNATURE_APPLIED",
  "entityName": "DailyLogSignature",
  "entityId": "02528ab5-da82-4ea7-af02-b5283c2b283e",
  "createdAt": "2026-05-26T14:14:53.806Z",
  "newValue": {
    "signedAt": "2026-05-26T14:14:53.779Z",
    "operation": "CREATED",
    "projectId": "6d3a45da-8f94-4cba-b0e1-9ddec8e2ff65",
    "dailyLogId": "3b328019-00a3-466c-b897-8c1cb22a4a4a",
    "signerName": "Administrador Demo",
    "signerRole": "Usuario",
    "signerUserId": "a287d76b-a684-4e67-862d-b5113a324009",
    "signatureType": "APPROVER"
  },
  "sensitivePatternFound": false
}
```

## 8. Pendientes o riesgos

- En el ambiente local, `RESPONSIBLE` ya existia previamente, por lo que la prueba activa de esta fase se documento con `APPROVER`.
- Si en una fase futura se permite reemplazar o actualizar firmas aplicadas, debe agregarse auditoria diferenciada con `operation: REPLACED` o `operation: UPDATED`.
- Para pruebas automatizadas permanentes conviene crear fixtures controlados que permitan firmar `RESPONSIBLE` y `APPROVER` sin depender del estado actual de la base local.
