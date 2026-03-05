---
title: SmartIQ white-label program v1
type: program
status: superseded
date: 2026-03-03
owner: Agent 0
superseded_by: docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md
---

# SmartIQ White-Label Program v1

> Superseded by `docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md`.

## Goal

Move SmartIQ from closed-beta engineering readiness to a sellable white-label B2B product track, focused on corporate training in Estonia/Baltics.

## Locked Decisions

1. ICP: corporate training teams.
2. Pricing model: setup fee + monthly subscription.
3. Delivery model: two parallel AI teams working in separate worktrees.
4. Governance: autonomous execution until PR-ready, with risk-based escalation.
5. IP strategy: immediate rebrand and gameplay language differentiation.

## Outcomes (12-week target)

1. White-label technical foundation is merged:
   - tenant data model
   - tenant admin API v1
   - branding/runtime configuration scaffold
2. Go-to-market foundation is merged:
   - pricing and packaging docs
   - pilot onboarding flow
   - reusable second-AI prompt templates
3. Operational controls for dual-AI execution are in place:
   - worktree setup script
   - file ownership policy
   - ownership validation script
   - reusable Team B execution prompts

## Workstreams

## Stream A - Platform Core

Owner: AI Team A

1. Database schema for tenants/users/memberships/billing/usage/audit.
2. Tenant admin API v1.
3. Tenant branding persistence and retrieval.
4. Security and tenancy guardrails for internal admin routes.

## Stream B - Commercial Surface

Owner: AI Team B

1. Rebrand copy updates.
2. Admin UX for tenant branding and user roster.
3. Pricing/landing and pilot collateral.

## Integration and Governance

1. Separate worktree per team is mandatory.
2. Shared file edits require explicit coordination.
3. Merge order:
   - schema and backend APIs
   - frontend/admin integration
   - docs and runbooks

## Prompt Assets

1. `docs/prompts/dual-ai/task-template.md`
2. `docs/prompts/dual-ai/integration-template.md`
3. `docs/prompts/dual-ai/review-template.md`
4. `docs/prompts/dual-ai/team-b-sprint1-admin.md`
5. `docs/prompts/dual-ai/team-b-sprint1-gtm.md`
6. `docs/prompts/dual-ai/team-b-sprint2-admin-operations.md`

## Exit Criteria

1. `mvn -q -f backend/pom.xml test` remains green for touched areas.
2. New white-label API and migration tests are green.
3. Dual-AI ownership validator passes on both team branches.
4. Program docs are current and cross-linked from runbooks/templates.
