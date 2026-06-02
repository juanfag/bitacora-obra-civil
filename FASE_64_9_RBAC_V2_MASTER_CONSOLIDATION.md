# FASE 64.9 - RBAC v2 Master Consolidation

## Resumen ejecutivo

FASE 64 queda consolidada tecnicamente como preparacion RBAC v2 hibrida. El sistema ya cuenta con arquitectura documentada, modelo tecnico propuesto, inventario backend/frontend, plan de normalizacion, catalogo pasivo de permisos v2, auditoria RBAC enterprise, compatibilidad hibrida en guards, visibilidad frontend hibrida y QA de regresion.

No se activo la matriz final del cliente. No se eliminaron permisos legacy. No se cambio enforcement definitivo por scope. La siguiente etapa depende de recibir la matriz cliente diligenciada para decidir permisos finales por rol, scopes efectivos y activacion controlada.

## Objetivo RBAC v2

RBAC v2 busca pasar de permisos planos asignados por rol/proyecto a autorizacion explicita por:

- rol
- permiso
- modulo
- accion
- scope
- proyecto u organizacion
- regla contextual de dominio

El objetivo final es expresar la matriz cliente sin depender de inferencias fragiles como `organizations:create` para acceso global o `daily-logs:update` para acciones criticas de workflow.

## Estado actual

### Estado funcional actual

- La autorizacion backend sigue usando `PermissionsGuard` con permisos legacy y equivalentes v2.
- `ProjectAccessPolicy` conserva comportamiento legacy y bypass por `organizations:create`.
- Los permisos legacy siguen activos.
- Los permisos v2 estan disponibles como catalogo y compatibilidad, pero no representan todavia la matriz final del cliente.
- El frontend usa visibilidad hibrida con fallback abierto para no bloquear operaciones durante transicion.
- Workflow mantiene reglas productivas actuales.
- Auditoria RBAC registra cambios administrativos existentes.

### Estado de cierre de fase

**FASE 64 cerrada tecnicamente en modo preparacion RBAC v2 hibrida, pendiente de matriz cliente diligenciada para enforcement final.**

## Fases ejecutadas

| Fase | Resultado |
| --- | --- |
| 64.0 Arquitectura | Diagnostico actual, matriz cliente esperada, scopes y propuesta conceptual. |
| 64.1 Modelo tecnico | Modelo RBAC v2 propuesto: Role, Permission, RolePermission, UserRole, UserProjectRole, PermissionScope. |
| 64.2 Inventario | Inventario de endpoints, guards, policies, permisos backend/frontend, gaps e inconsistencias. |
| 64.3 Normalizacion | Plan por bloques A-G con prioridades, rollback y estrategia segura. |
| 64.4 Catalogo/seeds | Catalogo central v2 y mapping legacy -> v2, sin activar enforcement final. |
| 64.5 Auditoria | Eventos RBAC, snapshots historicos y metadata estandarizada. |
| 64.6 Guards hibridos | Resolver centralizado legacy/v2 y `PermissionsGuard` compatible. |
| 64.7 Frontend visibility | Helper/hook frontend, endpoint de permisos y visibilidad hibrida. |
| 64.8 QA regresion | Builds, e2e RBAC/auditoria/workflow y conclusion QA aprobada con observaciones. |

## Cambios tecnicos realizados

### Catalogo y seeds

- Se agrego `prisma/rbac-v2-permission-catalog.ts`.
- Se centralizo `rbacV2Permissions`.
- Se centralizo `legacyToRbacV2PermissionMappings`.
- `prisma/seed.ts` fusiona permisos legacy + v2 sin eliminar legacy.
- `SUPER_ADMIN` conserva permisos legacy y recibe catalogo v2 por compatibilidad.

### Auditoria RBAC

- Se ampliaron eventos `AuditAction` para RBAC.
- Se agregaron snapshots historicos nullable en `AuditLog`.
- Se agrego metadata estructurada para eventos RBAC.
- `UsersService` audita asignacion/remocion de roles, acceso a proyecto y cambio de estado usuario.
- Se mantiene auditoria legacy existente.

### Guards y policies

- Se agrego `RbacPermissionResolver`.
- `PermissionsGuard` acepta permiso exacto o equivalente legacy/v2.
- `AuthModule` registra/exporta el resolver.
- `ProjectAccessPolicy` incorporo estructura preparatoria de scopes futuros sin cambiar comportamiento productivo.

