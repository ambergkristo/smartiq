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

### M6 pilot gate automation now exists

Observed result:

1. repo now exposes `npm run validate:m6:recurring-host:pilot-gate`,
2. the gate runs touched-scope backend and admin frontend tests before generating the pilot summary,
3. the gate can emit a machine-readable JSON summary and optionally fail when live pilot thresholds are still below target.

### Canonical pilot evidence-pack generator now exists

Observed result:

1. repo now exposes `npm run report:recurring-host:pilot-evidence`,
2. the evidence pack consumes the pilot summary JSON and writes a founder-readable M6 interpretation report,
3. the report highlights activated hosts, repeat hosts, paid conversions, open blockers with owners, onboarding blockers, upgrade blockers, and recent fixes,
4. the pilot gate now emits both the summary report and the evidence pack in one run.

### Canonical pilot capture command now exists

Observed result:

1. repo now exposes `npm run report:recurring-host:pilot-capture`,
2. one command can write summary markdown, summary JSON, evidence markdown, and gate JSON into a target output directory,
3. live pilot artifact capture now has a canonical file-naming path for `docs/reports`.

### Live pilot capture has now been executed against the deployed backend

Observed result:

1. GitHub Actions workflow `Recurring Host Pilot Capture` completed successfully on 2026-03-06 UTC with runs `22786841828` and `22786955543`,
2. the first live run confirmed that the workflow, backend URL, and internal API key path are all working end-to-end,
3. the second live run widened the capture from `status=active` to all tenant statuses and still returned `0` total tenants from `https://smartiq-63tk.onrender.com`,
4. current blocker is no live recurring-host tenant volume in the connected backend, not missing telemetry or broken capture tooling.

### Live pilot seeding and post-deploy capture now work end-to-end

Observed result:

1. GitHub Actions workflow `Recurring Host Pilot Seed` now succeeds against `https://smartiq-63tk.onrender.com`,
2. the deployed backend now accepts fresh-tenant `usage-summary` and `pilot-summary` reads without `500` errors,
3. live capture run `22787672040` now reports `3` active tenants, `3` activated hosts, and `2` repeat hosts,
4. `M6` remains below definition of done because live proof is still short of the required `10` activated hosts and `5` repeat hosts,
5. the remaining blocker is now real pilot volume and support ownership depth, not workflow wiring or backend path failure.

### Bootstrap-seeded cohorts no longer count toward M6 readiness

Observed result:

1. live bootstrap seeding can now create a `10`-tenant non-empty cohort with repeat-host, paid-conversion, and support-case signals,
2. live capture run `22787860123` briefly returned `READY` on raw totals alone, which exposed that bootstrap-seeded tenants could incorrectly satisfy the gate,
3. the pilot summary and evidence tooling now classifies tenants with the bootstrap pilot slug family as `bootstrap-seeded` and excludes them from `M6` threshold counts,
4. the corrected live capture run `22787954955` now reports `10` bootstrap-seeded tenants, `0` real pilot tenants, `0` real activated hosts, `0` real repeat hosts, and `thresholdStatus = NOT_YET`,
5. the remaining blocker is therefore explicitly real founder-assisted pilot usage, not missing product, telemetry, or automation rails.

## Validation

The following checks executed successfully after this progress slice:

1. `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,GameSessionControllerTest,BillingServiceTest" test`
2. `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx`
3. `node tools/generate_recurring_host_pilot_summary.js --snapshot=tools/fixtures/recurring_host_pilot_summary.sample.json --output=<temp>`
4. `node tools/validate_recurring_host_pilot_gate.js --snapshot=tools/fixtures/recurring_host_pilot_summary.sample.json`
5. `node tools/generate_recurring_host_pilot_evidence.js --summary-json=<temp-json> --output=<temp>`
6. `node tools/run_recurring_host_pilot_capture.js --snapshot=tools/fixtures/recurring_host_pilot_summary.sample.json --output-dir=<temp-dir>`

## Honest Status

`M6 Pilot Conversion and Retention Proof` remains active and is not promotable done yet because:

1. live recurring-host pilot artifacts now exist, but the latest corrected live capture reports `0` real pilot tenants and treats the entire current `10`-tenant cohort as bootstrap-seeded,
2. support/feedback loop now exists internally and is non-empty, but the recorded cases are still bootstrap evidence rather than founder-assisted real pilot proof,
3. repeat-host and paid-retention interpretation still needs a canonical report/evidence pack from real usage above the `M6` threshold.
