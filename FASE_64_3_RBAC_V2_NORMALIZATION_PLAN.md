# FASE 64.3 - RBAC v2 Plan de normalizacion

## Alcance

Esta fase convierte los hallazgos de RBAC 64.0, 64.1 y 64.2 en un plan tecnico ejecutable para normalizar RBAC v2.

No se modifica codigo productivo, permisos efectivos, guards, frontend, migraciones ni seeds.

Fuentes revisadas:

- `FASE_64_0_RBAC_MATRIX_V2_ARCHITECTURE.md`
- `FASE_64_1_RBAC_V2_TECHNICAL_MODEL.md`
- `FASE_64_2_RBAC_PERMISSION_INVENTORY.md`

## Resumen ejecutivo

El RBAC actual funciona para autorizacion basica, pero opera con permisos planos, roles asignados por proyecto y sin scopes explicitos. Esto impide expresar con precision la matriz cliente, especialmente para roles globales u organizacionales, usuarios con multiples roles, workflow de bitacoras, auditoria, dashboard, firmas, PDF y control documental.

La normalizacion RBAC v2 debe avanzar en bloques progresivos:

1. Crear catalogo canonico de permisos v2 y aliases legacy.
2. Sembrar roles/permisos v2 sin cambiar autorizacion efectiva.
3. Introducir guards, decorators y policies v2 en modo compatible.
4. Reemplazar el bypass implicito de `organizations:create` por scopes `GLOBAL` y `ORGANIZATION`.
5. Exponer permisos efectivos al frontend para visibilidad.
6. Auditar cambios RBAC y ejecutar QA de seguridad por matriz.

Principio rector: ningun usuario debe perder acceso durante la transicion inicial. Los permisos v2 deben convivir temporalmente con los legacy hasta completar migracion, pruebas y aprobacion cliente.

## Hallazgos clasificados

### Backend

| Prioridad | Hallazgo | Impacto | Normalizacion recomendada |
| --- | --- | --- | --- |
| CRITICO | `PermissionsGuard` autoriza permisos por OR sin evaluar scope, proyecto, organizacion ni propiedad. | Un permiso puede aplicar fuera del recurso esperado. | Crear policy v2 que resuelva `permission + scope + resource`. |
| CRITICO | `organizations:create` funciona como bypass global en `ProjectAccessPolicy`. | Cualquier rol con ese permiso obtiene acceso global a proyectos. | Reemplazar por `scope=GLOBAL` o `scope=ORGANIZATION`. |
| ALTO | `daily-logs:update` autoriza editar, enviar, aprobar, rechazar, cerrar, retornar y firmar. | Acciones workflow criticas quedan sobreampliadas. | Separar permisos atomicos de workflow. |
| ALTO | `daily-logs:read` autoriza lectura, PDF, evidencia documental, auditoria y dashboard. | Lectura general habilita acciones sensibles de consulta/exportacion. | Separar `download_pdf`, `audit_logs:read` y `dashboard:read`. |
| ALTO | `RolePermission` no contiene scope. | El alcance se infiere desde `ProjectUser` o bypass. | Agregar relacion rol-permiso-scope en modelo v2. |
| MEDIO | Endpoints OWN usan solo JWT: firma propia y cambio de password. | Correcto funcionalmente, pero no expresado en RBAC. | Modelar como permisos `OWN` o excepciones documentadas. |
| MEDIO | `roles/assignable` no usa `roles:read` ni `roles:assign`. | Catalogo actual y backend no estan alineados. | Normalizar permisos de roles y administracion. |
| MEDIO | Descargas documentales usan permisos `read`. | No distingue ver metadatos de descargar archivos. | Crear `documents:download`, `attachments:download`. |
| BAJO | Endpoints publicos deben quedar explicitamente catalogados. | Riesgo de endurecimiento accidental o exposicion innecesaria. | Mantener lista publica aprobada: login, health basico, verificacion publica. |

### Frontend

