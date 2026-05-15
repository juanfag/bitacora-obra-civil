# DAILY_LOG_SMOKE_TESTS_V1

## Objective

Provide a reproducible manual smoke checklist for the current DailyLog workflow using the existing NestJS API and Swagger UI.

This document does not introduce an automated test framework. It validates the current backend behavior after the workflow hardening phases.

## Scope

Validate:

- create daily log
- submit
- approve
- close
- cancel
- create event
- edit event
- upload attachment
- blocking changes when DailyLog is not editable
- contextual project authorization

## Preconditions

- API is running locally.
- Swagger is available at `http://localhost:3000/swagger`.
- Database is migrated and seeded.
- JWT auth is enabled.
- The demo seed exists.
- Upload configuration allows `image/jpeg`, `image/png`, and `application/pdf`.

Recommended validation commands before manual testing:

```bash
npx.cmd prisma validate
npm run api:build
npm run api:dev
```

## Known Demo User

Use the seeded admin user:

```json
{
  "email": "admin@bitacora.local",
  "password": "Password123!"
}
```

Expected result:

- `accessToken` is returned.
- Use Swagger `Authorize` with `Bearer <accessToken>`.

## Demo Project

The seed creates a project with:

```text
code: PROY-DEMO-001
name: Proyecto Demo Bitacora de Obra
```

Get the concrete `projectId` from:

```http
GET /api/v1/projects
```

Expected:

- Response includes a project with code `PROY-DEMO-001`.
- Save its `id` as `<PROJECT_ID>`.

## Event Type

Get an event type from:

```http
GET /api/v1/event-types
```

Expected:

- Response includes catalog values such as `WORK_PROGRESS` / `Avance de obra`.
- Save one `id` as `<EVENT_TYPE_ID>`.

## Happy Path

### 1. Login

```http
POST /api/v1/auth/login
```

Payload:

```json
{
  "email": "admin@bitacora.local",
  "password": "Password123!"
}
```

Expected:

- HTTP 201.
- Response includes `accessToken`.

### 2. Create DailyLog

```http
POST /api/v1/daily-logs
```

Payload:

```json
{
  "projectId": "<PROJECT_ID>",
  "logDate": "2026-05-15",
  "comments": "Smoke test daily log"
}
```

Expected:

- HTTP 201.
- Response status is `DRAFT`.
- Save `id` as `<DAILY_LOG_ID>`.

Important:

- If `status` is sent in the payload, backend still forces `DRAFT`.

### 3. Create DailyLogEvent

```http
POST /api/v1/daily-log-events
```

Payload:

```json
{
  "dailyLogId": "<DAILY_LOG_ID>",
  "eventTypeId": "<EVENT_TYPE_ID>",
  "activity": "Smoke test activity",
  "executionDescription": "Initial activity created while DailyLog is editable.",
  "reportedAt": "2026-05-15T15:30:00.000Z"
}
```

Expected:

- HTTP 201.
- Response includes `dailyLogId`.
- Response includes `reportedById`.
- Save `id` as `<DAILY_LOG_EVENT_ID>`.

### 4. Edit DailyLogEvent

```http
PATCH /api/v1/daily-log-events/{DAILY_LOG_EVENT_ID}
```

Payload:

```json
{
  "activity": "Smoke test activity updated",
  "executionDescription": "Updated while DailyLog is still editable."
}
```

Expected:

- HTTP 200.
- Updated fields are returned.

### 5. Upload Attachment

```http
POST /api/v1/attachments/upload
```

Swagger form-data:

```text
dailyLogEventId: <DAILY_LOG_EVENT_ID>
file: smoke.pdf
```

Expected:

- HTTP 201.
- Response includes `dailyLogEventId`.
- Response includes file metadata.
- Save `id` as `<ATTACHMENT_ID>`.

### 5.1 Delete Attachment While DRAFT

Create a second attachment while the DailyLog is still `DRAFT`, then call:

```http
DELETE /api/v1/attachments/{ATTACHMENT_ID}
```

Expected:

- HTTP 200.
- Response status is `DELETED`.
- `deletedById` is set.
- The local file is removed after the DB soft delete succeeds.

### 6. Submit DailyLog

Preferred endpoint:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/submit
```

Legacy alias:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/submit-review
```

Expected:

- HTTP 201 or 200 depending Nest response handling.
- Response status is `IN_REVIEW`.
- `DailyLogStatusHistory` receives `DRAFT -> IN_REVIEW`.
- `AuditLog` receives `workflowAction: DAILY_LOG_SUBMITTED`.

