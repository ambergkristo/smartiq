# CherryPick Game-First Recovery Decision

Date: 2026-04-20

## Decision

CherryPick is treated as a game product first.

The primary public promise is:

- `PLAY`: quick solo CherryPick session
- `JOIN`: join a live host-led CherryPick room
- `HOST`: create a room and launch the live game

The recurring host workspace remains a secondary operator layer. It can support repeat hosts, but it does not define the public identity of the product.

## Canonical Roles

- `Solo player`: starts and completes local/server-backed solo runs
- `Host`: creates a room, curates the roster, and launches the live game
- `Joined player`: joins the host room and follows the live session state from a personal device
- `Host workspace operator`: authenticated repeat host using templates, branding, billing, and review tools

## Current Joined-Player Promise

For the current recovery phase, `JOIN` does **not** promise true multi-device turn participation.

The honest contract is:

- joined players can enter the room before launch
- joined players can see room state after joining
- once the room is launched, new joins are closed
- live gameplay remains host-led for now

This is a deliberate temporary scope choice, not the end-state ambition.

## Why This Decision

The current codebase does not support real per-device turn authority:

- joined players do not receive gameplay authority tokens
- the active gameplay client remains the browser that created the game
- there is no frontend room websocket consumer driving live gameplay participation

Pretending otherwise creates a broken product promise. Freezing the honest model now lets Phase 1 repair the room-to-game lifecycle without inventing fake multiplayer.

## Immediate Product Implications

- home, join, and host surfaces must read as one CherryPick game family
- room launch must be authoritative and visible in room state
- post-launch joins must be blocked by backend contract
- player waiting-room copy must explicitly reflect host-led live play

## Deferred Follow-Up

True multi-client participation remains a later decision. It requires:

- room-bound game identity for joined players
- per-client turn authority
- live update delivery to player devices
- reconnection/resume semantics for active participants