| Prioridad | Hallazgo | Impacto | Normalizacion recomendada |
| --- | --- | --- | --- |
| ALTO | No existe store/contexto de permisos efectivos. | La UI muestra acciones por estado o por prueba de 403. | Crear endpoint y contexto de permisos efectivos. |
| ALTO | Workflow visible por estado, no por permiso. | Usuarios pueden ver botones que backend rechaza. | Combinar permiso efectivo + estado workflow. |
| MEDIO | Documentos usan flags iniciales en `true` y se apagan con 403. | La UI aprende permisos por error. | Cargar capacidades antes de renderizar acciones. |
| MEDIO | Dashboard solo usa `AuthGuard`. | Pantalla puede mostrarse sin permiso real. | Usar `dashboard:read`. |
| MEDIO | Users admin se controla por disponibilidad de catalogos/403. | Administracion sensible sin visibilidad declarativa. | Usar permisos efectivos para acciones admin. |
| BAJO | JWT se decodifica localmente para display. | Aceptable si no se usa como autorizacion. | Mantener solo como soporte visual, no como fuente RBAC. |

### Permisos legacy

| Prioridad | Hallazgo | Impacto | Normalizacion recomendada |
| --- | --- | --- | --- |
| ALTO | Nombres legacy usan guiones: `daily-logs`, `daily-log-events`, `event-types`. | Inconsistencia con nomenclatura v2 snake_case. | Crear aliases legacy -> v2. |
| ALTO | `daily-logs:update` debe mapear a multiples acciones. | Riesgo de bloqueo o sobreprivilegio al migrar. | Backfill conservador por rol y aprobacion cliente. |
| MEDIO | `attachments:create` realmente representa upload. | Codigo menos expresivo. | Mapear a `attachments:upload`. |
| MEDIO | `users:password:reset` no sigue formato v2. | Nomenclatura inconsistente. | Mapear a `users:password_reset`. |
| MEDIO | `audit:read` debe normalizarse. | Auditoria general y bitacora no comparten criterio. | Mapear a `audit_logs:read`. |

### Roles hardcoded

| Prioridad | Hallazgo | Impacto | Normalizacion recomendada |
| --- | --- | --- | --- |
| ALTO | `ORG_ADMIN` aparece en codigo pero no en seed. | Reglas de administrador critico no tienen catalogo consistente. | Agregar rol en catalogo v2 cuando cliente apruebe alcance. |
| ALTO | `SUPER_ADMIN`, `ORG_ADMIN`, `PROJECT_ADMIN` se usan en reglas de ultimo admin. | La logica depende de codigos de rol. | Mantener temporalmente y migrar a atributo `isCriticalAdmin` o policy. |
| MEDIO | Roles actuales no calzan uno a uno con matriz cliente. | Riesgo de mapeo incorrecto. | Crear tabla de equivalencias aprobada. |
| BAJO | Frontend muestra etiquetas de rol de firmas. | No es autorizacion, pero debe alinearse con nombres cliente. | Separar etiqueta funcional de permiso. |

### Endpoints sin proteccion explicita

| Prioridad | Endpoint/grupo | Estado actual | Decision recomendada |
| --- | --- | --- | --- |
| MEDIO | `GET /health/db` | Publico, expone conteo de roles. | Revisar hardening; puede requerir auth o limitar informacion. |
| MEDIO | `users/me/signature` | JWT-only. | Modelar como `user_signatures:manage_own` o excepcion OWN. |
| MEDIO | `PATCH /users/me/password` | JWT-only. | Modelar como `users:change_own_password` o excepcion OWN. |
| BAJO | Login y verificacion publica | Publicos por diseno. | Documentar como allowlist publica. |

### Gaps workflow

| Prioridad | Gap | Riesgo | Permiso v2 recomendado |
| --- | --- | --- | --- |
| CRITICO | Aprobar y rechazar dependen de `daily-logs:update`. | Un editor puede operar decision workflow. | `daily_logs:approve`, `daily_logs:reject`. |
| ALTO | Cerrar depende de `daily-logs:update` y genera PDF. | Cierre y emision documental quedan sobreampliados. | `daily_logs:close`, `daily_logs:generate_pdf`. |
| ALTO | Firmar depende de `daily-logs:update`. | Firma no queda separada como accion. | `signatures:apply` o `daily_logs:sign`. |
| MEDIO | Retornar a borrador depende de `daily-logs:update`. | Correccion workflow no distinguida. | `daily_logs:return_to_draft`. |
| MEDIO | Anular usa `daily-logs:delete`. | Borrado y anulacion juridica se mezclan. | `daily_logs:void`. |

### Gaps ProjectAccessPolicy

