---
title: SmartIQ white-label milestones v3 (business-first)
type: milestones
status: active
date: 2026-03-05
owner: Agent 0
masterplan: docs/plans/2026-03-05-white-label-masterplan-v3-business-first.md
---

# SmartIQ White-Label Milestones v3

## Sprint System

Hard rules:
1. One sprint executes exactly one milestone.
2. Only one milestone may be `IN_PROGRESS`.
3. Next milestone starts only after previous milestone exit gate is green.

Cadence:
1. Default sprint length is one week.
2. Compression is allowed only if gate checks and evidence quality are unchanged.

## Milestone Plan (S0 -> S8)

| Milestone | Sprint | Objective | Exit Gate (summary) | Status |
| --- | --- | --- | --- | --- |
| M0 | S0 | Baseline + gate system lock | v3 docs linked + docs checks green | DONE (2026-03-05) |
| M1 | S1 | Payment signal validation | 2 pilot-ready buying signals documented | IN_PROGRESS (2026-03-05) |
| M2 | S2 | IP risk mitigation lock | no known blocking IP risk | LOCKED |
| M3 | S3 | Auth + tenant isolation hardening | auth/isolation suite green | LOCKED |
| M4 | S4 | Runtime white-label behavior | per-tenant branding works without redeploy | LOCKED |
| M5 | S5 | Billing + limits | deterministic limit enforcement verified | LOCKED |
| M6 | S6 | Closed beta retention proof | 7-day retention evidence recorded | LOCKED |
| M7 | S7 | Pilot conversion ops | 2 paying pilots signed and onboarded | LOCKED |
| M8 | S8 | Launch hardening + go-live pack | final go/no-go gate green | LOCKED |

Current execution pointer:
1. `S0/M0` is complete.
2. `S1/M1` is active.

## Milestone DoD (decision complete)

### M0 - Baseline and Gate Lock

1. v3 masterplan, milestones, and gates docs are present and cross-linked.
2. README and plans index reference v3 as canonical.
3. v2 plan is marked superseded.
4. Docs validation commands are green.

### M1 - Payment Signal Validation

1. ICP and pricing page/copy are stable enough for outreach.
2. At least 10 qualified outreach attempts are logged.
3. At least 3 discovery calls are logged.
4. At least 2 prospects are explicitly ready for paid pilot terms.

### M2 - IP Risk Mitigation

1. Rebrand asset set is finalized.
2. Terminology/gameplay copy deltas against Smart10 are documented.
3. Asset provenance notes are complete for externally visible brand assets.
4. Legal/IP review result is stored with clear go/no-go note.

### M3 - Auth + Tenant Isolation Hardening

1. Tenant boundary is enforced on all white-label data paths.
2. Missing auth returns `UNAUTHENTICATED`.
3. Wrong-tenant access returns `FORBIDDEN_TENANT`.
4. Audit trail covers boundary-relevant admin mutations.

### M4 - Runtime White-Label Mechanism

1. Tenant branding fields (`name`, `logoUrl`, `primaryColor`, `secondaryColor`, `appTitle`) are resolved at runtime.
2. Two tenants on same deployment render distinct branding.
3. Runtime fallback behavior is deterministic when a tenant field is missing.

### M5 - Billing + Limit Enforcement

1. Usage events can be queried by billing period.
2. Plan limits enforce hard blocks on configured thresholds.
3. Limit violations emit `PLAN_LIMIT_REACHED` consistently.
4. Admin/audit evidence exists for limit-breach scenarios.

### M6 - Closed Beta Retention Proof

1. 5-10 beta tenants are onboarded.
2. Core flow evidence exists: onboarding -> usage -> report.
3. 7-day retention is measured and recorded.
4. If retention target fails, corrective iteration plan is attached before promotion.

### M7 - Pilot Conversion

1. Sales/demo handoff flow is repeatable from docs only.
2. At least 2 paying pilot tenants are contracted and onboarded.
3. Pricing tier selection and onboarding status are tracked per pilot.

### M8 - Launch Readiness

1. Security, migration, rollback, and monitoring checks are complete.
2. Operational ownership is explicit (owner + backup owner per runbook area).
3. Final go/no-go report is published with blocking risks closed or accepted.

## Promotion Rule

1. Promotion `M(n)` -> `M(n+1)` is valid only when:
   - `M(n)` DoD is fully satisfied
   - `M(n)` gate checks are green (see gates doc)
   - evidence links are written into milestone artifacts
