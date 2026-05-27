# FASE 59.2 - Fix estados documentales en PDF

## Objetivo

Corregir el bloque de control documental del PDF diario para que no muestre estados o acciones que no ocurrieron realmente en el flujo de la bitacora.

## Archivo modificado

- `apps/api/src/daily-logs/daily-log-pdf.service.ts`

## Causa encontrada

El resumen de workflow para `Rechazado` usaba `dailyLog.reviewedAt` y `dailyLog.reviewedBy` aunque no existiera una transicion real a `REJECTED`.

En el flujo actual, `reviewedAt` tambien se asigna cuando una bitacora es aprobada. Por eso un PDF de una bitacora aprobada/cerrada podia mostrar informacion en la fila `Rechazado` aunque la bitacora nunca hubiera sido rechazada.

## Cambios realizados

- `Rechazado` ahora se alimenta solo desde una transicion real en `statusHistory` con `toStatus = REJECTED`.
- `Anulado / cancelado` ya se alimentaba solo desde transiciones reales a `VOIDED` o `CANCELLED`; se mantiene ese comportamiento.
- Cuando una accion documental no ocurrio, se muestra `No aplicado`.
- Se evita usar timestamps globales compartidos, como `reviewedAt`, para inferir estados que no ocurrieron.

## Compatibilidad

- Compatible con bitacoras existentes.
- Si una bitacora historica no tiene transicion real a `REJECTED`, no se mostrara como rechazada.
- Si una bitacora historica si tiene transicion real a `REJECTED`, se mostrara usuario, fecha y comentario si existen.

## Restricciones respetadas

- No se modifico Prisma.
- No se crearon migraciones.
- No se alteraron contratos API.
- No se modifico workflow.
- No se modifico frontend.

## Validaciones ejecutadas

```powershell
npm.cmd run api:build
```

Resultado: OK.
