# DAILY_LOG_STATUS_TRANSITIONS_V1

## Objective

Document the current DailyLog status model, the temporary functional equivalences, and the hardened transition rules used by the existing backend.

This document is intentionally incremental. It does not require replacing `schema.prisma` or renaming enum values yet.

## Current Technical States

The current Prisma enum includes several technical states. The DailyLog workflow currently uses:

| State | Current meaning |
|---|---|
| `DRAFT` | Daily log is editable. Events and attachments can be created or modified. |
| `IN_REVIEW` | Daily log was submitted for review. Temporarily equivalent to pending approval. |
| `APPROVED` | Daily log was approved and can be closed. |
| `REJECTED` | Daily log was rejected. It remains a workflow state, but it is not editable in the hardened V1 rules. |
| `CLOSED` | Daily log is closed and immutable. |
| `VOIDED` | Daily log is cancelled/voided. Temporarily equivalent to cancelled. |

## Future Functional States

Target functional states for a later migration:

| Future state | Intended meaning |
|---|---|
| `DRAFT` | Initial draft before operational opening. |
| `OPEN` | Daily log is open for events and attachments. |
| `PENDING_APPROVAL` | Submitted and awaiting approval. |
| `APPROVED` | Approved and ready for closure/PDF. |
| `REOPENED` | Reopened through controlled exception. |
| `CLOSED` | Officially closed and immutable. |
| `CANCELLED` | Administratively cancelled. |

## Temporary Equivalences

| Current technical state | Temporary functional equivalent |
|---|---|
| `IN_REVIEW` | `PENDING_APPROVAL` |
| `VOIDED` | `CANCELLED` |

No current state safely represents `OPEN` or `REOPENED`.

## Editable State Rule

Current hardened V1 rule:

```text
Only DRAFT is editable.
```

This applies to:

- DailyLog update.
- DailyLogEvent create/update/delete.
- legacy Event create/update/delete.
- Attachment upload.
- Attachment delete.

## Allowed Transitions

| Endpoint | From | To | Notes |
|---|---|---|---|
| `POST /api/v1/daily-logs/{id}/submit` | `DRAFT` | `IN_REVIEW` | Preferred endpoint. |
| `POST /api/v1/daily-logs/{id}/submit-review` | `DRAFT` | `IN_REVIEW` | Legacy alias. |
| `POST /api/v1/daily-logs/{id}/approve` | `IN_REVIEW` | `APPROVED` | Creates approval record and audit entry. |
| `POST /api/v1/daily-logs/{id}/reject` | `IN_REVIEW` | `REJECTED` | Requires comment payload. |
| `POST /api/v1/daily-logs/{id}/return-to-draft` | `REJECTED` | `DRAFT` | Allows correction and resubmission after rejection. |
| `POST /api/v1/daily-logs/{id}/close` | `APPROVED` | `CLOSED` | Sets `closedAt`. |
| `POST /api/v1/daily-logs/{id}/cancel` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `VOIDED` | Not allowed from `CLOSED`. |
| `DELETE /api/v1/daily-logs/{id}` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `VOIDED` | Legacy cancellation path. |

## Blocked Transitions

| Attempt | Expected result |
|---|---|
| `DRAFT -> APPROVED` | 400 invalid transition. |
| `DRAFT -> CLOSED` | 400 invalid transition. |
| `IN_REVIEW -> IN_REVIEW` | 400 invalid transition. |
| `REJECTED -> IN_REVIEW` | 400 invalid transition; must use `return-to-draft` first. |
| `DRAFT -> DRAFT` via `return-to-draft` | 409 conflict. |
| `CLOSED -> VOIDED` | 400 invalid transition. |
| `CLOSED -> any edit` | 400/409 depending endpoint. |

## Legacy Endpoints

| Endpoint | Status | Recommendation |
|---|---|---|
| `POST /api/v1/daily-logs/{id}/submit-review` | Legacy alias | Keep until clients migrate to `submit`. |
| `DELETE /api/v1/daily-logs/{id}` | Legacy cancellation path | Keep until clients migrate to `cancel`. |

## Current Audit and History

Each successful workflow transition records:

- `DailyLogStatusHistory`.
- `AuditLog` with `entityName = DailyLog`.
- `AuditLog.oldValue.status`.
- `AuditLog.newValue.status`.
- `AuditLog.newValue.workflowAction`.

## Future Migration Recommendation

Recommended migration path:

1. Add official enum values only after all clients are ready.
2. Introduce `OPEN` as the editable operational state.
3. Replace current `IN_REVIEW` writes with `PENDING_APPROVAL`.
4. Replace current `VOIDED` writes with `CANCELLED`.
5. Add explicit `REOPENED` endpoint and transition policy.
6. Decide whether `return-to-draft` remains as-is or maps to a future `REOPENED -> OPEN` style flow.
7. Deprecate `submit-review` and `DELETE /daily-logs/{id}` after client migration.
8. Update `isEditableStatus()` to use `OPEN` when the migration lands.

## Risk Notes

- `REJECTED` is not directly editable; use `return-to-draft` to re-enable corrections.
- There is no safe temporary mapping for `OPEN`.
- There is no safe temporary mapping for `REOPENED`.
- `cancel` still writes `VOIDED` until a controlled enum migration exists.