### 7. Approve DailyLog

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/approve
```

Expected:

- Response status is `APPROVED`.
- `approvedById` is set.
- `approvedAt` is set.
- `DailyLogStatusHistory` receives `IN_REVIEW -> APPROVED`.
- `AuditLog` receives `workflowAction: DAILY_LOG_APPROVED`.

### 8. Close DailyLog

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/close
```

Expected:

- Response status is `CLOSED`.
- `closedAt` is set.
- `DailyLogStatusHistory` receives `APPROVED -> CLOSED`.
- `AuditLog` receives `workflowAction: DAILY_LOG_CLOSED`.

## Blocking After Non Editable State

Use the closed DailyLog from the happy path.

### 1. Edit Event After CLOSED

```http
PATCH /api/v1/daily-log-events/{DAILY_LOG_EVENT_ID}
```

Payload:

```json
{
  "activity": "Should not update after close"
}
```

Expected:

- HTTP 400.
- Message: `Daily log events can only be edited while the daily log is DRAFT.`

### 2. Upload Attachment After CLOSED

```http
POST /api/v1/attachments/upload
```

Swagger form-data:

```text
dailyLogEventId: <DAILY_LOG_EVENT_ID>
file: another-smoke.pdf
```

Expected:

- HTTP 400.
- Message: `Attachments can only be uploaded while the daily log is editable.`

### 3. Delete Attachment After CLOSED

Use an attachment that still exists for the closed DailyLog and call:

```http
DELETE /api/v1/attachments/{ATTACHMENT_ID}
```

Expected:

- HTTP 409.
- Message: `Attachments can only be deleted while the daily log is DRAFT.`

## Invalid Transitions

### 1. Approve From DRAFT

Create a new DailyLog and call:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/approve
```

Expected:

- HTTP 400.
- Message starts with `Invalid daily log transition from DRAFT.`

### 2. Close From DRAFT

Create a new DailyLog and call:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/close
```

Expected:

- HTTP 400.
- Message starts with `Invalid daily log transition from DRAFT.`

### 3. Submit Twice

Submit a `DRAFT` DailyLog once, then submit it again:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/submit
```

Expected:

- First request succeeds and returns `IN_REVIEW`.
- Second request returns HTTP 400.
- Message starts with `Invalid daily log transition from IN_REVIEW.`

## Reject Flow

Create a new DailyLog, submit it, then reject it.

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/reject
```

Payload:

```json
{
  "comment": "Smoke test rejection comment."
}
```

Expected:

- Response status is `REJECTED`.
- `comments` is updated.
- `DailyLogStatusHistory` receives `IN_REVIEW -> REJECTED`.
- `AuditLog` receives `workflowAction: DAILY_LOG_REJECTED`.
- DailyLogEvent creation/editing remains blocked because only `DRAFT` is editable in hardened V1.

## Return To Draft Flow

Use the rejected DailyLog from the previous flow.

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/return-to-draft
```

Expected:

- HTTP 200.
- Response status is `DRAFT`.
- `DailyLogStatusHistory` receives `REJECTED -> DRAFT`.
- `AuditLog` receives `workflowAction: DAILY_LOG_RETURNED_TO_DRAFT`.
- DailyLogEvent creation/editing is allowed again because `DRAFT` is editable.
- Attachment upload is allowed again for DailyLogEvents in this DailyLog.

After returning to draft, verify correction and resubmission:

```http
PATCH /api/v1/daily-log-events/{DAILY_LOG_EVENT_ID}
```

Payload:

```json
{
  "executionDescription": "Corrected after rejection."
}
```

Expected:

- HTTP 200.

Then submit again:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/submit
```

Expected:

- Response status is `IN_REVIEW`.

## Cancel Flow

