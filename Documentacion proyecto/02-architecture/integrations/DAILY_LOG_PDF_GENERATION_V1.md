# DAILY_LOG_PDF_GENERATION_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\integrations\DAILY_LOG_PDF_GENERATION_V1.md
```

---

# 1. Objetivo

Definir la estrategia funcional y técnica para la generación del PDF oficial de la bitácora diaria.

Este documento será la base para:

- diseño del PDF oficial,
- generación backend,
- firmas,
- snapshots documentales,
- almacenamiento,
- auditoría,
- versionado.

---

# 2. Objetivos funcionales

El PDF debe representar:

```text
La versión oficial e inmutable de la bitácora diaria.
```

Debe consolidar:

- información proyecto,
- eventos,
- fotografías,
- firmas,
- aprobaciones,
- observaciones,
- metadata cierre.

---

# 3. Momento de generación

## Regla principal

El PDF SOLO puede generarse cuando:

```text
DailyLog.status = APPROVED
```

---

# 4. Flujo general

```text
OPEN
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
GENERATE PDF
  ↓
CLOSED
```

---

# 5. Estrategia recomendada

## Backend-driven PDF

La generación debe ejecutarse desde backend.

NO desde frontend.

---

# 6. Servicio recomendado

```text
PdfGenerationService
```

Responsabilidades:

- consolidar información,
- construir template,
- insertar firmas,
- insertar imágenes,
- generar PDF,
- calcular hash,
- almacenar archivo,
- registrar auditoría.

---

# 7. Arquitectura propuesta

```text
Frontend
  ↓
NestJS API
  ↓
PdfGenerationService
  ↓
PDF Engine
  ↓
Storage Provider
  ↓
Google Drive
```

---

# 8. Información mínima requerida

## Datos proyecto

- nombre,
- código,
- organización,
- responsable.

---

## Datos DailyLog

- fecha,
- consecutivo,
- estado,
- timestamps workflow.

---

## Eventos

- tipo evento,
- actividad,
- descripción,
- usuario,
- fecha/hora.

---

## Adjuntos

- fotografías,
- referencias documentales,
- anexos.

---

## Firmas

- reportantes,
- aprobador,
- cierre.

---

# 9. Secciones recomendadas PDF

```text
Portada
Resumen proyecto
Información DailyLog
Eventos
Galería imágenes
Observaciones
Firmas
Metadata cierre
```

---

# 10. Portada sugerida

Mostrar:

- logo empresa,
- proyecto,
- fecha,
- consecutivo,
- estado,
- responsable.

---

# 11. Sección eventos

## Formato recomendado

Tabla estructurada:

| Hora | Tipo | Actividad | Responsable |
|---|---|---|---|

---

## Debe incluir

- descripción completa,
- evidencias,
- firmas.

---

# 12. Estrategia imágenes

## Recomendación

Imágenes deben:

- optimizarse,
- comprimirse,
- mantener legibilidad.

---

## Evitar

Imágenes excesivamente pesadas.

---

# 13. Estrategia firmas

## Tipos posibles

| Tipo | V1 |
|---|---|
| Firma canvas | Sí |
| Firma digital certificada | Futuro |
| Usuario/password | Opcional |

---

# 14. Metadata cierre

Incluir:

- usuario aprobador,
- fecha aprobación,
- usuario cierre,
- fecha cierre,
- hash PDF,
- versión documento.

---

# 15. Estrategia hash

## Recomendación

Generar:

```text
SHA256
```

---

## Objetivos

- integridad,
- trazabilidad,
- evidencia documental.

---

# 16. Estrategia almacenamiento

## V1

Guardar PDF en:

```text
Google Drive
```

---

## Base datos

Guardar únicamente:

- URL,
- path,
- hash,
- metadata.

---

# 17. Naming recomendado

## Ejemplo

```text
PROJECTCODE_2026-05-15_DAILYLOG_v1.pdf
```

---

# 18. Estrategia versionado

## Recomendación

Una vez CLOSED:

```text
PDF INMUTABLE
```

---

## Si hay reapertura

Generar:

```text
v2
v3
```

manteniendo histórico.

---

# 19. Librerías sugeridas

## Opciones Node.js

| Librería | Recomendación |
|---|---|
| pdfmake | Alta |
| Puppeteer | Alta |
| PDFKit | Media |

---

# 20. Recomendación técnica V1

## Mejor opción

```text
HTML + Puppeteer
```

Ventajas:

- diseño flexible,
- branding fácil,
- responsive print,
- tablas complejas,
- imágenes simples.

---

# 21. Estrategia templates

## Recomendación

Separar templates:

```text
templates/pdf/
```

Ejemplo:

```text
daily-log.template.html
```

---

# 22. Estrategia CSS impresión

Usar:

```text
print styles
```

para:

- saltos página,
- tablas,
- imágenes,
- firmas.

---

# 23. Auditoría obligatoria

Registrar:

- quién generó,
- cuándo,
- hash,
- versión,
- requestId.

---

# 24. Endpoint sugerido

## Generate PDF

```http
POST /api/v1/daily-logs/{id}/generate-pdf
```

---

## Download PDF

```http
GET /api/v1/daily-logs/{id}/pdf
```

---

# 25. Seguridad

## Validaciones obligatorias

- usuario autenticado,
- acceso proyecto,
- DailyLog APPROVED,
- permisos generación.

---

# 26. Riesgos si no se diseña correctamente

- PDFs corruptos,
- pérdida legal evidencia,
- imágenes ilegibles,
- inconsistencia datos,
- documentos manipulables.

---

# 27. Recomendación UX

Frontend debe permitir:

- preview PDF,
- descarga,
- impresión,
- histórico versiones.

---

# 28. Recomendación V1

Implementar desde inicio:

- generación backend,
- hash SHA256,
- almacenamiento externo,
- auditoría PDF,
- branding básico,
- imágenes optimizadas,
- versiones controladas.

Evitar inicialmente:

- firma digital certificada,
- OCR,
- watermark dinámico,
- edición PDF,
- compresión avanzada automática.
