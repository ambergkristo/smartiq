---
title: Recurring host SaaS M7 launch readiness evidence
type: report
status: active
date: 2026-03-07
track: recurring-host-saas
milestone: M7
---

# Recurring Host SaaS M7 Launch Readiness Evidence

## Metadata

- Date: 2026-03-07
- Branch: `main`
- Track: `recurring-host-saas`
- Milestone status: `M7 done with deferred M6 external proof`
- Backend: `https://smartiq-63tk.onrender.com`
- Frontend: `https://smartiq-nine.vercel.app`

## Evidence Summary

Observed result:

1. the public recurring-host conversion surface is live and reachable from the production frontend,
2. the narrow-launch technical gate now passes end-to-end against the live production backend and frontend,
3. release readiness, alert validation, public launch smoke, and recurring-host KPI dashboard generation are now reproducible from the repo,
4. the live backend now serves the richer fallback runtime deck shape, so runtime-deck verification no longer blocks narrow launch readiness.

## Live Gate Result

Command:

1. `BACKEND_URL=https://smartiq-63tk.onrender.com FRONTEND_URL=https://smartiq-nine.vercel.app node tools/validate_recurring_host_launch_gate.js --summary-json=.tmp/m6-live-artifacts-5/recurring-host-pilot-22787954955/2026-03-07-recurring-host-saas-m6-pilot-22787954955-summary.json --dashboard-output=.tmp/m7-live-launch-kpi.md`

Observed result:

1. gate result: `ok: true`,
2. `release_readiness`: passed,
3. `launch_alert_validation`: passed,
4. `launch_scope_smoke`: passed,
5. `recurring_host_launch_kpi_dashboard`: passed.

## Production Snapshot Used By The Gate

Observed aggregate from the latest live recurring-host summary:

1. `totalTenants: 10`
2. `activeTenants: 10`
3. `bootstrapSeededTenants: 10`
4. `realPilotTenants: 0`
5. `activatedHosts: 10`
6. `repeatHosts: 5`
7. `paidConversions: 1`
8. `realActivatedHosts: 0`
9. `realRepeatHosts: 0`
10. `realPaidConversions: 0`

Interpretation:

1. `M7` can now use live production data for narrow-launch KPI reporting,
2. this does not promote `M6`, because the live cohort is still bootstrap-only for commercial proof,
3. narrow launch readiness is therefore technically complete even though pilot conversion proof remains externally deferred.

## Supporting Production Checks

The following live checks executed successfully:

1. `API_BASE_URL=https://smartiq-63tk.onrender.com REQUESTS=20 node scripts/verify_runtime_deck.js`
2. `BACKEND_URL=https://smartiq-63tk.onrender.com FRONTEND_URL=https://smartiq-nine.vercel.app node tools/post-deploy-smoke.js`
3. `npm run release:check`
4. `npm run validate:beta:alerts`

## Honest Status

1. `M7` is promotable done because its own operational and public-launch gate is now green on live production surfaces,
2. `M6` remains deferred and unresolved as a commercial-proof dependency because real pilot hosts are still missing,
3. `M8` can proceed only as technical and analytical artifact work until real paying-host evidence exists,
4. no claim in this evidence file should be read as proof that SmartIQ is already commercially validated.
