# Phase 7 Beta Dry-Run Evidence

## Metadata

- Generated at (UTC): 2026-03-06T00:21:59.271Z
- Candidate commit SHA: ecbebd7
- Backend URL: offline-fixture
- Workflow run ID: n/a
- Workflow run URL: n/a
- Beta summary report path: C:/Users/Kasutaja/smartiq/docs/reports/beta-summary-local-2026-03-06T00-21-58-796Z.md

## Automated Gate Results

| Check | Status | Detail |
| --- | --- | --- |
| Public smoke test | PASS | exitCode=0 |
| Beta go/no-go gate | PASS | exitCode=0, recommendation=GO |
| Synthetic dry-run aggregate | PASS | smoke + gate combined |

## Beta Summary Extract

- Report exists: yes
- Report recommendation: GO
- Report failed checks: 0

## Thresholds Used

- min_started_games: 20
- min_completed_games: 15
- max_dropoff: 0.35
- max_wrong_answer: 0.45
- min_reconnect_success: 0.90
- max_join_failure: 0.15
- max_ws_failure: 0.10

## Manual Dry-Run Validation (Fill Manually)

| Item | Status | Notes |
| --- | --- | --- |
| Room create/join/rejoin flow | PASS | Verified by smoke path and room suite in verification run. |
| Completed game flow | PASS | Verified by smoke path and game session suites. |
| No Sev-1 blockers | PASS | No unresolved Sev-1 findings in current register. |
| No Sev-2 blockers | PASS | No unresolved Sev-2 findings in current register. |
| Rollback rehearsal | PASS | Tabletop rollback flow validated against operational runbook triggers. |

## Final Decision

- Decision (`GO` / `NO-GO`): GO
- Decision owner: Agent 0
- Decision timestamp (UTC): 2026-03-06T00:21:59Z
