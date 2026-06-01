# FASE 63.7.8 - Refactor visual bloque Auditoría y usuario ejecutor

## Objetivo

Rediseñar visualmente el bloque "Auditoría" del detalle de bitácora diaria para alinearlo con el sistema visual enterprise aplicado en evidencia documental, trazabilidad documental, firmas digitales y eventos.

También se ajustó la presentación del usuario ejecutor para mostrar un nombre/email amigable cuando venga disponible desde la respuesta actual, y usar un fallback claro cuando no exista.

## Alcance

Cambio frontend-only.

No se modificaron:

- Backend
- Prisma
- Migraciones
- Contratos API
- Endpoints
- RBAC
- Workflow
- Auditoría backend
- Dependencias

## Archivos modificados

- `apps/web/src/app/daily-logs/[id]/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/daily-log/daily-log-document-evidence.tsx`

## Componentes creados

No se crearon archivos de componentes nuevos en esta fase.

Se reutilizó la estructura existente de la página y se agregó una fila visual compacta para auditoría dentro del mismo archivo, evitando mover lógica o alterar contratos.

## Mejoras visuales aplicadas

- Se reemplazó la presentación de auditoría tipo timeline/card por una tabla enterprise compacta.
- La tabla muestra columnas:
  - Acción
  - Fecha/hora
  - Usuario
  - Detalle
- Las acciones se renderizan con badges suaves, de tamaño uniforme y alto contraste.
- Las acciones técnicas se mapean a labels amigables, por ejemplo:
  - `CREATE` -> `Creación`
  - `UPDATE` -> `Actualización`
  - `SUBMIT` -> `Envío a revisión`
  - `APPROVE` -> `Aprobación`
  - `REJECT` -> `Rechazo`
  - `CLOSE` -> `Cierre`
  - `DAILY_LOG_SIGNATURE_APPLIED` -> `Firma aplicada`
  - `GENERATE_PDF` -> `PDF generado`
- Para acciones desconocidas, el texto se humaniza sin mostrar el token técnico crudo.
- La columna `Detalle` muestra una descripción amigable de la acción o un resumen sanitizado cuando aplica.
- Se conserva la sanitización existente para evitar mostrar:
  - base64
  - `data:image`
  - `storagePath`
  - `uploads/`
  - rutas locales
  - hashes completos
  - IDs técnicos
- El bloque mantiene filtros existentes por texto, acción y entidad sin cambiar llamadas API.

## Usuario ejecutor

Se ajustó el render del usuario ejecutor:

- Si la respuesta actual incluye `userName`, `user.fullName`, `user.name`, `user.email`, `actor.fullName`, `actor.name`, `actor.email` o `userEmail`, se muestra ese valor.
- Si solo existe un UUID o un valor sensible, no se muestra como usuario.
- Si no hay dato amigable disponible, se muestra:

```text
Usuario no disponible
```

También se ajustó la tabla de trazabilidad documental del bloque Evidencia documental para usar el mismo fallback.

## Responsive

Desktop:

- Tabla compacta alineada.
- Encabezado discreto.
- Filas limpias con badges suaves.

Mobile:

- La cabecera se oculta.
- Cada fila se convierte en una mini-card compacta.
- Se muestran labels `Fecha`, `Usuario` y `Detalle`.
- No se espera overflow horizontal.

## Validaciones

### Build frontend

Comando ejecutado:

```powershell
npm.cmd run web:build
```

Resultado:

```text
OK
```

El build compiló correctamente, finalizó TypeScript y generó las páginas estáticas sin errores.

### Validación visual

Se verificó disponibilidad de API local en `localhost:3001`.

Resultado:

```text
No había proceso escuchando en 3001.
```

Por esa razón no fue posible validar visualmente con registros reales en navegador durante esta sesión.

La validación pendiente con API activa debe cubrir:

- Auditoría con varios registros.
- Auditoría sin registros.
- Usuario disponible.
- Usuario no disponible.
- Acciones variadas.
- Responsive mobile.
- Ausencia de overflow horizontal.

## Riesgos y observaciones

- Si el backend entrega nuevos nombres de acción, la UI los humaniza automáticamente; para labels más específicos se puede extender el mapa local.
- Si el backend no entrega usuario enriquecido, la UI no inventa datos y muestra `Usuario no disponible`.
- Se conserva el resumen sanitizado de oldValue/newValue; no se muestra JSON crudo.
- No se alteraron permisos, requests, filtros ni estructura de datos recibida.

## Resultado final

APROBADO CON OBSERVACIONES.

El refactor visual quedó implementado y el build web finalizó OK. La observación pendiente es repetir QA visual con API local activa y una bitácora con auditoría real.
