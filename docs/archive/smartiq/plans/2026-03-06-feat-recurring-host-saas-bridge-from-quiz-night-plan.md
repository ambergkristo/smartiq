---
title: Recurring Host SaaS execution bridge from Quiz Night SaaS
type: feat
status: active
date: 2026-03-06
---

> This document was archived after the project pivot from SmartIQ to CherryPick.

# Recurring Host SaaS execution bridge from Quiz Night SaaS

## Overview

This continuation plan restores execution context after the strategy pivot on 2026-03-06.

SmartIQ already has a completed `quiz-night-saas` delivery baseline through `M9`.
That baseline should now be treated as the product and technical substrate for the active `recurring-host-saas` track.

This document exists to make three things explicit:

1. what the team should resume next,
2. how to reconcile in-progress code with the official milestone order,
3. how the active recurring-host roadmap turns the finished quiz-night app into a sellable host SaaS.

## Current State

### Canonical planning status

1. `quiz-night-saas` is complete through `S9/M9` with evidence and `GO` launch decision.
2. `recurring-host-saas` is the active strategic track.
3. `recurring-host-saas` currently shows:
   - `M0` done,
   - `M1 Product Stabilization` in progress,
   - `M2+` not yet promotable.

### Workspace reality

The working tree already contains implementation that reaches ahead of the official active milestone:

1. onboarding bootstrap flow,
2. runtime auth persistence,
3. billing checkout initiation,
4. billing webhook ingestion and event ledger.

That means the repo is not blocked by missing ideas.
It is blocked by sequencing discipline.

## Problem Statement

Without an explicit bridge plan, execution can drift in two bad ways:

1. the team treats `quiz-night-saas` as a closed side quest instead of the foundation of the new host product,
2. the team promotes `recurring-host-saas` milestones out of order because partial `M2/M3` code already exists in the workspace.

The result would be false milestone progress, weak evidence, and a product that grows commercialization layers on top of unstable runtime behavior.

## Proposed Solution

Execution should proceed with a two-level model:

1. `Strategic level`:
   Use the completed `quiz-night-saas` app as the canonical base product.
   The new business direction is not a restart. It is the productization of that app for recurring hosts.
2. `Sprint level`:
   Resume from `recurring-host-saas M1`, close its gate cleanly, then promote milestone by milestone in order.

Any already-written `M2/M3` code should be treated as staged preview work:

1. keep it if it helps upcoming milestones,
2. do not claim milestone completion from it yet,
3. only formalize it after `M1` gate is green.

## Strategic Bridge

### What carries over from Quiz Night SaaS

The completed quiz-night track already provides:

1. self-serve onboarding skeleton,
2. tenant/runtime context resolution,
3. subscription state sync primitives,
4. entitlement rails,
5. create/join/play/replay flow,
6. conversion and retention instrumentation,
7. runbooks and operational readiness artifacts.

This should be treated as the minimum operating system for the recurring-host product.

### What Recurring Host SaaS adds

The recurring-host track should not re-prove the same app from scratch.
It should narrow and strengthen it for a recurring host ICP:

1. clearer host workflow,
2. stronger trust in auth and billing,
3. tenant-native host workspace,
4. repeat-host product depth,
5. real paid host behavior and retention,
6. niche launch proof.

## Sprint-by-Sprint Continuation Plan

### Sprint S1 / Milestone M1

Objective:
Stabilize the current app so the host can run a clear canonical flow without hidden ambiguity.

Execution focus:

1. fix and re-run the targeted gameplay/runtime suites in the recurring-host gate,
2. resolve any unclear dual-path behavior in startup and host flow,
3. verify create -> join -> play -> replay on desktop and mobile,
4. review EN and ET launch-pack quality defects that reduce host trust,
5. write three evidence notes required by the `M1` gate:
   - fixed-runtime regression note,
   - canonical host flow note,
   - launch-language content quality note.

Handling current ahead-of-plan code:

1. keep onboarding and billing changes in branch,
2. mark them as non-promoted preview scope,
3. do not let them expand `M1` acceptance criteria,
4. if they break `M1` suites, either fix or temporarily isolate them behind the canonical path.

Exit condition:
`M1` is complete only when the recurring-host `M1` gate is green, not when preview auth/billing code exists.

### Sprint S2 / Milestone M2

Objective:
Turn the current bootstrap identity approach into a real host authentication model.

Execution focus:

1. replace unsigned bootstrap bearer in production path,
2. define real sign-in/sign-out/session restore flow,
3. verify token validation instead of payload decoding,
4. align owner/member identity rules with tenant membership,
5. update frontend startup flow so first-session access uses the real auth path.

Carry-over from current workspace:

1. onboarding UI can remain as a draft interaction model,
2. runtime auth storage can remain as a temporary browser mechanism,
3. bootstrap token creation must not survive as the production trust model.

Exit condition:
No production path depends on unsigned bootstrap identity.

### Sprint S3 / Milestone M3

Objective:
Replace simulated billing behavior with a trustworthy commercial transaction path.

Execution focus:

1. swap fake checkout for a real billing provider integration,
2. add webhook verification and replay-safe ingestion,
3. reconcile subscription state into tenant runtime deterministically,
4. document failure and recovery handling,
5. preserve idempotency and stale-event protection already prototyped in code.

Carry-over from current workspace:

1. current checkout controller and webhook ledger are valid scaffolding,
2. they still require provider verification, secrets handling, and operational hardening.

Exit condition:
Manual fake billing is gone from the production path.

### Sprint S4 / Milestone M4

Objective:
Turn the quiz-night runtime into a real host workspace product.

Execution focus:

1. bind rooms and sessions explicitly to tenant context,
2. create host dashboard for launch, replay, duplicate event, and history,
3. make host/player entry surfaces branded and first-class,
4. prove cross-tenant isolation in host runtime behavior.

Exit condition:
Full host create -> player join -> replay flow works without operator help.

### Sprint S5 / Milestone M5

Objective:
Make payment visibly useful in the host product.

Execution focus:

1. lock Trial vs Pro Host matrix,
2. enforce at least three meaningful paid capabilities,
3. place upgrade prompts at real friction boundaries,
4. add host-facing analytics/history/template value.

Exit condition:
Entitlements affect real host actions, not only admin state.

### Sprint S6 / Milestone M6

Objective:
Prove activation, repeat hosting, and early paid conversion with real hosts.

Execution focus:

1. founder-assisted pilot onboarding,
2. host activation and replay metrics,
3. conversion measurement,
4. friction review and remediation loop.

Exit condition:
Real pilot host counts and repeat-host evidence exist from production usage.

### Sprint S7 / Milestone M7

Objective:
Prepare for narrow public launch.

Execution focus:

1. production observability for auth, billing, gameplay,
2. public pricing and conversion surface,
3. support and rollback playbooks,
4. host onboarding copy and launch-language polish.

### Sprint S8 / Milestone M8

Objective:
Validate SmartIQ as a sellable niche SaaS for recurring hosts.

Execution focus:

1. confirm at least three paying hosts,
2. confirm repeatable activation and retention in one segment,
3. publish go/no-go with evidence,
4. publish 12-month operating plan based on observed behavior.

### Sprint S9-S12 / Milestones M9-M12

Objective:
Move from sellable to mature niche product.

Execution focus:

1. host product depth,
2. content depth and freshness,
3. team/agency workflows,
4. mature retention and operating model.

## Immediate Next Actions

1. Treat `docs/plans/2026-03-06-recurring-host-saas-masterplan-v1.md` and `docs/plans/2026-03-06-recurring-host-saas-milestones-v1.md` as the authority for sequencing.
2. Run the recurring-host `M1` gate suites and log failures as the immediate stabilization backlog.
3. Write a short `M1` evidence pack with the three required notes.
4. Audit current onboarding/billing diffs and label each item as one of:
   - needed for `M1`,
   - staged for `M2`,
   - staged for `M3`.
