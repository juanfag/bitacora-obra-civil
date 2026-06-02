# FASE 64.8 - RBAC Hybrid Regression QA

## Resultado final

**QA APROBADO CON OBSERVACIONES**

La compatibilidad RBAC hibrida legacy + v2 fue validada en backend, workflow, auditoria y build frontend/backend sin activar la matriz final del cliente, sin eliminar permisos legacy y sin modificar enforcement definitivo.

La observacion principal es que la validacion frontend fue tecnica por build y revision de visibilidad, no por recorrido visual completo con navegador, porque el arranque controlado del servidor web local para QA encontro una limitacion del entorno PowerShell (`Path/PATH`) y no se forzo un proceso adicional.

## Alcance validado

- Documentos revisados:
  - `FASE_64_4_RBAC_V2_PERMISSION_CATALOG_SEEDS.md`
  - `FASE_64_5_RBAC_V2_AUDIT_TRAIL.md`
  - `FASE_64_6_RBAC_V2_HYBRID_GUARDS.md`
  - `FASE_64_7_FRONTEND_RBAC_HYBRID_VISIBILITY.md`
- Backend RBAC hibrido:
  - permisos legacy
  - permisos RBAC v2 equivalentes
  - usuario sin permiso
  - bypass `SUPER_ADMIN`
  - endpoints sensibles
- Frontend RBAC hibrido:
  - helper centralizado de permisos
  - navegacion principal
  - dashboard
  - proyectos
  - bitacoras
  - detalle de bitacora
  - documentos
  - usuarios
- Workflow:
  - crear bitacora
  - crear evento
  - enviar aprobacion
  - aprobar
  - rechazar
  - retornar a borrador
  - cerrar
  - generar evidencia PDF durante cierre
  - bloquear acciones invalidas
- Auditoria RBAC:
  - asignar rol
  - remover rol
  - asignar proyecto
  - remover proyecto
  - bloquear usuario
  - snapshots historicos

## Usuarios y roles usados

- `SUPER_ADMIN` / admin demo: usado para login, acceso total, workflow smoke y operaciones administrativas.
- Usuario temporal con rol v2: permisos `users:read`, `roles:assign`, `projects:read`, `daily_logs:read`, `daily_log_events:read`, `dashboard:read`.
- Usuario temporal legacy: permiso `daily-logs:read`.
- Usuario temporal sin permisos: rol vacio para validar `403`.
- Rol `VIEWER`: usado para validar asignacion/remocion y snapshots de auditoria RBAC.

## Pruebas backend

| Validacion | Resultado |
| --- | --- |
| Permiso legacy permite acceso | OK |
| Permiso v2 equivalente permite acceso | OK |
| Usuario sin permiso recibe 403 | OK |
| `SUPER_ADMIN` conserva acceso | OK |
| `users` protegido | OK |
| `roles/assignable` protegido | OK |
| `projects` protegido | OK |
| `daily-logs` protegido | OK |
| `daily-log-events` protegido | OK |
| `dashboard/metrics` protegido | OK |

Prueba ejecutada:

```bash
npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-hybrid-guards.e2e-spec.ts
```

Resultado: **4/4 tests OK**.

## Pruebas frontend

| Area | Resultado |
| --- | --- |
| Build Next.js | OK |
| Helper frontend hibrido | OK por build TypeScript |
| Navegacion condicionada por permisos | OK por build/revision |
| Dashboard con acciones condicionadas | OK por build/revision |
| Proyectos/documentos con acciones condicionadas | OK por build/revision |
| Detalle bitacora con workflow condicionado | OK por build/revision |
| Recorrido visual en navegador | No ejecutado por limitacion de arranque local |

Comando ejecutado:

```bash
npm.cmd run web:build
```

Resultado: **OK**.

Observaciones heredadas de 64.7:

- El bloque de auditoria en detalle de bitacora mantiene visibilidad si la pagina carga; backend sigue protegiendo el acceso.
- Un CTA secundario en empty state de bitacoras puede seguir visible en algunos estados; backend protege la accion.
- No existe suite frontend dedicada en `package.json`; la cobertura automatizada disponible es e2e backend/smoke.

## Pruebas workflow

Prueba ejecutada:

```bash
npm.cmd run test:e2e -- --runTestsByPath test/e2e/daily-log-workflow.e2e-spec.ts
```

Resultado final: **13/13 tests OK**.

