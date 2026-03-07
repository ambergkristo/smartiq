---
title: SmartIQ recurring host SaaS milestones v1
type: milestones
status: active
date: 2026-03-06
owner: Agent Strategy-Builder
masterplan: docs/plans/2026-03-06-recurring-host-saas-masterplan-v1.md
---

# SmartIQ Recurring Host SaaS Milestones v1

## Roadmap Frame

Planning assumptions:
1. Default sprint length is 2 weeks.
2. Total roadmap length is approximately 9-15 months.
3. Narrow paid traction is required before broad launch.

Execution governance:
1. `SmartIQ` source-of-truth for this repository is GitHub, not Gitea.
2. No Gitea mirror should be configured or used for this repository.
3. No later than `M4` completion, the active SmartIQ workstream must be updated into `main`.

## Milestone Plan

| Milestone | Sprint | Objective | Status |
| --- | --- | --- | --- |
| M0 | S0 | Strategy reset and baseline lock | DONE (2026-03-06) |
| M1 | S1 | Product stabilization | DONE (2026-03-06) |
| M2 | S2 | Real auth and trust hardening | DONE (2026-03-06) |
| M3 | S3 | Billing and payment hardening | DONE (2026-03-06) |
| M4 | S4 | Full host/join/replay canonical flow | DONE (2026-03-06) |
| M5 | S5 | Paid value and entitlement enforcement | DONE (2026-03-06) |
| M6 | S6 | Pilot conversion and retention proof | IN_PROGRESS (2026-03-06) |
| M7 | S7 | Narrow launch readiness | DONE (2026-03-07, with deferred M6 external proof) |
| M8 | S8 | Sellable niche SaaS validation | IN_PROGRESS (technical track, 2026-03-07) |
| M9 | S9 | Host product depth | IN_PROGRESS (technical track, 2026-03-07) |
| M10 | S10 | Content and gameplay depth | TODO |
| M11 | S11 | Team and agency productization | TODO |
| M12 | S12 | Mature niche product readiness | TODO |

Current execution pointer:
1. `M4` is complete.
2. `M5` is complete.
3. `M5` promotion is based on hosted player-cap enforcement, analytics/history gating, custom-branding runtime enforcement, session-template paid workflow, and deterministic billing-return entitlement refresh.
4. `M6` is now the active milestone.
5. `M6` telemetry now captures bootstrap, auth completion, session launch/duplicate/resume/complete, and billing upgrade lifecycle events into tenant usage summary, with an internal pilot summary, support-case loop, canonical pilot-summary report generator, pilot evidence-pack generator, pilot capture command, and pilot-gate automation available in admin ops/tooling.
6. Live `M6` seeding and capture now execute successfully against `https://smartiq-63tk.onrender.com`, including a bootstrap cohort that can exercise repeat-host, paid-conversion, and support-case evidence paths.
7. The `M6` gate now excludes bootstrap-seeded tenants from readiness counts, and the latest corrected artifact reports `10` bootstrap-seeded tenants but `0` real pilot tenants.
8. `M6` therefore remains honestly blocked on real pilot volume rather than missing instrumentation, because the milestone still requires `10` real activated hosts and `5` real repeat hosts.
9. `M7` was allowed to proceed in parallel with that deferred external blocker, and it now has a complete public recurring-host launch surface, launch KPI snapshot tooling, recurring-host incident runbook, and technical launch gate wrapper.
10. Live `M7` validation is now green on `https://smartiq-63tk.onrender.com` and `https://smartiq-nine.vercel.app`, including release readiness, alert validation, launch smoke, and runtime-deck verification through the launch gate.
11. `M7` is therefore promoted done on 2026-03-07, while `M6` remains explicitly deferred because real pilot proof is still missing.
12. `M8` is now the active commercial-proof milestone: recurring-host go/no-go pack generation, 12-month operating-plan generation, and a sellable-SaaS gate wrapper exist, but the milestone remains commercially unproven.
13. `M9` technical work has now also started in parallel with that deferred `M8` proof blocker: the host workspace includes a new `Host momentum` repeat-host analytics card derived from recent hosted sessions and saved templates.
14. The latest `M9` slice also adds host-side pre-live roster selection inside room management, so repeat hosts can curate selected room players directly into launch setup without rebuilding the player list manually.
15. The latest `M9` slice also adds one-click `history -> template` reuse from the session review panel, so repeat hosts can turn reviewed sessions directly into reusable presets.
16. The latest `M9` slice also makes reviewed session rosters win over stale room rosters during duplicate setup, so repeat-host reuse follows the last reviewed event reality more closely.
17. The latest `M9` slice also persists host launch-roster moderation locally per room code, so curated pre-live rosters survive browser resume for saved rooms.

