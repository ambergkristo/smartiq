---
title: feat: CherryPick game-first recovery plan
type: feat
status: active
date: 2026-04-20
---

# feat: CherryPick game-first recovery plan

## Overview

This plan resets CherryPick around a game-first product promise and sequences the rescue work in the only order that is likely to hold up under implementation pressure:

1. choose the product identity,
2. repair the room-to-game lifecycle,
3. decide what a joined player actually is,
4. consolidate the flows around that truth,
5. remove fake affordances and stale rules,
6. only then redesign the presentation and atmosphere.

The core recommendation is explicit:

- CherryPick should be treated as a game product first.
- `PLAY`, `JOIN`, and `HOST` should all support that game promise.
- The recurring-host workspace should remain a secondary operator layer, not the primary story of the app.

This plan is intentionally not a “UI polish” plan. The audit showed that the current failures are structural:

- the multiplayer promise is not backed by one lifecycle,
- host/player flows are not one coherent system,
- docs and runtime rules disagree,
- the visible product identity is split between CherryPick and SmartIQ.

## Problem Statement

CherryPick currently behaves like three partially merged products:

- a solo trivia game,
- a join-code live room product,
- a recurring-host SaaS/workspace.

That split produces the current failures:

- users cannot form one mental model in the first minute,
- `JOIN` does not deliver real game participation,
- `HOST` spans two incompatible shells,
- player waiting room surfaces feel like host tooling,
- visible controls and rules suggest capabilities the runtime does not actually support,
- documentation still describes older game models and transport behavior,
- the local gate is already red, which means even the technical baseline is unstable.

Without a deliberate reset, a redesign pass would only make the wrong thing prettier.

## Proposed Solution

Adopt a game-first recovery program with six phases and two hard decision gates.

### Core Product Decision

CherryPick should be positioned as:

- a fast trivia game with a strong solo loop,
- a credible join-code live mode,
- a host flow that exists to launch and control the live game,
- an optional host workspace that helps repeat operators, but does not define the app’s public identity.

### Non-Goals For This Plan

- Do not expand scope into couch mode, daily challenge, registered accounts, or leaderboards yet.
- Do not deepen the recurring-host SaaS track until the core game and live room promise are honest.
- Do not begin a full visual redesign before the role model and flow structure are stable.

## Research Summary

### Internal Findings

- The public pivot docs describe CherryPick as a hybrid quiz game platform with solo, couch, join-code, XP, and cherry mechanics in [docs/cherrypick/PROJECT_PIVOT_NOTE.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/PROJECT_PIVOT_NOTE.md:1).
- The product masterplan describes a game-first mode hierarchy in [docs/cherrypick/CHERRYPICK_PRODUCT_MASTERPLAN.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/CHERRYPICK_PRODUCT_MASTERPLAN.md:1).
- The engineering masterplan already assumed `PASS` removal and simplified host flow in [docs/cherrypick/CHERRYPICK_ENGINEERING_MASTERPLAN.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/CHERRYPICK_ENGINEERING_MASTERPLAN.md:1).
- Current `docs/ui.md` still describes older Smart10-style setup and pass-based flow in [docs/ui.md](C:/Users/Kasutaja/smartiq/docs/ui.md:1).
- Current realtime contract claims room WebSocket responsibilities and action semantics that do not match the actual frontend/runtime behavior in [docs/architecture/realtime-runtime-contract.md](C:/Users/Kasutaja/smartiq/docs/architecture/realtime-runtime-contract.md:1).
- Archived M8 material claims room-bound active-game behavior and realtime client support that are not credibly reflected in the current frontend/runtime audit in [docs/archive/smartiq/product/milestones/M8_REALTIME_INTEGRITY.md](C:/Users/Kasutaja/smartiq/docs/archive/smartiq/product/milestones/M8_REALTIME_INTEGRITY.md:1).

### Audit Backlog Produced

