---
title: SmartIQ white-label gates v3 (business-first)
type: gates
status: active
date: 2026-03-05
owner: Agent 0
masterplan: docs/plans/2026-03-05-white-label-masterplan-v3-business-first.md
milestones: docs/plans/2026-03-05-white-label-milestones-v3.md
---

# SmartIQ White-Label Gates v3

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
1. v3 masterplan exists and is active.
2. milestones and gates docs exist and are cross-linked.
3. README and plans index reference v3 as canonical.

### M1 Gate - Payment Signal

Required checks:
1. `node tools/validate_m1_payment_signal_gate.js docs/plans/2026-03-05-m1-payment-signal-ledger.json`
2. outreach log has >= 10 qualified contacts
3. discovery log has >= 3 calls
4. pilot intent log has >= 2 paid-pilot-ready signals

Required evidence:
1. dated outreach artifact:
   - `docs/plans/2026-03-05-m1-payment-signal-validation.md`
2. dated machine-readable ledger:
   - `docs/plans/2026-03-05-m1-payment-signal-ledger.json`
3. dated call summaries
4. dated pilot-intent table with contact status

### M2 Gate - IP Risk

Required checks:
1. `npm run validate:m2:ip-risk-gate`
2. rebrand copy delta review complete
3. branding asset provenance complete
4. legal/IP assessment note exists

Required evidence:
1. copy-delta register:
   - `docs/plans/2026-03-05-m2-copy-delta-register.csv`
2. branding provenance register:
   - `docs/plans/2026-03-05-m2-branding-asset-provenance.csv`
3. legal/IP assessment note:
   - `docs/plans/2026-03-05-m2-legal-ip-assessment.md`
4. explicit statement: "no known blocking IP risk"
5. owner sign-off with date

### M3 Gate - Auth and Tenant Isolation

Required checks:
1. `npm run validate:m3:tenant-isolation-gate`
2. `npm run validate:flyway:migrations`
3. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest,SecurityConfigTest" test`

Required evidence:
1. tenant boundary and auth report:
   - `docs/plans/2026-03-05-m3-auth-tenant-isolation-report.md`
2. auth status code behavior report (401/403 mapping)

### M4 Gate - Runtime White-Label

Required checks:
1. `npm --prefix frontend run test -- --run src/App.tenant-runtime.test.jsx src/admin/AdminConsole.test.jsx`
2. `npm --prefix frontend run build`

Required evidence:
1. two-tenant runtime proof (same build, different branding)
2. fallback behavior proof for missing tenant fields

### M5 Gate - Billing and Limits

Required checks:
1. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`

Required evidence:
1. limit-breach scenario with deterministic `PLAN_LIMIT_REACHED`
2. usage event query proof by billing period

### M6 Gate - Closed Beta Retention

Required checks:
1. onboarding flow checklist complete for all beta tenants
2. retention report calculated with 7-day window

Required evidence:
1. tenant-by-tenant retention table
2. corrective plan if target is missed

### M7 Gate - Pilot Conversion

Required checks:
1. two pilots signed with paid terms
2. onboarding completion recorded for both pilots

Required evidence:
1. signed terms metadata (commercial details can be redacted)
2. start date + first-value date for each pilot

### M8 Gate - Final Go/No-Go

Required checks:
1. `npm run validate:flyway:migrations`
2. `npm --prefix frontend run build`
3. release runbook check complete
4. rollback drill evidence complete

Required evidence:
1. final go/no-go report with blockers closed or accepted
2. production launch owner + backup owner list

## Promotion Formula

A milestone is promotable only if all are true:
1. DoD is complete in milestones doc.
2. Gate checklist is complete in this document.
3. Evidence links exist in milestone artifacts.
4. No unresolved Critical/High findings remain.
