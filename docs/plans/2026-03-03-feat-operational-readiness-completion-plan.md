---
title: feat: Operational readiness completion
type: feat
status: completed
date: 2026-03-03
---

# feat: Operational readiness completion

## Overview

Close all remaining items from `docs/plans/operational-readiness-masterplan.md` and move the plan to a shippable state with clear runbooks, deployment checks, and production metrics.

## Initial State (2026-03-03, before execution)

- Done:
  - Flyway empty-database smoke test exists (`FlywayEmptyDatabaseSmokeTest`)
  - Migration checklist exists (`docs/plans/migration-checklist.md`)
- Open at plan start:
  - `docs/plans/deployment-checklist.md` is missing
  - `docs/plans/operational-runbook.md` is missing
  - metric `smartiq.dataset.category.below.threshold` is not instrumented
  - masterplan does not yet show final closure state

## Milestones

### M1 - Milestone Baseline and Scope Lock (2026-03-03)

- [x] Confirm latest active masterplan scope and gaps.
- [x] Define closure path and dependencies.
- Exit criteria:
  - A dated completion plan exists and is referenced during execution.

### M2 - Deployment Clarity Completion (target: 2026-03-03)

- [x] Create `docs/plans/deployment-checklist.md` as canonical operator checklist.
- [x] Include full `smartiq.*` config matrix and related env vars used in deploy.
- [x] Document startup/shutdown order: DB -> backend -> optional dataset import.
- [x] Add release-day checks for:
  - DMZ/public CORS headers
  - WebSocket handshake success
  - dataset threshold gate behavior
- Exit criteria:
  - On-call can run deployment from checklist only, without tribal knowledge.

### M3 - Monitoring and Recovery Completion (target: 2026-03-03)

- [x] Add `docs/plans/operational-runbook.md`.
- [x] Cover health and diagnostic endpoints:
  - `/health`
  - `/actuator/prometheus`
  - `/version`
- [x] Add response playbooks for spikes in:
  - `smartiq.game.session.evicted.total`
  - `smartiq.game.action.rejected.total`
- [x] Add outage reconnect and cleanup flow (including `RoomWsGateway.unregister` behavior and cleanup triggers).
- Exit criteria:
  - A single runbook exists for incident triage and first-response actions.

### M4 - Dataset Threshold Instrumentation (target: 2026-03-03)

- [x] Instrument metric `smartiq.dataset.category.below.threshold`.
- [x] Ensure dataset summary logging includes `failOnThreshold`.
- [x] Add or update tests validating metric behavior and threshold failure path.
- [x] Document the new metric in observability docs.
- Exit criteria:
  - Metric visible in Prometheus and covered by tests.

### M5 - Closure Verification and Plan Finalization (target: 2026-03-04)

- [x] Run focused backend tests for modified areas.
- [x] Verify new docs are cross-linked from masterplan and migration checklist.
- [x] Update `operational-readiness-masterplan.md` with completion statuses and final checklist.
- [x] Run broader backend regression suite before release cut.
- [x] Capture final release sign-off timestamp and owner.
- Exit criteria:
  - All masterplan items are marked done or explicitly deferred with owner/date.

## Risks and Controls

- Risk: Docs drift from real config keys.
  - Control: Build checklist directly from `backend/src/main/resources/application.yml`.
- Risk: Metric added but not emitted in startup path.
  - Control: Unit test with `SimpleMeterRegistry` plus startup-path assertion.
- Risk: Incident runbook too generic.
  - Control: Include concrete commands and threshold-based actions.

## Definition of Done

- [x] All M2-M5 exits are met.
- [x] `docs/plans/operational-readiness-masterplan.md` reflects actual final status.
- [x] Backend tests pass for impacted files.