- [todos/005-pending-p1-unify-room-and-game-lifecycle.md](C:/Users/Kasutaja/smartiq/todos/005-pending-p1-unify-room-and-game-lifecycle.md:1)
- [todos/006-pending-p1-make-joiners-real-game-participants.md](C:/Users/Kasutaja/smartiq/todos/006-pending-p1-make-joiners-real-game-participants.md:1)
- [todos/007-pending-p2-define-a-single-product-identity.md](C:/Users/Kasutaja/smartiq/todos/007-pending-p2-define-a-single-product-identity.md:1)
- [todos/008-pending-p2-unify-join-host-and-player-flows.md](C:/Users/Kasutaja/smartiq/todos/008-pending-p2-unify-join-host-and-player-flows.md:1)
- [todos/009-pending-p2-remove-fake-and-unfinished-game-affordances.md](C:/Users/Kasutaja/smartiq/todos/009-pending-p2-remove-fake-and-unfinished-game-affordances.md:1)

### External Research Decision

No external research is required for this plan.

Reason:

- The dominant problems are internal contradictions, not unknown best practices.
- The codebase, docs, runtime audit, and test failures already provide enough signal to define the rescue order.

## Technical Approach

### Phase 0: Freeze The Story

**Goal:** Choose one public product hierarchy before touching implementation-heavy UX.

**Deliverables:**

- A one-page product decision record:
  - CherryPick is game-first.
  - Solo, join-code live play, and host launch are first-class.
  - Host workspace is secondary and subordinate to the live game flow.
- A canonical role definition:
  - `Solo player`
  - `Joined player`
  - `Host`
  - `Host workspace operator` if authenticated/runtime features are present
- A canonical promise for `JOIN`:
  - either true active player participation,
  - or explicit spectator/roster role.

**Why it must happen first:**

- Flow, naming, and UI structure all depend on whether `JOIN` means “play” or “watch”.
- Host workspace scope cannot be prioritized honestly before the public game promise is chosen.

**Exit Criteria:**

- Team agrees in writing that CherryPick is game-first.
- Team agrees whether joined players are active clients or spectators.

### Phase 0.5: Restore Trustworthy Baseline Verification

**Goal:** Stop building on a red baseline.

**Deliverables:**

- Triage and fix the current `npm run gate:local` failures that block confidence in core runtime assumptions.
- Add a focused verification matrix for:
  - room creation,
  - room join,
  - room launch,
  - late join policy,
  - player refresh/rejoin behavior.

**Notes:**

- This phase does not require fixing every historical problem.
- It does require making the touched contracts testable enough that lifecycle refactors do not happen blind.

**Exit Criteria:**

- Local gate passes, or the remaining failures are explicitly isolated from the recovery work.
- A small set of integration tests exists for room/game lifecycle behavior.

### Phase 1: Unify Room -> Game Lifecycle

**Goal:** Make room and game one coherent multiplayer lifecycle.

**Required Changes:**

- Extend room state to carry launched/live information, including:
  - room phase,
  - joinability/closed state,
  - active game reference or game summary,
  - host/participant launch state where needed.
- Replace “host creates standalone game while room stays open” with an authoritative room launch action.
- Define explicit late-join behavior:
  - blocked after launch,
  - allowed as spectator,
  - or allowed with recovery semantics.
- Align room error surface and frontend copy to the actual lifecycle (`waiting`, `live`, `closed`, `completed`, etc.).

**Frontend Impact:**

- `HOST` launch must no longer call a generic standalone create flow.
- Player waiting-room must know whether the room is pre-launch, live, closed, or resumable.

**Backend Impact:**

- Room snapshot model changes
- Room launch endpoint or room-bound game creation path
- Rejoin/preview semantics updated around active game state
- Tests for post-launch joins and room closure behavior

**Exit Criteria:**

- A launched room has distinct authoritative state.
- Late join behavior is enforced by backend contract.
- Player clients can detect and render live-room state without guessing.

### Phase 2: Decide And Implement The Joined Player Model

**Goal:** Make `JOIN` honest.

Choose one of these and implement it end-to-end:

#### Option A: True Multi-Client Participation

- Joined players receive enough authoritative context to participate.
- Turn ownership is scoped to the correct client.
- Live updates are pushed to all participants.
- Waiting-room transitions into active play state.

#### Option B: Explicit Host-Led Gameplay

