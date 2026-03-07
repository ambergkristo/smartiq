---
title: SmartIQ recurring host SaaS masterplan v1
type: masterplan
status: active
date: 2026-03-06
owner: Agent Strategy-Builder
track: recurring-host-saas
milestones: docs/plans/2026-03-06-recurring-host-saas-milestones-v1.md
gates: docs/plans/2026-03-06-recurring-host-saas-gates-v1.md
related_track: docs/plans/2026-03-06-quiz-night-saas-masterplan-v1.md
---

# SmartIQ Recurring Host SaaS Masterplan v1

## Summary

This is the next execution track for SmartIQ after the Quiz Night SaaS readiness pass.

This plan assumes the current repository already contains:
1. a working game engine,
2. room/session primitives,
3. tenant/admin foundations,
4. content pipeline and telemetry scaffolding.

This plan does not assume SmartIQ is already a sellable SaaS.

Primary objective:
1. Turn SmartIQ into a sellable niche SaaS for recurring live quiz hosts.

Extended objective after sellable state:
1. Turn SmartIQ from a sellable niche SaaS into a mature host product with durable retention, stronger content depth, and team/agency leverage.

Product definition:
1. SmartIQ is a hosted operating system for running branded live quiz sessions.
2. The paying customer is the recurring host, not the player.
3. The first wedge is small professional hosts:
   - corporate event facilitators,
   - community/event organizers,
   - small trivia operators.

## Strategic Position

Locked positioning:
1. "Run your branded live quiz night without manual ops."

Locked commercial posture:
1. narrow ICP first,
2. paid host subscription first,
3. self-serve where possible,
4. founder-assisted pilots allowed before broad launch.

Explicit non-goals for v1:
1. do not build a general education platform,
2. do not build an API-first developer product,
3. do not optimize for enterprise procurement first,
4. do not broaden scope to every event format before host retention is proven.

## Why This Track Exists

Current repo reality:
1. The game/product core is stronger than the commercial layer.
2. Tenant, billing, and onboarding foundations exist, but do not yet form a trustworthy SaaS.
3. Growth, pricing, and retention are still assumptions.

Therefore this plan optimizes for:
1. host productization,
2. trust and payment hardening before scale claims,
3. real usage proof,
4. real monetization,
5. narrow launch readiness.

## Sellable Niche SaaS Completion Definition

SmartIQ becomes a sellable niche SaaS only when all conditions are true:
1. A host can sign up, authenticate, create a tenant, and start a live session without support.
2. Rooms and game sessions are tenant-native and policy-enforced.
3. Paid checkout, webhook verification, and entitlement activation work end-to-end.
4. The host product has a clear recurring workflow:
   - create session,
   - invite players,
   - run session,
   - replay or duplicate event,
   - review basic host analytics.
5. Product analytics run on real production events, not offline fixtures.
6. At least 10 real pilot hosts have activated.
7. At least 5 hosts have run 2 or more sessions.
8. At least 3 paying hosts have converted on the canonical plan.
9. Launch-language content quality is operationally acceptable.
10. No unresolved Critical/High blockers remain across auth, billing, gameplay, and tenant isolation.

## Mature Product Completion Definition

For this roadmap, "game complete" does not mean no more features will ever be built.

It means SmartIQ has reached a practical mature-product state where all are true:
1. The product is commercially sellable without founder-assisted handholding for the core use case.
2. Hosts can run recurring events from a stable host workspace with templates, history, analytics, and repeatable setup.
3. Content quality and format depth are strong enough to support repeated usage without immediate novelty collapse.
4. Team and agency workflows exist for multi-host operation.
5. Support and operations are stable enough for narrow but repeatable scale.
6. The product has at least one proven growth motion beyond founder-led pilots.
7. Revenue retention depends primarily on product behavior, not manual service rescue.

## Operating Model

1. One sprint maps to exactly one milestone.
2. Exactly one milestone may be `IN_PROGRESS`.
3. `M(n+1)` starts only after `M(n)` DoD and gate are green.
4. Default sprint cadence is 2 weeks.
5. Founder/customer validation milestones are blocking, not optional.
6. No milestone may claim success using fixture-only commercial proof.
7. New scope enters only if it improves:
   - activation,
   - repeat hosting,
   - paid conversion,
   - runtime reliability.

## Product Priorities

Priority order:
1. trustworthy host flow,
2. real auth and payment trust,
3. tenant-native runtime,
4. monetizable capabilities,
5. repeat host behavior,
6. narrow launch readiness,
7. expansion features.

