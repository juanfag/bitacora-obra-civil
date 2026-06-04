# FASE 66.1 - Seed demo cliente / datos UAT

## Alcance

Preparacion de dataset demo UAT realista para el proyecto Bitacora diaria de Obra Civil.

La fase ajusto el seed existente para crear datos controlados, idempotentes y claramente identificables con prefijos `UAT` y correos `uat.*@bitacora.local`.

No se modificaron guards, permisos efectivos, workflow, PDF diario, migraciones productivas ni dependencias.

## Comando para ejecutar el seed

```powershell
npx.cmd prisma db seed
```

El comando ejecuta la configuracion existente de Prisma:

```text
tsx prisma/seed.ts
```

## Datos creados

Organizacion demo:

| Campo | Valor |
| --- | --- |
| Nombre | Constructora UAT Demo S.A.S. |
| NIT | 900661000-1 |
| Email | contacto.uat@bitacora.local |
| Telefono | 6040000000 |

Resumen validado en base local:

| Tipo de dato | Cantidad |
| --- | ---: |
| Organizaciones UAT | 1 |
| Proyectos UAT activos | 2 |
| Usuarios demo UAT | 7 |
| Bitacoras UAT | 6 |
| Eventos diarios UAT | 18 |
| Documentos metadata-only UAT | 3 |

## Usuarios demo y roles

Password comun para usuarios UAT:

```text
UatDemo123!
```

| Email | Nombre | Rol | Alcance |
| --- | --- | --- | --- |
| uat.superadmin@bitacora.local | UAT Super Admin | SUPER_ADMIN | Acceso administrativo demo sobre ambos proyectos UAT. |
| uat.projectmanager@bitacora.local | UAT Gerente de Proyecto | PROJECT_MANAGER | Gestion operativa de proyectos demo. |
| uat.supervisor@bitacora.local | UAT Supervisor de Obra | SUPERVISOR | Revision y seguimiento de bitacoras/eventos. |
| uat.projectadmin@bitacora.local | UAT Administrador de Proyecto | PROJECT_ADMIN | Administracion funcional de proyecto y documentos. |
| uat.auditor@bitacora.local | UAT Auditor Tecnico | AUDITOR | Consulta y auditoria de informacion demo. |
| uat.inspector@bitacora.local | UAT Inspector de Campo | INSPECTOR | Creacion/consulta de bitacoras, eventos y soportes. |
| uat.viewer@bitacora.local | UAT Consulta Cliente | VIEWER | Consulta de informacion demo. |

Todos los usuarios fueron asignados a los dos proyectos UAT con su rol correspondiente mediante `ProjectUser`.

## Proyectos demo

| Codigo | Nombre | Ubicacion | Estado |
| --- | --- | --- | --- |
| UAT-VIAL-001 | Corredor vial demo UAT | Medellin, Antioquia | ACTIVE |
| UAT-EDIF-002 | Edificio institucional demo UAT | Rionegro, Antioquia | ACTIVE |

## Bitacoras demo por estado

| Proyecto | Fecha | Estado | Descripcion |
| --- | --- | --- | --- |
| UAT-VIAL-001 | 2026-06-01 | CLOSED | Excavacion de caja vial, conformacion de subrasante y control topografico. |
| UAT-VIAL-001 | 2026-06-02 | APPROVED | Instalacion de tuberia pluvial y relleno compactado por capas. |
| UAT-VIAL-001 | 2026-06-03 | IN_REVIEW | Avance de concreto en cunetas y limpieza de frente enviado a revision. |
| UAT-VIAL-001 | 2026-06-04 | DRAFT | Actividades preliminares de senalizacion y replanteo. |
| UAT-EDIF-002 | 2026-06-03 | REJECTED | Rechazo por falta de soporte fotografico en acero de refuerzo. |
| UAT-EDIF-002 | 2026-06-04 | DRAFT | Seguimiento a formaleta, acero y liberacion parcial de cimentacion. |

Cada bitacora incluye eventos diarios realistas asociados a:

- avance de obra civil
- recepcion de materiales
- inspeccion tecnica

Las bitacoras con estados distintos de `DRAFT` incluyen historial de estado (`DailyLogStatusHistory`) coherente con el estado final.

## Documentos demo

Se crearon documentos metadata-only, sin binarios fisicos y sin almacenar archivos en PostgreSQL.

| Codigo | Proyecto | Categoria | Estado | Visibilidad |
| --- | --- | --- | --- | --- |
| UAT-DOC-VIAL-PLANO-001 | UAT-VIAL-001 | PLANOS | ACTIVE | PROJECT |
| UAT-DOC-VIAL-INF-001 | UAT-VIAL-001 | INFORMES_TECNICOS | IN_REVIEW | PROJECT |
| UAT-DOC-EDIF-ACTA-001 | UAT-EDIF-002 | ACTAS | APPROVED | ORGANIZATION |

Los documentos usan `storagePath` con prefijo `pending://` para indicar que no existe binario fisico asociado.

## Idempotencia

La idempotencia fue validada ejecutando dos veces:

```powershell
npx.cmd prisma db seed
```

Resultado:

- No se duplicaron usuarios, proyectos ni documentos.
- Las asignaciones usuario-proyecto se mantienen por clave unica `projectId_userId_roleId`.
- Las bitacoras se actualizan por clave unica `projectId_logDate`.
- Los eventos diarios se actualizan por `dailyLogId` + `activity`.
- El historial de estado UAT se reconstruye por bitacora para evitar duplicados.

## Validaciones ejecutadas

| Validacion | Resultado | Observaciones |
| --- | --- | --- |
| `npx.cmd tsc --noEmit ... prisma/seed.ts` | OK | Typecheck puntual del seed. |
| `npx.cmd prisma validate` | OK | Schema Prisma valido. |
| `npx.cmd prisma generate` | OK | Prisma Client generado correctamente. |
| `npx.cmd prisma db seed` | OK | Seed ejecutado correctamente. |
| `npx.cmd prisma db seed` segunda ejecucion | OK | Idempotencia confirmada. |
| `npm.cmd run api:build` | OK | Backend compila correctamente. |
| `npm.cmd run web:build` | OK | Frontend compila correctamente. |
| `npm.cmd run test:smoke` | OK | Health, login y flujo base de bitacora/API pasaron. |
| Consulta resumen UAT | OK | 2 proyectos, 7 usuarios, 6 bitacoras, 18 eventos y 3 documentos. |

## Riesgos y observaciones

- La password comun es solo para UAT/demo. Debe rotarse o eliminarse antes de produccion.
- Los documentos UAT son metadata-only; no prueban descarga de binario real.
- El smoke de login/API usa el mecanismo e2e existente y valida login del demo admin base; los usuarios UAT quedaron disponibles para prueba manual en ambiente UAT.
- El seed actual conserva el demo historico `admin@bitacora.local` y `PROY-DEMO-001`; no se elimina ni altera esa compatibilidad.
- No se crean adjuntos fisicos para evitar archivos falsos o rutas internas innecesarias.

## Archivos modificados

- `prisma/seed.ts`
- `FASE_66_1_SEED_DEMO_CLIENTE_UAT_QA.md`

## Resultado final

APROBADO.

La FASE 66.1 deja un seed demo UAT funcional, documentado e idempotente, con datos suficientes para recorridos cliente de organizacion, proyectos, usuarios por rol, bitacoras por estado, eventos diarios y documentos metadata-only.
