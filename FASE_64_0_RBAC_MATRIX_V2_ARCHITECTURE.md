# FASE 64.0 - RBAC Matrix v2 - Arquitectura

## Alcance de esta fase

Esta fase define arquitectura y criterios de diseno para RBAC Matrix v2. No implementa migraciones, no modifica guards, no cambia frontend y no altera permisos efectivos.

Fuentes revisadas:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `apps/api/src/auth/guards/permissions.guard.ts`
- `apps/api/src/daily-logs/guards/daily-log-project-access.guard.ts`
- `apps/api/src/projects/project-access.policy.ts`
- Controladores API con `@Permissions(...)`
- Servicios de roles y usuarios
- Frontend: workflow, auth guard, administracion de usuarios, documentos y acciones de bitacora
- Matriz cliente: `C:/Users/juan_/Downloads/RBAC_Enterprise_Matrix_Cliente (1).xlsx`

## Diagnostico RBAC actual

### Modelo actual

El modelo actual separa `Role`, `Permission`, `RolePermission` y `ProjectUser`.

- `Role`: catalogo global de roles.
- `Permission`: catalogo global de permisos por codigo.
- `RolePermission`: relacion N:N entre rol y permiso.
- `ProjectUser`: asigna usuario + rol + proyecto.

Limitacion principal: todo rol se asigna por proyecto. No existe una entidad explicita para alcance `GLOBAL`, `ORGANIZATION`, `PROJECT` u `OWN`. El alcance global se infiere indirectamente por permisos administrativos.

### Roles existentes en seed

Roles sembrados actualmente:

- `SUPER_ADMIN`
- `PROJECT_MANAGER`
- `SUPERVISOR`
- `PROJECT_ADMIN`
- `AUDITOR`
- `INSPECTOR`
- `VIEWER`

Inconsistencia detectada:

- El codigo de usuarios ya referencia `ORG_ADMIN` en reglas de administradores criticos, pero `ORG_ADMIN` no aparece en el seed actual.
- La matriz cliente si espera `ORG_ADMIN`.

### Permisos actuales

Permisos actuales por modulo:

- `organizations:create/read/update/delete`
- `projects:create/read/update/delete`
- `daily-logs:create/read/update/delete`
- `events:create/read/update/delete`
- `daily-log-events:create/read/update/delete`
- `event-types:create/read/update/delete`
- `roles:read`
- `roles:assign`
- `users:create/read/update/delete/manage`
- `users:password:reset`
- `attachments:create/read/delete`
- `documents:create/read/update/delete`
- `audit:read`

Permisos faltantes o demasiado agregados:

- Workflow de bitacora no tiene permisos dedicados: `daily-logs:submit`, `daily-logs:approve`, `daily-logs:reject`, `daily-logs:close`, `daily-logs:void`, `daily-logs:return-to-draft`.
- Firmas no tienen permisos dedicados: hoy usan `daily-logs:update`.
- Descarga PDF no tiene permiso dedicado: hoy usa `daily-logs:read`.
- Generacion PDF no tiene permiso dedicado: se dispara al cerrar.
- Dashboard no tiene permiso dedicado: hoy usa `daily-logs:read`.
- Auditoria de bitacora usa `daily-logs:read`, no `audit:read`.
- Descarga de documentos usa `documents:read`, no `documents:download`.
- Adjuntos no tienen `attachments:update` ni `attachments:download`.
- Roles tienen `roles:read` y `roles:assign`, pero el endpoint de roles asignables usa permisos administrativos alternativos.

### Guards actuales

`PermissionsGuard`:

- Lee permisos requeridos por metadata `@Permissions(...)`.
- Agrega todos los permisos de todos los roles activos del usuario.
- Autoriza si el usuario tiene cualquiera de los permisos requeridos.
- No evalua alcance, organizacion, proyecto, propiedad ni modulo.
- No recibe contexto del recurso para decidir si el permiso aplica al proyecto solicitado.

`DailyLogProjectAccessGuard`:

