---
title: SmartIQ white-label masterplan v4 (product-first rebaseline)
type: masterplan
status: active
date: 2026-03-05
owner: Agent 0
supersedes: docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md
business_baseline: docs/plans/2026-03-05-business-end-goal-assessment-et.md
milestones: docs/plans/2026-03-05-white-label-milestones-v3.md
gates: docs/plans/2026-03-05-white-label-gates-v3.md
---

# SmartIQ White-Label Masterplan v4 (Product-First Rebaseline)

## Summary

This is the canonical white-label execution plan for SmartIQ.

Primary objective:
1. Deliver a production-ready white-label assessment and certification engine with stable APIs, tenant isolation, and operational reliability.

Delivery mode lock:
1. Product-first execution is active.
2. Cold-call market research is not a blocking requirement for core engine delivery.
3. Commercial validation remains a post-launch workstream.

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
1. Tenant isolation, auth, runtime branding, and billing guardrails are production-verified.
2. API contracts are stable and validated through milestone gates.
3. Release readiness is complete:
   - migration safety,
   - rollback drill,
   - observability baseline,
   - launch runbook ownership.
4. Security and IP hygiene baselines are documented with explicit sign-off.
5. GA handoff package is complete and auditable.

## Public Interfaces (v4 baseline)

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

Commercial validation policy:
1. M1 commercial proof is not a core blocking gate for engine completion.
2. Commercial proof remains required for go-to-market scaling, but is tracked as post-launch evidence.

## Milestone and Gate Sources of Truth

1. Milestone plan and sprint mapping:
   - `docs/plans/2026-03-05-white-label-milestones-v3.md`
2. Promotion gates and verification checks:
   - `docs/plans/2026-03-05-white-label-gates-v3.md`

## Supersession

1. v2 white-label masterplan is historical and superseded:
   - `docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md`
