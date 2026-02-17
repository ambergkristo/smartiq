# UI and State Machine

This document describes the SmartIQ frontend game UX and the state machine that powers the round flow.

## Screens

## Setup

- Inputs: `topic`, `difficulty (1-3)`, `language`, round length, players list.
- Action: `Start round`.
- Behavior:
  - Generates a session id (`crypto.randomUUID()` fallback to timestamp id).
  - Resets local recent-card buffer.
  - Moves to `LOADING_CARD`.

## Play Board

- Left panel:
  - Player list with active player highlight.
  - Score per player.
  - Round status (`Card X / N`).
  - Last action text.
- Center panel:
  - Card metadata (topic, difficulty, language).
  - Question text.
  - 10 answer tiles.
  - Action bar (`ANSWER`, `PASS`, `LOCK IN`, `NEXT`) based on phase.

## Round Summary

- Sorted scoreboard.
- `New round` button returns to setup.

## GamePhase Model

Defined in `frontend/src/state/types.ts`.

- `SETUP`
- `LOADING_CARD`
- `CHOOSING`
- `CONFIRMING`
- `RESOLVED`
- `PASSED`
- `ROUND_SUMMARY`

## Transition Rules

- `SETUP -> LOADING_CARD` on start.
- `LOADING_CARD -> CHOOSING` when card fetch succeeds.
- `CHOOSING -> CONFIRMING` on `ANSWER`.
- `CONFIRMING -> CHOOSING` on `BACK`.
- `CONFIRMING -> RESOLVED` on `LOCK IN` (score applied).
- `CHOOSING -> PASSED` on `PASS`.
- `RESOLVED|PASSED -> LOADING_CARD` on `NEXT` while cards remain.
- `RESOLVED|PASSED -> ROUND_SUMMARY` when round card limit reached.
- `ROUND_SUMMARY -> SETUP` on `New round`.

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
- Happy-path board flow:
  - `frontend/src/App.test.jsx`
