Migration Checklist
===================

## 1. Apply migrations in dev / staging

1. Confirm the target environment has `SMARTIQ_IMPORT_ENABLED=true`, `SMARTIQ_POOL_ENABLED=true`, and the database credentials defined in `.env` (dev) or deployment manifest (staging).
2. Run the Flyway chain from the backend module so the same `db/migration` scripts execute as in CI:
   ```bash
   cd backend
   mvn -DskipTests=true flyway:migrate
   ```
3. After migration, check backend health:
   ```bash
   curl http://localhost:8081/health
   ```
   Expect `{"status":"UP"}` with HTTP 200.

## 2. Verify migration bundle from scratch

- The smoke test `FlywayEmptyDatabaseSmokeTest` recreates an empty H2 database, runs `flyway.clean()`, then migrates to latest. It lives in `backend/src/test/java/com/smartiq/backend/migration/`.
- Run in isolation:
  ```bash
  cd backend
  mvn -Dtest=FlywayEmptyDatabaseSmokeTest test
  ```
  This confirms migrations are self-contained and can bootstrap a clean database.

## 3. Rollback guidance

1. There is no automated undo for these Flyway scripts (destructive schema changes). To revert deployment:
   - Use Postgres client to restore previous snapshot or recreate database (`DROP DATABASE smartiq; CREATE DATABASE smartiq;`).
   - Re-run `cd backend && mvn -DskipTests=true flyway:migrate` against restored schema.
2. For local temporary staging reset:
   ```bash
   cd backend
   mvn -DskipTests=true flyway:clean flyway:migrate
   ```
   This mirrors smoke-test behavior and is safe only for ephemeral local databases.

## 4. Documentation updates

- When new Flyway scripts are added, update this checklist and `docs/plans/operational-readiness-masterplan.md`.
- Capture manual interventions (for example curated dataset imports) in `docs/plans/deployment-checklist.md` and link back here for migration verification.
