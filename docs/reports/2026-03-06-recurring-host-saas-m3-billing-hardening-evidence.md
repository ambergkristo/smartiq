---
title: Recurring host SaaS M3 billing hardening evidence
type: report
status: completed
date: 2026-03-06
track: recurring-host-saas
milestone: M3
---

# Recurring Host SaaS M3 Billing Hardening Evidence

## Metadata

- Date: 2026-03-06
- Branch: `fix/white-label-continuation`
- Track: `recurring-host-saas`
- Milestone: `M3 Billing and Payment Hardening`
- Promotion status: `DONE`

## Gate Commands

The following milestone-grade checks executed successfully in the current workspace:

1. `mvn -q -f backend/pom.xml "-Dtest=BillingServiceTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
2. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.test.jsx src/App.server-mode.test.jsx src/api.test.js`
3. `npm --prefix frontend run build`
4. `npm run validate:masterplan:refs`
5. `npm run validate:no-bom:docs`

## Definition Of Done Mapping

### 1. Trial or paid checkout works end-to-end

Observed result:

1. authenticated runtime members can initiate checkout from `/api/billing/checkout`,
2. checkout responses include provider-specific redirect URLs plus success/cancel return targets,
3. frontend uses the canonical `checkoutUrl` and exposes recovery checkout links from blocked billing states.

### 2. Webhook verification, replay safety, and subscription sync are production-grade

Observed result:

1. billing webhooks require HMAC signature verification,
2. duplicate events remain idempotent,
3. stale events are ignored without corrupting newer subscription state,
4. subscription updates sync into canonical tenant subscription state.

### 3. Runtime can read current plan and capabilities from canonical state

Observed result:

1. runtime `/api/me` reads tenant subscription state,
2. runtime `/api/me/tenant-capabilities` derives product capabilities from canonical subscription state,
3. host UI gates launches and upgrade prompts from runtime state instead of local assumptions.

### 4. Manual fake-billing flow is removed from the production path

Observed result:

1. default application config no longer provides a fake/local billing provider,
2. checkout now fails fast if billing provider config is missing,
3. checkout now rejects `local`, `fake`, `manual`, and `test` provider modes for runtime checkout.

### 5. Payment error handling and recovery path are documented and tested

Observed result:

1. past-due and canceled subscriptions block hosted launches,
2. blocked billing UI exposes a direct recovery checkout path,
3. recovery CTA and checkout-link fallback are covered in frontend tests,
4. billing hardening and recovery notes are captured in the milestone evidence set.

## Scope Delivered

1. config-backed external-provider checkout URLs with success/cancel return targets,
2. verified webhook ingestion and billing-event ledger behavior,
3. runtime subscription + capability read path,
4. blocked-billing recovery CTA in host UI,
5. explicit rejection of fake/local billing checkout modes.

## Promotion Decision

`M3 Billing and Payment Hardening` is promotable and marked `DONE` because:

1. milestone gate checks are green,
2. checkout, webhook verification, replay safety, subscription sync, and recovery behavior are all covered by reproducible tests,
3. fake/local checkout is no longer treated as a valid production host path.

The next active milestone is `M4 Full Host/Join/Replay Canonical Flow`.