- Valida que la bitacora exista y no este `VOIDED`.
- Valida que el usuario tenga acceso al proyecto de la bitacora via `ProjectAccessPolicy`.
- No valida accion workflow especifica; solo alcance de proyecto.

`ProjectAccessPolicy`:

- Devuelve `null` para acceso total si el usuario tiene un rol con permiso `organizations:create`.
- De lo contrario devuelve proyectos activos asignados en `ProjectUser`.
- `canAccessProject` permite acceso si hay membresia activa al proyecto o si aplica el bypass global.

Riesgo: `organizations:create` funciona como bypass de plataforma. Es una inferencia fragil y debe reemplazarse por scope explicito.

### Acciones workflow protegidas hoy

En `DailyLogsController`:

- Crear bitacora: `daily-logs:create`
- Editar bitacora: `daily-logs:update`
- Enviar revision: `daily-logs:update` + `DailyLogProjectAccessGuard`
- Aprobar: `daily-logs:update` + `DailyLogProjectAccessGuard`
- Rechazar: `daily-logs:update` + `DailyLogProjectAccessGuard`
- Cerrar: `daily-logs:update` + `DailyLogProjectAccessGuard`
- Firmar: `daily-logs:update`
- Descargar PDF: `daily-logs:read`
- Evidencia documental: `daily-logs:read`
- Auditoria de bitacora: `daily-logs:read`
- Cancelar/anular: `daily-logs:delete` + `DailyLogProjectAccessGuard`

Riesgo: quien pueda editar una bitacora puede tambien aprobar, rechazar, cerrar y firmar si cumple estado/proyecto. RBAC v2 debe separar esas acciones.

### Frontend actual

El frontend usa `AuthGuard` para autenticacion, pero la visibilidad fina se basa principalmente en estado de workflow:

- `canSubmitDailyLog(status)`
- `canApproveDailyLog(status)`
- `canRejectDailyLog(status)`
- `canCloseDailyLog(status)`
- `canCreateDailyLogEvent(status)`
- `canUploadEventAttachment(status)`

En usuarios/documentos hay manejo de errores 403 y flags locales, pero no existe matriz de permisos frontend centralizada. La autorizacion real sigue en backend.

Riesgo: la UI puede mostrar acciones a usuarios sin permiso y depender del 403 del backend. En RBAC v2, la UI debe consumir permisos efectivos para visibilidad, sin reemplazar autorizacion backend.

## Matriz cliente esperada

Columnas identificadas en Excel:

- Rol
- Descripcion funcional
- Alcance
- Ver proyectos
- Crear bitacora
- Editar bitacora
- Enviar revision
- Aprobar
- Cerrar
- Ver auditoria
- Subir documentos
- Eliminar documentos
- Observaciones cliente

Roles identificados en la matriz cliente:

- `ORG_ADMIN`
- `PROJECT_ADMIN (PMO)`
- `PROJECT_MANAGER`
- `ENTIDAD CONTRATANTE`
- Director de obra/proyecto
- `INGENIERO RESIDENTE`
- `INTERVENTOR`
- `CONSULTOR - DISENADOR`
- `MAESTRO DE OBRA`
- `VIEWER`
- `SUPER_ADMIN`

Observacion cliente:

- Existe nota sobre PMO: cuando aplique PMO, gestiona metodologias y herramientas. Conviene decidir si `PROJECT_ADMIN (PMO)` es alias de `PROJECT_ADMIN`, rol separado, o atributo funcional dentro de un rol de proyecto.

## Propuesta RBAC v2

### Principio de diseno

RBAC v2 debe separar cinco conceptos:

- Rol: perfil funcional asignable a usuarios.
- Permiso: capacidad atomica sobre modulo y accion.
- Alcance: nivel donde aplica el permiso.
- Proyecto/organizacion: recurso donde se materializa el alcance.
- Regla contextual: condicion adicional, por ejemplo estado de workflow o propiedad del registro.

### Modelo conceptual propuesto

Sin implementar todavia, el modelo objetivo deberia soportar:

