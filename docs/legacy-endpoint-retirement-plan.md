# Legacy Cards Endpoint Retirement Plan

## Scope

Canonical runtime endpoint:

- `GET /api/cards/nextRandom?language=&gameId=&topic=`

Deprecated legacy endpoints (kept temporarily for backward compatibility):

- `GET /api/cards/next?topicId=&topic=&difficulty=&sessionId=&lang=&v=`
- `GET /api/cards/random?topic=`

Code references:

- [backend/src/main/java/com/smartiq/backend/card/CardController.java](../backend/src/main/java/com/smartiq/backend/card/CardController.java)
- [README.md](../README.md)

## Timeline

- `2026-02-24`: retirement plan approved and migration tracking starts.
- `2026-06-30`: all first-party SmartIQ clients must be on `/api/cards/nextRandom`.
- `2026-09-30`: external client outreach complete; legacy traffic must be under 1% of card traffic.
- `2026-12-31 23:59:59 GMT`: deprecation sunset date already advertised in prod response headers.
- `2027-01-15`: target removal date for `/api/cards/next` and `/api/cards/random` from backend code.

If telemetry gates are not met by the target date, removal is delayed one sprint with a new dated plan revision.

## Telemetry and Exit Gates

Track legacy usage from Prometheus (`/actuator/prometheus`) using HTTP request counters.

Example queries:

```promql
sum(rate(http_server_requests_seconds_count{uri="/api/cards/next"}[7d]))
sum(rate(http_server_requests_seconds_count{uri="/api/cards/random"}[7d]))
sum(rate(http_server_requests_seconds_count{uri="/api/cards/nextRandom"}[7d]))
```

Legacy share:

```promql
(
  sum(rate(http_server_requests_seconds_count{uri=~"/api/cards/(next|random)"}[7d]))
)
/
clamp_min(
  sum(rate(http_server_requests_seconds_count{uri=~"/api/cards/(next|random|nextRandom)"}[7d])),
  0.000001
)
```

Exit gates before removal PR:

- 14-day legacy share `< 1%`.
- 7-day legacy request rate `== 0` for first-party clients (smoke tests and app telemetry).
- No active incidents or support tickets tied to legacy endpoints.

## Client Migration

Migration guide:

- [docs/legacy-cards-endpoint-migration.md](legacy-cards-endpoint-migration.md)

Tracking checklist (owner: backend + frontend):

- Update all first-party callers to `/api/cards/nextRandom`.
- Remove legacy endpoint usage from smoke/load scripts.
- Confirm production deprecation headers are visible on legacy responses.
- Publish migration note in release communication before removal PR.

## Removal PR Requirements

- Delete `/api/cards/next` and `/api/cards/random` mappings from `CardController`.
- Remove legacy deprecation header code for cards endpoints.
- Remove obsolete tests tied only to legacy routes; keep canonical endpoint coverage.
- Run canonical gate:
  - `npm run release:check`

## Rollback Plan

If removal causes external breakage:

1. Revert removal PR.
2. Re-enable legacy mappings with deprecation headers.
3. Keep canonical endpoint as default and restart telemetry capture.
