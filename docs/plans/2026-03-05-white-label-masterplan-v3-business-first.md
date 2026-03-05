---
title: SmartIQ white-label masterplan v3 (business-first lean)
type: masterplan
status: active
date: 2026-03-05
owner: Agent 0
supersedes: docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md
business_baseline: docs/plans/2026-03-05-business-end-goal-assessment-et.md
milestones: docs/plans/2026-03-05-white-label-milestones-v3.md
gates: docs/plans/2026-03-05-white-label-gates-v3.md
---

# SmartIQ White-Label Masterplan v3 (Business-First Lean)

## Summary

This is the canonical white-label execution plan for SmartIQ.

Primary objective:
1. Convert SmartIQ from a technically strong prototype into a sellable white-label product with verified business signal.

Canonical business gate questions from assessment (must be answered before aggressive scaling):
1. Who pays for this?
2. Is IP risk solvable?
3. Does content bring users back?

Canonical business baseline:
1. `docs/plans/2026-03-05-business-end-goal-assessment-et.md`

## Operating Model (locked)

1. Experimental multi-agent mode runs as one orchestrated flow.
2. Team A/Team B split is not required for normal execution.
3. Exactly one milestone may be `IN_PROGRESS` at any time.
4. `M(n+1)` may start only after `M(n)` is `DONE`.
5. Every milestone requires:
   - documented evidence
   - touched-scope tests green
   - no unresolved Critical/High findings
6. Default sprint cadence is one week per milestone.
7. Usage economy remains mandatory:
   - short prompts
   - no duplicate audits
   - targeted checks before broad checks

## Completion Definition (100%)

The program is considered complete only when all conditions are true:
1. At least 2 paying pilot tenants are onboarded.
2. IP risk is explicitly mitigated and documented.
3. Tenant isolation, auth, and plan-limit guardrails are green.
4. 7-day retention evidence exists for closed beta tenants.
5. Launch readiness pack is complete (runbook, rollback, monitoring, ownership).

## Public Interfaces (v3 baseline)

Existing interfaces kept stable:
1. Internal tenant admin APIs: `/internal/wl/*`
2. Runtime member context APIs:
   - `/api/me`
   - `/api/me/tenant-settings`
   - `/api/me/tenant-branding`
   - `/api/me/tenant-subscription`

Business-first v3 target interfaces to finalize through milestones:
1. `POST /api/auth/login` (or OAuth callback integration)
2. `GET /api/me`
3. `GET/PATCH /api/tenants/{tenantId}`
4. `POST /api/tenants/{tenantId}/members`
5. `POST /api/tenants/{tenantId}/content/import`
6. `GET /api/tenants/{tenantId}/usage`
7. `GET /api/tenants/{tenantId}/billing`

Error taxonomy to stay consistent across backend + frontend:
1. `UNAUTHENTICATED`
2. `FORBIDDEN_TENANT`
3. `PLAN_LIMIT_REACHED`
4. `INVALID_BRANDING_ASSET`

## Milestone and Gate Sources of Truth

1. Milestone plan and sprint mapping:
   - `docs/plans/2026-03-05-white-label-milestones-v3.md`
2. Promotion gates and verification checks:
   - `docs/plans/2026-03-05-white-label-gates-v3.md`

## Supersession

1. v2 white-label masterplan is historical and superseded:
   - `docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md`
