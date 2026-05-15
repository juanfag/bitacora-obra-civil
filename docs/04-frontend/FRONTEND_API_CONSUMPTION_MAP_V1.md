# FRONTEND_API_CONSUMPTION_MAP_V1

## Objective

Map the current backend API to the future Next.js frontend screens and user actions for the DailyLog MVP.

This document is planning-only. It does not require backend code changes, Prisma schema changes, or test changes.

## Suggested Frontend Modules

| Module | Purpose |
|---|---|
| Auth | Login, token storage, authenticated request wrapper, logout. |
| Projects | Project selection and project context. |
| DailyLogs | DailyLog listing, creation, detail, status workflow. |
| DailyLogEvents | DailyLogEvent CRUD inside editable DailyLogs. |
| Attachments | Upload, list, view metadata, and delete attachments for DailyLogEvents. |
| EventTypes | Catalog lookup for DailyLogEvent forms. |
| Users/RBAC context | Read current user permissions and drive UI visibility. |
| API client | Centralized HTTP client, error normalization, auth header injection. |

## DailyLog MVP Screens

| Screen | Purpose |
|---|---|
| Login | Authenticate user and store JWT. |
| Project selector / project list | Select active project context. |
| Project DailyLogs list | Show DailyLogs for a project with status/date filters. |
| DailyLog create | Create a new DailyLog for a work date. |
| DailyLog detail | Show DailyLog header, status, workflow actions, events, and attachments. |
| DailyLogEvent create/edit | Add or update event information while DailyLog is editable. |
| Attachment upload modal | Upload PDF/JPEG/PNG to a DailyLogEvent while DailyLog is editable. |
| Review action modal | Submit, approve, reject, close, or cancel with confirmation and optional comment. |

## Screen To API Map

### Login

| Action | Endpoint | Method |
|---|---|---|
| Login | `/api/v1/auth/login` | `POST` |

Success handling:

- Store `accessToken`.
- Store user summary from response.
- Redirect to project list or last selected project.

Error handling:

- `400/401`: show invalid credentials or validation message.

### Project Selector

| Action | Endpoint | Method |
|---|---|---|
| List projects | `/api/v1/projects` | `GET` |
| Get project detail | `/api/v1/projects/{id}` | `GET` |

Success handling:

- Select project context.
- Use selected `projectId` for DailyLog screens.

Error handling:

- `401`: session expired.
- `403`: user lacks project read permission.

### Project DailyLogs List

| Action | Endpoint | Method |
|---|---|---|
| List DailyLogs by project | `/api/v1/projects/{projectId}/daily-logs` | `GET` |
| List DailyLogs with filters | `/api/v1/daily-logs?projectId=&logDate=&status=&page=&limit=` | `GET` |

Required UI controls:

- date filter;
- status filter;
- pagination;
- create DailyLog button.

Success handling:

- Render status badges.
- Disable edit-oriented actions for non-editable statuses.

Error handling:

- `400`: invalid filters.
- `401`: session expired.
- `403`: user lacks read permission.

### DailyLog Create

| Action | Endpoint | Method |
|---|---|---|
| Create DailyLog | `/api/v1/daily-logs` | `POST` |

Payload:

```json
{
  "projectId": "uuid",
  "logDate": "2026-05-12",
  "comments": "Daily notes"
}
```

Success handling:

- Navigate to DailyLog detail.
- Show created status as `DRAFT`.

Error handling:

- `400`: invalid payload or project reference.
- `409`: duplicate DailyLog, missing previous required work day, or previous required work day not `CLOSED`.

Important UI note:

- Do not send `status`; backend forces `DRAFT`.

### DailyLog Detail

| Action | Endpoint | Method |
|---|---|---|
| Get DailyLog | `/api/v1/daily-logs/{id}` | `GET` |
| Update DailyLog comments/date/project fields currently accepted by API | `/api/v1/daily-logs/{id}` | `PATCH` |
| List events | `/api/v1/daily-log-events?dailyLogId={id}` | `GET` |

Success handling:

- Render status, comments, dates, and workflow buttons.
- Render event list.
- Show editable forms only when status is `DRAFT`.

Error handling:

- `404`: DailyLog no longer exists.
- `409`: update attempted outside `DRAFT`.

## DailyLogEvent Screens

### Create Event

| Action | Endpoint | Method |
|---|---|---|
| Get event type catalog | `/api/v1/event-types` | `GET` |
| Create event | `/api/v1/daily-log-events` | `POST` |

Payload:

```json
{
  "dailyLogId": "uuid",
  "eventTypeId": "uuid",
  "activity": "Concrete pour completed",
  "executionDescription": "Crew poured concrete without incidents.",
  "reportedAt": "2026-05-14T15:30:00.000Z"
}
```

Success handling:

- Append event to list.
- Clear form.
- Allow attachment upload for the new event if DailyLog remains editable.

Error handling:

- `400`: invalid payload or invalid references.
- `409`: parent DailyLog is not editable.

### Edit Event

| Action | Endpoint | Method |
|---|---|---|
| Update event | `/api/v1/daily-log-events/{id}` | `PATCH` |
| Delete event | `/api/v1/daily-log-events/{id}` | `DELETE` |

Success handling:

- Refresh event list or update local cache.

