# FASE 63.3 - Descarga segura de documentos

## Objetivo

Implementar descarga segura de documentos almacenados localmente, manteniendo JWT, RBAC, `ProjectAccessPolicy`, auditoria y evitando exponer `storagePath` o rutas internas.

## Endpoint

`GET /api/v1/documents/:id/download`

El endpoint devuelve el archivo como `attachment`.

## Reglas de seguridad

- JWT obligatorio.
- Permiso `documents:read`.
- El documento debe existir.
- El documento no debe estar en estado `DELETED`.
- Se valida acceso al proyecto mediante `ProjectAccessPolicy`.
- Usuario normal solo descarga documentos de proyectos asignados.
- SUPER_ADMIN mantiene acceso global por las reglas existentes de plataforma.
- El archivo se lee desde `storagePath` interno.
- La respuesta no expone `storagePath`, rutas locales ni checksum completo.
- Si el archivo fisico no existe, se responde `404 Document file not found`.
- Si el documento no existe o esta eliminado, se responde `404 Document not found`.
- La ruta resuelta debe permanecer dentro de `storage/documents`.
- No se crean URLs publicas ni enlaces anonimos.

## Headers usados

- `Content-Type`: valor de `mimeType` del documento, con fallback `application/octet-stream`.
- `Content-Disposition`: `attachment` con `filename` sanitizado y `filename*` UTF-8.
- `Content-Length`: tamano real del archivo en disco.
- `X-Content-Type-Options`: `nosniff`.

## Auditoria

Se agrego la accion:

- `DOWNLOAD_DOCUMENT`

Cada descarga exitosa registra auditoria sobre entidad `Document`.

El payload auditado no incluye:

- `storagePath`
- rutas locales
- `uploads/`
- paths absolutos
- checksum completo
- contenido/base64

## Pruebas realizadas

Validaciones tecnicas ejecutadas:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
```

Resultados:

- Prisma schema valido.
- Prisma Client regenerado.
- API build OK.

Casos cubiertos por implementacion:

- Sin token: protegido por `JwtAuthGuard`, esperado `401`.
- Sin permiso `documents:read`: protegido por `PermissionsGuard`, esperado `403`.
- Proyecto fuera de alcance: `ProjectAccessPolicy`, esperado `403`.
- Documento `DELETED`: `404`.
- Documento inexistente: `404`.
- Archivo fisico faltante: `404`.
- Endpoint publico QR no se modifica en esta fase.

## Pendientes

- Prueba manual con archivo real subido por `POST /documents/upload`.
- Endpoint inline/preview autenticado.
- Visor documental frontend.
- Versionamiento documental.
- Storage externo.
- Politicas de retencion.
