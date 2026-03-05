---
title: SmartIQ white-label M5 GTM and pilot readiness pack
type: milestone-pack
status: active
date: 2026-03-05
owner: Agent 0
---

# SmartIQ White-Label M5 GTM and Pilot Readiness Pack

## Scope

This document is the canonical M5 artifact set for:
1. Pricing and packaging baseline.
2. Pilot onboarding flow.
3. Conversion metrics and reporting definitions.

## Pricing and Packaging (v1)

### Starter

1. Target: small training teams (up to 50 monthly active learners).
2. Setup fee: EUR 1,200 (one-time).
3. Monthly fee: EUR 490.
4. Included usage guardrail: up to 1,000 usage-value units per billing period.
5. Overage policy: no auto-overage in v1; customer upgrades to Growth.

### Growth

1. Target: mid-size organizations (up to 250 monthly active learners).
2. Setup fee: EUR 2,500 (one-time).
3. Monthly fee: EUR 1,490.
4. Included usage guardrail: up to 10,000 usage-value units per billing period.
5. Overage policy: negotiated add-on block or upgrade to Enterprise.

### Enterprise

1. Target: large organizations and regulated environments.
2. Setup fee: negotiated.
3. Monthly fee: negotiated.
4. Usage guardrail: contract-defined, not product-hardcoded in v1.
5. Includes priority onboarding and security review support.

## Pilot Onboarding Flow (repeatable)

1. Discovery call and qualification.
2. Pilot scope lock:
   - learner volume,
   - success metric targets,
   - branded environment deadline.
3. Contract and data processing baseline.
4. Tenant setup in admin:
   - tenant created,
   - branding configured,
   - initial settings configured,
   - subscription set.
5. Admin handover:
   - owner account invited,
   - admin walkthrough completed,
   - runtime verification completed.
6. Pilot execution window (2-4 weeks).
7. Weekly checkpoint with KPI report.
8. Pilot closeout with go/no-go recommendation.

## Sales and Demo Handoff Kit

Required artifacts per pilot:
1. Tenant detail export (branding, settings, subscription snapshot).
2. Runtime verification evidence (`/api/me*` response sanity + UI screenshot).
3. Usage summary export (event type totals).
4. Audit summary export (critical tenant actions).
5. One-page stakeholder summary (risks, blockers, next recommendation).

## Conversion Metrics (frozen v1 definitions)

### Funnel events

1. `pricing_cta_click`: user clicks primary CTA on pricing page.
2. `waitlist_submit`: user submits waitlist/contact form.
3. `pilot_discovery_booked`: qualified discovery call booked.
4. `pilot_started`: pilot tenant is configured and kickoff completed.
5. `pilot_converted_paid`: pilot moves to paid subscription.

### KPI formulas

1. Pricing-to-waitlist conversion:
   - `waitlist_submit / pricing_cta_click`
2. Waitlist-to-discovery conversion:
   - `pilot_discovery_booked / waitlist_submit`
3. Discovery-to-pilot start conversion:
   - `pilot_started / pilot_discovery_booked`
4. Pilot-to-paid conversion:
   - `pilot_converted_paid / pilot_started`
5. Time-to-pilot-start:
   - median days from `pilot_discovery_booked` to `pilot_started`

## Pilot Exit Criteria

1. Technical:
   - tenant runtime branding/settings verified,
   - usage + audit reporting available,
   - no unresolved critical tenant-boundary issues.
2. Commercial:
   - KPI trend supports paid conversion.
3. Operational:
   - support handoff and owner enablement completed.

## Ownership and Cadence

1. Product/engineering owner updates this pack once per sprint.
2. Sales owner updates funnel KPI values weekly.
3. Any pricing changes require explicit version bump in this file.
