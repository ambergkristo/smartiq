---
title: Recurring host SaaS M7 launch surface progress
type: report
status: active
date: 2026-03-07
track: recurring-host-saas
milestone: M7
---

# Recurring Host SaaS M7 Launch Surface Progress

## Metadata

- Date: 2026-03-07
- Branch: `main`
- Track: `recurring-host-saas`
- Milestone status: `M7 technical track in progress`

## Progress Landed

### Public conversion surface now exists in the product shell

Observed result:

1. unauthenticated hosts now see a launch-focused recurring-host panel before onboarding and sign-in,
2. the surface is written for the locked wedge of small professional recurring quiz hosts,
3. the panel presents the launch plan structure clearly:
   - `Trial`,
   - `Pro Host`,
   - `Team/Agency later`,
4. product value is framed around branded live sessions, repeat-host workflow, billing recovery, and support readiness rather than generic quiz-engine copy.

### Public CTA path now connects directly into the host flows

Observed result:

1. `Start free host trial` focuses the onboarding workspace form,
2. `Sign in to existing workspace` focuses the runtime sign-in form,
3. the public surface therefore routes directly into the canonical host conversion path instead of leaving the user on a dead marketing screen.

### Narrow-launch ops artifacts now exist for recurring-host telemetry

Observed result:

1. repo now exposes `npm run report:recurring-host:launch-kpi`,
2. the launch KPI dashboard consumes recurring-host pilot summary JSON and emits a narrow-launch scoreboard over:
   - real activated hosts,
   - real repeat hosts,
   - real paid conversions,
   - auth/billing/live-session watchlists,
3. the dashboard explicitly separates bootstrap-seeded tenants from real pilot tenants,
4. a recurring-host incident runbook now exists for auth, billing, and live-session launch failures,
5. repo now exposes `npm run validate:m7:recurring-host:launch-gate` to aggregate release readiness, alert validation, launch smoke, and recurring-host KPI snapshot generation into one technical gate.

### Launch gate blockers in lint and smoke tooling were reduced to real deploy issues

Observed result:

1. frontend release-readiness no longer fails on `api.test.js` fetch globals or `AdminConsole.jsx` hook dependency drift,
2. post-deploy smoke no longer assumes `AbortController` timeout semantics or a single hard-coded topic path,
3. runtime deck verification can now resolve a playable topic from `/api/topics` instead of assuming a topicless `nextRandom` call is always valid,
4. `M7` technical gate therefore now fails on real live deck availability, not on avoidable local lint/tooling defects.

### Public topic discovery now matches playable public card sources better

Observed result:

1. `/api/topics` now counts only public/playable languages and allowed sources,
2. `flyway-seed-core` fallback cards are now treated as an allowed public source, matching the migration intent for environments without JSON import,
3. a new regression test protects against leaking `et`-disabled or deprecated-only topics into the public topic list,
4. a new seeded-fallback regression test protects public `nextRandom` serving for flyway-seeded environments.

## Validation

The following checks executed successfully after this progress slice:

1. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.server-mode.test.jsx src/App.test.jsx src/api.test.js`
2. `npm --prefix frontend run build`
3. `node tools/generate_recurring_host_pilot_summary.js --snapshot=tools/fixtures/recurring_host_pilot_summary.sample.json --json-output=<temp> --output=<temp>`
4. `node tools/generate_recurring_host_launch_kpi_dashboard.js --summary-json=<temp> --output=<temp>`
5. `node tools/validate_recurring_host_launch_gate.js --summary-json=<temp> --skip-release-check --skip-smoke --skip-alert-validation`
6. `npm --prefix frontend run lint`
7. `npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx src/api.test.js src/App.startup.test.jsx`
8. `mvn -q -f backend/pom.xml "-Dtest=CardControllerTest,CardControllerTopicCountsLanguageFilterTest,SeedDataMigrationTest,SecurityConfigTest" test`

## Honest Status

1. `M7` public conversion surface is now in progress and product-real,
2. `M6` remains deferred as an external proof dependency because real pilot usage is still missing,
3. `M7` now has a recurring-host KPI snapshot path, incident runbook, frontend release-readiness fixes, and hardened smoke/runtime-deck tooling,
4. the current live blocker is specific and honest: the deployed backend at `https://smartiq-63tk.onrender.com` still needs the new public-topic/fallback-source code before launch smoke can pass against production,
5. `M7` is therefore not promotable done yet because live production monitoring validation, launch-scope smoke proof, and final blocker review still need a post-deploy evidence slice.