- Joined players are clearly framed as spectators / rostered participants.
- Host remains the only gameplay driver.
- All player-facing copy, waiting room language, and screens are rewritten to match that truth.

**Recommendation:** Prefer Option A only if the team is willing to commit to the multiplayer contract properly. Otherwise choose Option B and stop pretending `JOIN` is active multiplayer.

**Why this phase comes before UI consolidation:**

- Without this decision, every screen redesign is provisional.

**Exit Criteria:**

- One participant model is chosen and documented.
- The runtime matches the documented model.
- Test coverage exists for join, refresh, and live-state transitions.

### Phase 3: Consolidate Flows Around Canonical Roles

**Goal:** Replace overlapping route logic and mixed-role shells with one canonical flow per role.

**Required Changes:**

- `PLAY`: one clear route from home into solo gameplay
- `JOIN`: one clear route for room-code entry
- `HOST`: one clear route for room setup and live launch
- optional authenticated host workspace:
  - clearly secondary,
  - reached intentionally,
  - not intermixed with first-run gameplay surfaces

**Specific Cleanup Targets:**

- Remove duplicate join variants unless they serve materially distinct purposes.
- Stop using host shell chrome for player waiting-room surfaces.
- Split “navigate away” from “destroy/clear room” actions.
- Remove `playerId` and other backend-ish identifiers from customer-facing surfaces.
- Make host onboarding and host sign-in either first-class and reachable or explicitly secondary.

**Exit Criteria:**

- One role -> one canonical flow
- No destructive navigation hidden behind standard back actions
- No role mismatch between shell, copy, and permissions

### Phase 4: Remove Fake Controls, Fake Rules, And Doc Drift

**Goal:** Make the product honest before making it beautiful.

**Required Changes:**

- Remove or correctly wire difficulty selection.
- Remove pass semantics from UI and docs if pass is not supported.
- Remove QR/demo placeholders from production-facing host flow.
- Remove brittle placeholder-based solo onboarding.
- Rewrite docs so they describe the real runtime, not older Smart10 or partially implemented ideas.

**Documents To Reconcile:**

- [docs/ui.md](C:/Users/Kasutaja/smartiq/docs/ui.md:1)
- [docs/architecture/realtime-runtime-contract.md](C:/Users/Kasutaja/smartiq/docs/architecture/realtime-runtime-contract.md:1)
- [README.md](C:/Users/Kasutaja/smartiq/README.md:1)

**Exit Criteria:**

- Every visible gameplay control changes real runtime behavior
- Every documented rule exists in the runtime
- No demo/placeholder language appears in core public flows

### Phase 5: Redesign The First Five Minutes

**Goal:** Build the version of CherryPick that feels like a place people come to play.

This is where visual identity and atmosphere work belongs, not earlier.

**Design Targets:**

- A home screen that sells one clear fantasy:
  - quick solo session,
  - join live game,
  - host live game
- Stronger visual separation between:
  - public game surfaces
  - host operator tooling
- Better pre-game anticipation:
  - more confident room-state language,
  - better join urgency,
  - clearer “what happens next”
- More coherent in-game emotional arc:
  - risk,
  - reveal,
  - reward,
  - cherry moments

**Important Constraint:**

- Do not redesign around fake or placeholder mechanics.
- Only elevate mechanics that already exist or are explicitly committed.

**Exit Criteria:**

- Home, join, host, and active gameplay all feel like one product family
- The first five minutes create momentum instead of confusion

### Phase 6: Verify Like A Product, Not Only A Codebase

**Goal:** Prove the rescue worked in reality.

**Verification Scope:**

- Automated:
  - `npm run gate:local`
  - focused backend room/game lifecycle tests
  - focused frontend interaction tests for `PLAY`, `JOIN`, `HOST`
- Browser/runtime:
  - solo start -> round -> resolution -> replay
  - host create room -> player join -> launch -> live transition
  - refresh/rejoin behavior on host and player routes
  - blocked or explicit behavior for late join after launch
- Product review:
  - first-run comprehension test
  - role clarity test
  - “would a new player understand what this product is in 20 seconds?” test

**Exit Criteria:**