| Prioridad | Gap | Riesgo | Normalizacion recomendada |
| --- | --- | --- | --- |
| CRITICO | Bypass global por permiso funcional `organizations:create`. | Escalada accidental por asignacion de permiso. | Resolver bypass solo con scope `GLOBAL`. |
| ALTO | Devuelve `null` para representar acceso total. | Ambiguo para servicios consumidores. | Devolver resultado estructurado: `scope`, `projectIds`, `reason`. |
| ALTO | No distingue organizacion de proyecto. | `ORG_ADMIN` no puede expresarse correctamente. | Incorporar scope `ORGANIZATION`. |
| MEDIO | No reporta permiso/asignacion que dio acceso. | Auditoria y debugging dificiles. | Retornar origen del permiso efectivo. |

### Gaps auditoria

| Prioridad | Gap | Riesgo | Normalizacion recomendada |
| --- | --- | --- | --- |
| ALTO | Auditoria de bitacora usa `daily-logs:read`. | Lectura de bitacora habilita trazabilidad sensible. | Usar `audit_logs:read` con scope. |
| ALTO | Cambios RBAC deben auditar antes/despues. | Dificil reconstruir asignaciones y privilegios. | Auditar actor, afectado, rol, permiso, scope y recurso. |
| MEDIO | Permiso efectivo no se registra como razon de acceso. | Incidentes dificiles de explicar. | Guard/policy v2 debe devolver `matchedPermission`. |

### Gaps dashboard

| Prioridad | Gap | Riesgo | Normalizacion recomendada |
| --- | --- | --- | --- |
| MEDIO | Dashboard usa `daily-logs:read`. | Métricas se habilitan por lectura de bitacoras. | Crear `dashboard:read`. |
| MEDIO | Frontend dashboard solo usa `AuthGuard`. | Pantalla puede cargar hasta recibir 403. | Controlar visibilidad por permisos efectivos. |

### Gaps usuarios/roles

| Prioridad | Gap | Riesgo | Normalizacion recomendada |
| --- | --- | --- | --- |
| ALTO | Administracion usa combinaciones OR de permisos amplios. | Dificil saber que permiso autoriza cada accion. | Separar `users:manage`, `roles:assign`, `users:invalidate_sessions`, `users:password_reset`. |
| ALTO | Asignacion de roles valida permisos contenidos, pero sin scope. | Actor puede asignar dentro de alcance incorrecto. | Validar rol + permiso + scope + recurso. |
| MEDIO | Proteccion ultimo admin usa roles hardcoded. | Dependencia fragil de codigos. | Mantener temporalmente; luego policy de administradores criticos. |

## Plan de normalizacion por bloques

### Bloque A - Catalogo permisos v2

Objetivo:

- Definir catalogo canonico de permisos v2.
- Definir acciones, modulos, scopes permitidos y aliases legacy.
- No cambiar autorizacion efectiva.

Entregables:

- Catalogo `Permission` v2: `code`, `module`, `action`, `description`, `version`.
- Catalogo `PermissionScope`: permisos y scopes validos.
- Tabla de aliases legacy -> v2.
- Tabla de permisos atomicos workflow, PDF, firmas, dashboard, auditoria, documentos y usuarios.

Prioridad:

- CRITICO para workflow y `ProjectAccessPolicy`.
- ALTO para documentos, usuarios/roles y auditoria.
- MEDIO para dashboard y endpoints OWN.

Validaciones:

- Revision documental contra matriz cliente.
- Validacion de nomenclatura `modulo:accion`.
- Prueba de no duplicados en catalogo propuesto.

### Bloque B - Seeds y compatibilidad legacy

Objetivo:

- Sembrar permisos v2 y roles v2 sin romper usuarios actuales.
- Mantener roles y permisos legacy durante transicion.
- Preparar backfill conservador.

Entregables:

- Seeds v2 en modo compatible.
- Roles actuales preservados.
- Rol `ORG_ADMIN` definido solo cuando cliente apruebe alcance.
- Mapeo por rol actual -> permisos v2 equivalentes.
- Estrategia para que `SUPER_ADMIN` conserve permisos legacy y reciba v2 `GLOBAL`.

Reglas:

