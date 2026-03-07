# Realtime Runtime Contract

SmartIQ runtime uses a split contract on purpose:

- WebSocket is server-to-client broadcast only.
- HTTP is the only action submission channel.

## Authority Model

- The backend is authoritative for room membership, turn ownership, scoring, round progression, and game-over decisions.
- Frontend state is a projection of backend snapshots.
- Clients must not derive gameplay outcomes locally.

## Transport Responsibilities

### WebSocket

- Path: `/ws/rooms/*`
- Responsibility: push room-state and lifecycle events such as `ROOM_STATE`, `PLAYER_JOINED`, `TURN_CHANGED`, `ROUND_ENDED`, and `GAME_ENDED`
- Client messages are unsupported and are rejected with a policy-violation close

### HTTP

- Room HTTP routes create, join, rejoin, resume, and moderate room membership
- Game HTTP routes create server sessions and submit actions such as answer, pass, confirm, and next-step transitions
- Billing, tenant, and host workspace operations stay on HTTP

## Reconnect Contract

Reconnect is intentionally two-step:

1. HTTP `rejoin` rotates the room auth token for the participant and returns the latest authoritative room snapshot.
2. WebSocket `resume` uses the current rotated token to subscribe to broadcasts and must not rotate that token again.

This preserves a single authoritative reconnect identity:

- stale room tokens stop working after HTTP rejoin
- the rotated token remains stable for subsequent WebSocket resume calls
- room state after reconnect is always sourced from the backend snapshot, not browser-local recovery
