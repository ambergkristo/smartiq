---
title: Recurring host SaaS M5 entitlement progress
type: report
status: active
date: 2026-03-06
track: recurring-host-saas
milestone: M5
---

# Recurring Host SaaS M5 Entitlement Progress

## Metadata

- Date: 2026-03-06
- Branch: `main`
- Track: `recurring-host-saas`
- Active milestone: `M5 Paid Value and Entitlement Enforcement`

## Progress Landed

### Three runtime capabilities now enforce real host behavior

Observed result:

1. hosted player cap remains enforced on server game-session creation and surfaced in setup UI,
2. analytics/history remains enforced on runtime audit and usage read paths, not only hidden in UI,
3. custom branding is now enforced through a runtime host route instead of existing only as an internal/admin concern.

### Custom branding is now a host-facing paid boundary

Observed result:

1. runtime members can update tenant branding from `/api/me/tenant-branding`,
2. backend blocks branding updates when the current plan does not include custom branding,
3. backend also blocks branding updates for non-owner/non-admin runtime roles,
4. host workspace now exposes a dedicated branding card with locked vs editable states,
5. successful branding updates apply immediately to host shell title and runtime accent colors.

### Billing return now re-syncs entitlements into runtime

Observed result:

1. app detects checkout return paths on `/billing/success` and `/billing/cancel`,
2. successful billing return triggers runtime snapshot refresh attempts instead of waiting for arbitrary manual reload timing,
3. when updated subscription/capability state arrives, the host workspace removes paid restrictions immediately in the same session,
4. cancel return shows deterministic messaging that plan state did not change.

## Validation

The following checks executed successfully after this progress slice:

1. `mvn -q -f backend/pom.xml "-Dtest=TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
2. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.server-mode.test.jsx src/App.test.jsx src/App.smoke.test.jsx src/api.test.js`

## Honest Status

This document captures an earlier `M5` progress slice.

Canonical completion evidence now lives in:

1. `docs/reports/2026-03-06-recurring-host-saas-m5-entitlement-evidence.md`