- `Role`
  - `code`
  - `name`
  - `description`
  - `status`
  - `roleType` opcional: system, client, operational

- `Permission`
  - `code`
  - `module`
  - `action`
  - `description`
  - `status`

- `RolePermission`
  - `roleId`
  - `permissionId`
  - `scope`

- `UserRoleAssignment`
  - `userId`
  - `roleId`
  - `scope`
  - `organizationId` nullable
  - `projectId` nullable
  - `status`
  - `assignedById`
  - `assignedAt`

El modelo actual `ProjectUser` puede evolucionar o ser reemplazado por una asignacion con scope. La decision se debe tomar en fase 64.1/64.2.

### Scopes

- `GLOBAL`: aplica a toda la plataforma. Reservado para `SUPER_ADMIN` y tareas de sistema.
- `ORGANIZATION`: aplica a todos los proyectos y usuarios de una organizacion.
- `PROJECT`: aplica a un proyecto especifico.
- `OWN`: aplica solo a recursos creados/asignados al usuario, por ejemplo firma propia o perfil propio.

Regla: un permiso sin scope no debe autorizar. Todo permiso efectivo debe resolverse como `permission + scope + resource`.

### Acciones tipo

Acciones canonicas:

- `read`
- `create`
- `update`
- `delete`
- `approve`
- `reject`
- `close`
- `void`
- `download`
- `sign`
- `audit`
- `manage`

Acciones adicionales recomendadas para workflow:

- `submit`
- `return-to-draft`
- `generate`

Aunque no estaban en la lista inicial, conviene incluirlas para evitar sobrecargar `update`.

### Convencion de codigos

Formato recomendado:

```txt
<module>:<action>
```

Ejemplos:

- `projects:read`
- `daily-logs:submit`
- `daily-logs:approve`
- `daily-logs:close`
- `daily-logs:download`
- `daily-logs:sign`
- `documents:download`
- `audit:read`
- `dashboard:read`
- `roles:manage`

## Matriz conceptual modulos / permisos / scopes

| Modulo | Permisos v2 sugeridos | Scopes validos |
| --- | --- | --- |
| proyectos | `projects:read`, `projects:create`, `projects:update`, `projects:delete`, `projects:manage` | GLOBAL, ORGANIZATION, PROJECT |
| bitacoras | `daily-logs:read`, `daily-logs:create`, `daily-logs:update`, `daily-logs:submit`, `daily-logs:approve`, `daily-logs:reject`, `daily-logs:close`, `daily-logs:void`, `daily-logs:return-to-draft` | GLOBAL, ORGANIZATION, PROJECT, OWN |
| eventos | `daily-log-events:read`, `daily-log-events:create`, `daily-log-events:update`, `daily-log-events:delete` | GLOBAL, ORGANIZATION, PROJECT, OWN |
| adjuntos | `attachments:read`, `attachments:create`, `attachments:delete`, `attachments:download` | GLOBAL, ORGANIZATION, PROJECT, OWN |
| firmas | `daily-log-signatures:read`, `daily-log-signatures:sign`, `daily-log-signatures:manage`, `user-signatures:manage-own` | GLOBAL, ORGANIZATION, PROJECT, OWN |
| PDF | `daily-log-pdf:generate`, `daily-log-pdf:download`, `daily-log-pdf:verify` | GLOBAL, ORGANIZATION, PROJECT |
| auditoria | `audit:read`, `audit:export` | GLOBAL, ORGANIZATION, PROJECT |
| usuarios | `users:read`, `users:create`, `users:update`, `users:delete`, `users:manage`, `users:password-reset`, `users:sessions-invalidate` | GLOBAL, ORGANIZATION, PROJECT, OWN |
| roles | `roles:read`, `roles:assign`, `roles:manage` | GLOBAL, ORGANIZATION, PROJECT |
| dashboard | `dashboard:read` | GLOBAL, ORGANIZATION, PROJECT |
| control documental | `documents:read`, `documents:create`, `documents:update`, `documents:delete`, `documents:download`, `documents:manage` | GLOBAL, ORGANIZATION, PROJECT, OWN |
| organizaciones | `organizations:read`, `organizations:create`, `organizations:update`, `organizations:delete`, `organizations:manage` | GLOBAL, ORGANIZATION |
| catalogos | `event-types:read`, `event-types:create`, `event-types:update`, `event-types:delete`, `document-types:manage` | GLOBAL, ORGANIZATION |