Cobertura validada:

- health endpoint
- login
- crear bitacora
- crear evento en bitacora editable
- bloquear bitacora duplicada
- validar dia laboral previo requerido
- omitir domingo en validacion de dia previo
- submit, approve y close
- bloquear approve/close desde `DRAFT`
- bloquear submit duplicado
- bloquear edicion de evento y carga de adjuntos despues de `CLOSED`
- reject, return-to-draft, correccion y resubmission
- bloquear return-to-draft fuera de `REJECTED`

## Pruebas auditoria

Prueba ejecutada:

```bash
npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-audit.e2e-spec.ts
```

Resultado: **1/1 test OK**.

Eventos confirmados:

- `RBAC_ROLE_ASSIGNED`
- `RBAC_ROLE_REMOVED`
- `RBAC_PROJECT_ACCESS_GRANTED`
- `RBAC_PROJECT_ACCESS_REMOVED`
- `RBAC_USER_STATUS_CHANGED`

Snapshots confirmados:

- `actorNameSnapshot`
- `actorEmailSnapshot`
- `targetUserSnapshot`
- `roleSnapshot`
- `scopeSnapshot`
- `projectSnapshot`
- `oldValue`
- `newValue`
- `metadata`

## Regresion tecnica

| Comando | Resultado |
| --- | --- |
| `npx.cmd prisma generate` | OK |
| `npx.cmd prisma validate` | OK |
| `npm.cmd run api:build` | OK |
| `npm.cmd run web:build` | OK |
| `npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-audit.e2e-spec.ts` | OK |
| `npm.cmd run test:e2e -- --runTestsByPath test/e2e/rbac-hybrid-guards.e2e-spec.ts` | OK |
| `npm.cmd run test:e2e -- --runTestsByPath test/e2e/daily-log-workflow.e2e-spec.ts` | OK despues de fix minimo de cleanup e2e |

## Fix minimo aplicado en QA

Archivo modificado:

- `test/e2e/helpers/cleanup.helper.ts`

Motivo:

- La suite `daily-log-workflow.e2e-spec.ts` ejecutaba correctamente sus 13 pruebas funcionales, pero fallaba en teardown por restricciones FK generadas por documentos/PDF asociados al cierre de bitacora.

Ajuste:

- `cleanupDailyLogGraph` ahora elimina `DailyLogDocument` y `DailyLogPdfVersion` antes de borrar `DailyLog`.
- `cleanupSmokeProjects` ahora elimina documentos del proyecto y sus relaciones (`EventDocument`, `DailyLogDocument`, `DailyLogPdfVersion`) antes de borrar `Project`.

Impacto:

- Cambio limitado a helpers e2e.
- No modifica autorizacion efectiva.
- No modifica guards productivos.
- No modifica frontend.
- No cambia workflow productivo.
- No activa RBAC v2 definitivo.

## Hallazgos

### Criticos

No se detectaron hallazgos criticos en las validaciones automatizadas ejecutadas.

### Altos

No se detectaron hallazgos altos.

### Medios

- La validacion visual frontend con navegador no quedo ejecutada en esta fase por limitacion de arranque local del proceso web. Mitigacion: `web:build` paso correctamente y la visibilidad hibrida fue validada por TypeScript/build y revision de componentes.

### Bajos

- La suite workflow requirio actualizar helpers de cleanup e2e para borrar artefactos documentales/PDF generados por cierre.
- Persisten observaciones menores de 64.7 sobre visibilidad frontend parcial en auditoria de detalle y CTA secundario de empty state.

## Pendientes

- Ejecutar un recorrido visual completo con usuarios reales cuando el entorno local web este estable:
  - login/logout
  - dashboard
  - navegacion por rol/permiso
  - detalle bitacora
  - botones workflow visibles/ocultos
  - usuarios/admin
- Normalizar las observaciones menores de visibilidad frontend en una fase posterior si el cliente las prioriza.
- Mantener la activacion final de matriz cliente fuera de esta fase.

## Conclusion

RBAC hibrido legacy + v2 queda validado tecnicamente para continuar hacia fases posteriores, con permisos legacy conservados, SUPER_ADMIN intacto, auditoria RBAC funcionando y workflow sin regresion automatizada.

La fase 64.8 no activo enforcement final RBAC v2, no elimino permisos legacy y no cambio reglas productivas de workflow.
