---
title: Recurring host SaaS M2 auth hardening evidence
type: report
status: active
date: 2026-03-06
track: recurring-host-saas
milestone: M2
---

# Recurring Host SaaS M2 Auth Hardening Evidence

## Metadata

- Date: 2026-03-06
- Branch: `fix/white-label-continuation`
- Active track: `recurring-host-saas`
- Milestone: `M2 Real Auth and Trust Hardening`

## Gate Commands

The `M2` auth/session gate commands executed successfully in the current workspace:

1. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.test.jsx src/App.server-mode.test.jsx src/App.smoke.test.jsx src/api.test.js`
2. `mvn -q -f backend/pom.xml "-Dtest=SecurityConfigTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`
3. `mvn -q -f backend/pom.xml "-Dtest=SecurityConfigTest,GameSessionControllerTest,RoomControllerTest,GameSessionServiceTest,RoomServiceTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test`

## Required Evidence

### 1. Signed runtime identity is now mandatory on the production path

Observed result:

1. runtime bearer tokens are issued through `RuntimeAuthTokenService`,
2. bearer tokens are verified before auth context is accepted,
3. unsigned `alg=none` tokens are rejected in the auth-context suite,
4. prod profile no longer relies on header fallback.

Implementation note:

1. `/api/me` and `/api/auth/*` now share the same auth-context error family,
2. onboarding bootstrap issues signed runtime tokens,
3. session restore/logout behavior is deterministic in frontend startup flow.

### 2. Hosts can sign in without manual header hacks

Observed result:

1. `/api/auth/request-link` creates a one-time login challenge,
2. `/api/auth/complete` consumes that challenge exactly once,
3. frontend sign-in restores runtime auth and reloads tenant snapshot,
4. invalid stored sessions are cleared and surfaced with recovery copy.

Implementation note:

1. default/dev flow uses echoed magic-link token delivery for local execution,
2. prod profile disables echoed delivery by default,
3. logout is stateless and always clears local runtime auth.

### 3. Security and auth-context tests are green

Observed result:

1. allowlisted auth/me routes still terminate in app logic instead of security middleware,
2. membership, suspension, and tenant-access behavior remains green,
3. auth completion is single-use and invalid/expired challenges fail cleanly.

## Forward Progress Already Landed

The workspace now contains milestone-following work beyond `M2`.
It is classified here to keep promotion honest.

### M3 progress landed but not promoted done

1. billing config is now explicit via `smartiq.billing.*`,
2. checkout URL generation is config-backed instead of hardcoded,
3. `/api/billing/webhook` requires verified HMAC signature,
4. webhook parsing, signature failure, duplicate replay, and stale-event handling are covered by tests.

### M4 groundwork landed but milestone is still incomplete

1. runtime auth is now propagated to server game-session and room creation calls,
2. host-created rooms and game sessions bind to tenant context when runtime auth is present,
3. cross-tenant host access to tenant-bound room/game runtime is rejected,
4. full host dashboard/history/replay workspace still remains open scope for `M4`.

## Milestone Exit Statement

`M2 Real Auth and Trust Hardening` is promotable in this workspace because:

1. signed runtime tokens replaced unsigned production auth shortcuts,
2. sign-in/session restore/logout flow exists and is tested,
3. auth-context security suites are green in default and prod profiles,
4. no promoted production path depends on unsigned bootstrap identity.

Next official milestone:

1. `M3 Billing and Payment Hardening` is now the active milestone.