### Frontend

- Se agrego `GET /users/me/permissions` para visibilidad.
- Se agrego helper `apps/web/src/lib/rbac-permissions.ts`.
- Se agrego hook `apps/web/src/lib/use-current-permissions.ts`.
- Se agrego navegacion filtrada `AppNavigation`.
- Se ajustaron acciones visibles en dashboard, proyectos, bitacoras, detalle, workflow, documentos, firmas, adjuntos y usuarios.

### QA

- Se agregaron pruebas e2e RBAC audit y hybrid guards.
- Se ajusto helper e2e de cleanup para artefactos documentales/PDF de workflow.
- Workflow smoke paso con 13/13 pruebas.

## Decisiones arquitectonicas

### Scopes definidos

| Scope | Significado |
| --- | --- |
| `GLOBAL` | Toda la plataforma. Reservado para `SUPER_ADMIN` y administracion global. |
| `ORGANIZATION` | Una organizacion y sus proyectos/usuarios. |
| `PROJECT` | Un proyecto especifico. |
| `OWN` | Recursos propios del usuario autenticado. |

### Nomenclatura v2

Formato objetivo:

```txt
modulo:accion
```

Convencion:

- Modulos compuestos en `snake_case`.
- Acciones atomicas.
- Guiones legacy conservados como aliases durante transicion.

### Compatibilidad

La transicion usa equivalencias bidireccionales en guard/frontend:

- permiso legacy requerido + permiso v2 asignado permite acceso
- permiso v2 requerido + permiso legacy asignado permite acceso
- permisos sin mapping conservan comparacion exacta

### Backend como autoridad

La visibilidad frontend no reemplaza autorizacion. Backend sigue siendo la fuente de verdad.

### Fallback frontend abierto

Durante transicion, si los permisos frontend no cargan, la UI evita bloquear acciones anticipadamente. El backend mantiene el control final.

## Catalogo permisos v2

Catalogo central actualmente implementado:

| Modulo | Permisos |
| --- | --- |
| `projects` | `projects:read`, `projects:create`, `projects:update`, `projects:assign_users` |
| `daily_logs` | `daily_logs:read`, `daily_logs:create`, `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `daily_logs:void`, `daily_logs:download_pdf` |
| `daily_log_events` | `daily_log_events:create`, `daily_log_events:update` |
| `attachments` | `attachments:upload`, `attachments:download` |
| `signatures` | `signatures:apply` |
| `audit_logs` | `audit_logs:read` |
| `users` | `users:read`, `users:create`, `users:update`, `users:manage_status` |
| `roles` | `roles:assign` |
| `dashboard` | `dashboard:read` |
| `documents` | `documents:read`, `documents:create`, `documents:update`, `documents:approve`, `documents:download`, `documents:delete` |

Permisos legacy conservados:

- `organizations:*`
- `projects:*`
- `daily-logs:*`
- `events:*`
- `daily-log-events:*`
- `event-types:*`
- `roles:read`
- `roles:assign`
- `users:*`
- `attachments:*`
- `documents:*`
- `audit:read`

## Compatibilidad legacy

Mappings principales:

| Legacy | V2 |
| --- | --- |
| `daily-logs:read` | `daily_logs:read`, `daily_logs:download_pdf` |
| `daily-logs:create` | `daily_logs:create` |
| `daily-logs:update` | `daily_logs:update`, `daily_logs:submit`, `daily_logs:approve`, `daily_logs:reject`, `daily_logs:close`, `signatures:apply` |
| `daily-logs:delete` | `daily_logs:void` |
| `daily-log-events:create` | `daily_log_events:create` |
| `daily-log-events:update` | `daily_log_events:update` |
| `attachments:create` | `attachments:upload` |
| `attachments:read` | `attachments:download` |
| `documents:read` | `documents:read`, `documents:download` |
| `audit:read` | `audit_logs:read` |
| `users:update` | `users:update`, `users:manage_status` |
| `users:manage` | `users:manage_status`, `roles:assign` |
| `roles:assign` | `roles:assign` |

Riesgo controlado:

- `daily-logs:update` mapea a varias acciones workflow para no romper accesos durante transicion, pero no debe usarse como asignacion final sin matriz cliente.

## Auditoria RBAC

Eventos preparados:

- `RBAC_ROLE_ASSIGNED`
- `RBAC_ROLE_REMOVED`
- `RBAC_PERMISSION_GRANTED`
- `RBAC_PERMISSION_REVOKED`
- `RBAC_SCOPE_CHANGED`
- `RBAC_PROJECT_ACCESS_GRANTED`
- `RBAC_PROJECT_ACCESS_REMOVED`
- `RBAC_USER_STATUS_CHANGED`
- `RBAC_ROLE_MAPPING_UPDATED`

Eventos implementados hoy:

- asignar rol
- remover rol
- otorgar acceso a proyecto
- remover acceso a proyecto
- cambiar estado usuario

Snapshots persistidos:

- actor
- usuario objetivo
- rol
- permiso futuro
- scope
- proyecto
- metadata
- old/new values

La auditoria RBAC no cambia autorizacion. Agrega trazabilidad enterprise sobre flujos administrativos existentes.

## Guards hibridos

`PermissionsGuard` mantiene su logica legacy, pero usa `RbacPermissionResolver`.

Validado:

- permiso legacy permite acceso
- permiso v2 equivalente permite acceso
- usuario sin permiso recibe `403`
- `SUPER_ADMIN` conserva acceso
- endpoints de users, roles, projects, daily-logs, daily-log-events y dashboard

Pendiente:

- enforcement real por `permission + scope + resource`
- reemplazo del bypass `organizations:create`
- trazabilidad del permiso efectivo que autorizo cada request

## Frontend visibility hibrida

Se implemento:

- endpoint `GET /users/me/permissions`
- helper de permisos equivalentes
- hook de permisos actuales
- navegacion por permisos
- acciones workflow visibles por permiso + estado
- controles de documentos, adjuntos, firmas, PDF y usuarios

Pendiente:

- recorrido visual completo por rol cuando entorno web local este estable
- cerrar observaciones menores de auditoria en detalle y CTA secundario de empty state
- reemplazar fallback abierto por enforcement frontend final cuando backend RBAC v2 este listo

## QA ejecutado

Validaciones previas relevantes:

- `npx.cmd prisma generate` - OK
- `npx.cmd prisma validate` - OK
- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK
- `npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-audit.e2e-spec.ts` - OK
- `npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-hybrid-guards.e2e-spec.ts` - OK
- `npm.cmd run test:e2e -- --runTestsByPath test/e2e/daily-log-workflow.e2e-spec.ts` - OK

Resultado 64.8:

**QA APROBADO CON OBSERVACIONES**

Observacion principal:

- La validacion frontend visual no se completo por limitacion del entorno local, aunque `web:build` paso correctamente.

## Estado final de FASE 64

### Quedo implementado

- Catalogo central de permisos RBAC v2.
- Mapping legacy -> v2.
- Seeds compatibles legacy + v2.
- Auditoria RBAC enterprise para cambios administrativos existentes.
- Resolver backend de equivalencias.
- `PermissionsGuard` hibrido.
- Estructura preparatoria de scopes en `ProjectAccessPolicy`.
- Endpoint de permisos actuales para frontend.
- Helper/hook frontend de permisos hibridos.
- Visibilidad frontend hibrida en componentes principales.
- Pruebas e2e de auditoria y guards hibridos.
- Fix de limpieza e2e para workflow documental/PDF.

### Quedo documentado

- Arquitectura RBAC v2.
- Modelo tecnico objetivo.
- Inventario completo de permisos backend/frontend.
- Plan de normalizacion por bloques.
- Riesgos y prioridades.
- Gaps workflow, auditoria, dashboard, usuarios/roles y ProjectAccessPolicy.
- Estrategia de rollback.
- Transicion hacia enforcement final.

### Quedo pendiente

- Recibir matriz cliente diligenciada.
- Confirmar roles finales.
- Confirmar permisos finales por rol.
- Confirmar scopes por rol/permiso.
- Confirmar equivalencias de roles actuales con roles cliente.
- Confirmar segregacion de funciones.
- Confirmar definicion de `OWN` por modulo.
- Definir `ORG_ADMIN` y PMO.
- Activar enforcement final por scope.
- Endurecer frontend sin fallback abierto.
- Ejecutar QA seguridad final por matriz aprobada.

### NO debe hacerse todavia

- No eliminar permisos legacy.
- No retirar aliases legacy.
- No cambiar permisos finales por rol.
- No activar matriz cliente final.
- No reemplazar `ProjectAccessPolicy` legacy.
- No quitar bypass actual antes de tener scope `GLOBAL` probado.
- No cambiar workflow productivo.
- No cambiar guards a enforcement final.
- No cerrar fallback frontend sin backend v2 final.
- No ejecutar migracion/asignacion final sin matriz cliente.

## Observaciones pendientes

- `organizations:create` sigue siendo bypass global legacy en `ProjectAccessPolicy`.
- `daily-logs:update` sigue siendo amplio para workflow productivo.
- Auditoria de bitacora aun se basa en permisos de lectura de bitacora.
- Dashboard todavia depende de protecciones legacy en backend.
- Algunos endpoints OWN siguen JWT-only por diseno actual.
- El frontend aun tiene fallback abierto durante transicion.
- El recorrido visual frontend por usuario/rol queda pendiente.

## Riesgos abiertos

| Riesgo | Estado | Mitigacion |
| --- | --- | --- |
| Sobreprivilegio al mapear `daily-logs:update` a workflow atomico. | Abierto | Resolver con matriz cliente por rol. |
| Escalada por `organizations:create`. | Abierto | Reemplazar por scope `GLOBAL` cuando se active RBAC v2 final. |
| Frontend puede mostrar acciones si falla carga de permisos. | Abierto controlado | Backend sigue autorizando; cerrar al activar enforcement final. |
| Roles actuales no equivalen 1:1 a roles cliente. | Abierto | Requiere matriz diligenciada y decision cliente. |
| `OWN` ambiguo en bitacoras/firma/perfil. | Abierto | Definir por modulo antes de migrar. |
| Auditoria de permisos/scopes futuros aun sin flujo productivo. | Abierto | Implementar cuando existan administracion de permisos/scopes. |

## Bloqueado por matriz cliente

Queda bloqueado hasta recibir matriz final:

- asignacion final permisos por rol
- definicion final de roles cliente
- alta de roles nuevos como `ORG_ADMIN` o `PROJECT_ADMIN_PMO`
- alcance final por rol (`GLOBAL`, `ORGANIZATION`, `PROJECT`, `OWN`)
- permisos workflow por rol
- permisos documentales por rol
- permisos de auditoria por rol
- segregacion de funciones
- reglas de aprobacion/cierre/firma
- decision sobre descargar/generar PDF
- enforcement backend definitivo
- enforcement frontend definitivo
- retiro progresivo de permisos legacy

## Fases siguientes recomendadas

### 65.0 - Analisis matriz cliente diligenciada

- Comparar matriz cliente contra catalogo v2.
- Detectar permisos faltantes.
- Confirmar roles nuevos y equivalencias.
- Definir scopes por rol.

### 65.1 - Ajuste catalogo final y permisos por rol

- Ajustar catalogo si la matriz requiere permisos adicionales.
- Preparar asignaciones finales por rol.
- Mantener legacy hasta QA.

### 65.2 - Migracion/asignacion final controlada

- Backfill de roles/permisos aprobados.
- Snapshot antes/despues.
- Rollback preparado.

### 65.3 - Enforcement RBAC v2 backend

- Activar policy por `permission + scope + resource`.
- Reemplazar bypass `organizations:create`.
- Separar workflow atomico en endpoints.

### 65.4 - Enforcement RBAC v2 frontend

- Pasar de fallback abierto a visibilidad estricta.
- Validar menus, botones y pantallas por rol.

### 65.5 - QA seguridad final

- Matriz rol x accion x proyecto.
- Pruebas multirol/multiproyecto.
- Pruebas `GLOBAL`, `ORGANIZATION`, `PROJECT`, `OWN`.
- Pruebas de auditoria, workflow, documentos, PDF y dashboard.

## Transicion formal

Las siguientes fases dependientes del cliente son:

- analisis matriz cliente diligenciada
- ajuste de permisos finales por rol
- migracion/asignacion final
- enforcement RBAC v2 backend
- enforcement RBAC v2 frontend
- QA seguridad final

## Conclusion

FASE 64 queda cerrada como preparacion RBAC v2 hibrida. El sistema esta listo para recibir la matriz cliente final y convertirla en asignaciones/enforcement controlado, con compatibilidad legacy preservada, auditoria RBAC activa y QA tecnica ejecutada.

No se debe avanzar a enforcement final RBAC v2 sin matriz cliente diligenciada y aprobada.