- Core automated checks pass
- Runtime walkthroughs behave as documented
- Product copy and flow no longer overpromise

## Recommended Execution Order

### Wave 1: Decisions And Truth

1. Product decision record
2. Joined-player model decision
3. Baseline verification recovery

### Wave 2: Contract Repair

1. Room snapshot / launch lifecycle redesign
2. Rejoin / late-join semantics
3. Live-state propagation strategy

### Wave 3: Flow Consolidation

1. Canonical `PLAY`
2. Canonical `JOIN`
3. Canonical `HOST`
4. Secondary host workspace placement

### Wave 4: Honesty Cleanup

1. Remove fake difficulty
2. Remove stale pass semantics
3. Remove placeholders and leaked internal identifiers
4. Rewrite stale docs

### Wave 5: Visual And Emotional Uplift

1. Home / entry redesign
2. Waiting room and host launch feel
3. In-game reward/reveal polish

## Alternative Approaches Considered

### Alternative 1: Start With A Full Visual Redesign

**Rejected because:**

- It would hide structural problems instead of solving them.
- The redesigned UI would likely need to be redone after lifecycle decisions.

### Alternative 2: Double Down On Recurring-Host SaaS First

**Rejected because:**

- It conflicts with the stated goal of becoming a place people come to play.
- It would keep public game identity subordinate to operator tooling.

### Alternative 3: Patch Small UX Problems Without Contract Changes

**Rejected because:**

- The biggest failures are contract-level, not copy-level.
- `JOIN` would remain misleading even with better wording.

## System-Wide Impact

### Interaction Graph

- `HOME` selection drives route selection, which drives setup shell selection, which currently drives either local solo autostart or room/game creation behavior.
- `HOST` launch currently jumps from room state into standalone game creation; Phase 1 changes that interaction graph so room launch becomes the authority boundary.
- Rejoin and preview behavior will need to source truth from room lifecycle state, not local assumptions.

### Error & Failure Propagation

- Current failure propagation is misleading because room and game can fail independently while the UI still speaks as if they are one session.
- Post-recovery, room lifecycle errors must be distinguishable from game-action errors.
- Reconnect failures, stale token failures, and room-closed failures need dedicated surfaces rather than generic retry messaging.

### State Lifecycle Risks

- Current browser-local state creates risk of stale room or gameplay assumptions surviving route changes.
- Launch-state transitions can leave orphaned rooms or disconnected players if not modeled explicitly.
- Destructive navigation currently clears meaningful state without confirmation; this must be redesigned before the next rollout.

### API Surface Parity

- Frontend route semantics
- Room preview, join, rejoin, and remove-player APIs
- Room snapshot payload
- Game creation and action APIs
- Realtime room event payloads
- Documentation for public product/runtime behavior

All of these need to describe the same model after the recovery.

### Integration Test Scenarios

- Host launches room, players join, host starts game, player sees correct live transition
- Late join after launch follows the chosen policy exactly
- Host refresh during active session preserves correct control state
- Player refresh during active room/game preserves correct status
- Join flow and waiting room do not expose host-only controls or internals

## Acceptance Criteria

### Functional Requirements

- [ ] CherryPick has one documented and visible game-first product hierarchy
- [ ] Room launch transitions into a real live-game lifecycle
- [ ] `JOIN` has an honest and implemented participation model
- [ ] `PLAY`, `JOIN`, and `HOST` each have one canonical flow
- [ ] Host workspace is clearly secondary and intentionally entered
- [ ] Fake controls, stale rules, and demo placeholders are removed or fully implemented

### Non-Functional Requirements

- [ ] Local verification gates are green for the touched system
- [ ] Core multiplayer transitions are covered by integration tests
- [ ] Documentation matches runtime reality
- [ ] Customer-facing surfaces do not leak backend-only identifiers

### Quality Gates

- [ ] `npm run gate:local` passes or remaining failures are explicitly unrelated and documented
- [ ] Browser walkthroughs pass for solo, join, host, refresh, and late-join scenarios
- [ ] Audit todos `005` through `009` are either resolved or explicitly superseded by this plan’s implementation artifacts

