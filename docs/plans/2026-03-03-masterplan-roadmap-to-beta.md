---
title: SmartIQ masterplan + roadmap to closed beta
type: masterplan
status: active
date: 2026-03-03
owner: Agent 0
---

# SmartIQ Masterplan + Roadmap (Closed Beta Go-Live, Phase-Based)

## Summary
This document is the canonical SmartIQ development priority and source of truth for roadmap sequencing.

Goal: bring SmartIQ to closed beta go-live quality with a server-authoritative Smart10 game experience on web, while preparing stable contracts for future native clients.

Locked decisions:
- Release target: closed beta go-live
- Timeline model: phase-based (no fixed dates)
- UI/UX scope: full Smart10 UX scope in this roadmap
- Platform scope: web first, plus native-readiness contracts
- Infra scope: keep current stack (Vercel + Render + managed Postgres)

---

## Execution Progress (Live)

Last updated: 2026-03-03

- [x] Phase 1 - Frontend runtime now starts server-authoritative engine for all player counts.
  - Evidence: commit `440fc2f`, `frontend/src/App.jsx`, `frontend/src/App.server-mode.test.jsx`.
- [x] Phase 1 - Stale rate-limit branch removed (`/api/session/answer`) and related config/docs cleaned up.
  - Evidence: commit `440fc2f`, `backend/src/main/java/com/smartiq/backend/web/RateLimitFilter.java`, `backend/src/main/java/com/smartiq/backend/config/RateLimitProperties.java`, `docs/plans/deployment-checklist.md`.
- [x] Phase 1 - Security moved to explicit allowlist + deny-by-default with dedicated regression test.
  - Evidence: commit `440fc2f`, `backend/src/main/java/com/smartiq/backend/config/SecurityConfig.java`, `backend/src/test/java/com/smartiq/backend/config/SecurityConfigTest.java`.
- [x] Phase 4 - Contract versioning implemented with explicit `GameSessionSnapshot.apiVersion` (`1`) and client-side compatibility guard.
  - Evidence: commit `f8baab0`, `backend/src/main/java/com/smartiq/backend/game/contract/GameSessionSnapshot.java`, `frontend/src/state/useServerGameEngine.ts`.
- [x] Phase 4 - Machine-readable API error taxonomy is active and consumed in frontend mappings.
  - Evidence: commits `4f2b8d7` and `82781a0`, `backend/src/main/java/com/smartiq/backend/web/ApiExceptionHandler.java`, `backend/src/main/java/com/smartiq/backend/web/ApiErrorResponse.java`, `frontend/src/api.js`.
- [x] Phase 4 - Reconnect semantics hardened: HTTP rejoin rotates token; websocket resume uses non-rotating auth path.
  - Evidence: commit `6788f7d`, `backend/src/main/java/com/smartiq/backend/room/RoomService.java`, `backend/src/main/java/com/smartiq/backend/room/ws/RoomWebSocketHandler.java`, `backend/src/test/java/com/smartiq/backend/room/RoomServiceTest.java`.
- [x] Phase 4 - Contract spec is published with explicit v1 schema and verification references.
  - Evidence: `docs/plans/game-session-api-contract-v1.md`, `docs/plans/README.md`, `frontend/src/fixtures/contracts/game-session-create-response-v1.json`.

Legend: `[x] done`, `[~] in progress`, `[ ] not started`.

---

## Scope and Completion Definition

### In Scope
1. Server-authoritative gameplay for all player counts (including single-player).
2. Smart10 UX flows end to end (setup, board, answer loop, pass logic, round summary, game over, reconnect UX).
3. Question rendering system rework for category-aware Smart10 interaction.
4. API canonicalization and legacy endpoint retirement.
5. Closed beta operational readiness (runbooks, gates, observability, incident handling).
6. Native-readiness in API contracts (versioning, strict schemas, reconnect semantics).

### Out of Scope
1. Native app implementation.
2. Infrastructure migration to a new cloud platform.
3. Public launch.

### Done When
1. `release-readiness` is green and branch protection is enforced.
2. Server-authoritative path is the only runtime gameplay path.
3. Smart10 UX + question rendering acceptance suite passes.
4. Closed beta runbook + KPI dashboard + rollback flow are validated.
5. Smoke, runtime deck, and reconnect suites pass.

---

## Target Architecture (Final State)

