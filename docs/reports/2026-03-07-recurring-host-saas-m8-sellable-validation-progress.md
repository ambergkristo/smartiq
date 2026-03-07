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

## Validation

The following checks executed successfully after this progress slice:

1. `node tools/generate_recurring_host_go_no_go_pack.js --summary-json=tools/fixtures/recurring_host_pilot_summary.sample.json --output=<temp>`
2. `node tools/generate_recurring_host_operating_plan.js --summary-json=tools/fixtures/recurring_host_pilot_summary.sample.json --output=<temp>`
3. `node tools/validate_recurring_host_sellable_saas_gate.js --summary-json=tools/fixtures/recurring_host_pilot_summary.sample.json --go-no-go-output=<temp> --operating-plan-output=<temp>`

## Honest Status

1. `M8` technical artifact generation is now underway even though `M7` still has a live deploy verification blocker,
2. the artifact chain is ready to consume real recurring-host summary JSON as soon as live narrow-launch proof is stable,
3. `M8` is not promotable done because sellable-SaaS proof still depends on real paying hosts, repeatable segment evidence, and a final go/no-go recommendation grounded in real usage.
