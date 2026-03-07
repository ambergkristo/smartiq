---
title: SmartIQ recurring host SaaS gates v1
type: gates
status: active
date: 2026-03-06
owner: Agent Strategy-Builder
masterplan: docs/plans/2026-03-06-recurring-host-saas-masterplan-v1.md
milestones: docs/plans/2026-03-06-recurring-host-saas-milestones-v1.md
---

# SmartIQ Recurring Host SaaS Gates v1

## Global Gate Rules

1. Every milestone must pass all required checks before promotion.
2. Touched-scope tests must be green in the current workspace.
3. Commercial milestones cannot be promoted using fixture-only evidence.
4. Critical/High unresolved findings block promotion.
5. Every milestone must publish reproducible evidence artifacts.

## Milestone Gates

### M0 Gate - Strategy Baseline

Required checks:
1. `npm run validate:no-bom:docs`
2. `npm run validate:masterplan:refs`

Required evidence:
1. new recurring-host strategy docs exist and cross-link correctly,
2. ICP, product definition, and completion definition are explicit,
3. inherited gaps from previous track are listed.

### M1 Gate - Product Stabilization

Required checks:
1. `npm --prefix frontend run test -- --run src/App.test.jsx src/App.server-mode.test.jsx src/App.smoke.test.jsx src/components/GameBoard.test.jsx`
2. `mvn -q -f backend/pom.xml "-Dtest=GameSessionControllerTest,RoomControllerTest,RoomServiceTest" test`
3. `npm --prefix frontend run build`

Required evidence:
1. fixed-runtime regression note,
2. canonical host flow note,
3. launch-language content quality note.

### M2 Gate - Real Auth and Trust Hardening

Required checks:
1. auth-context and security backend suites are green,
2. frontend auth/session tests are green,
3. no production path depends on unsigned bootstrap auth tokens.

Required evidence:
1. auth flow sequence note,
2. production token verification note,
3. sign-in to first session proof,
4. trust hardening note for removed shortcuts.

### M3 Gate - Billing and Payment Hardening

Required checks:
1. billing backend suites are green,
2. webhook replay/idempotency tests are green,
3. frontend checkout and subscription-state tests are green.

Required evidence:
1. checkout to subscription activation proof,
2. webhook verification note,
3. billing failure/recovery note,
4. payment hardening note.

### M4 Gate - Full Host/Join/Replay Canonical Flow

Required checks:
1. touched-scope frontend tests for host dashboard and runtime flow are green,
2. touched-scope backend tests for tenant-bound room/game behavior are green,
3. `npm --prefix frontend run build`

Required evidence:
1. tenant-bound room/session contract note,
2. host dashboard flow proof,
3. cross-tenant isolation proof,
4. host create -> player join -> replay flow proof.

### M5 Gate - Paid Value and Entitlements

Required checks:
1. entitlement enforcement tests are green,
2. runtime capability read-path tests are green,
3. frontend upgrade boundary tests are green.

Required evidence:
1. packaging matrix,
2. paid capability enforcement proof,
3. upgrade boundary prompt proof.

### M6 Gate - Pilot Conversion and Retention Proof

Required checks:
1. `npm run report:recurring-host:pilot-summary` generates a production analytics summary from real telemetry,
2. `npm run validate:m6:recurring-host:pilot-gate` passes in the live pilot environment,
3. pilot metrics artifact published,
4. pilot evidence pack is published with blocker owners and actions,
5. live artifact capture is reproducible via `npm run report:recurring-host:pilot-capture`,
6. touched-scope product tests remain green,
7. bootstrap-seeded tenants are excluded from readiness counts so the gate cannot pass on synthetic bootstrap data alone.

Required evidence:
1. activated-host count,
2. early paid conversion count,
3. repeat-host count,
4. onboarding and upgrade friction review with actions,
5. explicit separation between bootstrap-seeded cohorts and real pilot cohorts.

### M7 Gate - Narrow Launch Readiness

Required checks:
1. `npm run validate:m7:recurring-host:launch-gate`
2. `npm run release:check`
3. launch-scope smoke checks are green,
4. production monitoring and alert validation is green.

Required evidence:
1. pricing and public conversion surface review,
2. support and rollback playbook proof,
3. launch KPI dashboard snapshot from production data.

### M8 Gate - Sellable Niche SaaS Validation

Required checks:
1. all previous milestone gates remain green,
2. commercial evidence pack is complete,
3. no unresolved Critical/High blockers remain.

Required evidence:
1. at least 3 paying hosts proof,
2. repeatable segment proof,
3. final go/no-go recommendation with next 12-month plan.

### M9 Gate - Host Product Depth

Required checks:
1. host workspace and history/template tests are green,
2. touched-scope backend and frontend tests are green,
3. repeat-host product metrics are regenerated from production data.

Required evidence:
1. saved template or reusable session workflow proof,
2. host history/review proof,
3. repeat-host friction reduction note.

### M10 Gate - Content and Gameplay Depth

Required checks:
1. content quality gates are green for launch packs,
2. touched-scope gameplay mode tests are green,
3. content-system tests are green.

Required evidence:
1. content pack/versioning note,
2. additional gameplay/session mode proof,
3. content freshness and quality review note.

### M11 Gate - Team and Agency Productization

Required checks:
1. multi-host and role/permission tests are green,
2. team/agency tier capability tests are green,
3. touched-scope UI/build checks are green.

Required evidence:
1. multi-host tenant workflow proof,
2. shared asset/template proof,
3. live pilot note for team/agency usage.

### M12 Gate - Mature Niche Product Readiness

Required checks:
1. all previous milestone gates remain green,
2. production retention/revenue/support metrics are reviewed,
3. no unresolved Critical/High blockers remain in the mature host path.

Required evidence:
1. paid retention and repeat-usage evidence,
2. support and operational maturity review,
3. final maturity report with next-phase strategy.

## Promotion Formula

Promotion `M(n)` -> `M(n+1)` is valid only when all are true:
1. milestone DoD is fully satisfied,
2. milestone gate checks are green,
3. milestone evidence exists and is reproducible,
4. blocker register contains no unresolved Critical/High findings.
