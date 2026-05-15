# DAILY_LOG_SECURITY_ARCHITECTURE_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\security\DAILY_LOG_SECURITY_ARCHITECTURE_V1.md
```

---

# 1. Objetivo

Definir la arquitectura de seguridad inicial para la plataforma Bitácora diaria de Obra Civil.

Este documento servirá como base para:

- autenticación,
- autorización,
- protección APIs,
- seguridad documental,
- protección workflow,
- auditoría,
- hardening inicial.

---

# 2. Principios de seguridad

## 2.1 Backend como autoridad

Toda validación crítica debe ejecutarse en backend.

---

## 2.2 Mínimo privilegio

Cada usuario solo debe acceder a lo estrictamente necesario.

---

## 2.3 Trazabilidad obligatoria

Toda acción crítica debe quedar auditada.

---

## 2.4 Seguridad por capas

La seguridad debe existir en:

- frontend,
- backend,
- storage,
- base datos,
- workflow,
- APIs.

---

# 3. Arquitectura general

```text
Frontend
  ↓
JWT Authentication
  ↓
NestJS Guards
  ↓
Policies
  ↓
Workflow Validation
  ↓
Database + Audit
```

---

# 4. Autenticación

## Estrategia recomendada

```text
JWT Bearer Token
```

---

## Componentes

| Componente | Uso |
|---|---|
| Access Token | Requests API |
| Refresh Token | Renovación sesión |
| Password Hash | BCrypt |

---

# 5. Flujo autenticación

```text
Login
  ↓
JWT generado
  ↓
Frontend almacena token
  ↓
Requests autenticados
```

---

# 6. Roles iniciales

| Rol | Objetivo |
|---|---|
| ADMIN_SYSTEM | Administración global |
| ADMIN_PROJECT | Administración proyecto |
| DIRECTOR | Aprobación workflow |
| RESIDENT_ENGINEER | Operación obra |
| INSPECTOR | Registro operativo |
| VIEWER | Solo lectura |
| AUDITOR | Consulta auditoría |

---

# 7. Estrategia autorización

## Recomendación

Combinar:

- RBAC,
- permisos workflow,
- validación pertenencia proyecto.

---

# 8. Guards sugeridos

| Guard | Objetivo |
|---|---|
| JwtAuthGuard | Usuario autenticado |
| RolesGuard | Validación rol |
| ProjectMembershipGuard | Usuario pertenece proyecto |
| WorkflowPermissionGuard | Acción workflow válida |
| DailyLogStatusGuard | Estado válido |

---

# 9. Seguridad workflow

## Obligatorio

Validar:

- transición válida,
- rol válido,
- estado válido,
- permisos proyecto.

---

## Nunca permitir

```text
Cambio directo de status desde frontend
```

---

# 10. Seguridad APIs

## Headers obligatorios

| Header | Uso |
|---|---|
| Authorization | JWT |
| X-Request-Id | Correlation ID |

---

## Rate limiting recomendado

Aplicar en:

- login,
- uploads,
- generación PDFs.

---

# 11. Seguridad passwords

## Recomendación

- BCrypt.
- Salt rounds >= 10.
- Nunca almacenar plaintext.

---

# 12. Seguridad archivos

## Validaciones obligatorias

- MIME type,
- extensión,
- tamaño,
- autenticación,
- autorización.

---

## Nunca permitir

- ejecución archivos,
- URLs públicas permanentes.

---

# 13. Seguridad PDFs

PDFs oficiales deben:

- ser inmutables,
- auditarse,
- proteger acceso.

---

# 14. Auditoría seguridad

Registrar:

- login,
- errores auth,
- cambios workflow,
- reaperturas,
- descargas PDF.

---

# 15. Estrategia sesiones

## Recomendación V1

JWT stateless.

---

## Futuro

Opcional:

- revocación tokens,
- multi-device management,
- session tracking.

---

# 16. Seguridad frontend

## Recomendaciones

- proteger rutas,
- ocultar acciones no autorizadas,
- logout automático,
- manejo expiración token.

---

# 17. Seguridad base datos

## Recomendaciones

- UUIDs,
- soft delete,
- índices adecuados,
- backups automáticos.

---

# 18. Seguridad infraestructura

## Recomendaciones mínimas

- HTTPS obligatorio,
- variables entorno,
- secretos fuera código,
- backups.

---

# 19. Variables sensibles

Nunca exponer:

- JWT secrets,
- DB passwords,
- API keys,
- Google credentials.

---

# 20. Estrategia logs

Logs deben registrar:

- requestId,
- usuario,
- endpoint,
- resultado,
- errores críticos.

---

# 21. Riesgos principales

| Riesgo | Impacto |
|---|---|
| Cambio workflow indebido | Alto |
| Modificación bitácoras cerradas | Alto |
| Fuga documentos | Alto |
| PDFs alterados | Alto |
| Permisos incorrectos | Alto |

---

# 22. Recomendación V1

Implementar desde inicio:

- JWT,
- guards,
- RBAC,
- auditoría,
- validaciones uploads,
- HTTPS,
- requestId,
- workflow protegido.

Evitar inicialmente:

- OAuth complejo,
- SSO enterprise,
- MFA obligatorio,
- Zero Trust avanzado.
