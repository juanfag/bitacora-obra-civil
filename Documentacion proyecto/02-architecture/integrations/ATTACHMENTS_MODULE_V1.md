# ATTACHMENTS_MODULE_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\integrations\ATTACHMENTS_MODULE_V1.md
```

---

# 1. Objetivo

Definir la arquitectura funcional y técnica inicial del módulo de adjuntos (Attachments Module).

Este módulo permitirá gestionar:

- imágenes,
- documentos,
- planos,
- PDFs,
- evidencias,
- archivos administrativos,
- soportes técnicos,

asociados a:

- proyectos,
- DailyLogs,
- eventos,
- futuros módulos documentales.

---

# 2. Objetivos funcionales

El módulo debe permitir:

- cargar archivos,
- visualizar archivos,
- descargar archivos,
- relacionar archivos con entidades,
- auditar uploads,
- controlar permisos,
- soportar crecimiento documental.

---

# 3. Casos uso iniciales

| Caso | Descripción |
|---|---|
| Adjuntar fotos evento | Evidencia fotográfica diaria |
| Adjuntar planos | Planos asociados obra |
| Adjuntar suspensión | Documento oficial suspensión |
| Adjuntar actas | Actas técnicas |
| Adjuntar denuncias | Evidencia legal |
| Adjuntar demandas | Soporte jurídico |
| Adjuntar PDFs | Reportes o documentos externos |

---

# 4. Estrategia recomendada

## V1

Guardar:

- metadata en PostgreSQL,
- archivos en Google Drive.

---

## Importante

NO guardar binarios en DB.

---

# 5. Arquitectura general

```text
Frontend
  ↓
NestJS API
  ↓
Attachment Service
  ↓
Storage Provider
  ↓
Google Drive
```

---

# 6. Entidad Attachment

## Objetivo

Representar metadata del archivo.

---

## Campos sugeridos

| Campo | Tipo |
|---|---|
| id | UUID |
| entityType | String |
| entityId | UUID |
| fileName | String |
| originalFileName | String |
| mimeType | String |
| extension | String |
| fileSize | Integer |
| storageProvider | String |
| storagePath | String |
| publicUrl | String |
| uploadedById | UUID |
| uploadedAt | Timestamp |
| checksum | String |
| metadata | JSONB |

---

# 7. Estrategia polimórfica

## Recomendación

Usar:

```text
entityType + entityId
```

Ejemplos:

| entityType | entityId |
|---|---|
| DAILY_LOG | uuid |
| DAILY_LOG_EVENT | uuid |
| PROJECT | uuid |

---

# 8. Tipos archivo soportados V1

| Tipo | Permitido |
|---|---|
| jpg | Sí |
| jpeg | Sí |
| png | Sí |
| pdf | Sí |
| docx | Sí |
| xlsx | Sí |

---

# 9. Tipos inicialmente NO permitidos

| Tipo | Motivo |
|---|---|
| exe | Riesgo seguridad |
| bat | Riesgo seguridad |
| js | Riesgo ejecución |
| zip | Riesgo malware |
| rar | Riesgo malware |

---

# 10. Restricciones tamaño

## Recomendación inicial

| Tipo | Tamaño máximo |
|---|---|
| Imagen | 15 MB |
| Documento | 25 MB |

---

# 11. Flujo upload

## 11.1 Frontend

Usuario selecciona archivo.

---

## 11.2 Backend

Backend valida:

- MIME type,
- extensión,
- tamaño,
- permisos usuario,
- entidad destino.

---

## 11.3 Storage

Archivo sube a:

```text
Google Drive
```

---

## 11.4 Persistencia

Metadata se guarda en:

```text
Attachment
```

---

# 12. Flujo descarga

## Backend debe validar

- usuario autenticado,
- acceso proyecto,
- permisos documento.

---

## Nunca exponer

```text
URLs públicas permanentes
```

---

# 13. Estrategia almacenamiento Google Drive

## Estructura recomendada

```text
Organization/
  Project/
    Year/
      Month/
        DailyLog/
          Attachments/
```

---

## Ejemplo

```text
ConstructoraABC/
  TorreNorte/
    2026/
      05/
        DailyLog_2026-05-15/
```

---

# 14. Metadata recomendada

## JSONB metadata

Ejemplo:

```json
{
  "camera": "iPhone 15",
  "gps": "optional",
  "resolution": "1920x1080"
}
```

---

# 15. Estrategia imágenes

## Recomendación

Generar:

- thumbnail,
- preview optimizada,
- versión original.

---

# 16. Seguridad archivos

## Validaciones obligatorias

| Validación | Obligatoria |
|---|---|
| MIME type | Sí |
| Tamaño | Sí |
| Extensión | Sí |
| Usuario autenticado | Sí |
| Acceso proyecto | Sí |

---

# 17. Seguridad futura recomendada

| Funcionalidad | Fase futura |
|---|---|
| Antivirus | Sí |
| Malware scan | Sí |
| DLP | Sí |
| OCR | Sí |
| Clasificación automática | Sí |

---

# 18. Auditoría uploads

Toda acción debe auditarse.

---

## Eventos mínimos

| Evento | Auditar |
|---|---|
| Upload | Sí |
| Delete | Sí |
| Download | Recomendado |
| Preview | Opcional |

---

# 19. Estrategia eliminación

## Recomendación V1

Soft delete lógico.

---

## Nunca borrar inmediatamente

Archivos asociados a:

- DailyLogs CLOSED,
- PDFs oficiales,
- auditoría.

---

# 20. Reglas documentos oficiales

Documentos relacionados con:

- cierre,
- aprobación,
- PDF final,

deben considerarse:

```text
Inmutables
```

---

# 21. Estrategia preview frontend

## Imágenes

- preview inline,
- galería,
- zoom básico.

---

## PDFs

- embedded viewer,
- descarga.

---

# 22. Estrategia naming archivos

## Recomendación

Generar nombre interno seguro.

Ejemplo:

```text
uuid_timestamp.ext
```

NO usar nombre original como storage path.

---

# 23. Estrategia checksums

## Recomendación

Generar:

```text
SHA256
```

Objetivos:

- integridad,
- duplicados,
- validación corrupción.

---

# 24. Attachment Service

## Responsabilidades

- upload,
- download,
- validation,
- storage integration,
- metadata,
- permissions,
- checksum.

---

# 25. Storage Provider abstraction

## Recomendación

Crear interfaz:

```text
StorageProvider
```

Implementaciones futuras:

- Google Drive,
- S3,
- Azure Blob,
- MinIO.

---

# 26. Ejemplo interfaz

```ts
interface StorageProvider {
  upload(file): Promise<UploadResult>
  download(path): Stream
  delete(path): Promise<void>
}
```

---

# 27. Riesgos si no se implementa correctamente

- archivos huérfanos,
- fugas información,
- malware,
- corrupción documental,
- PDFs incompletos,
- pérdida trazabilidad.

---

# 28. Recomendación V1

Implementar desde inicio:

- metadata DB,
- storage externo,
- validaciones seguridad,
- permisos acceso,
- auditoría uploads,
- checksum SHA256,
- naming seguro.

Evitar inicialmente:

- OCR,
- IA clasificación,
- versionado complejo,
- CDN avanzado,
- deduplicación automática.