## Mapeo inicial matriz cliente a permisos v2

| Columna cliente | Permiso v2 |
| --- | --- |
| Ver proyectos | `projects:read` |
| Crear bitacora | `daily-logs:create` |
| Editar bitacora | `daily-logs:update` |
| Enviar revision | `daily-logs:submit` |
| Aprobar | `daily-logs:approve` |
| Cerrar | `daily-logs:close` |
| Ver auditoria | `audit:read` |
| Subir documentos | `documents:create` y/o `attachments:create` |
| Eliminar documentos | `documents:delete` y/o `attachments:delete` |

Decisiones a tomar:

- Si "Subir documentos" incluye adjuntos de eventos, documentos controlados, o ambos.
- Si "Editar bitacora" incluye editar eventos, editar metadatos de bitacora y retorno a borrador.
- Si "Aprobar" incluye rechazar/observar o si son permisos separados.
- Si "Cerrar" incluye generar PDF final.

## Roles v2 propuestos

### Roles de sistema

- `SUPER_ADMIN`: GLOBAL, administracion completa.
- `ORG_ADMIN`: ORGANIZATION, administracion de organizacion y proyectos asociados.
- `PROJECT_ADMIN`: PROJECT, administracion operativa del proyecto.
- `PROJECT_ADMIN_PMO`: PROJECT u ORGANIZATION, si cliente confirma que PMO es rol separado.

### Roles operativos cliente

- `PROJECT_MANAGER`: coordinacion y gestion del proyecto.
- `CONTRACTING_ENTITY`: entidad contratante / supervision operativa.
- `PROJECT_DIRECTOR`: director de obra/proyecto.
- `RESIDENT_ENGINEER`: ingeniero residente.
- `INTERVENTOR`: interventoria / auditoria tecnica.
- `CONSULTANT_DESIGNER`: consultor o disenador externo.
- `FOREMAN`: maestro de obra.
- `VIEWER`: consulta basica.

### Roles actuales a conciliar

- `SUPERVISOR` podria mapear a `CONTRACTING_ENTITY`, `PROJECT_DIRECTOR` o mantenerse como rol tecnico.
- `AUDITOR` podria mapear a `INTERVENTOR` o mantenerse como rol especializado de auditoria.
- `INSPECTOR` podria mapear a `FOREMAN`, `INTERVENTOR` o a un rol tecnico independiente.

No se recomienda borrar roles actuales en 64.0. Se debe definir una tabla de equivalencias con cliente antes de migrar.

## Riesgos detectados

### Conflictos entre roles

Un usuario puede tener multiples roles en uno o varios proyectos. RBAC v2 debe resolver permisos por union, pero registrar claramente el origen del permiso efectivo.

Riesgo especifico: un rol con permiso alto en un proyecto no debe elevar permisos en otro proyecto.

### Acceso global vs acceso por proyecto

El bypass actual por `organizations:create` puede conceder acceso a todos los proyectos. En v2 debe reemplazarse por `scope=GLOBAL` u `scope=ORGANIZATION`.

### Usuarios con multiples roles

Debe definirse si la union de permisos siempre gana o si existen restricciones por segregacion de funciones. Ejemplo: el creador de una bitacora no deberia aprobarla si cliente exige independencia.

### Permisos workflow

Hoy `daily-logs:update` cubre demasiadas acciones. Separar `submit`, `approve`, `reject`, `close`, `void`, `sign` y `download` reduce riesgo operativo y mejora auditoria.

### Visibilidad frontend vs autorizacion backend

La UI debe consumir permisos efectivos para ocultar acciones no disponibles, pero backend debe seguir siendo la fuente de verdad.