5. Remove or isolate any code path that creates confusion between local fallback flow and canonical host flow.
6. After `M1` goes green, convert the current onboarding/auth draft into the official `M2` implementation scope.
7. After `M2`, promote billing work into the official `M3` scope instead of continuing ad hoc.

## System-Wide Impact

### Interaction graph

1. Startup flow now spans frontend boot, runtime auth persistence, `/api/me` resolution, tenant settings/branding/subscription fetch, and game start behavior.
2. Billing changes now touch tenant subscription state, event ledger persistence, runtime plan reads, and upgrade UX.

### Error propagation

1. Startup/auth failures surface in frontend boot UX and can silently degrade to local defaults if not handled carefully.
2. Billing sync failures can create false plan state in runtime if webhook validity and reconciliation are weak.

### State lifecycle risks

1. bootstrap-created tenant/account state can outlive invalid auth assumptions,
2. fake checkout success can mislead operators if not clearly marked non-production,
3. tenant-bound runtime state must not leak across rooms or replays.

### API surface parity

Interfaces that must remain aligned:

1. `/api/onboarding/bootstrap`
2. `/api/me`
3. `/api/me/tenant-settings`
4. `/api/me/tenant-branding`
5. `/api/me/tenant-subscription`
6. `/api/billing/checkout`
7. `/api/billing/webhook`
8. host runtime startup and replay UI

## Acceptance Criteria

- [ ] A bridge plan exists that explicitly connects completed `quiz-night-saas` work to the active `recurring-host-saas` track.
- [ ] The next official implementation step is unambiguous: finish `recurring-host-saas M1` before promoting `M2/M3`.
- [ ] Current onboarding/billing work is classified as `M1`, `M2`, or `M3` scope instead of remaining mixed.
- [ ] The sprint-by-sprint path from stabilization to sellable host SaaS is documented in one place.
- [ ] The plan identifies immediate execution steps, risks, and milestone promotion rules.

## Success Metrics

1. Team can resume work without reopening strategy debates.
2. No milestone is claimed complete out of sequence.
3. `M1` exits with green gate evidence before auth/billing hardening is promoted.
4. The completed quiz-night app is treated as foundation, not duplicated work.

## Dependencies and Risks

### Dependencies

1. Existing recurring-host masterplan, milestones, and gates remain the source of truth.
2. Quiz-night evidence docs remain the proof baseline for already-built foundations.
3. Current working tree changes are preserved and reviewed carefully instead of discarded.

### Risks

1. scope creep from preview `M2/M3` code derails `M1`,
2. the team mistakes fixture-backed flow for production trust,
3. strategy docs and working tree drift apart,
4. auth and billing changes ship without a clean milestone evidence trail.

## References and Research

### Internal references

1. `docs/plans/2026-03-06-recurring-host-saas-masterplan-v1.md`
2. `docs/plans/2026-03-06-recurring-host-saas-milestones-v1.md`
3. `docs/plans/2026-03-06-recurring-host-saas-gates-v1.md`
4. `docs/plans/2026-03-06-quiz-night-saas-masterplan-v1.md`
5. `docs/plans/2026-03-06-quiz-night-saas-milestones-v1.md`
6. `docs/plans/2026-03-06-quiz-night-saas-gates-v1.md`
7. `docs/reports/2026-03-06-quiz-night-saas-milestone-evidence-m0-m9.md`
8. `docs/reports/2026-03-06-quiz-night-saas-m9-post-launch-hardening-pack.md`
9. `backend/src/main/java/com/smartiq/backend/tenant/TenantService.java`
10. `backend/src/main/java/com/smartiq/backend/tenant/TenantBillingController.java`
11. `frontend/src/App.jsx`
12. `frontend/src/api.js`

## Decision Summary

1. The next work is not "build Quiz Night SaaS".
   That app baseline is already complete in repo terms.
2. The next work is "stabilize and then productize that baseline into Recurring Host SaaS in milestone order".
3. Immediate resume point: `recurring-host-saas M1`.
