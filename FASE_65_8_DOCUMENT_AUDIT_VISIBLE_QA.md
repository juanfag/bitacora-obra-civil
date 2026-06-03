# FASE 65.8 - Auditoria Documental Visible

## Resumen ejecutivo

FASE 65.8 hace visible la trazabilidad documental usando `AuditLog` existente, sin crear modelos nuevos ni duplicar registros. Se agrego el endpoint `GET /documents/:id/audit` y un panel compacto de `Auditoria documental` en la biblioteca documental.

El endpoint consolida eventos del documento, sus versiones y sus relaciones documentales, con datos amigables y sanitizado para no exponer rutas fisicas ni datos internos sensibles.

## Backend implementado

Endpoint:

- `GET /documents/:id/audit`

Eventos incluidos:

- `DOCUMENT_CREATED`
- `DOCUMENT_UPDATED`
- `DOCUMENT_DELETED`
- `DOCUMENT_VERSION_CREATED`
- `DOCUMENT_DOWNLOADED`
- `DOCUMENT_RELATION_CREATED`
- `DOCUMENT_RELATION_DELETED`

Notas de compatibilidad:

- `CREATE_DOCUMENT` se normaliza como `DOCUMENT_CREATED`.
- `UPDATE_DOCUMENT` se normaliza como `DOCUMENT_UPDATED`.
- `DELETE_DOCUMENT` se normaliza como `DOCUMENT_DELETED`.
- `DOWNLOAD_DOCUMENT` se normaliza como `DOCUMENT_DOWNLOADED`.

Datos devueltos:

- `action`
- `rawAction`
- `entityType`
- `entityId`
- `performedBy`
- `createdAt`
- `metadata`
- `oldValue`
- `newValue`

Validaciones:

- documento existe
- usuario tiene acceso al proyecto del documento
- resultados ordenados por fecha descendente
- sanitizado de datos sensibles

## Frontend implementado

En la biblioteca documental:

- accion `Auditoria documental`
- panel compacto por documento
- historial con:
  - accion
  - usuario
  - fecha/hora
  - entidad
  - detalle resumido
- estados:
  - loading
  - empty state
  - error state
- boton `Refrescar`
- refresco automatico si el panel esta abierto despues de:
  - edicion de metadata
  - upload
  - descarga de version actual
  - descarga de version historica
  - soft delete

## Archivos modificados

- `apps/api/src/documents/documents.controller.ts`
- `apps/api/src/documents/documents.service.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/projects/[id]/documents/page.tsx`
- `apps/web/src/app/globals.css`
- `test/e2e/document-audit.e2e-spec.ts`

## Sanitizado

El endpoint no expone:

- `storagePath`
- `storageKey`
- `storageUrl`
- rutas fisicas
- tokens
- secretos
- passwords

La prueba e2e valida que la respuesta no contenga `storagePath` ni `storage/`.

## Validaciones ejecutadas

```bash
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run api:build
npm.cmd run web:build
npm.cmd run test:e2e -- --runTestsByPath test/e2e/document-audit.e2e-spec.ts
```

Resultados:

- `npx.cmd prisma validate`: OK.
- `npx.cmd prisma generate`: OK.
- `npm.cmd run api:build`: OK.
- `npm.cmd run web:build`: OK.
- `document-audit.e2e-spec.ts`: OK.

## Escenarios e2e cubiertos

- crear documento y consultar auditoria
- editar metadata y ver evento normalizado
- cargar version y ver `DOCUMENT_VERSION_CREATED`
- descargar documento y ver `DOCUMENT_DOWNLOADED`
- crear relacion documental y ver `DOCUMENT_RELATION_CREATED`
- validar orden descendente
- validar estructura amigable de usuario/entidad/fecha
- validar que no se expone `storagePath`

## Validacion manual pendiente

No se levanto navegador local en esta fase. La validacion manual recomendada cuando API/Web esten activos:

- abrir biblioteca documental por proyecto
- abrir `Auditoria documental`
- editar metadata y refrescar
- cargar V1/V2 y refrescar
- descargar version actual/historica y refrescar
- crear/eliminar relacion documental y refrescar
- soft delete y verificar evento
- confirmar empty state en documento sin eventos, si existe un caso limpio

## Restricciones confirmadas

- No se creo nuevo modelo.
- No se modifico workflow `DailyLog`.
- No se modifico RBAC efectivo.
- No se expone `storagePath` ni rutas internas.
- No se creo visor avanzado.
- No se rompio auditoria existente de bitacoras.
- No se duplican registros de auditoria.

## Observaciones y riesgos

- La auditoria visible depende de eventos ya registrados por las fases documentales previas.
- Algunas acciones historicas usan nombres legacy; el endpoint las normaliza para UI sin alterar la base.
- El panel de frontend es por documento y carga bajo demanda para evitar sobrecargar el listado.

## Resultado de fase

FASE 65.8 queda completada con auditoria documental visible desde UI y endpoint documental auditado/sanitizado.
