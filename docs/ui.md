# UI and State Machine

This document describes the SmartIQ frontend UX and Smart10-style round flow.

## Screens

## Setup

- Inputs: `topic`, `difficulty (1-3)`, `language`, players list.
- Action: `Start game`.
- Behavior:
  - Generates a game id (`crypto.randomUUID()` fallback to timestamp id) and stores it in localStorage.
  - `Any Topic` is the default and uses full random deck mode.
  - Moves to `LOADING_CARD`.

## Play Board

- Left panel:
  - Player list with active player highlight.
  - Score per player.
  - Round number and target points (30).
  - Current phase and last action text.
- Center panel:
  - Card metadata (topic, difficulty, language).
  - Question text.
  - 10 answer slots in wheel layout (fallback grid on narrow screens).
  - Action bar (`ANSWER`, `PASS`, `LOCK IN`, `NEXT`) based on phase.

## Round Summary / Game Over

- Round summary appears after each one-card round.
- `NEXT ROUND` loads a new card for the next round.
- `GAME OVER` appears when a player reaches 30 points.

## GamePhase Model

Defined in `frontend/src/state/types.ts`.

- `SETUP`
- `LOADING_CARD`
- `CHOOSING`
- `CONFIRMING`
- `RESOLVED`
- `PASSED`
- `ROUND_SUMMARY`
- `GAME_OVER`

## Smart10 Round Rules (Frontend)

- One round = one card.
- Players take turns on the same card.
- Wrong answer eliminates that player for the current round only.
- Pass skips turn and marks player as passed for the current round.
- Round ends when all players are passed/eliminated or all answer slots are resolved.
- First player to 30 total points wins the game.

## API Integration

- Preferred endpoint:
  - `GET /api/cards/nextRandom?language=&gameId=&topic=`
- Topics endpoint:
  - `GET /api/topics`
- Frontend behavior:
  - Uses timeout + retry for transient/network errors.
  - Shows backend error details on `404` when available.
  - For `Any Topic`, requests cards without topic filter.
  - Reuses persisted `gameId` across reloads for per-game anti-repeat behavior.

## Random Deck Rules

- Server-side anti-repeat for `nextRandom` per `gameId`:
  - Avoid same category back-to-back when alternatives exist.
  - Avoid same topic back-to-back when alternatives exist.
  - Avoid repeating recent card ids in last K=20 when alternatives exist.
  - Relax order if pool is too small: `cardId` -> `topic` -> `category`.

## Manual QA (Windows PowerShell)

1. Start backend and frontend:
   - `mvn -q -f backend/pom.xml test`
   - `npm --prefix frontend ci`
   - `npm --prefix frontend run dev`
2. Open app, keep `Any Topic` selected, add at least 2 players, click `Start game`.
3. Play 10 rounds with PASS/ANSWER mix and verify:
   - No immediate same category in consecutive rounds (when alternatives exist).
   - No immediate same topic in consecutive rounds (when alternatives exist).
4. Reload page and start another round:
   - Confirm game still loads cards with same persisted `gameId`.
5. Optional filter check:
   - Select one topic on setup and verify cards come from that topic while randomizing categories.
6. Empty-pool check:
   - Request unavailable filter/language and verify user sees a meaningful `404` detail message, not generic fallback.

## Test Coverage

- State machine transitions:
  - `frontend/src/state/useGameEngine.test.jsx`
- Round flow UI:
  - `frontend/src/App.test.jsx`
- Wheel layout rendering/fallback:
  - `frontend/src/components/GameBoard.test.jsx`
