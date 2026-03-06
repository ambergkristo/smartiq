---
title: Recurring host SaaS M6 pilot metrics progress
type: report
status: active
date: 2026-03-06
track: recurring-host-saas
milestone: M6
---

# Recurring Host SaaS M6 Pilot Metrics Progress

## Metadata

- Date: 2026-03-06
- Branch: `main`
- Track: `recurring-host-saas`
- Active milestone: `M6 Pilot Conversion and Retention Proof`

## Progress Landed

### Runtime pilot telemetry is now emitted from real host actions

Observed result:

1. onboarding bootstrap writes `host.workspace.bootstrapped`,
2. sign-in completion writes `host.auth.completed`,
3. live launch writes `host.session.started`,
4. duplicate launch writes `host.session.duplicated`,
5. resume control writes `host.session.resumed`,
6. game completion writes `host.session.completed`,
7. checkout initiation writes `billing.checkout.started`,
8. subscription lifecycle sync writes billing activation/update/cancel events.

### Founder-facing pilot summary now exists in admin operations

Observed result:

1. admin API now reads internal tenant usage summary directly,
2. admin console renders a pilot-metrics card over canonical usage-summary rows,
3. founder/operator can see bootstraps, host sign-ins, session launches, duplicate/resume actions, completed sessions, upgrade attempts, and paid activations without manual log parsing.

### Lightweight pilot support loop now exists in admin operations

Observed result:

1. internal admin API can create, list, and update tenant support cases without a new persistence table,
2. support cases are stored as canonical tenant audit evidence under `support_case`,
3. founder/operator can log onboarding, live-run, billing, or retention blockers with owner and next step,
4. pilot summary now derives support-load and friction status from both usage summary and support cases.

### Canonical pilot-summary artifact generator now exists

Observed result:

1. repo now exposes `npm run report:recurring-host:pilot-summary`,
2. the generator can read live internal admin telemetry or a snapshot file for reproducible dry-runs,
3. the markdown report aggregates activated hosts, repeat hosts, paid conversions, support load, risk mix, and tenant-by-tenant recommendations.

## Validation

The following checks executed successfully after this progress slice:

1. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,GameSessionControllerTest,BillingServiceTest" test`
2. `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx`
3. `node tools/generate_recurring_host_pilot_summary.js --snapshot=tools/fixtures/recurring_host_pilot_summary.sample.json --output=<temp>`

## Honest Status

`M6 Pilot Conversion and Retention Proof` remains active and is not promotable done yet because:

1. telemetry is now captured, but no recurring-host pilot summary artifact has been generated from live recurring-host usage yet,
2. support/feedback loop now exists internally, but it is not yet backed by actual recurring-host pilot volume,
3. repeat-host and early paid-retention interpretation still needs a canonical report/evidence pack from real usage.
