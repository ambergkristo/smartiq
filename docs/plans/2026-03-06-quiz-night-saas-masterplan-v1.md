---
title: SmartIQ quiz night SaaS masterplan v1
type: masterplan
status: completed
date: 2026-03-06
owner: Agent 0
track: quiz-night-saas
milestones: docs/plans/2026-03-06-quiz-night-saas-milestones-v1.md
gates: docs/plans/2026-03-06-quiz-night-saas-gates-v1.md
related_white_label_track: docs/plans/2026-03-05-white-label-masterplan-v3-business-first.md
---

# SmartIQ Quiz Night SaaS Masterplan v1

## Summary

This is the canonical execution track for SmartIQ as a self-serve Quiz Night SaaS.

Execution status:
1. Milestones `M0..M9` completed on 2026-03-06.

Primary objective:
1. Ship a self-serve hosted product where users can create a branded quiz night, invite players, play live, and upgrade from free to paid without manual sales or enterprise outreach.

Strategic constraints:
1. Reuse current SmartIQ engine, room, tenant, and runtime infrastructure.
2. Keep business pricing and packaging details deferred until product surfaces are stable.
3. Prioritize delivery speed and deterministic gates over broad scope.

## Operating Model (locked)

1. Exactly one milestone may be `IN_PROGRESS` at any time.
2. `M(n+1)` can start only after `M(n)` is `DONE` and its gate is green.
3. One sprint maps to exactly one milestone.
4. Default sprint cadence is one week.
5. Every milestone requires:
   - linked evidence artifacts,
   - touched-scope tests green,
   - no unresolved Critical/High findings.
6. Product scope expands only after conversion and retention instrumentation are in place.
7. White-label v3 track remains valid as a related strategic track; this plan is the canonical execution track for Quiz Night SaaS delivery.

## Deferred Business Decisions (explicitly not blocking v1 build)

1. Exact free-tier numeric limits.
2. Final Pro pricing amount and billing cycle variants.
3. Watermark policy for free plan.
4. Exact branding unlock matrix (which customizations are free vs paid).
5. Expansion pricing tiers beyond initial Pro.

## Completion Definition (100%)

The program is 100% complete only when all conditions are true:
1. A user can complete self-serve onboarding and create a playable tenant environment without operator intervention.
2. Free-to-paid upgrade flow works end-to-end (checkout initiation, billing event handling, subscription state sync).
3. Entitlements and limits are enforced deterministically across runtime and admin paths.
4. Core gameplay loop is stable for hosted quiz nights:
   - create room,
   - join room,
   - play session,
   - finish and replay.
5. Conversion funnel events are tracked from pricing CTA to active paid subscription.
6. 7-day retention report is generated from real runtime telemetry.
7. Operational readiness artifacts are complete (runbook, rollback triggers, alert ownership).
8. Final launch go/no-go report is `GO` with no unresolved Critical/High blockers.

## Post-100% Hardening Extension (M9)

After 100% completion at `M8`, a stabilization extension is executed in `M9`:
1. publish 30-day post-launch hardening package,
2. define ownership and mitigation for operational risks,
3. prioritize `P0/P1/P2` hardening backlog for immediate follow-up sprints.

## Public Interfaces (v1 baseline)

Existing interfaces kept stable:
1. `POST /api/game`
2. `GET /api/game/{gameId}`
3. `POST /api/game/{gameId}/action`
4. `POST /api/rooms`
5. `POST /api/rooms/{roomCode}/join`
6. `POST /api/rooms/{roomCode}/rejoin`
7. Runtime context APIs under `/api/me/*`
8. Internal tenant admin APIs under `/internal/wl/*`

Target interfaces to finalize through milestones:
1. `POST /api/auth/login` or equivalent auth callback endpoint.
2. `GET /api/me` as canonical runtime identity + tenant context read path.
3. Billing webhook ingestion endpoint.
4. Entitlement/capability read endpoint for runtime UI plan-state behavior.
5. Subscription state endpoint exposed for tenant runtime decisions.

Error taxonomy to remain consistent:
1. `UNAUTHENTICATED`
2. `FORBIDDEN_TENANT`
3. `PLAN_LIMIT_REACHED`
4. `INVALID_BILLING_EVENT`

## Milestone and Gate Sources of Truth

1. Sprint and milestone definitions:
   - `docs/plans/2026-03-06-quiz-night-saas-milestones-v1.md`
2. Promotion gates and required checks:
   - `docs/plans/2026-03-06-quiz-night-saas-gates-v1.md`