### 1) Backend as Source of Truth
- All gameplay decisions are resolved server-side (`ANSWER`, `PASS`, round transitions, winner).
- Frontend renders snapshots and submits actions.
- Idempotency remains mandatory through `actionRequestId`.

### 2) Frontend Thin-Client Model
- Single runtime engine path: server session engine.
- Local engine is test-only (or removed).
- Runtime UI state is snapshot-projected plus transient UX state (selection, confirm, animation).

### 3) Stable API and Contract Surface
- Canonical endpoints:
  - `POST /api/game`
  - `GET /api/game/{gameId}`
  - `POST /api/game/{gameId}/action`
  - `POST /api/rooms`
  - `POST /api/rooms/{roomCode}/join`
  - `POST /api/rooms/{roomCode}/rejoin`
  - `WS /ws/rooms/{roomCode}`
  - `GET /api/cards/nextRandom` (deck/test/diagnostic path)
- Legacy cards endpoints are not part of supported runtime integration.

### 4) Operational Reliability
- Existing stack retained.
- Pre-merge and pre-deploy gates stay mandatory.

---

## Roadmap by Phase

## Phase 0 - Program Lock and Contract Baseline
Goal: eliminate hidden decisions before implementation work.

Deliverables:
1. Canonical masterplan committed (this file).
2. Baseline contract spec for:
   - `GameSessionSnapshot`
   - `GameActionRequest`
   - room reconnect lifecycle
3. Definition-of-ready and definition-of-done checklists per phase.

Exit Criteria:
1. Implementation can proceed without unresolved high-impact design decisions.
2. Any deviation must update this masterplan explicitly.

## Phase 1 - Authoritative Core Completion
Goal: remove dual-engine risk and clean canonical backend surface.

Work:
1. Frontend runtime uses server-authoritative path for 1+ players.
2. Legacy card endpoint usage removed from runtime integration.
3. Stale limiter branch removed (non-existent endpoint bucket).
4. Security hardening:
   - explicit public allowlist
   - deny-by-default for non-public routes
   - internal access protections verified in prod profile

Exit Criteria:
1. No normal runtime path starts local engine.
2. Legacy cards routes are retired from supported integration surface.
3. Security negative-path tests pass.

## Phase 2 - Smart10 UX Rebuild (Full Scope)
Goal: align product feel and interaction clarity with Smart10-style play.

Work:
1. Setup UX improvements:
   - player entry flow
   - clear game configuration controls
   - preflight validation hints
2. Board UX improvements:
   - category-aware interaction model
   - clear lock/confirm semantics
3. Turn clarity:
   - active player prominence
   - local-control vs observer visibility
4. Summary UX:
   - high-signal round and game summaries
   - clear next-action CTAs
5. Error UX:
   - clear recovery for network/validation/conflict/exhaustion cases
6. Mobile web ergonomics:
   - touch target sizing
   - no horizontal overflow
   - accessible keyboard and ARIA semantics

Exit Criteria:
1. UX acceptance suite passes for desktop and mobile web.
2. PASS/ANSWER flows are intuitive and unambiguous.
3. Error states are recoverable with clear user action.

## Phase 3 - Question Rendering System Rework
Goal: category-driven rendering and gameplay affordances.

Work:
1. Introduce a `QuestionRenderModel` abstraction.
2. Category templates for:
   - `NUMBER`
   - `COLOR`
   - `CENTURY_DECADE`
   - `ORDER`
   - `TRUE_FALSE`
   - `OPEN`
3. Deterministic reveal mapping across peg states.
4. Explanation/metadata panel strategy for confidence and learning loop.
5. Locale-safe rendering strategy (EN/ET now, extensible later).

Exit Criteria:
1. Every supported category has explicit template behavior.
2. No silent generic fallback for supported categories.
3. Rendering tests cover category-specific interaction and reveal.

## Phase 4 - Native-Readiness API Layer
Goal: make API contracts stable for future iOS/Android clients.

Work:
1. Contract versioning policy (`apiVersion` + compatibility rules).
2. Snapshot normalization:
   - stable field names
   - deterministic enum sets
   - strict nullability expectations
3. Action error taxonomy:
   - machine-readable codes for `400/403/404/409/429/5xx`
4. Reconnect/session semantics documented and tested:
   - room resume
   - token invalidation
   - duplicate action behavior

Exit Criteria:
1. Contract spec is published and testable.
2. Consumer contract tests pass.
3. No frontend-only assumptions remain in API payload semantics.

## Phase 5 - Data Quality Hardening
Goal: reduce dataset quality risk before beta expansion.

