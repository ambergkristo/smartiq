---
title: SmartIQ quiz night SaaS gates v1
type: gates
status: completed
date: 2026-03-06
owner: Agent 0
masterplan: docs/plans/2026-03-06-quiz-night-saas-masterplan-v1.md
milestones: docs/plans/2026-03-06-quiz-night-saas-milestones-v1.md
---

> This document was archived after the project pivot from SmartIQ to CherryPick.

# SmartIQ Quiz Night SaaS Gates v1

## Global Gate Rules

1. Every milestone must pass all required checks before promotion.
2. All touched-scope tests must be green.
3. Critical/High unresolved findings block promotion.
4. Evidence must be linkable and reproducible from repo docs.

## Milestone Gate Checklists

### M0 Gate - Planning Baseline

Required checks:
1. `npm run validate:no-bom:docs`
2. `npm run validate:masterplan:refs`

Required evidence:
1. Quiz Night SaaS masterplan exists and is active.
2. Milestones and gates docs exist and are cross-linked.
3. `README.md` and `docs/plans/README.md` reference this track.

### M1 Gate - Self-Serve Onboarding Skeleton

Required checks:
1. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.test.jsx src/App.server-mode.test.jsx`
2. `mvn -q -f backend/pom.xml "-Dtest=SecurityConfigTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`

Required evidence:
1. onboarding flow sequence note (entry -> identity context -> first game setup),
2. runtime context contract verification note,
3. startup error-state behavior verification note.

### M2 Gate - Subscription Foundation

Required checks:
1. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
2. `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx`

Required evidence:
1. checkout initiation contract note,
2. billing-event ingestion and subscription-sync note,
3. idempotency note for duplicate billing events.

### M3 Gate - Plan Limits and Entitlements

Required checks:
1. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest" test`
2. `npm --prefix frontend run test -- --run src/App.tenant-runtime.test.jsx src/admin/AdminConsole.test.jsx`

Required evidence:
1. free-tier capability limit matrix,
2. deterministic `PLAN_LIMIT_REACHED` behavior proof,
3. upgrade-unlock behavior proof.

### M4 Gate - Quiz Night Product Surface v1

Required checks:
1. `npm --prefix frontend run test -- --run src/App.smoke.test.jsx src/components/GameBoard.test.jsx`
2. `npm --prefix frontend run build`
3. `mvn -q -f backend/pom.xml "-Dtest=GameSessionControllerTest,RoomControllerTest,RoomServiceTest" test`

Required evidence:
1. host create-room and invite flow proof,
2. guest join and complete-game flow proof,
3. replay/new-game loop proof.

### M5 Gate - Conversion Surface

Required checks:
1. `npm --prefix frontend run test -- --run src/App.test.jsx src/App.server-mode.test.jsx src/admin/AdminConsole.test.jsx`
2. `npm --prefix frontend run build`

Required evidence:
1. pricing-to-upgrade funnel event mapping,
2. upgrade prompt behavior proof on entitlement boundary,
3. paid activation state visibility proof.

### M6 Gate - Retention Loop

Required checks:
1. `npm run report:beta:summary`
2. touched-scope backend and frontend tests green

Required evidence:
1. generated 7-day retention report artifact,
2. retention KPI interpretation note,
3. corrective iteration note if target is missed.

### M7 Gate - Operational Readiness

Required checks:
1. `npm run release:check`
2. `npm run gate:phase7:dry-run`

Required evidence:
1. runbook updates for onboarding/billing/gameplay incidents,
2. monitoring and alert ownership table,
3. rollback drill outcome note.

### M8 Gate - Final Go/No-Go

Required checks:
1. `npm run release:check`
2. all required checks from M0..M7 remain green

Required evidence:
1. final launch go/no-go report with explicit `GO`,
2. completion-definition checklist (all 8 items marked satisfied),
3. blocker register shows no unresolved Critical/High items.

### M9 Gate - Post-Launch Hardening Package

Required checks:
1. `npm run validate:no-bom:docs`
2. `npm run validate:masterplan:refs`
3. `npm run release:check`

Required evidence:
1. post-launch hardening package report exists with 30-day cadence and owners,
2. operational risk register and mitigations are listed with severity,
3. prioritized hardening backlog is linked with target sprint ownership.

## Promotion Formula

A milestone is promotable only if all are true:
1. DoD is complete in milestones doc.
2. Gate checklist is complete in this document.
3. Evidence links exist in milestone artifacts.
4. No unresolved Critical/High findings remain.
5. Program closure requires `M0..M9` all green and `M8` final go/no-go = `GO`.