## Milestone Definitions

### M0 - Strategy Reset and Baseline Lock

Objective:
1. Replace "launch-ready" assumptions with an honest execution baseline.

Scope:
1. Freeze the target ICP to recurring live-quiz hosts.
2. Publish canonical strategy, milestones, and gates.
3. Define the narrow launch wedge and canonical paid path.
4. List all known gaps inherited from the previous track.

Definition of done:
1. Masterplan, milestones, and gates docs are published and cross-linked.
2. A single ICP and product definition are locked.
3. Previous readiness claims that rely on fixture-only evidence are explicitly treated as non-commercial proof.
4. Priority backlog is re-sorted against activation, repeat hosting, and paid conversion.

### M1 - Product Stabilization

Objective:
1. Make the current product internally reliable before more commercialization is layered on top.

Scope:
1. Fix failing frontend runtime/gameplay tests.
2. Remove ambiguous dual-path behavior where the host flow is unclear.
3. Verify room/game/replay flow on mobile and desktop.
4. Fix launch-language content defects that reduce host trust.

Definition of done:
1. Targeted frontend and backend gameplay suites are green.
2. One canonical host runtime path exists from setup to replay.
3. ET and EN launch packs pass agreed quality thresholds.
4. No Critical/High bugs remain in create/join/play/replay flow.

### M2 - Real Auth and Trust Hardening

Objective:
1. Replace low-trust runtime identity shortcuts with a real host authentication model.

Scope:
1. Add OAuth or passwordless auth callback flow.
2. Replace unsigned bootstrap bearer flow in production path.
3. Add account/session lifecycle behavior for real users.
4. Add owner/member identity rules aligned with tenant membership.
5. Close the highest-risk trust gaps in runtime auth handling.

Definition of done:
1. Hosts can sign up and sign in without manual header hacks.
2. Production auth tokens are verified, not only decoded.
3. Session restore/logout behavior is deterministic.
4. Security and auth-context tests are green.
5. No production path depends on unsigned bootstrap identity.

### M3 - Billing and Payment Hardening

Objective:
1. Establish a trustworthy commercial transaction path before growth claims.

Scope:
1. Integrate a real billing provider.
2. Implement checkout redirect and verified webhook handling.
3. Synchronize subscription state into tenant runtime.
4. Add billing failure and recovery handling for the host path.
5. Harden replay safety, webhook verification, and reconciliation behavior.

Definition of done:
1. Trial or paid checkout works end-to-end.
2. Webhook verification, replay safety, and subscription sync are production-grade.
3. Runtime can read current plan/capabilities from canonical state.
4. Manual fake-billing flow is removed from the production path.
5. Payment error handling and recovery path are documented and tested.

### M4 - Full Host/Join/Replay Canonical Flow

Objective:
1. Turn SmartIQ into a complete hostable quiz-night product, not just a stabilized engine plus SaaS rails.

Scope:
1. Bind rooms and game sessions to tenant context.
2. Create a host dashboard for session creation, launch, replay, and history.
3. Make branded host and player entry surfaces first-class.
4. Make host create, player join, live run, replay, and duplicate-event flow canonical.
5. Ensure runtime settings affect real host behavior where intended.

Definition of done:
1. Every room and live session is tenant-scoped.
2. Hosts can create, launch, replay, and review session history from product UI.
3. Branding is visible and consistent on both host and player surfaces.
4. Cross-tenant leakage tests and policy tests are green.
5. Full host/join/replay canonical flow works without operator intervention.

### M5 - Paid Value and Entitlement Enforcement

Objective:
1. Make payment visibly valuable and enforceable in product behavior.

Scope:
1. Lock a simple packaging matrix for Trial and Pro Host.
2. Add runtime capability checks for real host actions.
3. Add upgrade prompts at natural value boundaries.
4. Add host-facing analytics/history or template features that justify payment.

Definition of done:
1. At least 3 meaningful paid capabilities are enforced in runtime.
2. Upgrade flow is reachable from product friction points.
3. Paid activation removes restrictions immediately and deterministically.
4. Entitlements are enforced on host actions, not only internal admin APIs.

### M6 - Pilot Conversion and Retention Proof

Objective:
1. Prove that real hosts activate, convert, and come back.

Scope:
1. Run founder-assisted pilots with narrow ICP.
2. Instrument activation, session launch, replay, and repeat-host metrics.
3. Improve host onboarding based on pilot friction.
4. Add lightweight support/feedback loop into operations.
5. Measure upgrade behavior and early paid retention.

