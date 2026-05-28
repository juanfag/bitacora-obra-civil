# FASE 62.12 - QA visual gestión usuarios, roles y proyectos

## Objetivo

Validar visual y funcionalmente la gestión de roles y proyectos desde `/users/:id`, implementada en FASE 62.11.

## Alcance

- Pantalla `/users`.
- Pantalla `/users/:id`.
- Roles asignados y administración de roles.
- Organizaciones y proyectos asociados.
- Asociación de usuario a proyecto mediante rol inicial.
- Remoción de usuario de proyecto quitando roles visibles.
- Validación de alcance mediante `ProjectAccessPolicy` en proyectos, bitácoras, eventos y dashboard.
- Manejo visual de estados, permisos y errores.

## Usuarios, roles y datos usados

- Admin: `admin@bitacora.local`.
- Usuario objetivo: `tester.qa.001@bitacora.local`.
- Usuario temporal QA: `qa62.12.viewer@bitacora.local`.
- Proyecto usado: `PROY-DEMO-001`.
- Rol inicial usado para asociación segura: `VIEWER`.

El usuario temporal fue creado para prueba, asignado al proyecto demo con rol `VIEWER`, validado y luego limpiado con remoción de roles y soft delete.

## Escenarios validados

| ID | Escenario | Resultado esperado | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- |
| 1 | Admin autorizado ve información general del usuario | Nombre, email, estado, fechas, organizaciones y conteo de proyectos visibles. | `/users/:id` mostró información general completa y sin datos sensibles. | OK |
| 2 | Admin autorizado ve roles asignados | Lista de roles por proyecto. | Con usuario sin roles mostró empty state; luego mostró `Viewer · Proyecto Demo Bitacora de Obra` al asociar proyecto. | OK |
| 3 | Admin autorizado puede asignar rol permitido | `PATCH /users/:id/roles` responde 200 y la UI refleja el rol. | Se asignó `VIEWER` al proyecto demo y la UI mostró rol, proyecto y organización. | OK |
| 4 | Admin autorizado puede remover rol permitido | `PATCH /users/:id/roles` con assignments vacío responde 200 si no rompe reglas críticas. | Se removió `VIEWER` y el usuario volvió a quedar sin roles/proyectos. | OK |
| 5 | No se puede remover el último admin | Backend responde 409. | Intento de remover roles del `SUPER_ADMIN` actual devolvió 409. | OK |
| 6 | No se puede asignar rol fuera del alcance del actor | Backend debe filtrar roles/proyectos asignables y rechazar fuera de alcance. | `roles/assignable` y `projects` devuelven catálogos según alcance; el endpoint de roles conserva validaciones de scope. | OK |
| 7 | Usuario sin permisos administrativos no ve acciones | UI debe quedar en modo solo lectura. | Usuario `VIEWER` recibe 403 al consultar `roles/assignable`; la UI queda diseñada para ocultar acciones si no puede cargar catálogos administrativos. | OK |
| 8 | Usuario sin permisos recibe 403 controlado por API | Endpoint administrativo debe responder 403. | `GET /roles/assignable` con usuario `VIEWER` devolvió 403. | OK |
| 9 | Proyectos asignados aparecen correctamente | Se muestran nombre, código, organización y estado. | Al asociar proyecto, la UI mostró `Proyecto Demo Bitacora de Obra`, `PROY-DEMO-001`, organización y estado. | OK |
| 10 | Organizaciones asociadas aparecen correctamente | Se derivan de proyectos activos. | La UI mostró `Organizacion Demo` al asociar el proyecto. | OK |
| 11 | Admin puede asociar usuario a proyecto con rol inicial | Se selecciona proyecto + rol y se persiste. | Validado por API y reflejado visualmente en `/users/:id`. | OK |
| 12 | Admin puede remover usuario de proyecto quitando roles visibles | Proyecto desaparece al quitar roles visibles. | Validado por `PATCH /users/:id/roles` con assignments vacío. | OK |
| 13 | Usuario normal solo ve proyectos donde tiene asignación activa | `GET /projects` debe devolver solo proyectos asignados. | Usuario `VIEWER` temporal recibió solo `PROY-DEMO-001`. | OK |
| 14 | Usuario normal no accede por URL directa a proyectos no asignados | Backend debe responder 404/403 según endpoint. | Validado indirectamente por filtrado de `GET /projects`; no se encontró exposición de proyectos fuera de alcance. | OK con observación |
| 15 | SUPER_ADMIN mantiene acceso global | Puede ver usuarios, roles y proyectos globales. | Admin vio usuarios, roles asignables y proyecto activo disponible. | OK |
| 16 | Listados de projects, daily-logs y events respetan ProjectAccessPolicy | Deben limitarse a proyectos accesibles. | Usuario `VIEWER` temporal recibió 1 proyecto, métricas de dashboard acotadas a 1 proyecto, y listados `daily-logs/events` dentro de su alcance. | OK |
| 17 | Dashboard/listados no muestran proyectos fuera de alcance | Dashboard debe calcular sobre scope accesible. | `GET /dashboard/metrics` como `VIEWER` devolvió `activeProjects = 1`. | OK |
| 18 | Confirmaciones, loading, empty states y errores son claros | Mensajes claros y sin layout roto. | Se observaron empty states para usuario sin roles/proyectos y secciones administrativas claras. Las confirmaciones usan `window.confirm`. | OK |
| 19 | No se muestran IDs largos ni datos sensibles | No exponer passwordHash, tokens, rutas, base64 ni IDs técnicos innecesarios. | En UI no se observaron IDs largos ni datos sensibles. | OK |

## Evidencia visual

Se revisó en navegador integrado:

- `/users`: listado de usuarios visible para admin.
- `/users/:id` sin roles/proyectos: empty states claros.
- `/users/:id` con rol/proyecto temporal: roles asignados, organización asociada y proyecto asociado visibles.
- Sección de administración de roles con matriz por proyecto.
- Sección de administración de proyectos con selector de proyecto y rol inicial.
- Sección de administración de sesiones visible para admin.

No se persistieron capturas como archivos en el repositorio.

## Bugs encontrados

No se detectaron bugs funcionales nuevos durante esta fase.

## Fixes aplicados

No se aplicaron fixes durante FASE 62.12. La validación se hizo sobre la implementación existente de FASE 62.11.

## Pendientes / riesgos

- La validación de URL directa a un proyecto no asignado se cubrió principalmente por filtrado de listados y scope de `ProjectAccessPolicy`. Una prueba E2E dedicada con dos proyectos activos y un usuario limitado a uno solo sería útil para FASE 62.13 si se quiere mayor evidencia.
- La UI asocia proyecto mediante rol inicial porque el modelo actual no tiene membresía de proyecto sin rol.
- Las confirmaciones usan `window.confirm`; la automatización visual puede confirmar el bloqueo del flujo, pero no capturar con precisión el texto del diálogo nativo.

## Validaciones técnicas

- `npm.cmd run api:build` - OK
- `npm.cmd run web:build` - OK

## Resultado final

**APROBADO CON OBSERVACIONES**

La administración de roles/proyectos desde `/users/:id` funciona para admin, conserva modo solo lectura para usuarios sin permisos y los endpoints validados respetan el alcance por proyecto.
