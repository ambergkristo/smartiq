# Recurring Host SaaS M1 Stabilization Evidence

## Metadata

- Date: 2026-03-06
- Branch: `fix/white-label-continuation`
- Active track: `recurring-host-saas`
- Milestone: `M1 Product Stabilization`

## Gate Commands

The recurring-host `M1` gate commands were executed successfully in the current workspace:

1. `npm --prefix frontend run test -- --run src/App.test.jsx src/App.server-mode.test.jsx src/App.smoke.test.jsx src/components/GameBoard.test.jsx`
2. `mvn -q -f backend/pom.xml "-Dtest=GameSessionControllerTest,RoomControllerTest,RoomServiceTest" test`
3. `npm --prefix frontend run build`

## Required Evidence

### 1. Fixed-runtime regression note

Runtime/gameplay stabilization is green in the target frontend and backend suites.

Observed result:

1. frontend target suites passed,
2. backend room/game suites passed,
3. production frontend build passed.

Stabilized areas:

1. setup-to-start path still works in local and server-backed runtime flows,
2. create/play/round-end/replay loop remains green in smoke coverage,
3. no regression was introduced by the current startup/runtime changes.

### 2. Canonical host flow note

The currently accepted canonical host path is:

1. open setup screen,
2. choose topic/language/theme,
3. add at least one player,
4. start round,
5. answer and progress through round flow,
6. reach round summary,
7. continue to next round or replay.

Proof basis in current workspace:

1. `src/App.test.jsx` covers one-card round and next-round continuation,
2. `src/App.server-mode.test.jsx` covers server-backed game creation and action flow,
3. `src/App.smoke.test.jsx` covers create/play/summary/next-round and extended multiplayer scenarios,
4. `RoomControllerTest`, `RoomServiceTest`, and `GameSessionControllerTest` cover backend runtime mechanics.

Important sequencing note:

1. onboarding and billing scaffolding exists in the working tree,
2. it is not treated as the `M1` canonical host path,
3. `M1` promotion is based on stabilized gameplay/runtime path, not future auth/billing scope.

### 3. Launch-language content quality note

Launch-language content checks were verified for both EN and ET packs.

Commands run:

1. `node tools/score_cards_quality.js data/smart10/cards.en.json`
2. `node tools/score_cards_quality.js data/smart10/cards.et.json`
3. `node tools/validate_locale_packs.js data/smart10`

Observed result:

1. EN quality score: `1.0`
2. ET quality score: `1.0`
3. locale pack validation passed
4. EN pack: `1080` cards, `0` hard errors, `0` warnings
5. ET pack: `1080` cards, `0` hard errors, `0` warnings

Interpretation:

1. EN and ET launch packs satisfy the currently documented release-quality gates,
2. no pack-level validation defect blocks `M1` promotion.

## Current Scope Audit

The working tree contains forward-looking changes beyond `M1`.
To keep milestone order honest, the current scope is classified as follows:

### M1-owned or M1-validating scope

1. `frontend/src/App.test.jsx`
2. `frontend/src/App.server-mode.test.jsx`
3. `frontend/src/App.smoke.test.jsx`
4. `frontend/src/App.startup.test.jsx`
5. `frontend/src/App.tenant-runtime.test.jsx`
6. `frontend/src/App.jsx` setup/runtime flow stabilization subset
7. backend room/game runtime suites

### M2-auth scope already started

1. `backend/src/main/java/com/smartiq/backend/auth/RuntimeAuthTokenService.java`
2. `backend/src/main/java/com/smartiq/backend/auth/AuthContextResolver.java`
3. `backend/src/main/java/com/smartiq/backend/config/AuthContextProperties.java`
4. `backend/src/main/java/com/smartiq/backend/config/SecurityConfig.java`
5. `backend/src/main/java/com/smartiq/backend/tenant/TenantService.java` onboarding runtime token issuance
6. `backend/src/test/java/com/smartiq/backend/config/SecurityConfigTest.java`
7. `backend/src/test/java/com/smartiq/backend/tenant/TenantMeControllerTest.java`
8. `backend/src/test/java/com/smartiq/backend/tenant/TenantMeControllerProdAuthContextTest.java`
9. `frontend/src/api.js` runtime auth persistence subset
10. `frontend/src/App.jsx` onboarding/runtime auth subset

### M3-billing scope already started

1. `backend/src/main/java/com/smartiq/backend/tenant/TenantBillingController.java`
2. `backend/src/main/java/com/smartiq/backend/tenant/BillingService.java`
3. `backend/src/main/java/com/smartiq/backend/tenant/TenantBillingEvent.java`
4. `backend/src/main/java/com/smartiq/backend/tenant/TenantBillingEventRepository.java`
5. `backend/src/main/java/com/smartiq/backend/tenant/BillingCheckoutRequest.java`
6. `backend/src/main/java/com/smartiq/backend/tenant/BillingCheckoutResponse.java`
7. `backend/src/main/java/com/smartiq/backend/tenant/BillingWebhookRequest.java`
8. `backend/src/main/java/com/smartiq/backend/tenant/BillingWebhookResponse.java`
9. `backend/src/main/resources/db/migration/V6__create_billing_event_ledger.sql`
10. `frontend/src/api.js` checkout initiation subset
11. `frontend/src/App.jsx` upgrade CTA subset

## Milestone Exit Statement

`M1 Product Stabilization` is promotable in this workspace because:

1. the required gate commands are green,
2. the canonical setup-to-replay path is covered and stable,
3. EN and ET launch-pack validation is green,
4. forward-looking auth/billing changes have been explicitly separated from `M1` promotion logic.
