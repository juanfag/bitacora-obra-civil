# DAILY_LOG_SMOKE_TEST_AUTOMATION_V1

## Objective

Document the automated smoke test baseline for the current DailyLog workflow.

This is intentionally lightweight: Jest + Supertest, no heavy e2e framework, no browser automation, and no changes to business workflow logic.

## Files

```text
test/jest-e2e.config.cjs
test/tsconfig.e2e.json
test/e2e/setup-env.ts
test/e2e/daily-log-workflow.e2e-spec.ts
test/e2e/helpers/
.env.test.example
```

## Environment

Create a local `.env.test` from `.env.test.example`.

```bash
copy .env.test.example .env.test
```

Recommended variables:

```text
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitacora_obra_test
JWT_SECRET=change-me-for-tests
UPLOAD_PATH=uploads-test
SMOKE_ADMIN_EMAIL=admin@bitacora.local
SMOKE_ADMIN_PASSWORD=Password123!
```

The smoke tests expect:

- database is reachable
- migrations have been applied
- seed has been executed
- demo project `PROY-DEMO-001` exists
- event type `WORK_PROGRESS` exists
- demo admin can log in

## Install Test Dependencies

The baseline expects these dev dependencies:

```text
@nestjs/testing
jest
ts-jest
supertest
@types/jest
@types/supertest
```

Install with:

```bash
npm install -D @nestjs/testing jest ts-jest supertest @types/jest @types/supertest
```

## Run

Run the complete e2e smoke suite:

```bash
npm run test:e2e
```

Run only the DailyLog smoke spec:

```bash
npm run test:smoke
```

## Covered

The initial automated baseline covers:

- health endpoint works
- login works
- create DailyLog
- create DailyLogEvent while DailyLog is editable
- submit DailyLog
- approve DailyLog
- close DailyLog
- invalid approve from `DRAFT`
- invalid close from `DRAFT`
- duplicate submit
- editing DailyLogEvent after `CLOSED` is blocked
- uploading attachment after `CLOSED` is blocked
- reject then `return-to-draft`
- edit event after return to `DRAFT`
- submit again after return to `DRAFT`
- invalid `return-to-draft` from non-`REJECTED`

## Cleanup Strategy

The test suite tracks created DailyLog IDs and removes their related test data in `afterAll`.

Cleanup includes:

- attachments related to created DailyLogEvents
- DailyLogEvents
- DailyLogStatusHistory
- DailyLogApproval
- DailyLog audit logs
- DailyLogs

## Known Limitations

- This baseline assumes an available database and seeded demo data.
- It is not isolated with per-test database transactions yet.
- It does not create a second user/project fixture for contextual authorization failures.
- It does not assert DB audit/history rows directly yet.
- It validates attachment upload blocking after `CLOSED`, but does not validate successful attachment upload/delete in the automated suite yet.
- Physical upload cleanup is minimal because the automated attachment case expects the upload to be rejected and cleaned by the service.
- `package-lock.json` must be refreshed after test dependencies install successfully.

## Next Recommended Improvements

1. Add a dedicated test seed for project authorization cases.
2. Add direct assertions for `DailyLogStatusHistory`.
3. Add direct assertions for `AuditLog.oldValue` and `AuditLog.newValue`.
4. Add successful attachment upload/delete tests with safe filesystem cleanup.
5. Add a separate test database reset strategy.
6. Add CI command that runs migrations, seed, and `npm run test:smoke`.

