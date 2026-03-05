---
title: SmartIQ white-label gates v4 (product-first rebaseline)
type: gates
status: active
date: 2026-03-05
owner: Agent 0
masterplan: docs/plans/2026-03-05-white-label-masterplan-v3-business-first.md
milestones: docs/plans/2026-03-05-white-label-milestones-v3.md
---

# SmartIQ White-Label Gates v4

## Global Gate Rules

1. Every milestone must pass required checks before promotion.
2. All touched-scope tests must be green.
3. Critical/High unresolved findings block promotion.
4. Evidence must be linkable and reproducible from repo docs.

## Milestone Gate Checklists

### M0 Gate - Planning Baseline

Required checks:
1. `npm run validate:no-bom:docs`
2. `npm run validate:masterplan:refs`

Required evidence:
1. Canonical masterplan/milestones/gates links are valid.

### M1 Gate - Product Direction Lock (Non-Blocking for Core Build)

Required checks:
1. ICP, packaging, and use-case lock are documented.

Required evidence:
1. Product direction artifact is present and versioned.

Policy:
1. M1 is non-blocking for core engine build.
2. Commercial proof is tracked as post-launch workstream.

### M2 Gate - IP Hygiene Baseline

Required checks:
1. `npm run validate:m2:ip-risk-gate`

Required evidence:
1. `docs/plans/2026-03-05-m2-copy-delta-register.csv`
2. `docs/plans/2026-03-05-m2-branding-asset-provenance.csv`
3. `docs/plans/2026-03-05-m2-legal-ip-assessment.md`

### M3 Gate - Auth and Tenant Isolation

Required checks:
1. `npm run validate:m3:tenant-isolation-gate`

Required evidence:
1. `docs/plans/2026-03-05-m3-auth-tenant-isolation-report.md`

### M4 Gate - Runtime White-Label

Required checks:
1. `npm run validate:m4:runtime-gate`

Required evidence:
1. `docs/plans/2026-03-05-m4-runtime-white-label-report.md`

### M5 Gate - Admin Operations

Required checks:
1. `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx`
2. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest" test`

Required evidence:
1. Admin contract alignment report with zero blocking mismatches.

### M6 Gate - Billing and Usage

Required checks:
1. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`

Required evidence:
1. Limit-breach and usage-period evidence with stable error semantics.

### M7 Gate - Production Reliability

Required checks:
1. `npm run gate:local`

Required evidence:
1. Observability and reliability evidence pack with alert coverage.

### M8 Gate - Launch Readiness

Required checks:
1. `npm run validate:flyway:migrations`
2. `npm --prefix frontend run build`

Required evidence:
1. Release checklist completion.
2. Rollback drill completion.
3. Runbook ownership completion.

### M9 Gate - Final GA Sign-Off

Required checks:
1. All previous milestone gates are green.
2. No unresolved Critical/High issues.

Required evidence:
1. Final GA handoff package for engineering and ops.

## Promotion Formula

A milestone is promotable only if all are true:
1. DoD is complete in milestones doc.
2. Gate checklist is complete in this document.
3. Evidence links exist in milestone artifacts.
4. No unresolved Critical/High findings remain.
