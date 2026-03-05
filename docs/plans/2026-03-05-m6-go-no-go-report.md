---
title: SmartIQ white-label M6 go/no-go report
type: gate-report
status: final
date: 2026-03-05
owner: Agent 0
---

# SmartIQ White-Label M6 Go/No-Go Report

## Decision

GO (pilot scope).

Scope of GO:
1. White-label pilot environments and onboarding.
2. Tenant branding/settings/subscription runtime flow.
3. Usage ingestion with deterministic plan-limit guardrails.

## Evidence Summary

### Backend

1. White-label migration validation passed:
   - `npm run validate:flyway:migrations`
2. White-label backend slices passed:
   - `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`

### Frontend

1. Admin + runtime contract tests passed:
   - `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx src/App.test.jsx src/App.startup.test.jsx src/App.server-mode.test.jsx src/App.tenant-runtime.test.jsx`
2. Production build passed:
   - `npm --prefix frontend run build`

### Documentation and Plan Integrity

1. Docs BOM validation passed:
   - `npm run validate:no-bom:docs`
2. Masterplan reference validation passed:
   - `npm run validate:masterplan:refs`

## Remaining Risk Notes (non-blocking)

1. Pricing and plan limits are v1 defaults; commercial tuning is expected after first pilots.
2. Limit-rejection audit evidence is backend-only in v1; external reporting automation can be improved in follow-up.
3. Pilot KPI reporting still requires consistent sales ops input discipline.

## Post-Gate Action

1. Open first pilot tenant using the M5 onboarding flow.
2. Track conversion metrics weekly using frozen M5 definitions.
3. Raise a focused PR only when pilot evidence requires contract or guardrail adjustments.
