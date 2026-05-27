# FASE 59.1 - Fix PDF firmas visuales

## Objetivo

Corregir el renderizado de firmas aplicadas en el PDF diario para mostrar la imagen real del snapshot historico de `DailyLogSignature`, sin deformacion y sin modificar snapshots existentes.

## Archivo modificado

- `apps/api/src/daily-logs/daily-log-pdf.service.ts`

## Cambios realizados

- Se mantiene el uso de la firma desde el snapshot existente de `DailyLogSignature`.
- Se agrego validacion defensiva de MIME:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
- Se agrego validacion de magic bytes para:
  - JPEG
  - PNG
- Se agrego lectura de dimensiones reales de imagen:
  - PNG desde `IHDR`.
  - JPEG desde marcadores Start Of Frame.
- Se renderiza la firma dentro de una caja visual maxima:
  - ancho maximo: `190`
  - alto maximo: `72`
- Se calcula escala proporcional y se centra la imagen para evitar deformacion.
- Si el snapshot no existe, el MIME no es valido, los bytes no coinciden o la imagen no puede leerse, el PDF muestra:
  - `Firma no disponible`

## Seguridad

- No se recalculan firmas.
- No se modifican snapshots historicos.
- No se exponen rutas internas.
- No se exponen `storagePath`.
- No se exponen hashes.
- No se expone base64 en el PDF.
- La ruta del archivo se usa solo internamente para lectura segura del snapshot existente.

## Validaciones ejecutadas

```powershell
npm.cmd run api:build
```

Resultado: OK.

## Pendientes

- Validacion visual manual con un PDF real que tenga firma PNG/JPG aplicada.
- Si aparecen firmas historicas corruptas o con archivos faltantes, el PDF debe degradar a `Firma no disponible`.
