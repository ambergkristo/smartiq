---
title: SmartIQ white-label milestones v4 (product-first rebaseline)
type: milestones
status: active
date: 2026-03-05
owner: Agent 0
masterplan: docs/plans/2026-03-05-white-label-masterplan-v3-business-first.md
---

# SmartIQ White-Label Milestones v4

## Sprint System

Hard rules:
1. One sprint executes exactly one milestone.
2. Only one milestone may be `IN_PROGRESS`.
3. Next milestone starts only after previous milestone exit gate is green.

Cadence:
1. Default sprint length is one week.
2. Compression is allowed only if gate checks and evidence quality are unchanged.

## Milestone Plan (S0 -> S9)

| Milestone | Sprint | Objective | Exit Gate (summary) | Status |
| --- | --- | --- | --- | --- |
| M0 | S0 | Baseline + gate system lock | docs and gate references are valid | DONE (baseline) |
| M1 | S1 | Product direction lock | ICP + packaging + use-case lock complete | DONE (baseline) |
| M2 | S2 | IP hygiene baseline | copy/provenance/legal baseline present | DONE (baseline) |
| M3 | S3 | Auth + tenant isolation hardening | auth/isolation suite green | DONE (gate pass, 2026-03-05) |
| M4 | S4 | Runtime white-label behavior | tenant branding works without redeploy | DONE (gate pass, 2026-03-05) |
| M5 | S5 | Admin operations readiness | admin flows and role safety stable | DONE (gate pass, 2026-03-05) |
| M6 | S6 | Billing + usage guardrails | deterministic limits and usage reporting | READY |
| M7 | S7 | Production reliability | observability + reliability gates green | LOCKED |
| M8 | S8 | Launch readiness | release/rollback/runbook gates green | LOCKED |
| M9 | S9 | GA handoff (100%) | final production sign-off package complete | LOCKED |

Current execution pointer:
1. `S0/M0` baseline carry-forward is complete.
2. `S1/M1` baseline carry-forward is complete.
3. `S2/M2` baseline carry-forward is complete.
4. `S3/M3` is complete.
5. `S4/M4` is complete.
6. `S5/M5` is complete.
7. `S6/M6` is the next active milestone.

## Milestone DoD (decision complete)

### M0 - Baseline and Gate Lock

1. Canonical masterplan, milestones, and gates docs are linked.
2. Docs validation commands are green.
3. Supersession references are coherent.

### M1 - Product Direction Lock

1. Product category and core use-cases are locked.
2. Packaging and pricing structure are documented.
3. API delivery scope is frozen for implementation.

### M2 - IP Hygiene Baseline

1. Copy-delta register exists and is reviewed at baseline level.
2. Branding provenance register exists and is reviewed at baseline level.
3. Legal/IP memo exists with baseline status and owner.

### M3 - Auth + Tenant Isolation Hardening

1. Tenant boundary is enforced on white-label data paths.
2. Missing auth and wrong-tenant access return deterministic errors.
3. Security/auth regression test suite is green.

### M4 - Runtime White-Label Mechanism

1. Runtime branding fields resolve tenant-specifically.
2. Two tenants on same deployment render different branding.
3. Fallback behavior for missing tenant fields is deterministic.

### M5 - Admin Operations Readiness

1. Admin request/response contracts remain aligned.
2. Role-based constraints are enforced in admin paths.
3. Admin regression tests are green.

### M6 - Billing + Usage Guardrails

1. Usage events are queryable by billing period.
2. Plan limits enforce hard blocks with stable semantics.
3. Limit-breach behavior is auditable.

### M7 - Production Reliability

1. Observability baseline is complete (alerts + dashboards + key signals).
2. Reliability smoke and failure-path checks are green.
3. Incident triage entry points are documented.

### M8 - Launch Readiness

1. Release checklist is complete and auditable.
2. Rollback drill is completed and documented.
3. Ownership/runbook responsibilities are explicit.

### M9 - GA Handoff (100%)

1. Final production gate is green.
2. Handoff package is complete for engineering and ops.
3. White-label engine is production-ready and supportable.

## Promotion Rule

1. Promotion `M(n)` -> `M(n+1)` is valid only when:
   - `M(n)` DoD is fully satisfied
   - `M(n)` gate checks are green
   - evidence links are documented
