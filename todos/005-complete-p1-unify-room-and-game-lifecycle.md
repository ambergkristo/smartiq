---
status: complete
priority: p1
issue_id: "005"
tags: [code-review, gameplay, room, multiplayer, architecture]
dependencies: []
---

# Unify Room And Game Lifecycle

The product presents room-code multiplayer, but `room` and `game` are separate lifecycles with no authoritative handoff.

## Problem Statement

Hosts can gather players in a room and then start a separate `/api/game` session without changing room state. Players remain in a waiting-room model, late joins still work after the game has started, and there is no canonical “room launched into game” transition. This breaks the core promise of `JOIN`.

## Findings

- `RoomSnapshot` only carries `roomCode`, `tenantId`, `branding`, and `players`; there is no `gameId`, phase, launch state, or joinability flag in [backend/src/main/java/com/smartiq/backend/room/RoomSnapshot.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/room/RoomSnapshot.java:6).
- Host start flows copy selected room names into `playersText` and create a standalone game session via `/api/game` in [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:2324) and [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:2639).
- Runtime verification: after creating room `7AXR7S`, joining `Alice`, and creating a game session, `GET /api/rooms/7AXR7S` still returned an open room snapshot with no game linkage.
- Runtime verification: a late join for `Bob` succeeded after the game already existed, proving the room was still joinable and not transitioned into a launched state.

## Proposed Solutions

### Option 1: Make room the source of truth for launch state

**Approach:** Add launched state to room snapshots and create a room-backed `launch` endpoint that creates or binds a game session.

**Pros:**
- Aligns product promise with backend contract
- Gives players a single lifecycle to follow
- Enables late-join policy and reconnection rules

**Cons:**
- Requires coordinated backend/frontend contract changes
- Needs migration of current host flow

**Effort:** 2-4 days

**Risk:** Medium

---

### Option 2: Retire multiplayer join-code positioning for now

**Approach:** Reframe rooms as pre-game roster tools only, and explicitly state that gameplay happens on the host screen.

**Pros:**
- Smaller implementation effort
- Reduces false expectations quickly

**Cons:**
- Weakens product ambition
- Leaves architecture debt in place

**Effort:** 1-2 days

**Risk:** Medium

## Recommended Action

Make room the authoritative launch boundary and stop allowing post-launch joins.

Implemented recovery slice:

- room snapshots now carry lifecycle state and active game linkage
- room-backed launch happens through the existing game create path with room authority data
- late joins are blocked once the room is launched
- player-facing room state can distinguish pre-launch and live rooms

## Technical Details

**Affected files:**
- [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:2324)
- [backend/src/main/java/com/smartiq/backend/room/RoomSnapshot.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/room/RoomSnapshot.java:6)
- [backend/src/main/java/com/smartiq/backend/room/RoomService.java](C:/Users/Kasutaja/smartiq/backend/src/main/java/com/smartiq/backend/room/RoomService.java:134)

## Resources

- Audit todo: [todos/004-ready-p2-current-state-audit.md](C:/Users/Kasutaja/smartiq/todos/004-ready-p2-current-state-audit.md:1)

## Acceptance Criteria

- [x] Room snapshots expose authoritative launch state
- [x] Host launch transitions a room into a game-backed state
- [x] Late join behavior is explicitly defined and enforced
- [x] Player clients can determine whether a room is waiting or live, and closed joins return an explicit failure

## Work Log

### 2026-04-20 - Audit Finding

**By:** Codex

**Actions:**
- Traced room and game contracts across frontend and backend
- Verified through local API calls that a created game does not alter room state
- Verified that a late join still succeeds after game creation

**Learnings:**
- Multiplayer is currently marketed as a room-driven experience but implemented as a host-local game session

### 2026-04-20 - Phase 1 Implemented

**By:** Codex

**Actions:**
- Added room lifecycle fields (`phase`, `joinable`, `activeGame`) to the backend room contract
- Bound host launch to a room-backed game creation path by extending `CreateGameRequest` with optional room authority fields
- Blocked late joins after room launch with backend `ROOM_CLOSED` handling
- Updated frontend room-state persistence and waiting-room/live-room rendering to use lifecycle state
- Verified backend behavior with targeted JUnit tests and local API launch smoke

**Learnings:**
- The smallest durable repair was to keep `/api/game` as the launch endpoint but require explicit room authority when the launch originates from a room
