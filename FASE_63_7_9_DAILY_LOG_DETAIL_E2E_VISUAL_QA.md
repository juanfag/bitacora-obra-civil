# FASE 63.7.9 - QA visual E2E detalle de bitácora diaria

## Objetivo

Validar de punta a punta la pantalla de detalle de bitácora diaria con API activa, sesión real y datos reales, enfocándose en integración, UX, permisos, layout, datos y flujo operacional.

## Alcance

Fase principalmente QA. No se implementaron funcionalidades nuevas ni refactors grandes.

No se modificaron:

- Backend
- Prisma
- Migraciones
- Contratos API
- Endpoints
- RBAC
- Workflow
- Dependencias

## Entorno

- API: `http://localhost:3001/api/v1`
- Health validado: `http://localhost:3001/api/v1/health`
- Frontend: `http://localhost:3000`
- Navegador: navegador integrado de Codex
- Fecha QA: 2026-06-01

Observación:

- `http://localhost:3001/health` devuelve 404.
- `http://localhost:3001/api/v1/health` devuelve:

```json
{
  "status": "ok",
  "service": "bitacora-api"
}
```

## Precondiciones

- Frontend ya estaba escuchando en `localhost:3000`.
- API se levantó para QA y respondió correctamente durante la validación.
- Sesión real iniciada con:
  - Usuario: `admin@bitacora.local`
  - Rol visible: `Super Admin`
- Usuario limitado validado por API:
  - `juan.agudelo@bitacora.local`

## Bitácoras validadas

| ID | Estado | Motivo de validación | Resultado |
| --- | --- | --- | --- |
| `ba5dd3e5-7fd9-43a1-be23-baf5eea9f5d5` | CLOSED | Eventos, adjuntos PDF, evidencia documental, auditoría, PDF | OK con observaciones |
| `02954b13-30d5-4f4d-827c-4f36b8d84068` | CLOSED | Firmas aplicadas, evidencia documental, auditoría con firmas, verificación pública | OK con observaciones |
| `7063d89f-da4e-480b-8cd1-d2a83135ab04` | DRAFT | Estado editable, acción enviar a revisión, evidencia pendiente | OK con observaciones |
| `48cde4d6-802b-4b72-9120-decc1e3167e7` | REJECTED | Estado rechazado, acción volver a borrador, evidencia pendiente | OK con observaciones |

Estados no validados por falta de datos disponibles en el listado consultado:

- IN_REVIEW
- APPROVED

## Checklist visual

### Header inteligente

Resultado: APROBADO CON OBSERVACIONES.

- Estado visual correcto para CLOSED, DRAFT y REJECTED.
- Fecha amigable visible.
- Métricas visibles: eventos, adjuntos, firmas y actualización.
- Acciones agrupadas: Descargar PDF, Volver, Enviar a revisión o Volver a borrador según estado.
- Sin overflow horizontal en desktop.

Observaciones:

- En las bitácoras validadas el header mostró `Proyecto no disponible`.
- En las bitácoras validadas el header mostró `Responsable no disponible`.
- Esto reduce la lectura ejecutiva del expediente, aunque no bloquea navegación ni acciones.

### Resumen

Resultado: OK.

- Bloque alineado y visualmente consistente.
- Estado y fecha visibles.
- Comentarios o empty state se muestran de forma clara.

### Eventos de bitácora

Resultado: OK con observaciones.

- La bitácora `ba5dd3e5...` muestra 5 eventos en timeline operacional.
- Cards uniformes, alineadas y sin overflow.
- Adjuntos PDF visibles con nombre, tipo, tamaño, fecha de carga y usuario.
- Botones `Ver` y `Descargar` visibles por adjunto.
- CLOSED muestra correctamente el mensaje de solo lectura.

Observación:

- Un nombre de archivo histórico contiene mojibake: `â`. Clasificación: Bajo / deuda de normalización de datos históricos.

### Evidencia documental

Resultado: OK.