## Current Execution State

1. `M0` strategy reset is complete.
2. `M1` product stabilization is complete.
3. `M2` real auth and trust hardening is complete.
4. `M3` billing and payment hardening is complete.
5. `M4` full host/join/replay canonical flow is complete.
6. `M5` paid value and entitlement enforcement is complete.
7. `M6` pilot conversion and retention proof is now the active milestone.
8. `M6` now has real runtime pilot telemetry for bootstrap, auth completion, session launch/duplicate/resume/complete, and billing upgrade activation, plus a founder-facing pilot summary, support-case loop, canonical pilot-summary report generator, pilot evidence-pack generator, pilot capture command, and pilot-gate automation in admin ops/tooling.
9. Live `M6` seeding and capture now work successfully against `https://smartiq-63tk.onrender.com`, including a bootstrap cohort that can exercise repeat-host, paid-conversion, and support-case paths.
10. The `M6` gate now explicitly excludes bootstrap-seeded tenants from readiness counts; the latest corrected live capture is still `NOT_YET` because it reports `10` bootstrap-seeded tenants and `0` real pilot tenants.
11. `M7` was allowed to proceed in parallel with the deferred `M6` external-proof blocker, and it now has a public recurring-host launch surface, launch KPI snapshot tooling, recurring-host incident runbook, and technical launch gate wrapper.
12. Live `M7` validation is now green against `https://smartiq-63tk.onrender.com` and `https://smartiq-nine.vercel.app`, including release readiness, alert validation, launch smoke, and runtime-deck verification through the launch gate.
13. `M7` is therefore promoted done on 2026-03-07, with `M6` still explicitly deferred because real pilot proof remains absent.
14. `M8` is now the active commercial-proof milestone: recurring-host go/no-go pack generation, 12-month operating-plan generation, and a sellable-SaaS gate wrapper all exist, but commercial proof remains deferred until real paid/repeat evidence exists.
15. The current live `M8` artifact output is still honestly `NO_GO_SELLABLE` because the live cohort remains bootstrap-only for commercial proof.
16. `M9` technical work has now also started in parallel with that deferred `M8` proof blocker, beginning with a `Host momentum` repeat-host analytics card inside the host workspace.
17. The locked next-sequence is:
   - product stabilization,
   - auth/trust hardening,
   - billing/payment hardening,
   - full host/join/replay flow,
   - entitlements and upgrade triggers,
   - conversion and retention proof.

Post-M8 priority order:
1. repeat host retention,
2. host product depth,
3. content breadth and freshness,
4. team/agency expansion,
5. growth and acquisition mechanics,
6. operational efficiency.

## Business Model Direction

Recommended packaging:
1. `Trial`: short-lived evaluation path with basic host flow.
2. `Pro Host`: main paid plan for recurring hosts.
3. `Team/Agency`: later plan for multiple hosts, shared branding, and team controls.
4. `Premium Content / Add-ons`: only after recurring host retention is proven.

Upgrade triggers to implement:
1. remove SmartIQ branding,
2. saved event templates,
3. advanced host controls,
4. analytics/history,
5. higher player/team/session limits,
6. premium content packs or custom deck management.

## Technical Direction

Required architecture outcomes:
1. runtime auth must be real and verified,
2. room/game lifecycle must carry tenant context,
3. entitlements must be enforced on real host actions,
4. host product surfaces must become first-class,
5. analytics must be collected from production usage,
6. content quality gates must block low-trust launch packs.

Post-M8 architecture outcomes:
1. host workspace must support repeat operations and saved assets,
2. content system must support packs, templates, and freshness workflows,
3. analytics must support cohort and revenue retention analysis,
4. team/agency permissions must support multi-host operations cleanly.

## Post-M8 Maturity Extension

After `M8`, the roadmap continues through a maturity extension:
1. `M9`: host product depth,
2. `M10`: content and gameplay depth,
3. `M11`: team/agency productization,
4. `M12`: mature product readiness.

`M8` proves SmartIQ is sellable.
`M12` proves SmartIQ is a mature niche product.

## Milestone Sources of Truth

1. Milestones and roadmap:
   - `docs/plans/2026-03-06-recurring-host-saas-milestones-v1.md`
2. Gates and promotion checks:
   - `docs/plans/2026-03-06-recurring-host-saas-gates-v1.md`
