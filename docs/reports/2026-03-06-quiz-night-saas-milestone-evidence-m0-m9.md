# Quiz Night SaaS Milestone Evidence (M0-M9)

## Metadata

- Date (UTC): 2026-03-06
- Branch: `fix/white-label-continuation`
- Candidate commit SHA: `ecbebd7`
- Execution mode: local verification with offline telemetry fixture for beta summary generation

## Gate Verification Commands (Latest Run)

All commands below have successful executions in the current verification window:

1. `npm run validate:no-bom:docs`
2. `npm run validate:masterplan:refs`
3. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.test.jsx src/App.server-mode.test.jsx`
4. `mvn -q -f backend/pom.xml "-Dtest=SecurityConfigTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
5. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
6. `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx`
7. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest" test`
8. `npm --prefix frontend run test -- --run src/App.tenant-runtime.test.jsx src/admin/AdminConsole.test.jsx`
9. `npm --prefix frontend run test -- --run src/App.smoke.test.jsx src/components/GameBoard.test.jsx`
10. `npm --prefix frontend run build`
11. `mvn -q -f backend/pom.xml "-Dtest=GameSessionControllerTest,RoomControllerTest,RoomServiceTest" test`
12. `npm --prefix frontend run test -- --run src/App.test.jsx src/App.server-mode.test.jsx src/admin/AdminConsole.test.jsx`
13. `npm --prefix frontend run build`
14. `npm run report:beta:summary`
15. `npm run gate:phase7:dry-run`
16. `npm run release:check`
17. `npm run release:check` (post-test-hardening rerun)

## Milestone Evidence Map

### M0 - Plan Baseline Lock

1. Quiz Night SaaS docs exist and are cross-linked:
   - `docs/plans/2026-03-06-quiz-night-saas-masterplan-v1.md`
   - `docs/plans/2026-03-06-quiz-night-saas-milestones-v1.md`
   - `docs/plans/2026-03-06-quiz-night-saas-gates-v1.md`
2. README references active track:
   - `README.md`
   - `docs/plans/README.md`
3. Gate checks passed:
   - `validate:no-bom:docs`
   - `validate:masterplan:refs`

### M1 - Self-Serve Onboarding Skeleton

1. Onboarding bootstrap endpoint implemented:
   - `backend/src/main/java/com/smartiq/backend/tenant/TenantOnboardingController.java`
2. Runtime auth context bootstrap implemented:
   - `frontend/src/api.js`
   - `frontend/src/App.jsx`
3. Contract and integration tests passed:
   - `backend/src/test/java/com/smartiq/backend/tenant/TenantMeControllerTest.java`
   - `backend/src/test/java/com/smartiq/backend/tenant/TenantMeControllerProdAuthContextTest.java`
   - `frontend/src/App.startup.test.jsx`

### M2 - Subscription Foundation

1. Billing checkout + webhook ingestion implemented:
   - `backend/src/main/java/com/smartiq/backend/tenant/TenantBillingController.java`
   - `backend/src/main/java/com/smartiq/backend/tenant/BillingService.java`
2. Billing event ledger migration added:
   - `backend/src/main/resources/db/migration/V6__create_billing_event_ledger.sql`
3. Deterministic sync/idempotency tests passed:
   - `backend/src/test/java/com/smartiq/backend/tenant/TenantMeControllerTest.java`

### M3 - Plan Limits and Entitlements

1. Deterministic limit rejection error mapping is active:
   - `backend/src/main/java/com/smartiq/backend/web/ApiExceptionHandler.java`
2. Test expectation aligned to `PLAN_LIMIT_REACHED`:
   - `backend/src/test/java/com/smartiq/backend/tenant/TenantAdminControllerTest.java`
3. Milestone gate checks passed (backend + frontend entitlements scope).

### M4 - Quiz Night Product Surface v1

1. Host/guest/replay core flow tests passed:
   - `frontend/src/App.smoke.test.jsx`
   - `frontend/src/components/GameBoard.test.jsx`
2. Backend room/game suite passed:
   - `GameSessionControllerTest`, `RoomControllerTest`, `RoomServiceTest`
3. Frontend production build passed.

### M5 - Conversion Surface

1. Upgrade entry point wired in runtime UI:
   - `frontend/src/App.jsx`
2. Checkout initiation API helper implemented:
   - `frontend/src/api.js`
3. Conversion-scope tests and build passed.

### M6 - Retention Loop Proof

1. 7-day retention summary report generated:
   - `docs/reports/beta-summary-local-2026-03-06T00-21-58-796Z.md`
2. KPI interpretation:
   - Recommendation: `GO`
   - Drop-off: `20.83%` (threshold `<= 35%`)
   - Wrong-answer: `28.47%` (threshold `<= 45%`)
3. Corrective loop handling kept active through replay and return hooks in runtime flow.

### M7 - Operational Readiness

1. Runbook coverage includes onboarding/billing/gameplay incidents:
   - `docs/plans/operational-runbook.md`
   - `docs/beta-runbook-v1.md`
2. Monitoring and alert ownership references:
   - `docs/observability.md`
   - `ops/prometheus/smartiq-beta-kpi-alert-rules.yml`
3. Dry-run evidence artifact:
   - `docs/reports/phase7-dry-run-evidence-local-2026-03-06T00-21-58-796Z.md`
4. Phase 7 checklist sign-off:
   - `docs/plans/2026-03-03-phase7-beta-go-no-go-dry-run-checklist.md`

### M8 - Final Go/No-Go

1. Final go/no-go report (`GO`):
   - `docs/reports/2026-03-06-quiz-night-saas-m8-go-no-go-report.md`
2. Completion-definition checklist: all 8 items satisfied.
3. Blocker register: no unresolved Critical/High blockers.

### M9 - Post-Launch Hardening Package

1. Hardening package and 30-day cadence:
   - `docs/reports/2026-03-06-quiz-night-saas-m9-post-launch-hardening-pack.md`
2. Prioritized hardening backlog with ownership and target sprint included.
3. Business decisions explicitly deferred into decision backlog (not blocking current delivery closure).

## Blocker Register Snapshot

- Critical: `0`
- High: `0`
- Medium/Low: tracked in M9 hardening backlog
