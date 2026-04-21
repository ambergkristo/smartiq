---
title: Game session API contract v1
type: contract
status: active
date: 2026-03-03
owner: backend+frontend
---

# Game Session API Contract v1

Purpose
-------
Defines the canonical v1 wire contract for CherryPick server-authoritative game sessions and reconnect semantics.

Compatibility policy
--------------------

1. `GameSessionSnapshot.apiVersion` is mandatory.
2. This document defines `apiVersion = "1"`.
3. Additive changes inside v1 are allowed only if they do not break existing consumers.
4. Breaking changes require a new major snapshot version and an explicit migration window.

Canonical endpoints
-------------------

- `POST /api/game`
- `GET /api/game/{gameId}`
- `POST /api/game/{gameId}/action`
- `POST /api/rooms`
- `POST /api/rooms/{roomCode}/join`
- `POST /api/rooms/{roomCode}/rejoin`
- `WS /ws/rooms/{roomCode}`

`POST /api/game` request
------------------------

```json
{
  "players": ["Alice", "Bob"],
  "language": "en",
  "topic": "History",
  "winCondition": 30
}
```

Validation rules:

1. `players`: optional list, when present each name must be valid display name.
2. `language`: optional, currently supported `en`, `et`.
3. `topic`: optional.
4. `winCondition`: optional integer, must be `>= 1`.

`POST /api/game` response
-------------------------

```json
{
  "snapshot": { "...GameSessionSnapshot v1..." },
  "actionTokens": {
    "p1": "at_<32-hex>",
    "p2": "at_<32-hex>"
  }
}
```

`GameSessionSnapshot` v1
------------------------

```json
{
  "apiVersion": "1",
  "gameId": "uuid-or-stable-id",
  "winCondition": 30,
  "activePlayerIndex": 0,
  "players": [
    { "playerId": "p1", "displayName": "Alice" },
    { "playerId": "p2", "displayName": "Bob" }
  ],
  "roundState": {
    "roundNumber": 1,
    "phase": "CHOOSING",
    "starterPlayerId": "p1",
    "currentPlayerId": "p1",
    "lastAction": "Game started"
  },
  "boardState": {
    "question": "Question text?",
    "category": "OPEN",
    "topic": "History",
    "pegs": [
      { "index": 0, "state": "hidden", "value": null }
    ]
  },
  "totalScores": { "p1": 0, "p2": 0 },
  "roundScores": { "p1": 0, "p2": 0 },
  "statuses": { "p1": "ACTIVE", "p2": "ACTIVE" }
}
```

Enum sets:

1. `roundState.phase`: `QUESTION_ACTIVE`, `ROUND_SUCCESS`, `ROUND_FAIL`, `GAME_OVER`
2. `boardState.pegs[*].state`: `hidden`, `revealed`, `wrong`
3. `statuses[*]`: `ACTIVE`, `OUT`

`POST /api/game/{gameId}/action` request
----------------------------------------

```json
{
  "type": "ANSWER",
  "tileIndex": 3,
  "rank": 2,
  "actorPlayerId": "p1",
  "actionToken": "at_<32-hex>",
  "actionRequestId": "req_123"
}
```

Rules:

1. `type` required: `ANSWER` or `ADVANCE`.
2. `tileIndex` required only for `ANSWER`.
3. `rank` required for `ORDER` category answers.
4. `actorPlayerId` required, canonical format `p<1..8>`.
5. `actionToken` required, canonical format `at_[a-f0-9]{32}`.
6. `actionRequestId` required, max 128 chars, pattern `[A-Za-z0-9_-]+`.

Action response:

- Success returns `GameSessionSnapshot v1`.
- Duplicate `actionRequestId` returns conflict with code `DUPLICATE_ACTION`.

Error code taxonomy
-------------------

All non-legacy errors use the structured API error shape:

```json
{
  "timestamp": "ISO-8601",
  "status": 400,
  "code": "INVALID_ACTION",
  "error": "human-readable detail",
  "reason": "Bad Request",
  "path": "/api/game/{gameId}/action"
}
```

Canonical codes:

1. `INVALID_ACTION` (`400`) - invalid game action payload/fields.
2. `FORBIDDEN_ACTOR` (`403`) - actor/token mismatch.
3. `DUPLICATE_ACTION` (`409`) - duplicate `actionRequestId`.
4. `GAME_NOT_FOUND` (`404`) - game session not found.
5. `RATE_LIMITED` (`429`) - request throttled.
6. `INTERNAL_ERROR` (`500`) - unexpected server failure.
7. `INVALID_ROOM_REQUEST` (`400`) - room request format problems.
8. `INVALID_ROOM_TOKEN` (`400`) - invalid room auth token.
9. `ROOM_NOT_FOUND` (`404`) - room missing.
10. `PLAYER_NOT_FOUND` (`404`) - player missing in existing room.

Reconnect/session semantics
---------------------------

1. `POST /api/rooms/{roomCode}/rejoin` rotates `authToken` on success.
2. Client must persist returned `authToken` immediately.
3. Reusing old token after successful HTTP rejoin is invalid (`INVALID_ROOM_TOKEN`).
4. WebSocket handshake (`/ws/rooms/{roomCode}`) resumes session using current token and does not rotate token by itself.
5. Duplicate player websocket sessions are single-active; new session replaces old session in gateway.

Contract verification in tests
------------------------------

Backend:

1. `backend/src/test/java/com/smartiq/backend/game/contract/GameSessionSnapshotContractTest.java`
2. `backend/src/test/java/com/smartiq/backend/game/GameSessionControllerTest.java`
3. `backend/src/test/java/com/smartiq/backend/room/RoomControllerTest.java`
4. `backend/src/test/java/com/smartiq/backend/room/RoomServiceTest.java`
5. `backend/src/test/java/com/smartiq/backend/web/RateLimitFilterTest.java`

Frontend consumer:

1. `frontend/src/App.server-mode.test.jsx`
2. `frontend/src/api.test.js`
3. `frontend/src/fixtures/contracts/game-session-create-response-v1.json`

Quick verification command:

```bash
npm run test:contracts
```

CherryPick note
---------------

- `PASS` is not part of the active CherryPick action contract.
- Difficulty is not part of the public game-session creation contract.
