---
status: complete
priority: p1
issue_id: "006"
tags: [code-review, gameplay, websocket, multiplayer, frontend, backend]
dependencies: ["005"]
---

# Make Joiners Real Game Participants

Joined players currently behave like spectators in a waiting room, not gameplay actors.

## Problem Statement

The UI offers `JOIN`, waiting-room language, and room previews, but joined players never receive a game identity or action capability. The host browser remains the only real gameplay client. That mismatch is fatal for trust in a live multiplayer game.

## Findings

- Room join/rejoin responses only return room auth and room state in [backend/src/main/java/com/smartiq/backend/room/RoomParticipantResponse.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/room/RoomParticipantResponse.java:1) and [backend/src/main/java/com/smartiq/backend/room/RoomResumeResponse.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/room/RoomResumeResponse.java:1).
- Gameplay creation returns `actionTokens` for all players in [backend/src/main/java/com/smartiq/backend/game/GameSessionCreateResponse.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/game/GameSessionCreateResponse.java:1), but those tokens only live in the client that created the game.
- The frontend has no WebSocket consumer for room live state despite exposing a socket URL builder in [frontend/src/api.js](C:/Users/Kasutaja/smartiq/frontend/src/api.js:922).
- `useServerGameEngine` assumes the local browser controls every turn; `isLocalTurn` is hardcoded `true` in [frontend/src/state/useServerGameEngine.ts](C:/Users/Kasutaja/smartiq/frontend/src/state/useServerGameEngine.ts:679).

## Proposed Solutions

### Option 1: Build real multi-client gameplay

**Approach:** Bind players to a launched room/game, deliver per-player authority to the right client, and consume live updates over WebSocket or equivalent push.

**Pros:**
- Matches user expectation
- Enables actual device-based multiplayer
- Makes join flow meaningful

**Cons:**
- Largest implementation cost
- Requires contract redesign and client orchestration

**Effort:** 4-7 days

**Risk:** High

---

### Option 2: Reposition joiners as spectators only

**Approach:** Explicitly label joiners as viewers/roster participants, not active gameplay clients.

**Pros:**
- Easier to ship honestly
- Avoids false promises

**Cons:**
- Much weaker product
- Still requires copy and flow cleanup everywhere

**Effort:** 1-2 days

**Risk:** Medium

## Recommended Action

Resolve this recovery item by making the joined-player contract explicit instead of pretending multi-client turn control already exists.

Recovery implementation:

- treat joined players as pre-launch participants and post-launch followers of a host-led live game
- close late joins after launch
- rewrite join/wait/live copy so the runtime promise matches the actual model
- keep true multi-device turn authority as a later dedicated follow-up

## Technical Details

**Affected files:**
- [frontend/src/state/useServerGameEngine.ts](C:/Users/Kasutaja/smartiq/frontend/src/state/useServerGameEngine.ts:546)
- [frontend/src/api.js](C:/Users/Kasutaja/smartiq/frontend/src/api.js:922)
- [backend/src/main/java/com/smartiq/backend/room/ws/RoomWsGateway.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/room/ws/RoomWsGateway.java:74)

## Resources

- Audit todo: [todos/004-ready-p2-current-state-audit.md](C:/Users/Kasutaja/smartiq/todos/004-ready-p2-current-state-audit.md:1)

## Acceptance Criteria

- [x] Joined players are explicitly mapped to the chosen host-led live-room model
- [x] Product copy matches the current multiplayer model
- [x] Join and waiting-room transitions are covered by focused frontend verification
- [x] Late joins are closed once the host session is live

## Work Log

### 2026-04-20 - Audit Finding

**By:** Codex

**Actions:**
- Reviewed room/game response models and frontend engine assumptions
- Confirmed no frontend WebSocket consumer exists for room lifecycle

**Learnings:**
- `JOIN` is currently a promise without a full participant model behind it

### 2026-04-20 - Scope Decision Frozen

**By:** Codex

**Actions:**
- Aligned the recovery plan with a temporary host-led live-play contract
- Deferred true multi-client gameplay to a later dedicated implementation phase

**Learnings:**
- Phase 1 can be made honest and reliable without pretending that joined clients control turns today

### 2026-04-20 - Host-Led Model Implemented

**By:** Codex

**Actions:**
- Rewrote public join and player waiting flows around a host-led live-room model
- Removed customer-facing `playerId` leaks from join previews and waiting/host rosters
- Added frontend tests for joined-player waiting flow, non-destructive home routing, and host/player roster presentation

**Learnings:**
- The honest short-term win is not “fake multiplayer but prettier”; it is a clearly communicated host-led live room that behaves consistently
