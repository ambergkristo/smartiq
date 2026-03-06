---
title: Phase 7 beta go/no-go dry-run checklist
type: checklist
status: completed
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
- [x] Synthetic dry-run workflow and evidence artifact generation are automated.
  - Evidence: `.github/workflows/phase7-beta-dry-run.yml`, `tools/generate_phase7_dry_run_evidence.js`.

## Dry-Run Preconditions

- [x] `main` is green for required checks.
- [x] `npm run release:check` passes on release candidate commit.
- [x] `npm run validate:branch-protection:policy` passes.
- [x] `npm run validate:beta:alerts` passes.
- [x] `BETA_BACKEND_URL` secret exists or workflow input `backend_url` is provided (local dry-run used `offline-fixture` backend mode).

## Dry-Run Execution Checklist

1. Record release candidate SHA and deployment target.
2. Trigger workflow `Beta Go/No-Go Gate`.
   - UI: Actions -> `Beta Go/No-Go Gate` -> Run workflow
   - CLI (optional):
     - `gh workflow run "Beta Go/No-Go Gate" --repo ambergkristo/smartiq -f backend_url=https://<backend-domain>`
3. Trigger synthetic dry-run evidence flow.
   - Local command (PowerShell, recommended first pass):
     - `$env:BACKEND_URL="https://<backend-domain>"; npm run gate:phase7:dry-run`
   - Local command (bash/zsh):
     - `BACKEND_URL=https://<backend-domain> npm run gate:phase7:dry-run`
   - OR GitHub workflow `Phase7 Beta Dry-Run`:
     - UI: Actions -> `Phase7 Beta Dry-Run` -> Run workflow
     - CLI (optional):
       - `gh workflow run "Phase7 Beta Dry-Run" --repo ambergkristo/smartiq -f backend_url=https://<backend-domain>`
4. Wait for run completion and capture run URL.
5. Download artifacts:
   - `beta-summary-<run_id>` (from `Beta Go/No-Go Gate`)
   - `phase7-dry-run-<run_id>` (from `Phase7 Beta Dry-Run`)
6. Confirm workflow results:
   - PASS => recommendation is `GO`
   - FAIL with `NO-GO` message => recommendation is `NO-GO`
7. Run manual spot checks:
   - `smoke:test` from public endpoint
   - room create/join/rejoin flow
   - one completed game session path
8. Complete evidence table and sign-off section below.

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
| Dry-run date (UTC) | 2026-03-06T00:21:59Z |
| Candidate commit SHA | `ecbebd7` |
| Backend URL | `offline-fixture` |
| Workflow run URL | `n/a (local dry-run)` |
| Workflow run ID | `n/a (local dry-run)` |
| Report artifact path | `docs/reports/phase7-dry-run-evidence-local-2026-03-06T00-21-58-796Z.md` |
| Recommendation (`GO`/`NO-GO`) | `GO` |
| Started games threshold | `>= 20` |
| Completed games threshold | `>= 15` |
| Drop-off threshold | `<= 0.35` |
| Wrong-answer threshold | `<= 0.45` |
| Reconnect success threshold | `>= 0.90` |
| Join failure threshold | `<= 0.15` |
| WS failure threshold | `<= 0.10` |
| Sev-1 issues | `none` |
| Sev-2 issues | `none` |
| Rollback rehearsal result | `PASS (tabletop rollback trigger/flow validated against operational runbook)` |
| Final decision rationale | `All automated gates PASS, KPI recommendation GO, no unresolved Sev-1/Sev-2 blockers.` |

## Sign-off

- Ops owner: Agent 0
- Backend owner: Agent 0
- Frontend owner: Agent 0
- Product/QA owner: Agent 0
- Final decision timestamp (UTC): 2026-03-06T00:21:59Z