Create a new DailyLog, then call:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/cancel
```

Expected:

- Response status is `VOIDED`.
- `deletedById` is set.
- `DailyLogStatusHistory` receives `<previousStatus> -> VOIDED`.
- `AuditLog` receives `workflowAction: DAILY_LOG_VOIDED`.

Legacy compatibility:

```http
DELETE /api/v1/daily-logs/{DAILY_LOG_ID}
```

Expected:

- Same behavior as `cancel`.

## Contextual Project Authorization

Goal:

Validate that a user with global route permissions cannot operate workflow for a DailyLog belonging to a project where the user is not a member.

Manual setup:

1. Create or identify a second project.
2. Create or identify a user with a role that grants the needed `daily-logs:update` or `daily-logs:delete` permission.
3. Ensure the user is not assigned to the target project through `projectUser`.
4. Login as that user.
5. Attempt one of:

```http
POST /api/v1/daily-logs/{DAILY_LOG_ID}/submit
POST /api/v1/daily-logs/{DAILY_LOG_ID}/approve
POST /api/v1/daily-logs/{DAILY_LOG_ID}/reject
POST /api/v1/daily-logs/{DAILY_LOG_ID}/close
POST /api/v1/daily-logs/{DAILY_LOG_ID}/cancel
DELETE /api/v1/daily-logs/{DAILY_LOG_ID}
```

Expected:

- HTTP 403.
- Message: `User does not have access to this project.`

Attachment delete contextual check:

```http
DELETE /api/v1/attachments/{ATTACHMENT_ID}
```

Expected:

- HTTP 403.
- Message: `User does not have access to this project.`

SUPER_ADMIN compatibility:

- The current bypass is permission-based and uses `organizations:create`.
- This is temporary until an explicit platform policy exists.

## Minimal Database Checks

Use Prisma Studio or SQL to verify:

```text
daily_logs.status
daily_logs.submitted_at
daily_logs.approved_at
daily_logs.closed_at
daily_log_status_history.from_status
daily_log_status_history.to_status
audit_logs.entity_name = DailyLog
audit_logs.old_value.status
audit_logs.new_value.status
audit_logs.new_value.workflowAction
attachments.daily_log_event_id
attachments.status
attachments.deleted_by
```

## Attachment Delete Errors

### Attachment Does Not Exist

```http
DELETE /api/v1/attachments/00000000-0000-0000-0000-000000000000
```

Expected:

- HTTP 404.
- Message: `Attachment not found`

### Attachment Event Is Deleted

If the related `DailyLogEvent` was soft deleted and the attachment remains active:

```http
DELETE /api/v1/attachments/{ATTACHMENT_ID}
```

Expected:

- HTTP 409.
- Message: `Attachment cannot be deleted because its daily log event is deleted.`

## Expected Current Workflow States

Current backend states:

```text
DRAFT
IN_REVIEW
APPROVED
REJECTED
CLOSED
VOIDED
```

Official future states are not implemented yet:

```text
OPEN
PENDING_APPROVAL
REOPENED
CANCELLED
```

## Current Status Transition Matrix

Temporary equivalences:

| Current state | Future functional equivalent |
|---|---|
| `IN_REVIEW` | `PENDING_APPROVAL` |
| `VOIDED` | `CANCELLED` |

Allowed transitions:

| Endpoint | From | To | Expected |
|---|---|---|---|
| `POST /daily-logs/{id}/submit` | `DRAFT` | `IN_REVIEW` | OK |
| `POST /daily-logs/{id}/submit-review` | `DRAFT` | `IN_REVIEW` | OK, legacy alias |
| `POST /daily-logs/{id}/approve` | `IN_REVIEW` | `APPROVED` | OK |
| `POST /daily-logs/{id}/reject` | `IN_REVIEW` | `REJECTED` | OK |
| `POST /daily-logs/{id}/return-to-draft` | `REJECTED` | `DRAFT` | OK |
| `POST /daily-logs/{id}/close` | `APPROVED` | `CLOSED` | OK |
| `POST /daily-logs/{id}/cancel` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `VOIDED` | OK |
| `DELETE /daily-logs/{id}` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `VOIDED` | OK, legacy alias |

Blocked transitions:

| Attempt | Expected |
|---|---|
| `DRAFT -> APPROVED` | HTTP 400 |
| `DRAFT -> CLOSED` | HTTP 400 |
| `REJECTED -> IN_REVIEW` | HTTP 400; call `return-to-draft` first |
| `DRAFT -> DRAFT` via `return-to-draft` | HTTP 409 |
| `CLOSED -> VOIDED` | HTTP 400 |

Editable state rule:

```text
Only DRAFT is editable.
```

## Known Technical Debt

- `OPEN`, `PENDING_APPROVAL`, `REOPENED`, and `CANCELLED` are not implemented yet.
- `cancel` currently maps to `VOIDED`.
- `submit` currently maps to `IN_REVIEW`.
- `return-to-draft` is a tactical recovery path until official `OPEN` / `REOPENED` states exist.
- `submit-review` remains as a legacy alias.
- `DELETE /daily-logs/{id}` remains as a legacy cancellation path.
- `submit-review` should be deprecated after clients migrate to `submit`.
- `DELETE /daily-logs/{id}` should be deprecated after clients migrate to `cancel`.
- Contextual SUPER_ADMIN compatibility currently uses a permission-based bypass via `organizations:create`; it should be replaced by an explicit platform policy.
- No automated e2e framework exists yet.
- Project authorization smoke testing needs a second user/project fixture beyond the default seed.
- PDF validation is not part of this smoke checklist because PDF workflow is not implemented yet.
- Attachment delete is blocked unless the related DailyLog is `DRAFT`.
