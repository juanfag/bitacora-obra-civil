# FASE 65.6 - Upload Documental desde Frontend

## Resumen ejecutivo

FASE 65.6 habilita la carga de archivos desde la biblioteca documental frontend por proyecto, consumiendo el upload enterprise versionado ya disponible en backend mediante `POST /documents/upload`.

La UI permite cargar la primera version de un documento metadata-only y nuevas versiones para documentos que ya tienen version vigente. Despues del upload se refrescan automaticamente el listado, el badge de version actual y el panel de versiones.

## Alcance implementado

- Accion `Cargar archivo` por documento en la biblioteca documental.
- Upload V1 para documentos existentes sin version actual.
- Upload V2+ para documentos existentes con versiones previas.
- Consumo de `POST /documents/upload`.
- Envio de:
  - `file`
  - `documentId`
  - `projectId`
  - `type`
  - `title`
  - `description`, si existe
  - `metadata` con contexto frontend, `organizationId`, `categoryId` y `code`
- Refresco automatico de:
  - listado documental
  - version actual
  - panel de versiones
- Metadata visible de version:
  - version actual
  - nombre de archivo
  - tipo MIME
  - tamano
  - checksum SHA256 abreviado
  - fecha de carga
- Descarga de version actual.
- Descarga de versiones historicas desde el panel de versiones.
- Validaciones frontend:
  - archivo requerido
  - maximo 10 MB
  - tipos permitidos: PDF, JPG, PNG
  - archivo no vacio
- Mensajes claros para errores:
  - `400`
  - `403`
  - `404`
  - `500+`
- Loading durante upload y bloqueo temporal de botones.
- Confirmacion de exito visible.
- Error visible sin romper la pantalla.
- Ajuste responsive basico para paneles y acciones.

## Archivos modificados

- `apps/web/src/app/projects/[id]/documents/page.tsx`
- `apps/web/src/app/globals.css`

## Restricciones confirmadas

- No se modifico workflow `DailyLog`.
- No se modifico RBAC efectivo.
- No se integro Google Drive/S3.
- No se almacenan binarios en PostgreSQL desde frontend.
- No se expone `storagePath` ni rutas internas.
- No se rompio la descarga ni el versionamiento existente.
- No se creo visor documental avanzado.

## Validaciones tecnicas ejecutadas

```bash
npm.cmd run web:build
npm.cmd run api:build
```

Resultados:

- `npm.cmd run web:build`: OK.
- `npm.cmd run api:build`: OK.

## Validacion manual

Se intento levantar API/Web localmente para ejecutar la validacion manual en navegador, pero `Start-Process` sigue fallando en esta sesion por conflicto de entorno `Path/PATH`, antes de abrir puertos `3000/3001`.

Validaciones manuales pendientes cuando API/Web puedan levantarse:

- crear documento metadata-only
- cargar archivo V1
- cargar nueva version V2
- verificar badge de version actual
- abrir panel de versiones
- descargar version actual
- descargar version historica
- validar error por archivo no permitido
- validar responsive basico

## Observaciones

- El DTO backend de upload no acepta `categoryId` ni `organizationId` como campos directos; el frontend conserva compatibilidad enviandolos dentro de `metadata` y usa `documentId` para mantener la categoria del documento ya creado.
- La accion `Cargar archivo` se muestra solo a usuarios con permiso `documents:create`, consistente con el guard actual de `POST /documents/upload`.
- La UI no muestra rutas de almacenamiento ni metadata interna sensible.
- El checksum se muestra abreviado para trazabilidad visual sin saturar la tabla.

## Resultado de fase

FASE 65.6 queda implementada y validada tecnicamente por build. El upload documental frontend esta operativo a nivel de UI/contrato y pendiente de validacion manual en navegador cuando el entorno permita levantar los dev servers.
