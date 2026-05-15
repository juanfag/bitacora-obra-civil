# PROJECT_FOLDER_STRUCTURE_STANDARD_V1

## Proyecto

Bitácora diaria de Obra Civil

## Ubicación recomendada del archivo

```text
C:\DEV\Bitacora de Obra\Documentation proyecto\02-architecture\PROJECT_FOLDER_STRUCTURE_STANDARD_V1.md
```

---

# 1. Objetivo

Definir la estructura oficial de carpetas para el proyecto Bitácora diaria de Obra Civil.

Este documento servirá para:

- mantener orden,
- facilitar navegación,
- soportar escalabilidad,
- organizar documentación,
- organizar código fuente,
- evitar dispersión de artefactos.

---

# 2. Principios

## 2.1 Separación clara

Separar:

- documentación,
- backend,
- frontend,
- infraestructura,
- diagramas,
- prompts IA.

---

## 2.2 Escalabilidad

La estructura debe soportar crecimiento futuro.

---

## 2.3 Convención consistente

Todos los equipos deben respetar la misma organización.

---

# 3. Estructura documentación oficial

```text
Documentation proyecto/
```

---

# 4. Carpetas principales documentación

```text
01-functional
02-architecture
03-devops
04-api
05-roadmap
06-codex
07-presentations
08-diagrams
```

---

# 5. Objetivo carpetas documentación

| Carpeta | Objetivo |
|---|---|
| 01-functional | Reglas negocio y funcionalidad |
| 02-architecture | Arquitectura técnica |
| 03-devops | Infraestructura y despliegue |
| 04-api | Estándares APIs |
| 05-roadmap | Planeación y MVP |
| 06-codex | Prompts IA y sesiones |
| 07-presentations | Presentaciones cliente |
| 08-diagrams | Diagramas Mermaid/PlantUML |

---

# 6. Subestructura 02-architecture

```text
02-architecture/
  backend/
  frontend/
  security/
  integrations/
  erd/
  decisions/
```

---

# 7. Subestructura 06-codex

```text
06-codex/
  conventions/
  prompts/
  sesiones/
```

---

# 8. Estructura repositorio desarrollo

## Recomendación

```text
bitacora-obra/
```

---

# 9. Estructura backend recomendada

```text
backend/
  src/
    modules/
    common/
    config/
    prisma/
    tests/
```

---

# 10. Estructura módulos backend

```text
module/
  controllers/
  services/
  workflow/
  dto/
  validators/
  guards/
  policies/
  repositories/
  interfaces/
  constants/
```

---

# 11. Estructura frontend recomendada

```text
frontend/
  src/
    app/
    modules/
    components/
    services/
    hooks/
    types/
```

---

# 12. Estructura frontend módulos

```text
daily-log/
  components/
  pages/
  hooks/
  services/
  validators/
  types/
```

---

# 13. Estructura diagrams

```text
08-diagrams/
  workflow/
  erd/
  architecture/
  infrastructure/
```

---

# 14. Estructura DevOps

```text
03-devops/
  docker/
  nginx/
  scripts/
  deployments/
```

---

# 15. Estructura uploads local temporal

## Recomendación

```text
temp/uploads/
```

---

## Importante

NO almacenar archivos permanentes localmente.

---

# 16. Estructura templates PDF

```text
backend/src/templates/pdf/
```

---

# 17. Estructura logs

```text
logs/
  backend/
  nginx/
```

---

# 18. Convenciones nombres archivos

## Documentación

Formato:

```text
UPPERCASE_WITH_UNDERSCORES_V1.md
```

---

## Código fuente

Formato estándar framework/language.

---

# 19. Convenciones versiones documentos

## Formato recomendado

```text
_V1
_V2
_V3
```

---

# 20. Riesgos si no existe estándar

- documentación perdida,
- artefactos mezclados,
- difícil mantenimiento,
- deuda técnica,
- caos organizacional.

---

# 21. Recomendación V1

Mantener esta estructura desde el inicio del proyecto y evitar reorganizaciones masivas posteriores.
