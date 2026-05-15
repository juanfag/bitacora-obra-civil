# ERD V2 + Workflow Operacional
## Proyecto: Bitácora Digital de Obra Civil

Versión: V2.0
Fecha: 15/05/2026
Estado: Definición funcional y técnica

---

# 1. Objetivo

Definir el modelo operativo, entidades maestras, reglas de negocio, flujo de aprobación y estructura base del sistema “Bitácora Digital de Obra Civil”, considerando:

- Validez operativa
- Trazabilidad legal
- Auditoría
- Control documental
- Escalabilidad futura
- Operación multi proyecto
- Operación móvil
- Flujo formal de aprobación y cierre

---

# 2. Alcance MVP

## Incluido en MVP

### Core Operacional
- Multi proyecto
- Usuarios y roles
- Daily Logs
- Eventos
- Adjuntos
- Fotografías
- Firmas
- Workflow aprobación
- Cierre diario
- Bloqueo legal
- Auditoría
- PDF oficial
- Catálogos maestros
- Operación móvil responsive

---

## Excluido temporalmente

### Fase futura
- Offline real
- OCR documental
- IA documental
- Integración SAP
- Integración ERP
- Power BI avanzado
- Firma electrónica certificada
- WhatsApp
- Microsoft Teams
- Analytics avanzados
- Workflow BPM enterprise
- Versionamiento documental avanzado

---

# 3. Arquitectura Recomendada

## Backend

- NestJS
- PostgreSQL
- Prisma ORM
- JWT Authentication

## Frontend

- Next.js
- TailwindCSS
- shadcn/ui
- React Query

---

# 4. Arquitectura Modular Recomendada

```txt
apps/api
apps/web
packages/shared
```

---

# 5. Estructura Modular Backend

```txt
src/modules/

auth/
users/
organizations/
projects/
daily-logs/
daily-log-events/
attachments/
approvals/
signatures/
audit/
catalogs/
pdf/
notifications/
```

---

# 6. Reglas Operativas Globales

## Regla 1

No puede abrirse una nueva bitácora si existe una bitácora anterior pendiente de cierre para una fecha operativa obligatoria del proyecto.

---

## Regla 2

Una bitácora en estado CLOSED es completamente inmutable.

No se permiten:
- Ediciones
- Eliminaciones
- Nuevos adjuntos
- Nuevas firmas
- Cambios de estado

---

## Regla 3

Toda modificación antes del cierre debe generar:

- Auditoría
- Usuario responsable
- Timestamp
- Dirección IP
- Historial before/after

---

## Regla 4

Toda aprobación debe generar:

- Firma
- Registro de aprobación
- Snapshot PDF
- Hash documental

---

## Regla 5

No deben existir días operativos obligatorios sin bitácora cerrada.

---

# 7. Calendario Operativo

## Objetivo

Permitir manejo real de:

- Domingos
- Festivos
- Suspensiones
- Paros
- Eventos climáticos
- Restricciones operativas

---

# 8. Entidades Principales

## 8.1 Organization

Representa la empresa cliente.

### Campos

```txt
id
name
taxId
country
createdAt
updatedAt
```

---

## 8.2 Project

Representa cada obra.

### Campos

```txt
id
organizationId
name
code
location
startDate
estimatedEndDate
status
createdAt
updatedAt
```

### Relaciones

```txt
Organization 1 ── N Project
```

---

## 8.3 ProjectWorkingSchedule

Define días laborales estándar del proyecto.

### Campos

```txt
id
projectId
monday
tuesday
wednesday
thursday
friday
saturday
sunday
createdAt
updatedAt
```

---

## 8.4 ProjectNonWorkingDay

Justifica días sin bitácora obligatoria.

### Campos

```txt
id
projectId
date
reasonType
description
approvedById
createdById
createdAt
```

### Tipos sugeridos

```txt
HOLIDAY
NO_OPERATION
WEATHER_SUSPENSION
LEGAL_SUSPENSION
STRIKE
SPECIAL_PERMISSION
OTHER
```

---

## 8.5 User

### Campos

```txt
id
organizationId
name
email
passwordHash
status
createdAt
updatedAt
```

---

## 8.6 Role

### Campos

```txt
id
code
name
description
```

### Roles iniciales

```txt
ADMIN
PROJECT_COORDINATOR
CONSTRUCTION_DIRECTOR
RESIDENT
INTERVENTOR
CONSULTANT
SST
QUALITY
AUDITOR
```

---

## 8.7 ProjectMember

Relaciona usuarios con proyectos.

### Campos

```txt
id
projectId
userId
roleId
active
createdAt
```

---

# 9. Core de Bitácora

## 9.1 DailyLog

Representa la bitácora diaria.

### Campos

```txt
id
projectId
logDate
status
consecutiveNumber
createdById
submittedAt
approvedAt
closedAt
closedById
createdAt
updatedAt
```

### Estados

```txt
DRAFT
IN_REVIEW
REJECTED
APPROVED
CLOSED
CANCELLED
```

### Restricciones

```txt
projectId + logDate = único
```

---

## 9.2 DailyLogEvent

