# FASE 61.3 - QA visual y seguridad usuarios solo lectura

## Objetivo

Validar que el modulo de usuarios en modo solo lectura funcione correctamente y no exponga datos sensibles.

## Ambiente usado

- API local: `http://localhost:3001/api/v1`
- Web local: `http://localhost:3000`
- Usuario autorizado: `admin@bitacora.local`
- Fecha de validacion: 2026-05-27

## Comandos ejecutados

```powershell
npm.cmd run web:build
npm.cmd run api:build
```

Resultado:

- `web:build`: OK
- `api:build`: OK

## Validaciones HTTP

### GET /api/v1/users

Resultado: OK

- Status con usuario autorizado: `200`
- Total observado: `2`
- Items observados: `2`
- No se detectaron cadenas sensibles en la respuesta serializada.

### GET /api/v1/users/:id

Resultado: OK

- Status con usuario autorizado: `200`
- Detalle observado para `Administrador Demo`.
- Incluye datos seguros: nombre, email, estado, roles, organizacion, proyectos, fechas.

### Busqueda por nombre/email

Resultado: OK

- Query validada: `search=admin`
- Status: `200`
- Resultado observado: `1` usuario.

### 401 sin token

Resultado: OK

- `GET /api/v1/users?page=1&limit=3` sin token retorno `401`.

### Usuario sin permiso

Resultado: OK

- Se valido un token firmado para un usuario sin permisos activos de lectura.
- Resultado observado: `403`.

## Validacion visual en navegador

### /users carga correctamente

Resultado: OK

Se observo:

- Titulo `Usuarios`.
- Texto de contexto de modo solo lectura.
- Filtro `Buscar usuario`.
- Botones `Buscar` y `Limpiar`.
- Listado con usuarios.
- Estado, roles, nombre, email, organizaciones, proyectos asociados y fechas.
- Paginacion visible.

### /users/[id] carga detalle correctamente

Resultado: OK

Se observo:

- Titulo `Detalle de usuario`.
- Nombre y email.
- Estado.
- Fechas de creacion y actualizacion.
- Organizaciones.
- Roles por proyecto.
- Proyectos asociados.

### Busqueda y estado vacio

Resultado: OK

Se busco `noexiste999`.

Resultado observado:

- `Sin usuarios para mostrar`
- `No hay usuarios que coincidan con los filtros aplicados.`

### Paginacion

Resultado: OK por render y estado actual.

- Se renderizan controles `Anterior` y `Siguiente`.
- Con el dataset actual hay una sola pagina, ambos controles aparecen deshabilitados.
- No se pudo validar cambio de pagina real porque solo existen 2 usuarios visibles.

### Loading state

Resultado: OK por implementacion y flujo observado.

- La pantalla tiene estado `Cargando usuarios`.
- En ambiente local la carga fue rapida, por lo que el estado es transitorio.

### Error state

Resultado: OK

Se detuvo la API local y se abrio `/users` con sesion activa.

Resultado observado:

- `No fue posible cargar los usuarios`
- `No fue posible cargar los usuarios.`

### 401 redirige a /login

Resultado: OK

Se cerro sesion y se intento abrir `/users`.

Resultado observado:

- URL final: `http://localhost:3000/login`

### Acciones no permitidas

Resultado: OK

No se observaron botones o acciones para:

- crear usuario
- editar usuario
- activar usuario
- desactivar usuario
- asignar roles

Solo existen acciones de navegacion:

- `Volver al dashboard`
- `Ver detalle`
- `Volver a usuarios`

## Seguridad visual

Resultado: OK

No se observaron como texto visible:

- `passwordHash`
- tokens
- secretos
- rutas internas
- hashes
- base64
- `data:image`
- `storagePath`
- `uploads/`

Nota: los enlaces de detalle usan `/users/:id` como ruta tecnica, pero el ID no se muestra como contenido visible al usuario.

## Layout y responsive

### Desktop

Resultado: OK

- Listado y detalle renderizan con cards limpias.
- Controles de busqueda y paginacion se ven alineados.
- No se observaron textos cortados en la validacion desktop.

### Responsive basico

Resultado: OK por CSS implementado.

- En `max-width: 720px`, filtros y cards se apilan.
- Los botones principales pasan a ancho completo cuando aplica.

## Evidencia

- Respuestas HTTP reales validadas.
- DOM renderizado real validado en navegador para `/users` y `/users/[id]`.
- Estado vacio, error, 401 y 403 validados.

## Hallazgos

- Sin bugs criticos.
- La paginacion no pudo probar cambio de pagina real por falta de volumen de datos en el ambiente.
- No se hicieron cambios de logica durante esta fase.

## Resultado final

FASE 61.3 validada correctamente.
