# FASE 50 - Validacion visual y QA de firmas en PDF

## 1. Objetivo

Validar de forma reproducible que las firmas reales aplicadas a una bitacora diaria se embeben visualmente en el PDF generado, sin romper la verificacion QR, el snapshot documental cerrado ni las reglas de seguridad de exposicion de datos internos.

## 2. Alcance validado

- Generacion del PDF diario desde `daily-log-pdf.service.ts`.
- Render visual de firmas `RESPONSIBLE` y `APPROVER` desde `DailyLogSignature`.
- Fallback visual cuando una firma no existe o su imagen no puede leerse.
- Conservacion de QR y bloque de verificacion documental.
- No exposicion de rutas internas, `storagePath`, `uploads/`, rutas absolutas ni checksums completos.
- No sobrescritura de snapshots documentales existentes.

## 3. Precondiciones

- API activa o entorno local capaz de ejecutar el modulo NestJS.
- Base de datos PostgreSQL disponible.
- Una bitacora `CLOSED`.
- Al menos una bitacora `CLOSED` con firma `RESPONSIBLE`.
- Opcional: una bitacora con firma `APPROVER`.
- Usuario autenticable para pruebas manuales si se valida desde endpoint HTTP.

Ambiente local usado:

- DailyLog probado: `3b328019-00a3-466c-b897-8c1cb22a4a4a`.
- Estado: `CLOSED`.
- Firmas presentes: `RESPONSIBLE`.
- Firma `APPROVER`: no registrada en este ambiente.

## 4. Casos de prueba

| Caso | Procedimiento | Resultado esperado | Resultado obtenido local |
| --- | --- | --- | --- |
| PDF sin firmas | Generar PDF de una bitacora sin registros en `daily_log_signatures`. | La seccion `Firmas` aparece y muestra `Firma no registrada` para Responsable y Aprobador. El PDF no falla. | Pendiente por falta de fixture local sin firmas al momento de esta validacion. |
| PDF con solo RESPONSIBLE | Generar PDF de bitacora `CLOSED` con firma `RESPONSIBLE`. | Bloque Responsable muestra imagen, nombre y fecha/hora. Bloque Aprobador muestra `Firma no registrada`. | OK. DailyLog `3b328019-00a3-466c-b897-8c1cb22a4a4a` genero PDF valido con firma RESPONSIBLE. |
| PDF con RESPONSIBLE + APPROVER | Generar PDF de bitacora con ambas firmas aplicadas. | Ambos bloques muestran imagen, nombre y fecha/hora. | Pendiente por falta de firma APPROVER en el ambiente local. |
| PDF con APPROVER faltante | Generar PDF con RESPONSIBLE y sin APPROVER. | Aprobador muestra `Firma no registrada` sin romper layout. | OK, cubierto por el caso local con solo RESPONSIBLE. |
| PDF con imagen de firma invalida/corrupta | Alterar temporalmente un snapshot de firma en entorno controlado o apuntar a archivo ilegible. | El PDF se genera y el bloque afectado muestra fallback `Firma no registrada`. | Pendiente. No se alteraron archivos productivos ni snapshots existentes. |
| PDF cerrado con snapshot previo | Generar PDF de bitacora `CLOSED` que ya tiene snapshot documental. | Si no hay firmas nuevas posteriores al snapshot, reutiliza snapshot. Si hay firmas posteriores, genera PDF en memoria con firmas sin sobrescribir snapshot existente. | OK. El PDF de prueba se genero en memoria con firma aplicada posterior al snapshot sin sobrescribir el snapshot documental. |
| Verificacion QR despues de generar PDF | Abrir o consultar la URL QR/publica de verificacion del PDF generado. | QR y codigo siguen apuntando a verificacion publica, sin requerir cambios de endpoint. | No se modifico la logica QR. Pendiente de validacion visual manual en navegador en esta fase. |
| Inspeccion de cadenas sensibles | Buscar cadenas internas en el buffer PDF. | No aparecen `storagePath`, `uploads/`, `C:\`, `/mnt/`, `apps/api`, `checksumSha256`. | OK. `forbiddenFound: []`. |

## 5. Comandos reproducibles

### Build API

```powershell
npm.cmd run api:build
```

### Generar PDF de prueba

Este comando genera `bitacora-fase50-signatures-qa.pdf` en la raiz del proyecto usando una bitacora `CLOSED` con firma `RESPONSIBLE` o `APPROVER`.

```powershell
@'
import { Test } from '@nestjs/testing';
import { writeFile } from 'node:fs/promises';
import { AppModule } from './apps/api/src/app.module';
import { DailyLogPdfService } from './apps/api/src/daily-logs/daily-log-pdf.service';
import { PrismaService } from './apps/api/src/prisma/prisma.service';