### Auditoria de cambios RBAC

Los cambios de roles, permisos y asignaciones deben auditar:

- actor
- usuario afectado
- rol afectado
- scope afectado
- organizacion/proyecto
- permisos antes/despues
- motivo opcional

### Backward compatibility

Al introducir permisos nuevos, endpoints existentes no deben quedar inaccesibles accidentalmente. Se requiere periodo de compatibilidad o migracion de permisos por rol.

### Roles faltantes en seed

`ORG_ADMIN` aparece en logica de usuarios pero no en seed. La fase de implementacion debe corregir catalogos antes de depender de ese rol.

## Decisiones pendientes para cliente

1. Confirmar si `PROJECT_ADMIN (PMO)` es el mismo `PROJECT_ADMIN` o un rol separado.
2. Confirmar equivalencias:
   - `SUPERVISOR`
   - `AUDITOR`
   - `INSPECTOR`
   - `ENTIDAD CONTRATANTE`
   - `INTERVENTOR`
3. Confirmar si "Subir documentos" cubre documentos controlados, adjuntos de eventos o ambos.
4. Confirmar si "Eliminar documentos" permite borrado logico de PDF final o solo soportes.
5. Confirmar si aprobar y rechazar deben ser permisos separados.
6. Confirmar si cerrar bitacora implica siempre generar PDF final.
7. Confirmar si existe segregacion de funciones:
   - creador no aprueba
   - aprobador no cierra
   - firmante por rol especifico
8. Confirmar si `OWN` aplica a bitacoras creadas por el usuario o solo a perfil/firma propia.
9. Confirmar si auditoria debe ser visible para interventoria, entidad contratante y administradores.
10. Confirmar nomenclatura final de roles cliente.

## Recomendacion de fases 64.1 a 64.5

### FASE 64.1 - Catalogo RBAC v2

Objetivo:

- Definir catalogo final de roles y permisos v2.
- Crear tabla de equivalencias rol actual -> rol v2.
- Confirmar permisos nuevos con cliente.
- No tocar guards todavia.

Entregable:

- Documento/catalogo aprobado de roles, permisos, scopes y equivalencias.

### FASE 64.2 - Modelo y migracion controlada

Objetivo:

- Disenar migracion de datos para scope explicito.
- Decidir si evolucionar `ProjectUser` o crear `UserRoleAssignment`.
- Agregar seeds v2 sin romper roles actuales.

Entregable:

- Migracion Prisma y seed v2 preparados.
- Backfill de asignaciones actuales a `PROJECT`.

### FASE 64.3 - Autorizacion backend v2

Objetivo:

- Introducir policy/guard que evalua `permission + scope + resource`.
- Reemplazar bypass por `organizations:create`.
- Separar permisos workflow en endpoints de bitacora.
- Mantener compatibilidad temporal donde aplique.

Entregable:

- Guards/policies v2 con pruebas unitarias/e2e.

### FASE 64.4 - Frontend por permisos efectivos

Objetivo:

- Exponer endpoint de permisos efectivos del usuario.
- Ajustar UI para mostrar/ocultar acciones por permisos + estado.
- Mantener backend como autoridad final.

Entregable:

- UI consistente con RBAC v2.

### FASE 64.5 - QA, auditoria y hardening

Objetivo:

- Validar matriz cliente rol por rol.
- Auditar cambios RBAC.
- Probar multiples roles, multiples proyectos, global vs organizacion vs proyecto.
- Verificar workflow completo y documentos.

Entregable:

- QA matrix ejecutada.
- Evidencia de endpoints permitidos/denegados.
- Riesgos residuales documentados.

## Resultado esperado de arquitectura

RBAC Matrix v2 debe pasar de permisos planos por rol/proyecto a permisos efectivos con alcance explicito. Esto permite mapear la matriz cliente sin depender de inferencias, evita que `daily-logs:update` concentre workflow critico y prepara una autorizacion coherente para backend, frontend y auditoria.