Representa eventos registrados.

### Campos

```txt
id
dailyLogId
eventTypeId
budgetChapterId
title
description
executionStatus
eventDateTime
locationText
latitude
longitude
isCritical
createdById
createdAt
updatedAt
```

### Estados de ejecución

```txt
APPROVED_FOR_PROGRESS
REJECTED
PENDING_CORRECTION
INFORMATIONAL
```

---

## 9.3 EventType

Catálogo de eventos.

### Campos

```txt
id
code
name
description
requiresPhoto
requiresDocument
requiresSignature
isCritical
active
```

### Eventos iniciales

```txt
WORK_PROGRESS
SUSPENSION
INCIDENT
ACCIDENT
WEATHER
INSPECTION
MATERIAL_DELIVERY
INTERVENTORY_VISIT
MACHINERY_MOVEMENT
TECHNICAL_OBSERVATION
OTHER
```

---

## 9.4 BudgetChapter

Catálogo de capítulos presupuestales.

### Campos

```txt
id
projectId
code
name
active
```

---

# 10. Adjuntos y Documentos

## 10.1 Attachment

### Campos

```txt
id
organizationId
projectId
dailyLogId
dailyLogEventId
originalName
fileName
mimeType
extension
size
storagePath
uploadedById
createdAt
```

### Reglas

- Un attachment puede asociarse a DailyLog o DailyLogEvent.
- No exponer rutas físicas directamente.
- Toda descarga debe pasar por validación de permisos.

---

# 11. Firmas y Aprobaciones

## 11.1 DailyLogApproval

### Campos

```txt
id
dailyLogId
approverId
roleCode
decision
comments
approvedAt
rejectedAt
createdAt
```

### Decisiones

```txt
APPROVED
REJECTED
REQUEST_CHANGES
```

---

## 11.2 Signature

### Campos

```txt
id
dailyLogId
dailyLogEventId
userId
signatureType
signatureImagePath
signedAt
ipAddress
userAgent
hash
```

### Tipos

```txt
EVENT_SIGNATURE
DAILY_LOG_CLOSURE
APPROVAL_SIGNATURE
```

---

# 12. PDF Oficial

## 12.1 DailyLogPdf

### Campos

```txt
id
dailyLogId
version
consecutiveNumber
storagePath
hash
generatedById
generatedAt
```

### Reglas

- El PDF oficial se genera al cerrar la bitácora.
- El PDF debe quedar congelado.
- El hash debe permitir validación documental futura.

---

# 13. Auditoría

## 13.1 AuditLog

### Campos

```txt
id
organizationId
projectId
entityName
entityId
action
beforeData
afterData
userId
ipAddress
userAgent
createdAt
```

### Acciones sugeridas

```txt
CREATE
UPDATE
DELETE
SUBMIT
APPROVE
REJECT
SIGN
CLOSE
GENERATE_PDF
UPLOAD_ATTACHMENT
```

---

# 14. Workflow Operacional V1

## Flujo Principal

```txt
1. Director o Coordinador crea DailyLog
2. Usuarios autorizados registran eventos
3. Eventos reciben adjuntos y firmas
4. Director revisa eventos
5. DailyLog pasa a IN_REVIEW
6. Director e Interventoría aprueban
7. Se generan firmas finales
8. Se genera PDF oficial
9. DailyLog pasa a CLOSED
10. La bitácora queda bloqueada
```

---

# 15. Validación Calendario Operativo

## Flujo de validación

```txt
1. Identificar fecha solicitada
2. Validar si es día operativo
3. Validar excepciones del calendario
4. Buscar último día operativo obligatorio
5. Validar que esté CLOSED
6. Permitir o bloquear creación
```

---

# 16. Casos Operativos

## Caso válido

```txt
Viernes: CLOSED
Sábado: NO_OPERATION
Domingo: No operativo
Lunes: Puede abrir
```

---

## Caso inválido

```txt
Martes: DRAFT
Miércoles: intenta abrir
Resultado: bloqueado
```

---

# 17. Recomendaciones Técnicas

## MVP

Implementar inicialmente:

- PWA responsive
- subida diferida de fotos
- tolerancia a mala conectividad
- almacenamiento desacoplado
- auditoría obligatoria
- PDF legal

---

## No implementar todavía

- Offline real
- OCR
- IA documental
- SAP integration
- Power BI avanzado
- Firma certificada
- BPM avanzado

---

# 18. Próximos Pasos

1. Ajustar Prisma Schema V2
2. Construir catálogos maestros
3. Implementar workflow DailyLog
4. Implementar auditoría
5. Implementar firmas
6. Implementar PDF oficial
7. Construir endpoints NestJS
8. Construir frontend operativo

---

# 19. Conclusión

La plataforma deja de ser una aplicación simple de registro operativo y pasa a convertirse en una solución de trazabilidad legal, técnica y documental para proyectos de obra civil.

El enfoque MVP debe priorizar:

- estabilidad operativa
- validez documental
- auditoría
- control legal
- facilidad de uso en campo

antes de incorporar funcionalidades avanzadas como IA, OCR o integraciones enterprise.