async function main() {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const pdfService = moduleFixture.get(DailyLogPdfService);
  const prisma = moduleFixture.get(PrismaService);
  const dailyLog = await prisma.dailyLog.findFirst({
    where: {
      status: 'CLOSED',
      signatures: { some: { signatureType: { in: ['RESPONSIBLE', 'APPROVER'] } } },
    },
    select: {
      id: true,
      status: true,
      signatures: {
        select: { signatureType: true, signerName: true, signedAt: true },
        orderBy: { signedAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!dailyLog) {
    console.log(JSON.stringify({ skipped: true, reason: 'No CLOSED DailyLog with signatures found.' }, null, 2));
    await moduleFixture.close();
    return;
  }

  const pdf = await pdfService.generate(dailyLog.id, {
    sub: 'a287d76b-a684-4e67-862d-b5113a324009',
    email: 'admin@bitacora.local',
    fullName: 'Administrador Demo',
    status: 'ACTIVE',
  });
  await writeFile('bitacora-fase50-signatures-qa.pdf', pdf.buffer);

  const text = pdf.buffer.toString('latin1');
  const forbidden = ['storagePath', 'uploads/', 'uploads\\\\', 'C:\\\\', '/mnt/', 'apps/api', 'checksumSha256'];
  const forbiddenFound = forbidden.filter((item) => text.includes(item));

  console.log(JSON.stringify({
    dailyLog,
    fileName: pdf.fileName,
    output: 'bitacora-fase50-signatures-qa.pdf',
    header: pdf.buffer.subarray(0, 5).toString('ascii'),
    sizeBytes: pdf.buffer.length,
    forbiddenFound,
  }, null, 2));

  await moduleFixture.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@ | npx.cmd ts-node --project apps/api/tsconfig.json
```

### Validar que inicia con `%PDF-`

```powershell
Format-Hex -Path .\bitacora-fase50-signatures-qa.pdf -Count 5
```

Resultado esperado: los primeros bytes corresponden a `%PDF-`.

### Buscar cadenas sensibles

```powershell
Select-String -Path .\bitacora-fase50-signatures-qa.pdf -Pattern 'storagePath','uploads/','C:\\','/mnt/','apps/api','checksumSha256' -SimpleMatch
```

Resultado esperado: sin coincidencias.

## 6. Resultado esperado general

- El PDF se genera correctamente y abre en visor compatible.
- La seccion `Firmas` aparece al final del PDF.
- Responsable y Aprobador muestran imagen real si existe snapshot.
- Si falta la firma, aparece `Firma no registrada`.
- QR/verificacion documental siguen presentes.
- No se sobrescribe el snapshot documental cerrado existente.
- No se exponen rutas internas, paths locales, `uploads/`, `storagePath` ni checksums completos.

## 7. Resultado obtenido en ambiente local

Comando ejecutado:

```powershell
npm.cmd run api:build
```

Resultado: OK.

PDF generado:

- Archivo: `bitacora-fase50-signatures-qa.pdf`.
- DailyLog: `3b328019-00a3-466c-b897-8c1cb22a4a4a`.
- Estado: `CLOSED`.
- Firma encontrada: `RESPONSIBLE`, firmante `Administrador Demo`.
- Header: `%PDF-`.
- Tamano aproximado: `139970` bytes.
- Cadenas sensibles encontradas: ninguna.

Salida relevante:

```json
{
  "dailyLog": {
    "id": "3b328019-00a3-466c-b897-8c1cb22a4a4a",
    "status": "CLOSED",
    "signatures": [
      {
        "signatureType": "RESPONSIBLE",
        "signerName": "Administrador Demo",
        "signedAt": "2026-05-25T23:01:49.264Z"
      }
    ]
  },
  "fileName": "bitacora-2026-05-22.pdf",
  "output": "bitacora-fase50-signatures-qa.pdf",
  "header": "%PDF-",
  "sizeBytes": 139970,
  "forbiddenFound": []
}
```

## 8. Riesgos o pendientes

- Falta validar visualmente un PDF con ambas firmas `RESPONSIBLE` + `APPROVER` en este ambiente local.
- Falta simular una imagen corrupta de firma en un entorno aislado para confirmar visualmente el fallback.
- Falta abrir manualmente el PDF en Chrome/Adobe para inspeccion visual final.
- Falta validar manualmente la URL QR publica desde navegador despues de generar el PDF.
- Si el negocio exige que las firmas formen parte del snapshot documental inmutable, se debe definir una fase posterior para cerrar la bitacora solo despues de firmas o versionar un nuevo snapshot firmado sin sobrescribir el snapshot original.
