---
title: Recurring host SaaS M3 billing and host-surface progress
type: report
status: active
date: 2026-03-06
track: recurring-host-saas
milestone: M3
---

# Recurring Host SaaS M3 Billing and Host-Surface Progress

## Metadata

- Date: 2026-03-06
- Branch: `fix/white-label-continuation`
- Active track: `recurring-host-saas`
- Active milestone: `M3 Billing and Payment Hardening`

## Gate Commands

The following validation commands executed successfully in the current workspace:

1. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.test.jsx src/App.server-mode.test.jsx src/App.smoke.test.jsx src/api.test.js`
2. `mvn -q -f backend/pom.xml "-Dtest=SecurityConfigTest,GameSessionControllerTest,RoomControllerTest,GameSessionServiceTest,RoomServiceTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
3. `npm --prefix frontend run build`
4. `npm run validate:masterplan:refs`
5. `npm run validate:no-bom:docs`

## M3 Evidence Landed

### 1. Runtime now reads canonical plan and capability state

Observed result:

1. `/api/me/tenant-capabilities` is now exposed for runtime member sessions.
2. `fetchTenantRuntimeSnapshot()` loads subscription plus capability state in one canonical read path.
3. Host UI shows plan-state information from runtime capability data instead of inferring everything locally.

### 2. Billing hardening remains on the trusted path

Observed result:

1. checkout creation is config-backed,
2. webhook signature verification remains mandatory,
3. stale and duplicate billing events still reconcile safely,
4. runtime host launch behavior now reacts to canonical subscription state and capability state together,
5. checkout URLs now carry explicit success/cancel return paths for provider handoff,
6. frontend blocked-billing state now exposes a direct recovery checkout link instead of only a passive status message.

## Forward Progress Already Landed

To keep milestone promotion honest, the work below is classified as progress beyond the currently active `M3`.

### M4 progress landed but not promoted done

1. host workspace panel now surfaces subscription, usage, and recent-activity context in product UI,
2. room/game runtime is tenant-scoped on the authenticated host path,
3. cross-tenant room/game access rejection remains green,
4. full host create -> player join -> replay/history workflow is still incomplete.

### M5 groundwork landed but milestone is not yet promotable

1. a simple runtime packaging matrix now exists: `trial` vs `pro_host`,
2. runtime capabilities are read from backend instead of being frontend-only assumptions,
3. trial plan now blocks host analytics/history endpoints,
4. hosted game creation now enforces a player-cap boundary for trial sessions,
5. frontend shows an upgrade boundary prompt when host player count exceeds current plan capability.

## Honest Status

`M3 Billing and Payment Hardening` remains active and is not promoted done yet because:

1. a real external billing provider is not yet integrated end-to-end,
2. paid checkout completion is not yet proven beyond local/config-backed redirect construction,
3. payment failure and recovery behavior still needs milestone-grade documentation as a completed commercial path.

Current truthful execution state:

1. `M3` remains the only active milestone,
2. `M4` host workspace/product-surface work has advanced materially,
3. `M5` entitlement rails have begun and now exist in runtime code and tests.
