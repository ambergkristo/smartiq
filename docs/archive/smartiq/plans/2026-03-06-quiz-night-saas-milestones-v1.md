---
title: SmartIQ quiz night SaaS milestones v1
type: milestones
status: completed
date: 2026-03-06
owner: Agent 0
masterplan: docs/plans/2026-03-06-quiz-night-saas-masterplan-v1.md
---

> This document was archived after the project pivot from SmartIQ to CherryPick.

# SmartIQ Quiz Night SaaS Milestones v1

## Sprint System

Hard rules:
1. One sprint executes exactly one milestone.
2. Only one milestone may be `IN_PROGRESS`.
3. Next milestone starts only after previous milestone exit gate is green.

Cadence:
1. Default sprint length is one week.
2. Compression is allowed only if gate checks and evidence quality stay unchanged.

## Milestone Plan (S0 -> S9)

| Milestone | Sprint | Objective | Exit Gate (summary) | Status |
| --- | --- | --- | --- | --- |
| M0 | S0 | Plan baseline lock | quiz-night docs linked + docs checks green | DONE (2026-03-06) |
| M1 | S1 | Self-serve onboarding skeleton | account to first-tenant flow demonstrable | DONE (2026-03-06) |
| M2 | S2 | Subscription foundation | billing event to subscription sync deterministic | DONE (2026-03-06) |
| M3 | S3 | Plan limits and entitlements | free/pro capability enforcement deterministic | DONE (2026-03-06) |
| M4 | S4 | Quiz night product surface v1 | create/join/play/replay flow stable | DONE (2026-03-06) |
| M5 | S5 | Conversion surface | pricing to upgrade funnel observable | DONE (2026-03-06) |
| M6 | S6 | Retention loop proof | 7-day retention report generated | DONE (2026-03-06) |
| M7 | S7 | Operational readiness | runbook + monitoring + rollback drill complete | DONE (2026-03-06) |
| M8 | S8 | Launch go/no-go | 100% completion definition fully green | DONE (2026-03-06) |
| M9 | S9 | Post-launch hardening package | 30-day hardening plan + handoff package published | DONE (2026-03-06) |

Current execution pointer:
1. Program completed through `S9/M9` on 2026-03-06.

## Milestone DoD (decision complete)

### M0 - Baseline and Gate Lock

1. Masterplan, milestones, and gates docs for Quiz Night SaaS are present and cross-linked.
2. `README.md` and `docs/plans/README.md` reference this track as active.
3. Existing white-label track references remain intact.
4. Docs validation commands are green.

### M1 - Self-Serve Onboarding Skeleton

1. User onboarding path exists from entry point to first tenant bootstrap.
2. Runtime can resolve user context and selected tenant after onboarding.
3. First-game initiation path is reachable without operator actions.
4. Minimal contract tests for onboarding context and startup flow are green.

### M2 - Subscription Foundation

1. Checkout initiation contract is defined and implemented in backend/frontend flow.
2. Billing event ingestion path updates tenant subscription state deterministically.
3. Subscription state is retrievable for runtime and admin behavior.
4. Duplicate/out-of-order billing events are handled safely.

### M3 - Plan Limits and Entitlements

1. Entitlement model defines free vs paid capabilities in code and tests.
2. Limit enforcement blocks restricted actions with deterministic error codes.
3. Upgrade path removes paid-feature restrictions after subscription activation.
4. Audit evidence exists for limit-rejection scenarios.

### M4 - Quiz Night Product Surface v1

1. Host can create a game room and invite players with shareable flow.
2. Guests can join and complete gameplay round-loop without critical blockers.
3. Replay/new game path is stable.
4. Mobile and desktop sanity checks are documented.

### M5 - Conversion Surface

1. Pricing page and upgrade CTA are connected to checkout entry.
2. In-app upgrade prompts appear on entitlement boundary events.
3. Funnel events are emitted for pricing click, checkout start, and paid activation.
4. KPI definitions and event mapping are documented.

### M6 - Retention Loop Proof

1. Retention measurement logic is implemented with a 7-day window.
2. Retention report artifact is generated from runtime telemetry.
3. At least one corrective loop mechanism exists (for example replay prompt or return hook).
4. If retention threshold is missed, corrective iteration note is attached before promotion.

### M7 - Operational Readiness

1. Incident runbook is updated for onboarding, billing, and gameplay failures.
2. Monitoring and alert ownership is explicit.
3. Rollback trigger conditions are documented and rehearsed.
4. Support escalation path is documented.

### M8 - Launch Go/No-Go

1. All previous milestones are `DONE` with linked evidence.
2. Completion definition checks are all satisfied.
3. Final go/no-go report is published with explicit `GO` decision.
4. No unresolved Critical/High blockers remain.

### M9 - Post-Launch Hardening Package

1. 30-day post-launch hardening package is published with ownership and cadence.
2. Operational risk register exists with severity and explicit mitigation owners.
3. Hardening backlog is prioritized (`P0/P1/P2`) with target sprint assignment.
4. Future business decisions are isolated into explicit decision backlog items.

## Evidence Map

1. Consolidated milestone evidence:
   - `docs/reports/2026-03-06-quiz-night-saas-milestone-evidence-m0-m9.md`
2. Final launch go/no-go report (`GO`):
   - `docs/reports/2026-03-06-quiz-night-saas-m8-go-no-go-report.md`
3. M9 post-launch hardening package:
   - `docs/reports/2026-03-06-quiz-night-saas-m9-post-launch-hardening-pack.md`

## Promotion Rule

1. Promotion `M(n)` -> `M(n+1)` is valid only when:
   - `M(n)` DoD is fully satisfied,
   - `M(n)` gate checks are green (see gates doc),
   - evidence links are written into milestone artifacts.
2. Program close (`100% + hardening extension`) is reached only when `M0..M9` are `DONE`.
