---
title: Dual-AI delivery protocol
type: protocol
status: legacy
date: 2026-03-03
owner: Agent 0
superseded_by: docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md
---

# Dual-AI Delivery Protocol

> Legacy compatibility protocol. Canonical execution model is now defined in `docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md`.

## Purpose

Provide a deterministic way for two AI teams to work in parallel directly in this repository without corrupting each other's work.

## Required Structure

1. One worktree per team.
2. One branch per task.
3. One PR per branch.

Example:

1. Team A worktree: `worktrees/ai-team-a`
2. Team B worktree: `worktrees/ai-team-b`
3. Branch format: `wl/<stream>/<task>-<yyyymmdd>`

## File Ownership Rules

1. Team A owns backend/platform scope by default:
   - `backend/**`
   - `tools/**` (platform scripts only)
2. Team B owns frontend/commercial scope by default:
   - `frontend/**`
   - `docs/prompts/**`
3. Shared coordination files require explicit lock/announcement:
   - `README.md`
   - `docs/plans/**`
   - `docs/policies/**`
   - `.github/workflows/**`
   - `package.json`

## Delivery Cadence

1. Team A and Team B run in parallel.
2. Architect performs integration review per PR-ready batch:
   - conflict matrix
   - risk log
   - merge order
3. Merge order:
   - migrations/schemas
   - backend APIs
   - frontend/admin
   - docs and scripts

## Blocking Conditions

Pause integration and escalate if any of the following occur:

1. Tenant isolation boundary violation.
2. Auth/authz bypass in newly added routes.
3. Shared-file conflict burst (>3 shared files in same batch).
4. Migration safety risk (failed empty-db migration or rollback concern).

## Command Checklist

1. Bootstrap worktrees:
   - `powershell -ExecutionPolicy Bypass -File tools/setup_dual_ai_worktrees.ps1`
2. Validate file ownership before PR:
   - `node tools/validate_dual_ai_file_ownership.js --team=team-a --base=origin/main`
   - `node tools/validate_dual_ai_file_ownership.js --team=team-b --base=origin/main`
   - Add `--allow-shared-locked` only when shared-file edits were explicitly coordinated.
