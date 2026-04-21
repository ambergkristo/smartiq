# CherryPick UI and Runtime Flow

This document describes the current CherryPick frontend behavior after the game-first recovery work.

## Public Entry Flows

### Home

- Home is the public product entry.
- Primary choices:
  - `Play`: start a solo CherryPick run immediately
  - `Join Game`: enter the live-room join flow
  - `Host Game`: prepare and launch a host-led live room

### Join

- `#/join` is the canonical public room-code flow.
- `#/join/:roomCode` is the canonical deep-link flow.
- Join is currently honest host-led live play:
  - joined devices enter the room roster
  - the host remains the gameplay driver
  - late joins close once the room is live

### Host

- `#/host` is the canonical public host flow.
- Host prepares the topic and room, shares the code, then starts the live session.
- Authenticated host workspace/runtime surfaces are secondary operator tools, not the public product story.

## Setup and Launch

### Quick Start Setup

- The setup shell supports:
  - `topic`
  - `language`
  - `players`
- `difficulty` is not a public runtime control because it is not wired through the current game creation contract.
- `Any Topic` remains the default and uses random deck mode.

### Room Launch

- Host room creation produces a shareable room code.
- Joined players appear in the host roster before launch.
- Starting a host room creates a room-backed live game.
- Once launched, the room becomes `LIVE` and new joins are blocked.

## Gameplay Surface

- The frontend uses server-authoritative game sessions.
- The board shows:
  - topic/language card metadata from backend snapshots
  - question text
  - 8 answer tiles
  - action flow built around `ANSWER`, `LOCK IN`, and `NEXT ROUND`
- CherryPick does not expose a `PASS` action in the current runtime.

## Summary / Game Over

- Round summary appears after each round.
- `NEXT ROUND` advances to the next server-authoritative round.
- `GAME OVER` appears when a player reaches the win condition.
- Summary UI reports score, correct answers, and wrong answers only.

## GamePhase Model

Defined in `frontend/src/state/types.ts`.

- `SETUP`
- `LOADING_CARD`
- `CHOOSING`
- `CONFIRMING`
- `RESOLVED`
- `ROUND_SUMMARY`
- `GAME_OVER`

## Core Rules

- One round = one card.
- Players take turns on the same card.
- Wrong answers eliminate the acting player for the current round.
- There is no pass mechanic in the CherryPick runtime contract.
- First player to the configured target score wins the game.

## API Integration

- Topics endpoint:
  - `GET /api/topics`
- Server-authoritative game endpoints:
  - `POST /api/game`
  - `GET /api/game/{gameId}`
  - `POST /api/game/{gameId}/action`
- Room endpoints:
  - create, join, rejoin, preview, and launch live-room state
- `POST /api/game/{gameId}/action` supports CherryPick gameplay actions only; `PASS` is unsupported.

## Manual QA

1. Start backend and frontend:
   - `mvn -q -f backend/pom.xml test`
   - `npm --prefix frontend ci`
   - `npm --prefix frontend run dev`
2. Verify home shows `Play`, `Join Game`, and `Host Game`.
3. Verify `Play` starts solo without a placeholder handoff screen.
4. Verify `Join Game` uses the two-step room-code then name flow.
5. Verify host room creation shows the share link and roster with no QR demo block.
6. Launch a room and verify late joins are blocked once the room is live.
