# FASE 66.0 - Hardening pre-UAT

## Alcance

Fase de estabilizacion tecnica pre-UAT para el proyecto Bitacora diaria de Obra Civil.

El alcance incluyo revision general de backend, frontend, Prisma, documentacion QA, estado de puertos locales, estado de migraciones, builds, pruebas e2e disponibles y riesgos visibles que puedan afectar una demo cliente.

No se implementaron funcionalidades nuevas. No se modificaron RBAC efectivo, guards, workflow de bitacoras, generacion PDF, migraciones productivas, modelo Prisma ni dependencias.

## Validaciones ejecutadas

| Validacion | Resultado | Observaciones |
| --- | --- | --- |
| `npx.cmd prisma validate` | OK | Schema Prisma valido. |
| `npx.cmd prisma generate` | OK | Prisma Client generado correctamente. |
| `npx.cmd prisma migrate status` | OK | 22 migraciones encontradas. Base de datos alineada con el schema. |
| `npm.cmd run api:build` | OK | Backend NestJS compila correctamente. |
| `npm.cmd run web:build` | OK | Frontend Next.js compila correctamente. |
| `npm.cmd run test:e2e` | OK | 6 suites aprobadas, 21 tests aprobados. |
| Revision puertos `3000`, `3001` | OK | No se detectaron dev servers activos. |
| Revision documentos QA fases 65.x | OK | Documentos QA documentales recientes presentes. |
| Revision endpoints/guards | OK con observaciones | No se detecto regresion evidente; existen endpoints publicos esperados que deben confirmarse para UAT. |
| Revision TODO/sensibles | OK con observaciones | No se detectaron secretos hardcoded; hay deuda menor documentada. |

## Resultado pruebas e2e

Resultado global:

- Test suites: 6 passed, 6 total.
- Tests: 21 passed, 21 total.

Suites cubiertas:

- `daily-log-workflow.e2e-spec.ts`
- `document-audit.e2e-spec.ts`
- `document-relations.e2e-spec.ts`
- `document-versions.e2e-spec.ts`
- `rbac-audit.e2e-spec.ts`
- `rbac-hybrid-guards.e2e-spec.ts`

Durante las pruebas aparecieron respuestas `403` y `409` esperadas dentro de escenarios negativos. No representan fallo de regresion porque las suites finalizaron correctamente.

## Hallazgos criticos

No se identificaron hallazgos criticos bloqueantes para UAT.

## Hallazgos medios

1. Endpoints publicos a confirmar antes de UAT.

   Se observaron endpoints publicos esperados:

   - `POST /auth/login`
   - `GET /health`
   - `GET /health/db`
   - endpoints publicos de verificacion de bitacora diaria

   Recomendacion: confirmar con el equipo si `health/db` y la verificacion publica deben estar expuestos en el ambiente UAT o si deben quedar restringidos por red/proxy.

2. Smoke visual frontend no ejecutado con navegador en esta fase.

   El frontend compila correctamente, pero no se levanto servidor local para una validacion visual navegada. Para demo cliente conviene ejecutar un smoke final en navegador con usuarios demo reales.

## Hallazgos bajos

1. Advertencia deprecada de `pg` durante e2e.

   Se observo una advertencia:

   - `Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0`

   No rompe UAT actualmente, pero conviene revisarla antes de actualizar `pg` a una version mayor.

2. Logs de arranque en backend.

   `apps/api/src/main.ts` imprime URLs de API y Swagger al iniciar. Es aceptable para desarrollo/UAT controlado, pero debe revisarse para produccion si se requiere logging estructurado estricto.

3. TODOs tecnicos existentes.

   Se detectaron TODOs no bloqueantes en areas como:

   - antivirus para adjuntos
   - endurecimiento futuro de `ProjectAccessPolicy`
   - maquina de estados formal de workflow
   - endurecimiento de estados `DRAFT`

   Son deuda conocida y no se modificaron por restriccion de fase.

## Riesgos para UAT

- Confirmar que el ambiente UAT tenga variables `.env` completas y consistentes con la base de datos objetivo.
- Confirmar que los usuarios/roles demo esten sembrados y tengan permisos esperados.
- Confirmar exposicion deseada de `health/db` y endpoints publicos de verificacion.
- Ejecutar smoke visual final con navegador antes de presentar al cliente.
- Verificar estrategia de almacenamiento documental del ambiente UAT; el modulo documental no debe exponer `storagePath` ni rutas internas.
- Mantener congeladas reglas RBAC, workflow y PDF hasta que exista una fase especifica de cambio aprobada.

## Recomendaciones

- Ejecutar un smoke manual pre-demo con usuarios representativos: administrador, residente, auditor y usuario sin permisos criticos.
- Validar login/logout, dashboard, proyectos, bitacoras, biblioteca documental, upload documental, auditoria visible y descarga.
- Revisar configuracion de proxy/firewall para endpoints publicos antes de UAT.
- Mantener un snapshot o respaldo de base de datos UAT antes de sesiones cliente.
- Programar correccion posterior de la advertencia `pg` si se planea actualizar dependencias.

## Checklist antes de FASE 66.1

- [ ] Confirmar ambiente UAT y variables `.env`.
- [ ] Confirmar usuarios demo y credenciales controladas.
- [ ] Confirmar seed/demo data de organizaciones, proyectos, bitacoras y documentos.
- [ ] Ejecutar smoke visual con navegador.
- [ ] Confirmar exposicion publica de health checks y verificacion de bitacoras.
- [ ] Confirmar que no haya dev servers activos antes de entregar el ambiente.
- [ ] Confirmar que RBAC efectivo, workflow y PDF siguen congelados salvo fase aprobada.
- [ ] Respaldar base de datos UAT antes de demo cliente.

## Archivos modificados

Solo se agrego este documento:

- `FASE_66_0_HARDENING_PRE_UAT_QA.md`

No se aplicaron fixes minimos porque no se identificaron fallos bloqueantes.

## Resultado final

APROBADO CON OBSERVACIONES.

La FASE 66.0 queda cerrada como hardening tecnico pre-UAT exitoso. El proyecto compila, Prisma valida, las pruebas e2e disponibles pasan y no hay servidores locales activos en `3000` o `3001`. Las observaciones pendientes son de confirmacion operativa y deuda menor, no de bloqueo tecnico inmediato.
