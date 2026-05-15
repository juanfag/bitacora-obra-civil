# DEVOPS_DEPLOYMENT_STRATEGY_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\03-devops\DEVOPS_DEPLOYMENT_STRATEGY_V1.md
```

---

# 1. Objetivo

Definir la estrategia inicial DevOps y despliegue para la plataforma Bitácora diaria de Obra Civil.

Este documento servirá como base para:

- ambientes,
- despliegues,
- CI/CD,
- infraestructura,
- backups,
- observabilidad,
- seguridad operativa.

---

# 2. Objetivos DevOps

La estrategia debe permitir:

- despliegues controlados,
- ambientes separados,
- rollback seguro,
- monitoreo,
- trazabilidad,
- escalabilidad futura.

---

# 3. Ambientes recomendados

| Ambiente | Objetivo |
|---|---|
| local | Desarrollo |
| dev | Integración |
| qa | Validación funcional |
| prod | Producción |

---

# 4. Arquitectura inicial recomendada

```text
Frontend Next.js
Backend NestJS
PostgreSQL
Google Drive Storage
Reverse Proxy HTTPS
Cloud VM / Docker
```

---

# 5. Estrategia despliegue inicial

## Recomendación V1

Dockerized deployment.

---

## Componentes

| Servicio | Contenedor |
|---|---|
| frontend | nextjs-app |
| backend | nestjs-api |
| database | postgres |
| reverse proxy | nginx |

---

# 6. Docker Compose recomendado

## Servicios mínimos

```text
frontend
backend
postgres
nginx
```

---

# 7. Variables entorno

## Backend

```text
DATABASE_URL
JWT_SECRET
GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN
```

---

## Frontend

```text
NEXT_PUBLIC_API_URL
```

---

# 8. Gestión secretos

## Recomendación

Nunca almacenar:

- passwords,
- JWT secrets,
- API keys,
- credenciales Google,

dentro del repositorio Git.

---

# 9. Estrategia CI/CD

## Pipeline recomendado

```text
Git Push
  ↓
Lint
  ↓
Tests
  ↓
Build
  ↓
Docker Build
  ↓
Deploy
```

---

# 10. Herramientas sugeridas

| Herramienta | Uso |
|---|---|
| GitHub Actions | CI/CD |
| Docker | Containers |
| Nginx | Reverse proxy |
| PM2 opcional | Process management |
| Uptime Kuma | Monitoring |

---

# 11. Estrategia base datos

## PostgreSQL

Recomendaciones:

- backups diarios,
- migrations Prisma,
- acceso restringido,
- no exposición pública.

---

# 12. Estrategia backups

## Frecuencia recomendada

| Tipo | Frecuencia |
|---|---|
| Database | Diario |
| PDFs | Diario |
| Attachments | Diario |
| Configuración | Semanal |

---

# 13. Estrategia logs

## Recomendación

Logs centralizados para:

- backend,
- nginx,
- workflow,
- errores críticos.

---

## Metadata mínima

- requestId,
- timestamp,
- usuario,
- endpoint,
- errorCode.

---

# 14. Observabilidad

## Recomendación inicial

Implementar:

- uptime monitoring,
- error tracking,
- disk alerts,
- CPU/RAM alerts.

---

# 15. Seguridad infraestructura

## Recomendaciones mínimas

- HTTPS obligatorio,
- firewall,
- puertos mínimos expuestos,
- fail2ban opcional,
- acceso SSH restringido.

---

# 16. Estrategia HTTPS

## Recomendación

Usar:

```text
Let's Encrypt
```

---

# 17. Estrategia dominios

## Ejemplo

| Ambiente | Dominio |
|---|---|
| dev | dev.bitacoraobra.com |
| qa | qa.bitacoraobra.com |
| prod | app.bitacoraobra.com |

---

# 18. Estrategia uploads

## Importante

Los archivos NO deben almacenarse en contenedores.

Usar:

```text
Google Drive Storage
```

---

# 19. Estrategia PDFs

PDFs oficiales deben:

- persistirse externamente,
- tener backups,
- conservar hash SHA256.

---

# 20. Estrategia rollback

## Recomendación

Mantener:

- imágenes Docker versionadas,
- backups DB,
- tags release.

---

# 21. Riesgos principales

| Riesgo | Impacto |
|---|---|
| pérdida DB | Alto |
| pérdida PDFs | Alto |
| exposición secretos | Alto |
| downtime | Alto |
| deploy inconsistente | Alto |

---

# 22. Costos iniciales aproximados

| Servicio | Estimado |
|---|---|
| VPS Cloud | USD 20–60/mes |
| PostgreSQL Managed opcional | USD 15–50/mes |
| Dominio | USD 10–20/año |
| Backups | Variable |
| Google Workspace/Drive | Según uso |

---

# 23. Estrategia escalabilidad futura

## Futuro

- Kubernetes,
- S3 storage,
- CDN,
- autoscaling,
- observabilidad enterprise.

---

# 24. Recomendación V1

Implementar desde inicio:

- Docker,
- backups,
- HTTPS,
- CI/CD básico,
- logs estructurados,
- ambientes separados.

Evitar inicialmente:

- Kubernetes,
- microservicios,
- multi-region,
- alta disponibilidad compleja.
