# CherryPick Single-Player Execution Masterplan

Date: 2026-04-23
Status: active
Source of truth: audit findings from repository state at commit family around `12c7b63`

## Purpose

This document converts the current CherryPick audit into an execution plan with the smallest practical number of large sprints.

The plan is intentionally biased toward:

- single-player-first delivery
- product truth over roadmap theater
- release-contract correctness
- replayability and retention before multiplayer expansion

It does not treat missing `JOIN` or `HOST` completion as the main problem. Those surfaces matter only where they create drift, misleading docs, or release risk for the current solo product.

## Product Truth

CherryPick today is strongest as:

- a dark, premium-feeling solo quiz product
- an 8-answer all-or-nothing game loop
- a server-authoritative runtime with local XP progression

CherryPick today is weakest at:

- content truth and content quality
- consistency between runtime, docs, validators, and smoke scripts
- honest retention systems
- reward depth versus the public promise

That means the next phase should not chase breadth. It should make the current solo product real, sharp, and releasable.

## Success Definition

CherryPick is considered ready for a narrow public single-player launch when all of the following are true:

1. The active EN runtime dataset feels coherent, human-readable, and replayable.
2. Home, gameplay, result, and docs advertise only systems that actually exist.
3. Release gates, runtime config, smoke tests, and deploy docs all describe the same product contract.
4. The solo loop is fast and tense enough to support repeated play.
5. At least one real retention mechanic exists beyond local XP.
6. The product is stable across desktop and mobile core screens.

## What We Will Not Prioritize In This Track

- full public `JOIN` expansion
- full public `HOST` expansion
- couch mode delivery
- broad white-label or recurring-host SaaS work
- cosmetic rebrands not tied to correctness, retention, or launch readiness

## Milestone Map

## M10 - Product Truth + Release Contract

### Goal

Make the current solo product honest and make the repo's release contract trustworthy again.

### Why This Comes First

The current repo already has a playable solo runtime, but the product is undermined by two high-severity problems:

- the active EN content still includes obviously synthetic scaffolding
- the repo's own release/config/smoke contracts disagree about what CherryPick is

Until those are fixed, deeper gameplay and retention work sits on a weak base.

### Scope

- align `application.yml`, validators, smoke scripts, and runtime deck assumptions
- fix active EN dataset quality issues in the shipped runtime set
- upgrade validators so these content failures are caught automatically
- remove fake Daily Challenge / leaderboard claims from home until real systems exist
- update active docs so the repo defaults to the current solo-first story

### Done Means

- `npm run validate:cards:cherrypick` is green
- `npm run gate:local` is green
- `npm run release:check` is green
- home no longer contains fake retention theater
- core docs match the implemented product

## M11 - Solo Loop + Reward Contract

### Goal

Turn the current solo flow from "works" into "feels like CherryPick."

### Scope

- tighten answer-selection pacing
- remove unnecessary confirmation friction
- finish or intentionally narrow the XP/reward contract
- make gameplay and result screens explain the real reward model clearly
- clean residual solo-path drift like stale difficulty semantics

### Done Means

- the solo loop feels fast and tense in browser testing
- reward semantics are consistent in code, UI, tests, and docs
- new gameplay coverage locks the contract in place

## M12 - Retention Systems

### Goal

Add real reasons to come back.

### Scope

- Daily Challenge v1
- leaderboard-lite or personal-best loop
- stronger progression persistence
- minimal analytics for replay/drop-off measurement
- rebuild home modules on top of real retention data

### Done Means

- the home screen contains live retention modules
- the daily feature is playable end-to-end
- the team can measure if users replay

## M13 - Launch Readiness

### Goal

Make the narrow public solo launch operationally credible.

### Scope

- mobile and viewport polish
- accessibility and empty/error-state polish
- deploy/runbook/smoke alignment for the real product path
- soft-launch rehearsal and blocker capture

### Done Means

- core screens are launch-stable on laptop and mobile
- deploy and rollback guidance matches reality
- the remaining blocker list is small and explicit

## Sprint Plan

We are intentionally using four large sprints rather than many micro-sprints.

## Execution Sprint A - Product Truth + Release Contract

### Workstreams

1. Release contract alignment
2. EN runtime content repair
3. Validator honesty upgrade
4. Home honesty cleanup
5. Docs truth pass

### Primary Owner Areas

- data
- backend/tooling
- frontend
- docs/product

### Main Risks

- touching validators can expose more latent dataset debt than expected
- content cleanup may require editorial judgment, not only scripting

### Must-Have Exit Proof

- green release-gate commands captured in `tasks/todo.md`
- before/after examples of cleaned runtime content

## Execution Sprint B - Solo Loop + Reward Contract

### Workstreams

1. gameplay pacing pass
2. XP/reward contract completion
3. result/progression clarity
4. solo-path cleanup and coverage

### Primary Owner Areas

- frontend/gameplay
- backend/game contract
- product

### Main Risks

- changing pacing can accidentally reduce clarity if not tested in browser
- reward changes can create docs/test drift if not updated together

### Must-Have Exit Proof

- updated gameplay tests
- browser verification of the faster solo loop

## Execution Sprint C - Retention Systems

### Workstreams

1. Daily Challenge v1
2. leaderboard-lite or personal-best
3. progression persistence hardening
4. analytics v1
5. real home retention modules

### Primary Owner Areas

- backend
- frontend
- product/data

### Main Risks

- trying to overbuild retention instead of shipping one sharp loop
- backend persistence scope growing too large

### Must-Have Exit Proof

- one real daily loop is playable
- home cards use real data
- analytics confirms usage through the replay funnel

## Execution Sprint D - Launch Readiness

### Workstreams

1. viewport/mobile/accessibility polish
2. production launch docs and smoke alignment
3. post-deploy verification
4. soft-launch rehearsal

### Primary Owner Areas

- frontend
- infra/ops
- QA

### Main Risks

- last-mile polish can sprawl unless held to launch blockers only

### Must-Have Exit Proof

- core screens verified on target breakpoints
- deploy, smoke, and rollback flow exercised against a live-like environment

## Immediate Execution Order

1. Start Execution Sprint A.
2. Do not begin Daily Challenge implementation before Execution Sprint A closes.
3. Do not expand public `JOIN`/`HOST` work during this masterplan unless it blocks solo delivery.

## First Task Inside Execution Sprint A

The first execution task remains:

`Fix the active EN runtime content and validator honesty so CherryPick stops shipping obviously synthetic questions.`

This is the highest-leverage move because it improves:

- gameplay quality
- player trust
- retention potential
- pipeline truthfulness

## Tracker

The active checklist lives in:

- `tasks/todo.md`

Related audit artifact:

- `todos/004-ready-p2-current-state-audit.md`
