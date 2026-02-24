# Branch Consolidation Audit (Generated)

Generated: 2026-02-24T20:41:30.226Z

## Scope

- Repo: `ambergkristo/smartiq`
- Base branch: `origin/main`
- Branches scanned: `30`
- Max branches setting: `30`
- GitHub PR metadata: `available`
- Output file: `docs/branch-consolidation-audit-latest.md`

## Summary

- Branches with ahead > 0: **30**
- PR state distribution: merged=29, open=0, closed=0, none=1
- Branches requiring manual review: **1**

## Manual Review Candidates

| Branch | Ahead | Behind | PR State | PR | Reason |
| --- | ---: | ---: | --- | --- | --- |
| `feat/frontend-server-state-render-20260224` | 1 | 40 | NONE | - | Ahead commits exist with no merged PR evidence |

## Branch Table

| Branch | Updated | Ahead | Behind | Plus | PR State | Route |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `chore/semantic-parity-blocking-20260224` | 2026-02-24T21:13:59+02:00 | 2 | 13 | 2 | MERGED | Skip |
| `chore/semantic-gate-070-blocking-20260224` | 2026-02-24T20:59:07+02:00 | 1 | 14 | 0 | MERGED | Skip |
| `fix/test-smoke-order-timeout-stability-20260224` | 2026-02-24T20:53:05+02:00 | 1 | 15 | 0 | MERGED | Skip |
| `feat/data-locale-parity-gate-20260224` | 2026-02-24T20:46:23+02:00 | 1 | 16 | 0 | MERGED | Skip |
| `feat/data-semantic-number-pass-20260224` | 2026-02-24T20:32:15+02:00 | 1 | 17 | 0 | MERGED | Skip |
| `chore/data-semantic-warning-budget-20260224` | 2026-02-24T20:24:39+02:00 | 1 | 18 | 0 | MERGED | Skip |
| `fix/beta-findings-summary-threshold-gate-20260224` | 2026-02-24T20:13:11+02:00 | 1 | 19 | 0 | MERGED | Skip |
| `fix/beta-findings-summary-report-generator-20260224` | 2026-02-24T20:03:39+02:00 | 1 | 20 | 0 | MERGED | Skip |
| `fix/beta-findings-room-funnel-metrics-20260224` | 2026-02-24T19:57:04+02:00 | 1 | 21 | 0 | MERGED | Skip |
| `fix/beta-findings-gameplay-metrics-20260224` | 2026-02-24T19:41:53+02:00 | 1 | 22 | 0 | MERGED | Skip |
| `chore/frontend-remove-legacy-next-helpers-20260224` | 2026-02-24T19:34:11+02:00 | 1 | 23 | 0 | MERGED | Skip |
| `chore/legacy-endpoint-retirement-plan-20260224` | 2026-02-24T19:28:16+02:00 | 1 | 24 | 0 | MERGED | Skip |
| `docs/beta-runbook-v1-20260224` | 2026-02-24T19:21:40+02:00 | 1 | 25 | 0 | MERGED | Skip |
| `feat/reconnect-resume-20260224` | 2026-02-24T19:15:22+02:00 | 1 | 26 | 0 | MERGED | Skip |
| `feat/ui-control-gating-20260224` | 2026-02-24T19:07:37+02:00 | 1 | 27 | 0 | MERGED | Skip |
| `feat/ws-rooms-gateway-20260224` | 2026-02-24T19:00:43+02:00 | 1 | 28 | 0 | MERGED | Skip |
| `feat/rooms-create-join-20260224` | 2026-02-24T18:28:11+02:00 | 1 | 29 | 0 | MERGED | Skip |
| `feat/backend-single-player-server-session-20260224` | 2026-02-24T18:19:29+02:00 | 1 | 30 | 0 | MERGED | Skip |
| `refactor/frontend-remove-local-multiplayer-toggle-20260224` | 2026-02-24T18:11:22+02:00 | 1 | 31 | 0 | MERGED | Skip |
| `feat/frontend-server-state-flow-tests-20260224` | 2026-02-24T18:05:39+02:00 | 1 | 32 | 0 | MERGED | Skip |
| `feat/frontend-server-state-default-and-tests-20260224` | 2026-02-24T17:59:46+02:00 | 1 | 33 | 0 | MERGED | Skip |
| `feat/frontend-server-state-render-v1-20260224` | 2026-02-24T17:49:56+02:00 | 1 | 34 | 0 | MERGED | Skip |
| `feat/frontend-server-state-api-client-20260224` | 2026-02-24T17:24:19+02:00 | 1 | 35 | 0 | MERGED | Skip |
| `feat/frontend-server-state-render-20260224` | 2026-02-24T16:51:15+02:00 | 1 | 40 | 1 | NONE | Investigate |
| `fix/docs-nextrandom-single-source-20260224-clean` | 2026-02-24T16:39:28+02:00 | 1 | 40 | 0 | MERGED | Skip |
| `feat/server-game-session-api-20260224` | 2026-02-24T16:32:06+02:00 | 2 | 40 | 0 | MERGED | Skip |
| `feat/server-game-session-contract-20260224` | 2026-02-24T16:13:48+02:00 | 1 | 40 | 0 | MERGED | Skip |
| `fix/ui-mobile-tap-targets-20260224` | 2026-02-24T16:00:02+02:00 | 1 | 42 | 1 | MERGED | Skip |
| `feat/ui-peg-feedback-icons-20260224` | 2026-02-24T15:43:39+02:00 | 1 | 46 | 0 | MERGED | Skip |
| `feat/ui-visual-parity-v2-20260224` | 2026-02-24T15:41:56+02:00 | 2 | 43 | 0 | MERGED | Skip |

## Commands Used

```bash
git for-each-ref refs/remotes/origin --format="%(refname:short)|%(committerdate:iso8601-strict)"
git rev-list --count <base>..<branch>
git rev-list --count <branch>..<base>
git merge-base --is-ancestor <branch> <base>
git cherry <base> <branch>
gh pr list --repo <repo> --state all --limit <n> --json ...
```
