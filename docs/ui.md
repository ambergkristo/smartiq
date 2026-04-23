# CherryPick UI and Runtime Flow

This document describes the current CherryPick frontend behavior for the active single-player-first product path.

## Public Entry Flows

### Home

- Home is the public product entry.
- Primary choices:
  - `Play Solo`: start a solo CherryPick run immediately
  - `Choose topic`: enter the solo topic-select shell
- `Join` and `Host` may still exist in the repo, but they are not the active public product focus.

## Setup and Launch

### Solo Setup

- The setup shell supports:
  - `topic`
  - `language`
  - `runner alias`
- `difficulty` is not a public runtime control because it is not wired through the current game creation contract.
- `Any Topic` remains the default and uses random deck mode.
- Daily challenge copy in setup is roadmap-only until the feature is backed by a real reset/persistence system.

## Gameplay Surface

- The frontend uses server-authoritative game sessions.
- The board shows:
  - topic/language card metadata from backend snapshots
  - question text
  - 8 answer tiles
  - action flow built around `SUBMIT PICK`, `LOCK IN`, and `NEXT ROUND`
- CherryPick does not expose a `PASS` action in the current runtime.

## Summary / Game Over

- Round summary appears after each round.
- `NEXT ROUND` advances to the next server-authoritative round.
- `GAME OVER` appears when the run ends.
- Summary UI reports XP/progression context and round outcome only; it does not claim unimplemented leaderboard or daily systems.

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
- One board = exactly 8 answer tiles.
- Solo play stays all-or-nothing: one wrong pick kills the round reward.
- There is no pass mechanic in the CherryPick runtime contract.
- The active public product is the solo loop plus local XP progression.

## API Integration

- Topics endpoint:
  - `GET /api/topics`
- Server-authoritative game endpoints:
  - `POST /api/game`
  - `GET /api/game/{gameId}`
  - `POST /api/game/{gameId}/action`
- `POST /api/game/{gameId}/action` supports CherryPick gameplay actions only; `PASS` is unsupported.
- Room endpoints still exist in the repo, but they are not part of the current single-player product target.

## Manual QA

1. Start backend and frontend:
   - `mvn -q -f backend/pom.xml test`
   - `npm --prefix frontend ci`
   - `npm --prefix frontend run dev`
2. Verify home shows `Play Solo` and `Choose topic` as the dominant actions.
3. Verify `Play Solo` starts the solo loop without a placeholder handoff screen.
4. Verify `#/start` shows the topic-select shell with the 8-tile board contract visible.
5. Verify gameplay keeps `SUBMIT PICK`, `LOCK IN`, and `NEXT ROUND` reachable in the main viewport.
6. Verify result screens show XP/progression without fake leaderboard or daily claims.
