---
title: Recurring host SaaS M5 entitlement evidence
type: report
status: completed
date: 2026-03-06
track: recurring-host-saas
milestone: M5
---

# Recurring Host SaaS M5 Entitlement Evidence

## Metadata

- Date: 2026-03-06
- Branch: `main`
- Track: `recurring-host-saas`
- Milestone: `M5 Paid Value and Entitlement Enforcement`
- Result: `DONE`

## What Landed

### Paid capabilities now map to real runtime behavior

Observed result:

1. hosted player cap blocks oversized live launches in runtime,
2. analytics/history read paths stay blocked outside paid capability state,
3. custom branding is enforced through runtime host APIs and host workspace UI,
4. session templates are now a real paid workflow instead of a capability-only placeholder.

### Session templates became a paid host workflow

Observed result:

1. runtime settings now support canonical `host.sessionTemplates`,
2. runtime members on entitled plans can save current host setup as reusable templates,
3. saved templates can be applied back into topic, language, theme, and roster setup,
4. saved templates can be deleted from host workspace,
5. trial plans are blocked from template save/delete through runtime API and UI.

### Paid activation remains deterministic

Observed result:

1. billing return refresh continues to re-sync runtime entitlements in-session,
2. paid capabilities unlock immediately after refreshed runtime snapshot arrives,
3. upgrade CTAs exist at player-cap, branding, analytics/history, and template boundaries.

## Definition Of Done Check

`M5` definition of done is satisfied:

1. at least 3 meaningful paid capabilities are enforced in runtime:
   - hosted player cap,
   - analytics/history,
   - custom branding,
   - session templates,
2. upgrade flow is reachable from product friction points,
3. paid activation removes restrictions immediately and deterministically,
4. entitlements are enforced on host actions, not only internal admin APIs.

## Validation

The following checks executed successfully after the final `M5` slice:

1. `mvn -q -f backend/pom.xml "-Dtest=TenantMeControllerTest" test`
2. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.server-mode.test.jsx src/App.test.jsx src/App.smoke.test.jsx src/api.test.js`

## Promotion Decision

`M5 Paid Value and Entitlement Enforcement` is promotable and marked `DONE`.

Next active milestone:

1. `M6 Pilot Conversion and Retention Proof`
