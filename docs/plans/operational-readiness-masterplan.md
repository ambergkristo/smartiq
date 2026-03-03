Operational Readiness Master Plan
=================================

Updated: 2026-03-03

Scope
-----
Track and close operational-readiness gaps discovered in audit work.

Goals
-----
1. **Migration reliability.** Every Flyway change is validated with repeatable migrate flow and clean-database smoke coverage.
2. **Deployment clarity.** One canonical checklist covers config, start/stop order, and release-day verifications.
3. **Monitoring and recovery.** Core production safety nets are documented with concrete incident actions.

Milestone plan
--------------
Execution milestones are tracked in:

- `docs/plans/2026-03-03-feat-operational-readiness-completion-plan.md`

Plan items and status
---------------------

### Migration reliability

- [x] Confirm CI runs Flyway migration chain checks.
  - Evidence: `.github/workflows/backend-ci.yml` runs migration validation and backend tests.
- [x] Add clean-database smoke test to prove migrations are self-contained.
  - Evidence: `backend/src/test/java/com/smartiq/backend/migration/FlywayEmptyDatabaseSmokeTest.java`.
- [x] Publish migration apply/test/rollback checklist.
  - Evidence: `docs/plans/migration-checklist.md`.

### Deployment clarity

- [x] Publish canonical deployment checklist with config matrix.
  - Evidence: `docs/plans/deployment-checklist.md`.
- [x] Document startup/shutdown order (DB, backend, optional dataset import).
  - Evidence: `docs/plans/deployment-checklist.md`.
- [x] Document release-day checks for:
  - DMZ/public CORS headers
  - WebSocket handshake success
  - Dataset threshold gate
  - Evidence: `docs/plans/deployment-checklist.md`.

### Monitoring and recovery

- [x] Ensure dataset summary logs include `failOnThreshold`.
  - Evidence: `backend/src/main/java/com/smartiq/backend/config/CardImportRunner.java`.
- [x] Instrument threshold metric `smartiq.dataset.category.below.threshold`.
  - Evidence: `backend/src/main/java/com/smartiq/backend/config/CardImportRunner.java`.
- [x] Add tests for threshold behavior and metric output.
  - Evidence: `backend/src/test/java/com/smartiq/backend/config/CardImportRunnerTest.java`.
- [x] Publish operational incident runbook.
  - Evidence: `docs/plans/operational-runbook.md`.
- [x] Define outage reconnect and cleanup flow including `RoomWsGateway.unregister`.
  - Evidence: `docs/plans/operational-runbook.md`.

Remaining actions
-----------------

- [x] Run broader backend regression suite before release cut.
- [x] Capture final release sign-off timestamp and owner in this file.

Release sign-off
----------------

- Timestamp: `2026-03-03T13:12:56+02:00` (Europe/Tallinn)
- Owner: `Kasutaja`
- Verification: backend regression suite passed (`mvn test`, 178 tests, 0 failures, 0 errors, 0 skipped)