- No retirar ningun permiso legacy en primera liberacion.
- Todo rol actual debe conservar al menos su capacidad efectiva actual.
- El mapeo de `daily-logs:update` debe revisarse rol por rol antes de conceder workflow atomico.

Validaciones:

- Snapshot de permisos por rol antes/despues.
- Verificacion de que ningun rol pierde permisos legacy.
- Comparacion contra matriz cliente.

### Bloque C - Guards y decorators

Objetivo:

- Introducir autorizacion v2 capaz de evaluar recurso y scope.
- Mantener `PermissionsGuard` legacy mientras se activa progresivamente.

Entregables:

- Decorator v2 con permiso, accion o metadata de recurso.
- `RbacPolicy` o `EffectivePermissionService`.
- Guard v2 en modo compatible.
- Trazabilidad del permiso que autorizo.

Reglas:

- El guard v2 debe autorizar por `permission + scope + resource`, no solo por string.
- Debe soportar aliases legacy durante transicion.
- Debe devolver razon de denegacion para QA y auditoria.

Validaciones:

- Tests unitarios de scopes: `GLOBAL`, `ORGANIZATION`, `PROJECT`, `OWN`.
- Tests multirol y multiproyecto.
- Tests de alias legacy.

### Bloque D - ProjectAccessPolicy v2

Objetivo:

- Reemplazar bypass por `organizations:create`.
- Representar acceso global, organizacional y por proyecto de forma explicita.

Entregables:

- Policy v2 que devuelva resultado estructurado.
- Eliminacion progresiva de `null` como acceso total.
- Integracion con servicios de proyectos, bitacoras, documentos, dashboard y usuarios.

Reglas:

- `GLOBAL` permite todos los proyectos.
- `ORGANIZATION` permite proyectos de una organizacion.
- `PROJECT` permite proyectos asignados.
- `OWN` no debe usarse para acceso general a proyectos.

Validaciones:

- Usuario global ve todos los proyectos.
- Usuario organizacional ve solo proyectos de su organizacion.
- Usuario proyecto ve solo sus proyectos asignados.
- Usuario con multiples roles obtiene union por recurso, no elevacion global accidental.

### Bloque E - Frontend permission visibility

Objetivo:

- Pasar de visibilidad por estado/403 a visibilidad por permisos efectivos.
- Mantener backend como autoridad final.

Entregables:

- Endpoint `me/effective-permissions` o equivalente.
- Contexto frontend de permisos efectivos.
- Helpers `hasPermission(permission, scope/resource)`.
- Actualizacion de botones, menus y pantallas sensibles.

Reglas:

- La UI debe usar permiso efectivo + estado workflow.
- No usar roles directos para autorizar UI.
- Los errores 403 deben quedar como fallback, no como mecanismo primario.

Validaciones:

- Screenshots/QA por rol.
- Botones workflow visibles solo con permiso y estado correctos.
- Documentos, usuarios, dashboard y proyectos alineados con backend.

### Bloque F - Auditoria RBAC

Objetivo:

- Auditar cambios de roles, permisos, scopes y asignaciones.
- Permitir explicar por que una accion fue autorizada o denegada.

Entregables:

- Eventos de auditoria para cambios RBAC.
- Registro antes/despues de asignaciones.
- Metadata de actor, usuario afectado, rol, permiso, scope, proyecto/organizacion.
- Motivo opcional de cambio.

Validaciones:

- Cambiar rol genera evento.
- Revocar rol genera evento.
- Cambiar permisos de rol genera evento.
- Se puede reconstruir la asignacion efectiva desde auditoria.

### Bloque G - QA seguridad

Objetivo:

- Validar matriz rol x accion x scope antes de activar RBAC v2 como autoridad principal.

Entregables:

- Matriz QA por rol, proyecto y accion.
- Pruebas de endpoints permitidos/denegados.
- Pruebas frontend de visibilidad.
- Checklist de rollback.

Casos minimos:

- Usuario sin rol.
- Usuario con rol proyecto.
- Usuario con multiples roles en proyectos distintos.
- Usuario `ORG_ADMIN`.
- Usuario `SUPER_ADMIN`.
- Usuario inactivo o sesion invalidada.
- Acciones workflow por estado y permiso.
- Descargas PDF/documentos/adjuntos.
- Auditoria y dashboard.

## Prioridad global

