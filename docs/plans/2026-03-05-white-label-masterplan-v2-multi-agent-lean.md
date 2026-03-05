---
title: SmartIQ white-label masterplan v2 (multi-agent lean)
type: masterplan
status: active
date: 2026-03-05
owner: Agent 0
supersedes: docs/plans/2026-03-03-white-label-program-v1.md
---

# SmartIQ White-Label Masterplan v2 (Multi-Agent Lean)

## Summary

This is the canonical white-label execution plan for SmartIQ.

Primary objective:
- Reach a production-ready white-label track for corporate training with minimal operational and token overhead.

Operating mode:
- Experimental multi-agent mode with one orchestrator flow.
- No separate Team A / Team B split is required for normal execution.
- Use short milestone-scoped prompts and single checkpoint merges.

## Locked Decisions

1. ICP remains corporate training teams in Estonia/Baltics.
2. Pricing model remains setup fee + monthly subscription.
3. Existing stack remains unchanged (web-first architecture, current deploy model).
4. White-label implementation is milestone-based and decision-complete per milestone.
5. Usage economy is mandatory: low prompt verbosity, no duplicate analyses, max 1-2 parallel subagents.

## Public Interfaces (v2 contract freeze)

Existing white-label endpoints are the baseline surface:
1. Internal tenant admin APIs: `/internal/wl/*`
2. Runtime member context APIs: `/api/me`, `/api/me/tenant-settings`, `/api/me/tenant-branding`, `/api/me/tenant-subscription`

Error taxonomy to keep consistent across backend + frontend:
1. `INVALID_TENANT_REQUEST`
2. `FORBIDDEN_TENANT_ACCESS`
3. `TENANT_NOT_FOUND`
4. `USER_NOT_FOUND`
5. `MEMBERSHIP_NOT_FOUND`
6. `LAST_OWNER_PROTECTION`

Future public tenant APIs are a later milestone item, not phase-0 scope.

## Milestones

### M0 - Canonicalization and Scope Lock

1. v2 masterplan is canonical and cross-linked.
2. v1 white-label program is explicitly superseded.
3. Execution policy for usage economy is documented and active.

Done when:
1. Canonical references in README and plans index point to v2.
2. No active docs require Team A/B split for normal work.

### M1 - Backend White-Label Foundation Stabilization

1. Tenant schema, admin APIs, auth context, and error mappings are stable.
2. Migration and targeted backend tests are green for white-label slices.

Done when:
1. White-label backend test slice passes.
2. Migration safety checks pass on current branch.

### M2 - Admin UI Contract Alignment

1. Admin UI request/response shapes match backend white-label contracts.
2. Validation and error rendering use frozen taxonomy.

Done when:
1. Frontend unit tests for admin tabs pass.
2. Contract mismatch findings are zero for settings/subscription/member flows.

### M3 - Tenant Runtime Branding and Settings End-to-End

1. Tenant branding/settings/subscription correctly resolve through `/api/me*`.
2. Runtime reflects tenant-specific branding and config.

Done when:
1. End-to-end happy path passes: tenant create -> configure -> runtime reflects.

### M4 - Billing and Usage Guardrails

1. Usage event ingestion and reporting are stable.
2. Plan/limit enforcement and associated error behavior are deterministic.

Done when:
1. Limit breach scenarios emit expected API errors and audit evidence.

### M5 - GTM and Pilot Readiness

1. Pricing/packaging docs and pilot onboarding artifacts are complete.
2. Sales/demo handoff is repeatable.

Done when:
1. Pilot runbook and conversion metric definitions are finalized.

### M6 - Go/No-Go Gate

1. Consolidated release evidence is generated.
2. Blocking risks are either closed or explicitly accepted.

Done when:
1. Final white-label go/no-go gate is documented with evidence links.

## Test and Acceptance Baseline

1. Tenant A cannot access Tenant B data.
2. Missing/invalid auth context is rejected; forbidden tenant access is rejected.
3. Tenant branding is applied tenant-specifically in runtime.
4. Billing/usage limits block correctly with stable error semantics.
5. Flyway migration checks remain green for white-label schema changes.
6. End-to-end pilot flow succeeds with auditable outputs.

## Usage Economy Policy

1. Keep one active milestone in progress per orchestrator loop.
2. Use short prompts with explicit DoD and max 3 open questions.
3. Reuse prior evidence; do not rerun broad repo-wide audits unless scope changed.
4. Prefer targeted tests over full-suite runs during iteration.
5. Merge in small batches with one integration checkpoint per milestone.
