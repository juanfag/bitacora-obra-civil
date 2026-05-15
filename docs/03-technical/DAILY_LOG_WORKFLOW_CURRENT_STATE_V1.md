# DAILY_LOG_WORKFLOW_CURRENT_STATE_V1

## Objective

Consolidate the current implemented DailyLog workflow behavior in the existing NestJS backend.

This document is descriptive only. It does not introduce schema changes, endpoint changes, test changes, or workflow behavior changes.

## Current DailyLog Statuses

The current workflow uses these `DailyLogStatus` values:

| Status | Current meaning |
|---|---|
| `DRAFT` | Editable DailyLog. Events and attachments can be created, updated, or deleted. |
| `IN_REVIEW` | Submitted for review. Temporarily equivalent to future `PENDING_APPROVAL`. |
| `APPROVED` | Approved and eligible for closure. |
| `REJECTED` | Rejected by reviewer. Not editable directly. Must be returned to `DRAFT` before corrections. |
| `CLOSED` | Final closed state. DailyLog, events, and attachments are immutable. |
| `VOIDED` | Cancelled/voided DailyLog. Temporarily equivalent to future `CANCELLED`. |

The Prisma enum contains additional technical values, but the current workflow behavior is centered on the states above.

## Allowed Transitions

| Endpoint | From | To | Notes |
|---|---|---|---|
| `POST /api/v1/daily-logs/{id}/submit` | `DRAFT` | `IN_REVIEW` | Preferred submit endpoint. |
| `POST /api/v1/daily-logs/{id}/submit-review` | `DRAFT` | `IN_REVIEW` | Legacy alias for submit. |
| `POST /api/v1/daily-logs/{id}/approve` | `IN_REVIEW` | `APPROVED` | Records approval, status history, and audit. |
| `POST /api/v1/daily-logs/{id}/reject` | `IN_REVIEW` | `REJECTED` | Requires rejection comment. Records history and audit. |
| `POST /api/v1/daily-logs/{id}/return-to-draft` | `REJECTED` | `DRAFT` | Recovery path for corrections and resubmission. |
| `POST /api/v1/daily-logs/{id}/close` | `APPROVED` | `CLOSED` | Sets `closedAt`. Records history and audit. |
| `POST /api/v1/daily-logs/{id}/cancel` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `VOIDED` | Current cancellation path. Not allowed from `CLOSED`. |
| `DELETE /api/v1/daily-logs/{id}` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `VOIDED` | Legacy cancellation path. |

## Forbidden Transitions

Invalid workflow transitions return `409 Conflict` with a clear transition message.

| Attempt | Result |
|---|---|
| `DRAFT -> APPROVED` | Blocked. Must submit first. |
| `DRAFT -> CLOSED` | Blocked. Must submit and approve first. |
| `IN_REVIEW -> IN_REVIEW` | Blocked as duplicate submit. |
| `APPROVED -> IN_REVIEW` | Blocked. |
| `REJECTED -> IN_REVIEW` | Blocked. Must use `return-to-draft`, then submit again. |
| `DRAFT -> DRAFT` through `return-to-draft` | Blocked. Only `REJECTED` can return to `DRAFT`. |
| `CLOSED -> VOIDED` | Blocked. Closed DailyLogs cannot be cancelled through current workflow. |
| `CLOSED -> any edit` | Blocked. |

## Editable And Non-Editable States

Current editable status rule:

```text
Only DRAFT is editable.
```

| Status | Editable? |
|---|---|
| `DRAFT` | Yes |
| `IN_REVIEW` | No |
| `APPROVED` | No |
| `REJECTED` | No, until `return-to-draft` is executed |
| `CLOSED` | No |
| `VOIDED` | No |

The rule is centralized through `isEditableStatus()` and currently returns true only for `DRAFT`.

## DailyLogEvent Rules

DailyLogEvent records are tied to a parent DailyLog.

Current rules:

- DailyLogEvent can be created only when the parent DailyLog is editable.
- DailyLogEvent can be updated only when the parent DailyLog is editable.
- DailyLogEvent can be soft-deleted only when the parent DailyLog is editable.
- Current editable parent status is `DRAFT`.
- Attempts to create, update, or delete events outside editable status return `409 Conflict`.
- `reportedById` is taken from the authenticated user, not from request body.

The legacy `Events` module follows the same editable-status constraint for consistency.

## Attachment Rules

