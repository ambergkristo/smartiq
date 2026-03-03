---
title: Phase 7 beta go/no-go dry-run checklist
type: checklist
status: active
date: 2026-03-03
owner: Agent 0
---

# Phase 7 Beta Go/No-Go Dry-Run Checklist

## Purpose

Provide one canonical execution checklist and evidence template for the closed-beta go/no-go dry-run.

## Completed Phase 7 Building Blocks (Code + Docs)

- [x] KPI threshold alerts codified and CI-validated.
  - Evidence: `ops/prometheus/smartiq-beta-kpi-alert-rules.yml`, `tools/validate_beta_alert_rules.js`.
- [x] Automated go/no-go workflow available and blocking on `NO-GO`.
  - Evidence: `.github/workflows/beta-go-no-go.yml`.
- [x] Main branch protection policy codified and validated against workflow contexts.
  - Evidence: `docs/policies/main-branch-protection-policy.json`, `tools/validate_branch_protection_policy.js`.

## Dry-Run Preconditions

- [ ] `main` is green for required checks.
- [ ] `npm run release:check` passes on release candidate commit.
- [ ] `npm run validate:branch-protection:policy` passes.
- [ ] `npm run validate:beta:alerts` passes.
- [ ] `BETA_BACKEND_URL` secret exists or workflow input `backend_url` is provided.

## Dry-Run Execution Checklist

1. Record release candidate SHA and deployment target.
2. Trigger workflow `Beta Go/No-Go Gate`.
   - UI: Actions -> `Beta Go/No-Go Gate` -> Run workflow
   - CLI (optional):
     - `gh workflow run "Beta Go/No-Go Gate" --repo ambergkristo/smartiq -f backend_url=https://<backend-domain>`
3. Wait for run completion and capture run URL.
4. Download artifact `beta-summary-<run_id>` and store it in release evidence.
5. Confirm workflow result:
   - PASS => recommendation is `GO`
   - FAIL with `NO-GO` message => recommendation is `NO-GO`
6. Run manual spot checks:
   - `smoke:test` from public endpoint
   - room create/join/rejoin flow
   - one completed game session path
7. Complete evidence table and sign-off section below.

## Go/No-Go Decision Rules

- `GO` requires all:
  - workflow result PASS
  - no Sev-1 or Sev-2 blockers
  - rollback path validated
- `NO-GO` if any:
  - workflow returns `NO-GO`
  - smoke or reconnect critical path fails
  - unresolved Sev-1/Sev-2 issue remains

## Evidence Template (Fill on Dry-Run)

| Field | Value |
| --- | --- |
| Dry-run date (UTC) |  |
| Candidate commit SHA |  |
| Backend URL |  |
| Workflow run URL |  |
| Workflow run ID |  |
| Report artifact path |  |
| Recommendation (`GO`/`NO-GO`) |  |
| Started games threshold |  |
| Completed games threshold |  |
| Drop-off threshold |  |
| Wrong-answer threshold |  |
| Reconnect success threshold |  |
| Join failure threshold |  |
| WS failure threshold |  |
| Sev-1 issues |  |
| Sev-2 issues |  |
| Rollback rehearsal result |  |
| Final decision rationale |  |

## Sign-off

- Ops owner: _____________________
- Backend owner: __________________
- Frontend owner: _________________
- Product/QA owner: ______________
- Final decision timestamp (UTC): _____________________
