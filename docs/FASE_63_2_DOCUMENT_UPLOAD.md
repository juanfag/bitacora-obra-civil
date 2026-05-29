# FASE 63.2 - Upload fisico controlado de documentos

## Objetivo

Implementar carga fisica controlada de archivos para el modulo `documents`, creando el registro `Document` asociado y manteniendo RBAC, `ProjectAccessPolicy`, auditoria y respuestas sanitizadas.

## Alcance

Se agrego el endpoint multipart para documentos de control documental. Esta fase no implementa visor avanzado, thumbnails, versionamiento, Google Drive, S3 ni URLs prefirmadas.

## Endpoint

`POST /api/v1/documents/upload`

`multipart/form-data`:

- `file` obligatorio
- `projectId` obligatorio
- `dailyLogId` opcional
- `eventId` opcional
- `type` obligatorio
- `title` obligatorio
- `description` opcional
- `metadata` opcional como string JSON

La respuesta devuelve metadata segura del documento y no expone `storagePath`, rutas locales ni checksum completo.

## Validaciones

- JWT obligatorio.
- Permiso `documents:create`.
- `ProjectAccessPolicy` obligatorio.
- `projectId` debe existir.
- `dailyLogId`, si se informa, debe pertenecer al mismo proyecto.
- `eventId`, si se informa, debe pertenecer al mismo proyecto.
- Si se informan `dailyLogId` y `eventId`, el evento debe pertenecer a esa bitacora.
- Archivo obligatorio.
- Tamano maximo inicial: 10 MB.
- `metadata`, si se informa, debe ser JSON object valido.

MIME types permitidos:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Extensiones permitidas:

- `.pdf`
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.docx`
- `.xlsx`

## Storage local

Los archivos se guardan bajo ruta interna:

```text
storage/documents/{projectId}/{yyyy}/{mm}/{uuid-filename}
```

El directorio se crea automaticamente si no existe. La ruta se persiste internamente en `Document.storagePath`, pero no se devuelve en la API.

## Seguridad

- Sanitizacion de nombre original.
- Uso de `basename` para evitar path traversal.
- Bloqueo de extensiones peligrosas dentro de nombres con doble extension.
- Validacion MIME + extension.
- Validacion de magic bytes para PDF, JPEG, PNG, WEBP y contenedores Office Open XML.
- No se aceptan ejecutables.
- Si falla la persistencia en BD despues de escribir archivo, se elimina el archivo creado.
- No se exponen rutas internas, `storagePath`, `uploads/`, paths absolutos ni checksum completo en respuestas publicas.

## Auditoria

Se registran dos eventos:

- `CREATE_DOCUMENT`
- `UPLOAD_DOCUMENT`

El payload de auditoria es seguro y no incluye imagen/base64, rutas internas ni checksum completo.

## Pruebas realizadas

Comandos ejecutados:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
```

Resultado:

- Prisma schema valido.
- Prisma Client regenerado.
- API build OK.

## Pendientes

- Descarga segura del documento.
- Visor documental.
- Thumbnails.
- Versionamiento documental.
- Storage externo.
- Antivirus.
- Validacion profunda de contenido para DOCX/XLSX mas alla de firma ZIP.