Definition of done:
1. At least 10 real pilot hosts have activated.
2. At least 5 hosts have run 2 or more sessions.
3. Activation, conversion, and repeat-host metrics are generated from real usage.
4. Highest-friction onboarding and upgrade blockers have owners and fixes.

### M7 - Narrow Launch Readiness

Objective:
1. Prepare the product for a narrow public launch to the chosen niche.

Scope:
1. Production observability and alert ownership for auth, billing, and gameplay.
2. Pricing page and public conversion surface for the chosen niche.
3. Support workflow and rollback playbooks.
4. Finalize launch-language content baseline and host onboarding copy.

Definition of done:
1. Public-facing conversion path exists and is internally reviewed.
2. Operational playbooks are complete for auth, billing, and live-session incidents.
3. KPI dashboards run from production data.
4. No unresolved Critical/High blockers remain for narrow launch.

### M8 - Sellable Niche SaaS Validation

Objective:
1. Prove that SmartIQ is no longer only a product prototype, but a sellable niche SaaS.

Scope:
1. Validate paid conversion and repeat usage in the chosen niche.
2. Publish a go/no-go decision pack for broader launch or continued pilot mode.
3. Produce a 12-month product and revenue operating plan based on observed data.

Definition of done:
1. At least 3 paying hosts are live on the canonical plan.
2. At least 1 customer segment shows repeatable activation and retention behavior.
3. Founder can describe:
   - who buys,
   - why they pay,
   - what they repeat,
   - what the next growth motion is.
4. A go/no-go recommendation is published with evidence from real usage.

### M9 - Host Product Depth

Objective:
1. Make SmartIQ meaningfully better for repeat hosts, not just first-time activation.

Scope:
1. Add saved event templates or reusable session presets.
2. Add host session history and post-session review surfaces.
3. Add better pre-live controls:
   - lobby control,
   - participant management,
   - restart/replay/duplicate event flow.
4. Add first real host analytics workspace.

Definition of done:
1. Hosts can save and reuse repeatable session setup.
2. Hosts can review past sessions from product UI.
3. Core repeat-host workflow is faster than first-session workflow.
4. Repeat host satisfaction and operational friction are measurably improved.

### M10 - Content and Gameplay Depth

Objective:
1. Prevent the product from stalling after novelty wears off.

Scope:
1. Add content pack/version model.
2. Expand launch-language deck quality and freshness.
3. Add at least one additional meaningful gameplay or session format variation.
4. Add editorial/content QA workflow and launch gating.

Definition of done:
1. Hosts can choose or assign content packs cleanly.
2. Launch packs meet quality thresholds for repeated use.
3. At least one additional session mode is production-usable.
4. Content freshness and defect monitoring are operationalized.

### M11 - Team and Agency Productization

Objective:
1. Expand beyond solo hosts into small teams and agencies without turning into enterprise services.

Scope:
1. Add multi-host tenant workflows.
2. Add role-based host collaboration surfaces.
3. Add shared asset model for branding, templates, and session history.
4. Add `Team/Agency` packaging and capability matrix.

Definition of done:
1. Multiple hosts can operate within one tenant cleanly.
2. Shared templates, assets, and histories work without role confusion.
3. Team/Agency tier is product-real, not only pricing-copy-real.
4. At least one pilot account successfully uses multi-host workflows.

### M12 - Mature Niche Product Readiness

Objective:
1. Prove SmartIQ is not only sellable, but operationally and product-wise mature for its niche.

Scope:
1. Review retention, revenue retention, and support load.
2. Harden the highest-leverage growth loops.
3. Finalize operational playbooks for routine scale.
4. Publish a maturity assessment and next-phase strategy.

Definition of done:
1. Core niche segment shows stable repeat usage and acceptable paid retention.
2. The product can onboard and retain customers without founder rescue as the normal path.
3. Growth, support, and operations are documented with realistic owner model.
4. A maturity report is published describing what is finished, what remains expansion, and what should not be built yet.

## Milestone Dependencies

1. `M1` depends on `M0`.
2. `M2` depends on `M1`.
3. `M3` depends on `M2`.
4. `M4` depends on `M3`.
5. `M5` depends on `M4`.
6. `M6` depends on `M5`.
7. `M7` depends on `M6`.
8. `M8` depends on `M7`.
9. `M9` depends on `M8`.
10. `M10` depends on `M9`.
11. `M11` depends on `M10`.
12. `M12` depends on `M11`.