## Success Metrics

- New user can explain the product in one sentence after seeing the home screen
- Joined player no longer hits a misleading waiting-room dead end
- Host can predict what “start game” actually does
- Audit backlog for lifecycle/flow dishonesty is materially reduced
- Manual review no longer describes the app as “three products merged together”

## Dependencies & Risks

### Dependencies

- Team willingness to choose game-first positioning
- Contract changes across frontend and backend
- Focused integration test work before and during lifecycle changes

### Risks

- If the team refuses to choose the joined-player model early, the plan will stall in flow churn
- If visual redesign starts before Phase 2, implementation will likely be thrown away
- If recurring-host SaaS priorities continue to dominate without product reset, the same contradictions will reappear

## Documentation Plan

- Create a short decision record for the chosen product hierarchy and joined-player model
- Update `README.md` once the model is true again
- Rewrite `docs/ui.md` to reflect actual CherryPick gameplay
- Rewrite `docs/architecture/realtime-runtime-contract.md` to reflect the real transport and lifecycle model
- Archive or explicitly mark stale material that contradicts the chosen direction

## References & Research

### Internal References

- Audit summary: [todos/004-ready-p2-current-state-audit.md](C:/Users/Kasutaja/smartiq/todos/004-ready-p2-current-state-audit.md:1)
- Lifecycle todo: [todos/005-pending-p1-unify-room-and-game-lifecycle.md](C:/Users/Kasutaja/smartiq/todos/005-pending-p1-unify-room-and-game-lifecycle.md:1)
- Participation todo: [todos/006-pending-p1-make-joiners-real-game-participants.md](C:/Users/Kasutaja/smartiq/todos/006-pending-p1-make-joiners-real-game-participants.md:1)
- Identity todo: [todos/007-pending-p2-define-a-single-product-identity.md](C:/Users/Kasutaja/smartiq/todos/007-pending-p2-define-a-single-product-identity.md:1)
- Flow todo: [todos/008-pending-p2-unify-join-host-and-player-flows.md](C:/Users/Kasutaja/smartiq/todos/008-pending-p2-unify-join-host-and-player-flows.md:1)
- Honesty/polish todo: [todos/009-pending-p2-remove-fake-and-unfinished-game-affordances.md](C:/Users/Kasutaja/smartiq/todos/009-pending-p2-remove-fake-and-unfinished-game-affordances.md:1)
- Product direction: [docs/cherrypick/PROJECT_PIVOT_NOTE.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/PROJECT_PIVOT_NOTE.md:1)
- Product vision: [docs/cherrypick/CHERRYPICK_PRODUCT_MASTERPLAN.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/CHERRYPICK_PRODUCT_MASTERPLAN.md:1)
- Engineering sequencing signal: [docs/cherrypick/CHERRYPICK_ENGINEERING_MASTERPLAN.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/CHERRYPICK_ENGINEERING_MASTERPLAN.md:1)
- Contradictory runtime doc: [docs/ui.md](C:/Users/Kasutaja/smartiq/docs/ui.md:1)
- Contradictory transport doc: [docs/architecture/realtime-runtime-contract.md](C:/Users/Kasutaja/smartiq/docs/architecture/realtime-runtime-contract.md:1)

### Runtime Evidence

- Home screenshot: [review-home.png](C:/Users/Kasutaja/.agent-browser/tmp/screenshots/screenshot-1776686521877.png:1)
- Solo runtime screenshot: [review-playflow.png](C:/Users/Kasutaja/smartiq/.tmp/review-playflow.png:1)
- Join flow screenshot: [review-joinflow.png](C:/Users/Kasutaja/smartiq/.tmp/review-joinflow.png:1)
- Deep-link join screenshot: [review-latejoin.png](C:/Users/Kasutaja/smartiq/.tmp/review-latejoin.png:1)
- Host flow screenshot: [review-hostflow.png](C:/Users/Kasutaja/smartiq/.tmp/review-hostflow.png:1)

### Verification Evidence

- Local gate currently fails: `npm run gate:local`
- Verified room remained joinable after standalone game creation on 2026-04-20 using local API calls against `http://localhost:8081`