| Prioridad | Items |
| --- | --- |
| CRITICO | Bypass `organizations:create`; scope/resource en autorizacion; permisos workflow approve/reject/close/sign; plan de compatibilidad sin perdida. |
| ALTO | Catalogo v2; aliases legacy; ProjectAccessPolicy v2; roles hardcoded; auditoria RBAC; usuarios/roles; permisos atomicos PDF/documentos. |
| MEDIO | Frontend visibility; dashboard propio; endpoints OWN; health/db hardening; attachment metadata/listado. |
| BAJO | Etiquetas de roles frontend; documentacion de public endpoints; limpieza de nomenclatura despues de transicion. |

## Estrategia segura

### Evitar romper usuarios actuales

- Mantener permisos legacy activos durante toda la primera etapa.
- Agregar permisos v2 como expansion, no como reemplazo inmediato.
- Backfill por rol con snapshot antes/despues.
- Activar guards v2 inicialmente en modo compatible o shadow mode.
- Comparar decisiones legacy vs v2 antes de cortar.

### Mantener SUPER_ADMIN bypass temporal

- Durante transicion, `SUPER_ADMIN` conserva todos los permisos legacy.
- Agregar permisos v2 con `scope=GLOBAL`.
- Mantener bypass legacy por `organizations:create` solo hasta que `ProjectAccessPolicy v2` este probado.
- Registrar en auditoria cuando el acceso venga por bypass legacy.
- Eliminar el bypass legacy solo con aprobacion y QA de regresion.

### Mapear permisos legacy

