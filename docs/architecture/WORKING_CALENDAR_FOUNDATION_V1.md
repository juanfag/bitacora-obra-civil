# WORKING_CALENDAR_FOUNDATION_V1

## Objective

Prepare the technical foundation for replacing the current hardcoded Sunday skip in DailyLog previous-day validation with an explicit working calendar model.

This document is intentionally preparatory. It does not require changes to `schema.prisma`, workflow endpoints, enums, auth, RBAC, smoke tests, or the current DailyLog creation behavior.

## Current Behavior

DailyLog creation currently enforces sequence by checking the previous required work day for the same project.

Current temporary rule:

```text
Sunday is treated as a non-working day and is skipped.
All other days are treated as working days.
```

This means:

- Monday creation checks the previous Saturday.
- Tuesday through Saturday creation checks the previous calendar day.
- There is no support yet for holidays, project-specific calendars, justified no-work days, or suspension periods.

## Future Calendar Model

The future model should separate calendar configuration from DailyLog workflow state. DailyLog creation should ask a calendar policy which previous work day is required for a project and date.

Recommended conceptual components:

| Concept | Purpose |
|---|---|
| Project working days | Defines regular weekdays when a project is expected to operate. |
| Holidays | Defines non-working dates by country, organization, or project. |
| Justified no-work days | Defines one-off dates where work was not expected, with a reason and actor. |
| Suspension days | Defines dates or ranges where the project was formally suspended. |
| Calendar policy service | Resolves whether a date is working and finds the previous required work day. |

No database table names are final in this document. The final schema should be introduced through a controlled migration phase.

## Working Days By Project

Each project should eventually support a working week configuration.

Examples:

- Monday to Saturday.
- Monday to Friday.
- Custom shifts for special projects.

Suggested future behavior:

- If a project has an explicit working-day configuration, use it.
- If not, fall back to an organization default.
- If no organization default exists, fall back to a platform default.

The current platform default is effectively:

```text
Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.
Sunday is non-working.
```

## Holidays

Holidays should be resolved with a precedence model.

Suggested precedence:

1. Project-specific holiday.
2. Organization-specific holiday.
3. Country or regional holiday.
4. Platform default holiday source, if any.

Holiday records should support:

- date or date range;
- country or region code;
- optional organizationId;
- optional projectId;
- name;
- source;
- active/inactive status.

DailyLog creation should not require a DailyLog for a holiday unless the project explicitly marks that date as working.

## Justified No-Work Days

Some days are not holidays and not suspensions, but still should not require a DailyLog. Examples:

- site inaccessible for a documented reason;
- administrative closure;
- client-approved non-work day;
- exceptional safety restriction.

Suggested future fields:

- projectId;
- date or date range;
- reason;
- justification notes;
- createdById / approvedById;
- status.

These records should be auditable because they directly affect whether a DailyLog can be skipped.

## Suspension Days

Suspensions are different from casual no-work days because they are formal project states or periods.

Suggested future behavior:

- A suspension period should mark all dates in the range as not required for DailyLog sequence validation.
- A suspended day may still allow special administrative records later, but it should not require a normal DailyLog.
- Suspension changes should be audited.

Suspension can be modeled either as:

- project status history with date ranges; or
- an explicit project calendar exception type.

The final design should avoid duplicating the same business event in multiple tables.

## DailyLog Creation Impact

The future DailyLog creation rule should become:

```text
To create a DailyLog for project P on date D:
1. Validate D is a required working day for project P.
2. Resolve the previous required working day before D.
3. If no previous required working day exists in the project calendar, allow only the first DailyLog for the project.
4. If a previous required working day exists, require its DailyLog to exist and be CLOSED.
5. Return 409 Conflict for missing or non-CLOSED previous required DailyLog.
```

Questions to decide in the implementation phase:

- Should creating a DailyLog on a non-working day be blocked, allowed with a warning, or allowed only through an override?
- Should the first DailyLog date be constrained by project `startDate`?
- Should a project be allowed to have gaps before its first DailyLog?
- How should retroactive calendar changes affect existing DailyLogs?

## Suggested Service Boundary

A future incremental implementation can introduce a service without changing public API contracts first:

```text
WorkingCalendarService
  isRequiredWorkDay(projectId, date)
  getPreviousRequiredWorkDay(projectId, date)
  explainNonWorkingDay(projectId, date)
```

`DailyLogsService` should delegate calendar decisions to this service instead of hardcoding weekday logic.

## Migration Strategy

Recommended phased approach:

1. Introduce `WorkingCalendarService` with the current Sunday-skip behavior only.
2. Move the hardcoded weekday calculation out of `DailyLogsService`.
3. Add tests around the service contract.
4. Add schema for calendar configuration and exceptions.
5. Backfill organization/project defaults.
6. Enable holidays and exceptions behind service logic.
7. Add admin APIs for maintaining calendar data.
8. Update smoke and e2e tests to cover configured non-working days.

## Current Technical Debt

- Sunday skip is hardcoded in DailyLog creation validation.
- Holidays are not represented.
- Project-specific working weeks are not represented.
- Justified no-work days are not represented.
- Suspension periods are not represented in DailyLog sequence validation.
- Calendar decisions are not yet auditable as first-class records.

This debt is known and accepted temporarily to keep FASE 11 conservative and avoid premature schema changes.