Error handling:

- `404`: event not found.
- `409`: parent DailyLog is not editable.

## Attachment Upload Behavior

| Action | Endpoint | Method |
|---|---|---|
| Upload attachment | `/api/v1/attachments/upload` | `POST multipart/form-data` |
| List event attachments | `/api/v1/daily-log-events/{id}/attachments` | `GET` |
| Get attachment metadata | `/api/v1/attachments/{id}` | `GET` |
| Delete attachment | `/api/v1/attachments/{id}` | `DELETE` |

Upload form fields:

| Field | Required | Notes |
|---|---|---|
| `dailyLogEventId` | Yes | UUID of the DailyLogEvent. |
| `file` | Yes | `image/jpeg`, `image/png`, or `application/pdf`. |

Success handling:

- Show uploaded file metadata.
- Refresh event attachments.

Error handling:

- `400`: missing file, invalid MIME type, file too large, or invalid event reference.
- `403`: user cannot access the project for delete.
- `404`: attachment not found.
- `409`: parent DailyLog is not editable, or related DailyLogEvent is deleted.

UI behavior:

- Show upload controls only when parent DailyLog status is `DRAFT`.
- Show delete controls only when parent DailyLog status is `DRAFT`.
- Show read-only attachment list in non-editable statuses.

## Workflow Button Visibility

Button visibility should use both status and permissions. Permission names should come from the authenticated user's effective permissions when the frontend has that context.

| Button | Visible when status | Endpoint | Notes |
|---|---|---|---|
| Submit | `DRAFT` | `POST /api/v1/daily-logs/{id}/submit` | Hide if user lacks `daily-logs:update`. |
| Approve | `IN_REVIEW` | `POST /api/v1/daily-logs/{id}/approve` | Hide if user lacks `daily-logs:update`. |
| Reject | `IN_REVIEW` | `POST /api/v1/daily-logs/{id}/reject` | Requires comment modal. |
| Close | `APPROVED` | `POST /api/v1/daily-logs/{id}/close` | Confirmation recommended. |
| Cancel | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED` | `POST /api/v1/daily-logs/{id}/cancel` | Hide for `CLOSED` and `VOIDED`. |
| Return to draft | `REJECTED` | `POST /api/v1/daily-logs/{id}/return-to-draft` | Needed before correction/resubmission. |

## Status-Based UI Behavior

| Status | DailyLog fields | Events | Attachments | Workflow UI |
|---|---|---|---|---|
| `DRAFT` | Editable | Create/edit/delete | Upload/delete | Show submit and cancel. |
| `IN_REVIEW` | Read-only | Read-only | Read-only | Show approve/reject/cancel according to permissions. |
| `APPROVED` | Read-only | Read-only | Read-only | Show close/cancel according to permissions. |
| `REJECTED` | Read-only until returned to draft | Read-only until returned to draft | Read-only until returned to draft | Show return-to-draft and cancel. |
| `CLOSED` | Read-only | Read-only | Read-only | No mutating workflow buttons. |
| `VOIDED` | Read-only | Read-only | Read-only | No mutating workflow buttons. |

## Expected Success And Error Handling

Recommended frontend error normalization:

| HTTP status | Frontend handling |
|---|---|
| `200/201` | Show success toast only for user-initiated mutations. Refresh local data. |
| `400` | Show validation message near form fields when possible. |
| `401` | Clear token and redirect to login. |
| `403` | Show access denied message and hide unavailable actions. |
| `404` | Show not-found state or return to list. |
| `409` | Show business-rule conflict message from API. Do not retry automatically. |
| `500` | Show generic error and log correlation/request id if available. |

## Legacy Endpoints Frontend Should Avoid

| Legacy endpoint | Use instead |
|---|---|
| `POST /api/v1/daily-logs/{id}/submit-review` | `POST /api/v1/daily-logs/{id}/submit` |
| `DELETE /api/v1/daily-logs/{id}` | `POST /api/v1/daily-logs/{id}/cancel` |

Frontend should not build new UI flows around legacy endpoints. Keep them only for backward compatibility with older clients.

## Gaps Before Frontend Development

| Gap | Impact |
|---|---|
| No frontend permission/context endpoint documented yet | UI may need to infer permissions from login payload or request a backend enhancement. |
| No generated OpenAPI client yet | Manual API client can drift from Swagger contract. |
| No file download/public URL contract finalized for attachments | Attachment metadata exists, but final viewing/download UX needs confirmation. |
| No configurable working calendar yet | UI can show current Sunday-skip behavior, but cannot manage holidays or project calendars. |
| No PDF/signature workflow yet | Closed DailyLogs cannot yet expose final report/signature actions. |
| Legacy states still present | UI must use current implemented statuses and avoid future labels until migration. |
| Error response shape should be normalized in frontend client | Nest validation/business errors may vary slightly by endpoint. |

## Recommended Frontend Start Order

1. API client and auth session handling.
2. Project selector.
3. DailyLog list and detail.
4. DailyLog create flow with `409` business-rule handling.
5. DailyLogEvent CRUD inside `DRAFT`.
6. Attachment upload/list/delete inside `DRAFT`.
7. Workflow action buttons and confirmation modals.
8. Read-only states and access-denied handling.
