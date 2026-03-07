---
title: Recurring host SaaS M8 sellable validation progress
type: report
status: active
date: 2026-03-07
track: recurring-host-saas
milestone: M8
---

# Recurring Host SaaS M8 Sellable Validation Progress

## Metadata

- Date: 2026-03-07
- Branch: `main`
- Track: `recurring-host-saas`
- Milestone status: `M8 technical track in progress`

## Progress Landed

### Sellable-SaaS evidence artifacts now have canonical generators

Observed result:

1. repo now exposes `npm run report:recurring-host:go-no-go-pack`,
2. repo now exposes `npm run report:recurring-host:operating-plan`,
3. the go/no-go pack consumes recurring-host pilot summary JSON and emits an explicit recommendation:
   - `GO_NARROW_SCALE`,
   - `CONTINUE_PILOT`,
   - `NO_GO_SELLABLE`,
4. the operating-plan generator emits a founder-readable 12-month plan based on real activation, repeat-host, paid-conversion, and support-friction signals.

### `M8` now has a technical gate wrapper for artifact continuity

Observed result:

1. repo now exposes `npm run validate:m8:recurring-host:sellable-gate`,
2. the wrapper generates the canonical go/no-go pack and operating plan from the same pilot-summary input,
3. the wrapper returns an honest `externalProofDeferred` flag until real activation/repeat/paid thresholds exist.

### Live sellable-SaaS artifacts now generate from the latest recurring-host summary

Observed result:

1. the latest live recurring-host summary now produces a canonical `NO_GO_SELLABLE` pack,
2. the same live summary now produces a 12-month operating plan grounded in real-vs-bootstrap cohort separation,
3. the live `M8` gate remains honestly deferred because real activated/repeat/paid counts are still `0/0/0`.

### Founder-facing sellable readiness now exists inside admin ops

Observed result:

1. the `Usage & Audit` tab now includes a dedicated `Sellable readiness` section derived from live `pilotSummary + usageSummary` data,
2. the section translates raw pilot state into a readable per-tenant signal such as `Activation signal`, `Repeat-host signal`, or `Repeatable paid signal`,
3. founder can now see explicit proof gaps like missing paid conversion or open support friction without leaving the product for offline artifact generation,
4. this does not replace the canonical go/no-go pack, but it reduces the gap between raw telemetry and day-to-day commercial decision-making.

## Validation

The following checks executed successfully after this progress slice:

1. `node tools/generate_recurring_host_go_no_go_pack.js --summary-json=tools/fixtures/recurring_host_pilot_summary.sample.json --output=<temp>`
2. `node tools/generate_recurring_host_operating_plan.js --summary-json=tools/fixtures/recurring_host_pilot_summary.sample.json --output=<temp>`
3. `node tools/validate_recurring_host_sellable_saas_gate.js --summary-json=tools/fixtures/recurring_host_pilot_summary.sample.json --go-no-go-output=<temp> --operating-plan-output=<temp>`
4. `node tools/generate_recurring_host_go_no_go_pack.js --summary-json=.tmp/m6-live-artifacts-5/recurring-host-pilot-22787954955/2026-03-07-recurring-host-saas-m6-pilot-22787954955-summary.json --output=<temp>`
5. `node tools/generate_recurring_host_operating_plan.js --summary-json=.tmp/m6-live-artifacts-5/recurring-host-pilot-22787954955/2026-03-07-recurring-host-saas-m6-pilot-22787954955-summary.json --output=<temp>`
6. `node tools/validate_recurring_host_sellable_saas_gate.js --summary-json=.tmp/m6-live-artifacts-5/recurring-host-pilot-22787954955/2026-03-07-recurring-host-saas-m6-pilot-22787954955-summary.json --go-no-go-output=<temp> --operating-plan-output=<temp>`
7. `npm --prefix frontend run test -- --run src/admin/AdminConsole.test.jsx`
8. `npm --prefix frontend run lint`
9. `npm --prefix frontend run build`

## Honest Status

1. `M7` launch readiness is now technically complete on live production surfaces, so `M8` is the active follow-on technical milestone,
2. the artifact chain is now proven against both sample data and the latest live recurring-host summary JSON,
3. founder now has an in-product sellable-readiness read model, but it still reflects the same underlying reality as the offline artifacts,
4. the current live recommendation is honestly `NO_GO_SELLABLE`,
5. `M8` is not promotable done because sellable-SaaS proof still depends on real paying hosts, repeatable segment evidence, and a final go/no-go recommendation grounded in real usage.