Attachments are related to `DailyLogEvent`.

Current rules:

- Attachment upload requires an existing active `DailyLogEvent`.
- Attachment upload is allowed only when the parent DailyLog is editable.
- Attachment delete validates the attachment, DailyLogEvent, DailyLog, and project access.
- Attachment delete is allowed only when the parent DailyLog is `DRAFT`.
- Upload or delete attempts outside editable state return `409 Conflict`.
- `uploadedById` is taken from the authenticated user, not from request body.
- Physical file deletion is attempted after the database record is soft-deleted.

## Duplicate DailyLog Rule

DailyLog creation enforces one DailyLog per project and work date.

Current behavior:

```text
If a DailyLog already exists for the same projectId + logDate,
the API returns 409 Conflict.
```

Expected message:

```text
A daily log already exists for this project and date.
```

## Previous Required Working Day Rule

DailyLog creation validates sequence by project.

Current behavior:

```text
Before creating a DailyLog for project P on date D:
1. Resolve the previous required work day.
2. If a DailyLog exists for that previous required work day, it must be CLOSED.
3. If no DailyLog exists for that previous required work day but the project already has any DailyLog, creation is blocked.
4. If the project has no DailyLogs, creation is allowed as the first DailyLog.
```

Blocking cases return `409 Conflict`.

Typical messages:

```text
Previous required work day daily log must be CLOSED before creating a new daily log.
```

```text
Previous required work day daily log must exist and be CLOSED before creating a new daily log.
```

## Sunday Skip Temporary Behavior

The current previous-day calculation treats Sunday as a non-working day.

Current temporary behavior:

- Monday checks Saturday as the previous required work day.
- Tuesday through Saturday check the previous calendar day.
- Sunday is skipped.

This is temporary technical debt. It must be replaced by a proper working calendar model that supports project working days, holidays, justified no-work days, and suspension days.

See `docs/03-technical/WORKING_CALENDAR_FOUNDATION_V1.md`.

## Reject Recovery Behavior

Rejected DailyLogs are not directly editable.

Recovery path:

```text
REJECTED -> DRAFT
```

Endpoint:

```text
POST /api/v1/daily-logs/{id}/return-to-draft
```

After returning to `DRAFT`:

- DailyLogEvent records can be edited again.
- Attachments can be uploaded again.
- The DailyLog can be submitted again through `submit`.

If `return-to-draft` is called from any status other than `REJECTED`, the API returns `409 Conflict`.

## Legacy Endpoint Notes

| Endpoint | Current status | Recommendation |
|---|---|---|
| `POST /api/v1/daily-logs/{id}/submit-review` | Legacy alias | Keep while clients migrate to `submit`. |
| `DELETE /api/v1/daily-logs/{id}` | Legacy cancellation alias | Keep while clients migrate to `cancel`. |

Legacy endpoints remain protected by JWT, RBAC, and project contextual access where applicable.

## Smoke Test Coverage Summary

The automated smoke baseline currently covers:

- health endpoint;
- login as demo admin;
- DailyLog creation;
- DailyLogEvent creation while editable;
- duplicate DailyLog creation returns `409`;
- previous required work day not `CLOSED` returns `409`;
- creation after previous required work day is `CLOSED`;
- Sunday skip behavior;
- submit, approve, and close happy path;
- invalid approve from `DRAFT`;
- invalid close from `DRAFT`;
- duplicate submit;
- event editing blocked after `CLOSED`;
- attachment upload blocked after `CLOSED`;
- reject then `return-to-draft`;
- invalid `return-to-draft` from non-`REJECTED`.

Smoke tests create isolated test projects to avoid depending on accumulated demo project DailyLog history.

## Known Technical Debt

- Sunday skip is hardcoded and not backed by a configurable calendar.
- Holidays are not represented.
- Project-specific working weeks are not represented.
- Justified no-work days are not represented.
- Suspension periods are not represented in DailyLog sequence validation.
- Future functional states `OPEN`, `PENDING_APPROVAL`, `REOPENED`, and `CANCELLED` are not migrated into the Prisma enum yet.
- `IN_REVIEW` temporarily maps to future `PENDING_APPROVAL`.
- `VOIDED` temporarily maps to future `CANCELLED`.
- `submit-review` and `DELETE /daily-logs/{id}` remain as legacy compatibility paths.
- Calendar decisions are not yet auditable as first-class records.