- PDF principal domina visualmente la sección.
- Estado documental amigable.
- Acciones claras: `Verificación pública`, `Descargar PDF`.
- Metadata compacta:
  - Versión PDF
  - Formato
  - Tamaño
  - Generado por
  - Código
  - Código hash
- Código hash integrado en la grilla.
- Trazabilidad documental renderiza como tabla.
- Usuario ejecutor muestra fallback `Usuario no disponible` cuando no viene enriquecido.
- No se observan rutas internas ni datos sensibles.

### Firmas digitales

Resultado: OK.

- La bitácora `02954b13...` muestra 3 firmas aplicadas.
- Tabla alineada.
- Nombre, rol, fecha/hora, estado y firma compacta visibles.
- Bitácoras sin firma muestran filas pendientes.

Observación:

- En DRAFT/REJECTED aparece aviso de que la bitácora debe estar aprobada o cerrada para aplicar firmas. Los botones de firma aparecen en el texto capturado; se recomienda revisar visualmente si quedan correctamente deshabilitados. Clasificación: Bajo / validación visual adicional.

### Auditoría

Resultado: OK.

- Auditoría renderiza como tabla compacta.
- Acciones amigables visibles.
- Fecha/hora amigable.
- Usuario ejecutor visible cuando existe (`Administrador Demo` en firmas).
- Fallback `Usuario no disponible` cuando no llega dato enriquecido.
- Detalle legible: `Bitácora creada`, `Bitácora enviada a aprobación`, `Bitácora aprobada`, `Bitácora cerrada`, `Firma digital aplicada`.
- Sin JSON crudo visible.

### Metadatos

Resultado: APROBADO CON OBSERVACIONES.

- Sección ubicada al final y visualmente secundaria.
- Fechas claras.

Observación:

- Se muestra `Proyecto` como UUID abreviado. Clasificación: Bajo / mejora UX, porque sigue siendo metadata técnica visible.

## Checklist funcional

| Acción | Resultado |
| --- | --- |
| Crear evento | No ejecutado para evitar modificar datos durante QA. DRAFT muestra `+ Agregar evento`. |
| Editar evento | No ejecutado. |
| Agregar adjunto | No ejecutado. CLOSED oculta carga por solo lectura. |
| Ver adjunto | Botones visibles en eventos con PDF. |
| Descargar adjunto | Botones visibles en eventos con PDF. |
| Enviar a aprobación | Visible en DRAFT. No ejecutado para no alterar estado. |
| Aprobar | No validado por falta de IN_REVIEW. |
| Rechazar | No validado por falta de IN_REVIEW. |
| Cerrar | No validado por falta de APPROVED. |
| Aplicar firma | No ejecutado para no alterar datos. Firmas existentes visibles. |
| Descargar PDF | Validado por API; PDF inicia con `%PDF-`. |
| Verificación pública | Validada en navegador; no pide login y muestra documento válido. |
| Volver al listado | Botón visible. |

## Checklist RBAC

### Admin

Resultado: OK.

- `admin@bitacora.local` inicia sesión correctamente.
- Rol visible: `Super Admin`.
- Puede acceder a proyectos y detalles de bitácora.

### Usuario limitado

Resultado: OK por API.

- `juan.agudelo@bitacora.local` inicia sesión correctamente.
- `GET /projects` devuelve 2 proyectos.
- `GET /daily-logs?limit=100` devuelve 6 bitácoras.
- Estados visibles para ese usuario por API: `CLOSED:5`, `REJECTED:1`.

Limitación:

- No se completó validación visual en navegador con usuario limitado porque el navegador integrado presentó restricciones para manipular sesión/localStorage directamente. La sesión admin sí fue validada visualmente.

## Checklist responsive

Resultado: PARCIAL.

- En desktop no se detectó overflow horizontal en bitácoras validadas.
- Las tablas de evidencia y auditoría tienen estilos responsive implementados.

Limitación:

- El navegador integrado no expuso cambio de viewport, por lo que no se pudo validar visualmente tablet/mobile/zoom 125% en esta sesión.

Pendiente:

- Repetir en navegador manual con:
  - 1366px
  - tablet
  - mobile
  - zoom 125%

## Checklist PDF y verificación

Resultado: OK.

PDF validado:

- DailyLog: `02954b13-30d5-4f4d-827c-4f36b8d84068`
- Archivo generado: `qa-6379-test.pdf`
- Header: `%PDF-`
- Tamaño: `87130` bytes

Verificación:

- Código: `3479dddd5a53470f`
- Endpoint de verificación: `MATCH`
- Estado: `CLOSED`
- URL pública:

```text
http://localhost:3000/public/verify/02954b13-30d5-4f4d-827c-4f36b8d84068?code=3479dddd5a53470f
```

Validación navegador:

- No pidió login.
- Mostró `Documento válido`.
- No presentó overflow horizontal.

## Seguridad visual

No se observaron en el texto renderizado:

- `storagePath`
- `uploads/`
- `data:image`
- `base64`
- `apps/api`
- `checksumSha256`

## Hallazgos clasificados

| Severidad | Hallazgo | Evidencia | Recomendación |
| --- | --- | --- | --- |
| Medio | Header muestra `Proyecto no disponible` y `Responsable no disponible` en bitácoras reales. | CLOSED, DRAFT y REJECTED validadas. | Crear fase corta para resolver nombres desde datos existentes o fetch auxiliar seguro. |
| Bajo | Metadatos muestra UUID abreviado de proyecto. | Sección Metadatos. | Reemplazar por nombre/código cuando esté disponible o degradar el dato técnico. |
| Bajo | Nombre de archivo histórico muestra mojibake `â`. | Evento con PDF adjunto. | Normalizar encoding de metadata histórica o sanitizar visualmente en frontend. |
| Bajo | Usuario ejecutor no disponible en varias transiciones. | Auditoría y trazabilidad documental. | Backend podría enriquecer audit logs con usuario; frontend ya usa fallback seguro. |
| Bajo | Botones de firma aparecen en texto capturado para estados no firmables. | DRAFT/REJECTED. | Confirmar visualmente si están disabled; si no, ajustar UI frontend-only. |
| Pendiente | No hay datos IN_REVIEW/APPROVED para validar. | Listado de bitácoras consultado. | Crear datos QA controlados o usar fixture existente. |
| Pendiente | Responsive tablet/mobile no validado por limitación del navegador integrado. | Sin API de viewport disponible. | Repetir manualmente en navegador local. |

## Correcciones aplicadas

No se aplicaron correcciones en esta fase.

Los hallazgos detectados no bloquearon el flujo principal y se documentan para una fase posterior acotada.

## Validaciones técnicas

### API build

Comando:

```powershell
npm.cmd run api:build
```

Resultado:

```text
OK
```

### Web build

Comando:

```powershell
npm.cmd run web:build
```

Resultado:

```text
OK
```

## Estado API health

Durante QA:

```text
http://localhost:3001/api/v1/health -> OK
```

Al cierre de la sesión, el puerto `3001` ya no aparecía escuchando en el último chequeo.

## Riesgos y pendientes

- Validar visualmente usuario limitado en navegador real.
- Validar estados IN_REVIEW y APPROVED con datos de prueba.
- Validar responsive real en tablet/mobile/zoom 125%.
- Resolver nombre de proyecto/responsable en header.
- Revisar metadata técnica visible en sección Metadatos.
- Revisar encoding de nombres de archivos históricos.

## Resultado final

QA APROBADO CON OBSERVACIONES.

Justificación:

- Los flujos principales del detalle de bitácora cargan con API real y sesión real.
- CLOSED, DRAFT y REJECTED se renderizan sin overflow en desktop.
- Eventos, adjuntos, evidencia documental, firmas, auditoría, PDF y verificación pública funcionan con datos reales.
- Los builds API y Web finalizan OK.
- Persisten observaciones UX/datos no bloqueantes y limitaciones de cobertura por falta de datos IN_REVIEW/APPROVED y viewport móvil.