Work:
1. Raise quality gate from `0.80` to `0.85` after warning cleanup.
2. Reduce terse NUMBER option warnings below safety margin.
3. Enforce production fail-fast for category threshold coverage.
4. Keep locale parity checks blocking and monitored.

Exit Criteria:
1. EN/ET parity remains stable.
2. NUMBER quality risk moves away from threshold boundary.
3. Production startup fails fast on threshold breach.

## Phase 6 - Multiplayer Session Durability
Goal: improve continuity and scaling safety for closed beta.

Work:
1. Move game/room session persistence to Redis-backed store interface.
2. Keep memory store as explicit local-dev fallback only.
3. Validate reconnect and eviction behavior under restart scenarios.
4. Tune retention and capacity guardrails for beta load profile.

Exit Criteria:
1. Restart continuity tests pass.
2. Room/game state recovery is reliable after backend restart.
3. Eviction and retention metrics are visible and actionable.

## Phase 7 - Beta Operations and Go-Live Gate
Goal: production-grade operating readiness for closed beta.

Work:
1. Enforce branch protection and required checks policy.
2. Finalize runbooks:
   - deploy
   - rollback
   - incident triage
   - outage reconnect flow
3. KPI dashboards and threshold alerts:
   - completion/drop-off
   - answer/pass ratios
   - reconnect success
   - ws/join failure rates
4. Closed beta dry-run across synthetic and manual sessions.

Exit Criteria:
1. Go-live checklist is signed off.
2. No Sev-1 or Sev-2 blockers remain after dry-run.
3. Rollback drill completed successfully.

---

## Public Interfaces and Contract Changes

### Deprecation / Removal
- Retire legacy cards endpoints from supported runtime path.
- Remove stale rate-limit branches for non-existent routes.

### Contract Stabilization
- Versioned `GameSessionSnapshot` contract.
- Strict `GameActionRequest` contract with typed errors.
- Standardized error code map:
  - `INVALID_ACTION`
  - `FORBIDDEN_ACTOR`
  - `DUPLICATE_ACTION`
  - `GAME_NOT_FOUND`
  - `RATE_LIMITED`
  - `INTERNAL_ERROR`

### Frontend Internal Interface Shape
- Single runtime gameplay API:
  - `startSession`
  - `fetchSnapshot`
  - `submitAction`
  - `resumeSession`
- `QuestionRenderModel` adapters per category.

---

## Test Strategy and Acceptance Scenarios

### Backend Contract Tests
1. Snapshot schema conformance and enum validity.
2. Action validation and forbidden actor/token paths.
3. Duplicate `actionRequestId` conflict semantics.

### Backend Gameplay Tests
1. PASS gating correctness.
2. ORDER rank validation.
3. Round/game transition and winner logic.
4. Reconnect correctness.

### Frontend Integration Tests
1. Server-authoritative start for 1+ players.
2. Category-complete Smart10 answer loop behavior.
3. Error-state recovery paths.
4. Mobile viewport interaction checks.

### End-to-End Smoke
1. Create room -> join -> play -> reconnect -> finish.
2. Exhausted deck recovery behavior.
3. Backend restart during active session (durability phase onward).

### Operational Tests
1. Full release gate pass.
2. Deploy env validation pass.
3. Rollback rehearsal and post-rollback smoke.

---

## Rollout and Monitoring Plan

1. Staging rollout with contract version controls.
2. Closed beta enablement in waves.
3. Daily KPI review during initial beta window:
   - completion rate
   - drop-off rate
   - wrong-answer spikes
   - reconnect failures
4. Incident response SLA and on-call handoff.
5. Formal go/no-go checkpoint after beta stability window.

---

## Ownership Model

1. Backend lead:
   - authoritative core, contracts, security, durability
2. Frontend lead:
   - Smart10 UX, rendering system, thin-client behavior
3. Data lead:
   - dataset quality, semantic and parity gates
4. Infra/Ops lead:
   - CI/CD enforcement, deploy/rollback, observability
5. Product/QA lead:
   - beta acceptance criteria and release readiness

---

## Assumptions and Defaults

1. Current deployment stack remains unchanged.
2. Closed beta is the terminal target for this roadmap.
3. Web remains primary client; native is prepared via contracts only.
4. UI/UX and question rendering rework are in roadmap scope.
5. Existing release-readiness gate remains mandatory baseline.
6. No additional major game-mode pivots during this roadmap.
