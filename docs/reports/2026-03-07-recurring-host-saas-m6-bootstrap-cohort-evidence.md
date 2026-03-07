---
title: Recurring host SaaS M6 bootstrap cohort evidence
type: report
status: active
date: 2026-03-07
track: recurring-host-saas
milestone: M6
---

# Recurring Host SaaS M6 Bootstrap Cohort Evidence

## Metadata

- Date: 2026-03-07
- Branch: `main`
- Backend: `https://smartiq-63tk.onrender.com`
- Seed workflow run: `22787839405`
- Capture workflow run: `22787954955`

## Observed Result

1. recurring-host pilot bootstrap seeding now creates a stable non-empty live cohort for admin telemetry, support-case, billing-upgrade, and capture-path validation,
2. the latest live capture reports `10` total tenants, all `10` classified as `bootstrap-seeded`,
3. the same live capture reports `10` total activated hosts, `5` total repeat hosts, `1` total paid conversion, `1` open support case, and `2` resolved support cases,
4. the corrected `M6` gate now evaluates only the non-seeded cohort for milestone readiness and therefore returns `thresholdStatus = NOT_YET`,
5. current real pilot proof remains `0` real pilot tenants, `0` real activated hosts, `0` real repeat hosts, and `0` real paid conversions.

## Why This Matters

1. the repo now distinguishes bootstrap validation from actual founder-assisted pilot proof,
2. synthetic bootstrap data no longer creates a false `READY` signal for `M6`,
3. the remaining blocker is real pilot acquisition and usage, not telemetry, capture automation, or backend reliability.

## Canonical Artifact

1. live summary JSON: `.tmp/m6-live-artifacts-5/recurring-host-pilot-22787954955/2026-03-07-recurring-host-saas-m6-pilot-22787954955-summary.json`
2. live evidence pack: `.tmp/m6-live-artifacts-5/recurring-host-pilot-22787954955/2026-03-07-recurring-host-saas-m6-pilot-22787954955-evidence.md`
