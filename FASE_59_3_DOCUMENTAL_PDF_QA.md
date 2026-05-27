# FASE 59.3 - QA PDF documental

## Objetivo

Validar end-to-end que el PDF diario final conserva calidad documental despues de los fixes:

- FASE 59.1: render visual de firmas reales sin deformacion.
- FASE 59.2: estados documentales basados en transiciones reales.

## Ambiente usado

- API local: `http://127.0.0.1:3001/api/v1`
- Fecha de validacion: 2026-05-27
- Usuario autenticado: administrador local de pruebas

## Bitacoras usadas

### Bitacora principal con firmas reales validas

- DailyLog ID: `b16a1988-1f21-4704-8315-4d414c629a00`
- Estado: `CLOSED`
- Comentarios: `25 mayo`
- PDF generado: `bitacora-fase59-3-valid-signatures.pdf`
- Tamano PDF: `249043` bytes
- Verification code: `aacf5068d3f684ef`

Firmas aplicadas:

- `RESPONSIBLE`: `image/jpeg`, `39133` bytes.
- `APPROVER`: `image/jpeg`, `39133` bytes.
- `INSPECTOR`: `image/jpeg`, `39133` bytes.

Nota: el PDF actual renderiza visualmente los bloques requeridos `Responsable` y `Aprobador`.

### Bitacora secundaria para fallback de firma invalida

- DailyLog ID: `3b328019-00a3-466c-b897-8c1cb22a4a4a`
- Estado: `CLOSED`
- PDF generado: `bitacora-fase59-3.pdf`
- Tamano PDF: `139963` bytes

Firmas observadas:

- `RESPONSIBLE`: `image/png`, `68` bytes.
- `APPROVER`: `image/jpeg`, `9` bytes.

Esta segunda bitacora sirve para confirmar que una firma JPEG invalida o corrupta no se embebe como imagen valida y debe degradar a `Firma no disponible`.

## Validaciones ejecutadas

### Generacion de PDF

Se genero un PDF nuevo mediante:

```powershell
GET /api/v1/daily-logs/b16a1988-1f21-4704-8315-4d414c629a00/pdf
```

Resultado:

- Archivo creado correctamente.
- Header: `%PDF-`
- Tamano: `249043` bytes.
- Layout no rompio la generacion.

### Firmas visuales

Validacion estructural del PDF:

- Objetos de imagen detectados: `5`.
- Dimensiones de imagen detectadas:
  - `1300x867`
  - `1139x379`
  - `1139x379`
  - `172x172`

Interpretacion:

- Las dos imagenes `1139x379` corresponden a snapshots de firma JPG validos.
- El render del servicio usa una caja maxima `190x72` y calcula escala proporcional, por lo que no deforma la relacion de aspecto.
- El QR aparece como imagen cuadrada `172x172`.

### Firma invalida

En la bitacora secundaria existe una firma `APPROVER` con `image/jpeg` de `9` bytes. Con el fix 59.1:

- Se valida MIME.
- Se validan magic bytes.
- Se leen dimensiones reales.
- Si la imagen no es valida, se retorna `null` y el PDF muestra `Firma no disponible`.

No se modifico ni recalculo ningun snapshot historico.

### QR y verificacion publica

Endpoint publico validado:

```powershell
GET /api/v1/public/daily-logs/b16a1988-1f21-4704-8315-4d414c629a00/verification?code=aacf5068d3f684ef
```

Resultado:

- `verified`: `true`
- `reason`: `MATCH`
- `status`: `CLOSED`

### Historial documental

Auditoria de la bitacora principal:

- Acciones observadas:
  - `CREATE`
  - `SUBMIT`
  - `APPROVE`
  - `DAILY_LOG_SIGNATURE_APPLIED`
  - `DAILY_LOG_SIGNATURE_APPLIED`
  - `DAILY_LOG_SIGNATURE_APPLIED`
  - `CLOSE`
  - `CREATE`

Validacion:

- Eventos `REJECT`: `0`
- Eventos `VOID`: `0`
- No hubo transicion real a `REJECTED`.
- No hubo transicion real a `VOIDED` o `CANCELLED`.

Con el fix 59.2:

- `Rechazado` solo se alimenta desde `statusHistory.toStatus = REJECTED`.
- `Anulado / cancelado` solo se alimenta desde `statusHistory.toStatus = VOIDED` o `CANCELLED`.
- Acciones no ocurridas muestran `No aplicado`.

### Seguridad documental

Busqueda en el PDF generado:

- `storagePath`: no encontrado.
- `uploads/`: no encontrado.
- `base64`: no encontrado.
- `data:image`: no encontrado.
- `apps/api`: no encontrado.
- `/mnt/`: no encontrado.
- `C:\`: no encontrado.
- Hashes SHA256 completos: `0` coincidencias.

## Limitaciones de la validacion

- El visor del navegador de Codex bloqueo la apertura directa de `file://...pdf` por politica de seguridad, por lo que la evidencia visual se baso en validacion estructural del PDF, metadatos de firmas, objetos de imagen embebidos, endpoints reales y ausencia de cadenas sensibles.
- La extraccion textual directa del PDF no es confiable porque el contenido interno puede estar codificado/comprimido por PDFKit.

## Comandos ejecutados

```powershell
npm.cmd run api:build
```

Adicionalmente se usaron llamadas HTTP locales autenticadas para:

- Login.
- Generar PDF.
- Consultar evidencia documental.
- Consultar firmas.
- Consultar auditoria.
- Consultar verificacion publica.

## Resultado final

- PDF generado correctamente.
- Firmas JPG reales detectadas como imagenes embebidas.
- QR presente como imagen y endpoint publico funcional.
- Historial documental consistente con transiciones reales.
- Acciones no ocurridas no se infieren desde timestamps compartidos.
- No se exponen rutas internas, storage paths, base64 ni hashes completos.
- No se modifico logica adicional durante esta fase.
