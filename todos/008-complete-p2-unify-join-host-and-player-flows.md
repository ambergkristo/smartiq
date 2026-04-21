---
status: complete
priority: p2
issue_id: "008"
tags: [code-review, ux, ui, flows, multiplayer]
dependencies: ["007"]
---

# Unify Join Host And Player Flows

The current flow system duplicates core journeys and mixes host/player mental models.

## Problem Statement

Joining a game, hosting a game, and waiting as a player all use overlapping but inconsistent flows. Labels switch between `Game code` and `Room code`, player lobbies inherit host console chrome, destructive navigation is hidden behind ordinary “Back to home” actions, and backend-style `playerId` values leak into the UI.

## Findings

- Join flow exists in multiple variants across [frontend/src/components/home/JoinGameScreen.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/home/JoinGameScreen.jsx:1), [frontend/src/components/PlayerJoin.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/PlayerJoin.jsx:1), and [frontend/src/components/GameRoom.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/GameRoom.jsx:85).
- Player waiting room reuses host-oriented shell/header framing in [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:2937).
- Host/player lists show `playerId` values in customer-facing surfaces such as [frontend/src/components/player/PlayerJoinFlow.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/player/PlayerJoinFlow.jsx:148) and [frontend/src/components/player/WaitingRoomView.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/player/WaitingRoomView.jsx:64).
- `Back to home` clears room state directly from the host lobby support flow in [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:3014).

## Proposed Solutions

### Option 1: Design one canonical flow per role

**Approach:** Separate host, player, and solo journeys clearly, then reuse only shared primitives, not whole shells.

**Pros:**
- Cleaner navigation
- Less cognitive load
- Easier testing and maintenance

**Cons:**
- Requires route and component consolidation

**Effort:** 2-4 days

**Risk:** Medium

---

### Option 2: Patch copy and surface details only

**Approach:** Keep the current structure but align labels and hide internal IDs.

**Pros:**
- Faster
- Lower code churn

**Cons:**
- Leaves structural confusion in place
- Will not fix role mismatch

**Effort:** 1-2 days

**Risk:** High

## Recommended Action

Adopt one canonical role-first flow:

- `PLAY` starts solo immediately from home
- `JOIN` owns public room-code entry and deep-link entry
- `HOST` owns public host-room creation and launch
- saved room state can be resumed, but it no longer overrides route ownership

## Technical Details

**Affected files:**
- [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:2937)
- [frontend/src/components/GameRoom.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/GameRoom.jsx:1)
- [frontend/src/components/player/PlayerJoinFlow.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/player/PlayerJoinFlow.jsx:1)

## Resources

- Runtime screenshots:
- [review-joinflow.png](C:/Users/Kasutaja/smartiq/.tmp/review-joinflow.png:1)
- [review-latejoin.png](C:/Users/Kasutaja/smartiq/.tmp/review-latejoin.png:1)

## Acceptance Criteria

- [x] One join flow exists for direct room-code entry
- [x] Player waiting room uses player-specific framing
- [x] Destructive room-closing actions require explicit intent
- [x] Internal identifiers are removed from customer-facing surfaces

## Work Log

### 2026-04-20 - Audit Finding

**By:** Codex

**Actions:**
- Compared join/home/player-route/lobby flows in source and runtime
- Captured screenshots for join and deep-link join states

**Learnings:**
- The flow duplication is not cosmetic; it creates conflicting mental models for the same action

### 2026-04-20 - Canonical Flows Implemented

**By:** Codex

**Actions:**
- Removed the duplicate public join form from the setup/host shell
- Made `#/join` and `#/join/:roomCode` the canonical public join routes and kept `#/host` as the canonical host route
- Stopped letting saved player room state force the app away from home
- Renamed destructive actions to explicit `Leave room` / `Leave host room`

**Learnings:**
- Route ownership matters as much as copy: if saved room state can hijack navigation, the product still feels structurally confused