| Legacy | V2 |
| --- | --- |
| `daily-logs:read` | `daily_logs:read`, `daily_logs:download_pdf`, `dashboard:read` segun rol, posible `audit_logs:read` |
| `daily-logs:update` | `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `daily_logs:return_to_draft`, `signatures:apply` segun rol |
| `daily-logs:delete` | `daily_logs:void` |
| `daily-log-events:*` | `daily_log_events:*` |
| `event-types:*` | `event_types:*` |
| `attachments:create` | `attachments:upload` |
| `attachments:read` | `attachments:read`, `attachments:download` segun endpoint |
| `documents:read` | `documents:read`, `documents:download` |
| `audit:read` | `audit_logs:read` |
| `users:password:reset` | `users:password_reset` |

### Activacion progresiva RBAC v2

1. Catalogo v2 y aliases sin uso productivo.
2. Seeds v2 coexistiendo con legacy.
3. Resolver permisos efectivos en shadow mode.
4. Comparar decisiones legacy/v2 en logs o pruebas.
5. Activar guard v2 en endpoints de menor riesgo.
6. Activar workflow atomico con permisos backfilled.
7. Activar frontend visibility por permisos efectivos.
8. Retirar aliases legacy solo despues de QA y aprobacion.

### Rollback recomendado

- Mantener `PermissionsGuard` legacy disponible hasta cierre de transicion.
- No eliminar permisos legacy ni `ProjectUser` en las primeras migraciones.
- Versionar seeds para permitir restaurar catalogo previo.
- Guardar snapshots de:
  - roles
  - permisos
  - role-permissions
  - asignaciones por usuario/proyecto
- Si falla v2, desactivar guard v2 y volver a permisos legacy sin tocar datos de usuario.

### Validaciones por fase

| Fase | Validacion minima |
| --- | --- |
| Catalogo | No duplicados; aliases completos; permisos por modulo aprobados. |
| Seeds | Snapshot antes/despues; SUPER_ADMIN conserva acceso; roles actuales no pierden permisos. |
| Migraciones | Prisma validate/generate; constraints por scope; backfill reversible. |
| Guards | Tests unitarios scope/resource; legacy vs v2 comparado. |
| Policies | Multirol, multiproyecto, GLOBAL/ORGANIZATION/PROJECT/OWN. |
| Frontend | Visibilidad por permisos; 403 como fallback; no roles directos. |
| QA | Matriz rol x accion x proyecto; evidencia de permitidos/denegados. |

## Riesgos

| Riesgo | Prioridad | Mitigacion |
| --- | --- | --- |
| Perder accesos al dividir `daily-logs:update`. | CRITICO | Backfill conservador y compatibilidad legacy. |
| Mantener sobreprivilegios si se mapea `daily-logs:update` a todo workflow para todos. | ALTO | Revisar rol por rol con matriz cliente. |
| Escalada accidental por `organizations:create`. | CRITICO | Sustituir por scope `GLOBAL` y retirar bypass legacy en fase controlada. |
| Confundir alcance `ORGANIZATION` con todos los proyectos. | ALTO | Tests con multiples organizaciones. |
| Usuarios multirol elevan permisos fuera del proyecto asignado. | ALTO | Evaluar permiso contra recurso objetivo. |
| Frontend queda desalineado con backend. | MEDIO | Backend fuente de verdad; UI consume permisos efectivos. |
| `OWN` ambiguo en bitacoras y firmas. | MEDIO | Definir owner por modulo antes de implementar. |
| Auditoria incompleta de cambios RBAC. | ALTO | Auditar antes/despues desde el primer cambio de asignaciones v2. |

## Orden recomendado de implementacion

1. Aprobar catalogo v2, scopes y aliases legacy.
2. Aprobar equivalencias de roles actuales con matriz cliente.
3. Implementar migraciones y seeds v2 sin retirar legacy.
4. Implementar servicio de permisos efectivos en modo lectura.
5. Implementar `ProjectAccessPolicy v2` en shadow mode.
6. Implementar guard/decorator v2 compatible.
7. Migrar endpoints de lectura de bajo riesgo.
8. Migrar permisos workflow atomicos con backfill aprobado.
9. Exponer permisos efectivos al frontend.
10. Ajustar visibilidad frontend por permiso + estado.
11. Activar auditoria RBAC completa.
12. Ejecutar QA seguridad y retirar bypass/aliases legacy por etapas.

## Checklist antes de tocar codigo

- [ ] Cliente aprueba roles v2 y equivalencias de roles actuales.
- [ ] Cliente confirma si `PROJECT_ADMIN (PMO)` es rol separado.
- [ ] Cliente confirma alcance y permisos de `ORG_ADMIN`.
- [ ] Cliente confirma si aprobar y rechazar son permisos separados.
- [ ] Cliente confirma si cerrar implica generar PDF.
- [ ] Cliente confirma definicion de `OWN` por modulo.
- [ ] Equipo aprueba nomenclatura snake_case v2.
- [ ] Equipo aprueba estrategia de aliases legacy.
- [ ] Equipo aprueba rollback con guard legacy.
- [ ] Existe snapshot de roles/permisos/asignaciones actuales.
- [ ] Existe matriz QA rol x accion x scope.
- [ ] Existe plan de auditoria RBAC.

## Fases sugeridas 64.4+

### FASE 64.4 - Catalogo RBAC v2 y aliases

- Definir catalogo final de permisos v2.
- Definir aliases legacy.
- Definir roles v2 y equivalencias.
- Entregable documental o seed plan aprobado.

### FASE 64.5 - Migraciones y seeds compatibles

- Crear tablas/enums v2.
- Sembrar permisos, scopes, roles y aliases.
- Mantener legacy.
- Preparar backfill reversible.

### FASE 64.6 - Effective permissions y ProjectAccessPolicy v2

- Implementar resolucion de permisos efectivos.
- Implementar policy v2 en modo compatible.
- Comparar decisiones legacy/v2.

### FASE 64.7 - Guards/decorators v2

- Introducir decorator v2.
- Activar guard v2 en endpoints seleccionados.
- Mantener fallback legacy mientras se valida.

### FASE 64.8 - Workflow atomico

- Separar permisos de submit, approve, reject, close, void, return, sign y PDF.
- Ejecutar backfill por rol.
- Probar matriz workflow por estado y permiso.

### FASE 64.9 - Frontend visibility

- Exponer permisos efectivos.
- Crear helpers/contexto frontend.
- Ajustar botones, menus y pantallas por permiso + estado.

### FASE 64.10 - Auditoria y QA seguridad

- Auditar cambios RBAC.
- Ejecutar matriz rol x accion x scope.
- Documentar evidencias y riesgos residuales.
- Planear retiro de legacy y bypass temporal.

## Resultado esperado

Este plan deja una ruta de normalizacion RBAC v2 ejecutable y segura. La implementacion debe iniciar por catalogo, aliases y compatibilidad, no por cambios directos a guards o frontend. El objetivo es llegar a autorizacion por permiso atomico, scope y recurso sin romper usuarios existentes ni perder trazabilidad.
