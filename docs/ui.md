# UI and State Machine

This document describes the SmartIQ frontend UX and Smart10-style round flow.

## Screens

## Setup

- Inputs: `topic`, `difficulty (1-3)`, `language`, players list.
- Action: `Start game`.
- Behavior:
  - Generates a session id (`crypto.randomUUID()` fallback to timestamp id).
  - Resets local recent-card buffer.
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
  - `GET /api/cards/next?topic=&difficulty=&sessionId=&lang=`
- Topics endpoint:
  - `GET /api/topics`
- Frontend behavior:
  - Uses timeout + retry for transient/network errors.
  - Shows fallback mode message on backend failures.
  - Shows bank-empty guidance when backend returns `404`.
  - Maintains local recent card id buffer (last 20 ids).

## Test Coverage

- State machine transitions:
  - `frontend/src/state/useGameEngine.test.jsx`
- Round flow UI:
  - `frontend/src/App.test.jsx`
- Wheel layout rendering/fallback:
  - `frontend/src/components/GameBoard.test.jsx`
