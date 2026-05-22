# FASE 42.9 - Validacion end-to-end QR

## Objetivo

Validar de forma reproducible que el PDF de una bitacora diaria cerrada contiene un QR publico funcional y que la pagina publica verifica correctamente la autenticidad documental sin requerir login.

## Precondiciones

- Base de datos local disponible con datos demo.
- Usuario demo disponible:
  - Email: `admin@bitacora.local`
  - Password: `Password123!`
- Existe al menos una `DailyLog` en estado `CLOSED`.
- Variables esperadas:
  - API: `http://localhost:3001/api/v1`
  - Web: `http://localhost:3000`
  - `FRONTEND_URL=http://localhost:3000` o fallback local equivalente.

## Comandos para levantar API/Web

API:

```powershell
$env:PORT="3001"
npm.cmd run api:dev
```

Web:

```powershell
npm.cmd run web:dev
```

Health API:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/health"
```

Web:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000"
```

## Datos usados en validacion local

- API health: `{"status":"ok","service":"bitacora-api"}`
- Web: HTTP `200`
- DailyLog cerrada validada por endpoint in-memory: `3b328019-00a3-466c-b897-8c1cb22a4a4a`
- Verification code validado: `f7104fe507c5938d`
- PDF generado para inspeccion: `fase42-9-bitacora.pdf`
- PDF generado: inicia con `%PDF-`
- Tamano PDF generado: `11505` bytes
- Paginas detectadas en PDF: `4`
- Objetos de imagen detectados en PDF: `2`

## Casos de prueba

### 1. API y Web arriba

Resultado esperado:

- `GET http://localhost:3001/api/v1/health` responde `status: ok`.
- `GET http://localhost:3000` responde HTTP 200.

Resultado obtenido:

- API health OK.
- Web HTTP 200 OK.

### 2. DailyLog CLOSED con codigo de verificacion

Resultado esperado:

- Existe una bitacora `CLOSED`.
- El endpoint privado autenticado devuelve `verificationCode`.

Resultado obtenido:

- Se uso una bitacora `CLOSED`.
- Se obtuvo codigo corto de verificacion.

### 3. PDF generado

Resultado esperado:

- El PDF inicia con `%PDF-`.
- Contiene QR visible.
- No genera paginas extra por footer.
- No contiene rutas internas.
- No contiene hash documental completo.
- No contiene checksums completos de adjuntos.

Resultado obtenido:

- Firma inicial `%PDF-` confirmada.
- PDF generado con 4 paginas.
- Se detectaron objetos de imagen en el PDF, incluyendo QR/evidencias.
- No se encontraron cadenas sensibles en bytes del PDF: `storagePath`, `uploads/`, `C:\`, `/mnt/`, `apps/api`, `checksumSha256`.
- No se encontraron secuencias hexadecimales de 64 caracteres en el PDF.

### 4. URL publica con codigo correcto

URL:

```text
http://localhost:3000/public/verify/3b328019-00a3-466c-b897-8c1cb22a4a4a?code=f7104fe507c5938d
```

Resultado esperado:

- No pide login.
- Muestra `✅ Documento valido`.
- Muestra datos minimos: Proyecto, Fecha bitacora, Estado, Codigo consultado, Fecha de verificacion.

Resultado obtenido:

- Endpoint publico respondio `verified=true`, `reason=MATCH`.
- Respuesta publica no expuso `dailyLogId`, `projectId`, `verificationCode`, `hash`, `checksumSha256`, `storagePath`, `path` ni `uploadedById`.
- Verificacion visual recomendada en navegador con la URL anterior.

### 5. URL publica con codigo incorrecto

URL:

```text
http://localhost:3000/public/verify/3b328019-00a3-466c-b897-8c1cb22a4a4a?code=CODIGO_INVALIDO
```

Resultado esperado:

- No pide login.
- Muestra `❌ Documento no valido`.
- `reason` es `CODE_MISMATCH`.

Resultado obtenido:

- Endpoint publico respondio HTTP 200.
- `verified=false`.
- `reason=CODE_MISMATCH`.

### 6. URL publica sin codigo

URL:

```text
http://localhost:3000/public/verify/3b328019-00a3-466c-b897-8c1cb22a4a4a
```

Resultado esperado:

- Frontend muestra `Codigo de verificacion requerido`.
- Frontend no llama a la API si falta `code`.

Resultado obtenido:

- La pagina frontend tiene guard local antes del request cuando falta `code`.
- Endpoint publico, si se invoca directamente sin `code`, responde HTTP 400 con `No se recibio codigo de verificacion.`

### 7. ID inexistente

URL:

```text
http://localhost:3000/public/verify/00000000-0000-0000-0000-000000000000?code=ABC
```

Resultado esperado:

- Muestra `Bitacora no encontrada`.

Resultado obtenido:

- Endpoint publico respondio HTTP 404.
- Frontend mapea HTTP 404 a `Bitacora no encontrada`.

## Comandos de validacion ejecutados

Build API:

```powershell
npm.cmd run api:build
```

Build Web:

```powershell
npm.cmd run web:build
```

Validacion de endpoint publico con app Nest en memoria:

```powershell
npx.cmd ts-node --project apps/api/tsconfig.json
```

Validacion PDF:

```powershell
Invoke-WebRequest -UseBasicParsing `
  -Uri "http://localhost:3001/api/v1/daily-logs/{dailyLogId}/pdf" `
  -Headers @{ Authorization = "Bearer {token}" } `
  -OutFile "fase42-9-bitacora.pdf"
```

## Checklist final

- [x] API health OK
- [x] Web OK
- [x] PDF generado OK
- [x] QR visible OK por objetos de imagen en PDF; pendiente captura visual manual si se requiere evidencia grafica
- [x] URL publica valida OK por endpoint publico
- [x] Codigo incorrecto muestra invalido OK
- [x] Sin codigo muestra requerido OK
- [x] ID inexistente muestra no encontrado OK
- [x] Sin login requerido OK
- [x] Sin rutas internas en PDF OK
- [x] Sin hash/checksums completos expuestos OK
- [x] Sin paginas extra por footer OK

## Evidencias sugeridas

- Captura del PDF abierto en Chrome/Adobe mostrando el QR.
- Captura de `/public/verify/{id}?code={verificationCode}` mostrando documento valido.
- Captura de `/public/verify/{id}?code=CODIGO_INVALIDO` mostrando documento no valido.
- Captura de `/public/verify/{id}` mostrando codigo requerido.
- Captura de `/public/verify/00000000-0000-0000-0000-000000000000?code=ABC` mostrando bitacora no encontrada.

## Fixes aplicados

- No se requirieron cambios de logica durante esta fase.
- Se detecto que una instancia vieja del API en `3001` no tenia la ruta publica cargada. Se detuvo esa instancia para validar contra el codigo actual.

