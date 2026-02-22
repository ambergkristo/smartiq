# Observability

Pool/runtime observability endpoints:

- `GET /actuator/metrics`
- `GET /actuator/prometheus`
- `GET /internal/pool-stats`

`/internal/pool-stats` includes per `(topic,difficulty,language)` key:

- pool size
- refill count
- last refill timestamp
- fallback DB hits
- cache hit rate

Prometheus metrics include:

- `smartiq.pool.size`
- `smartiq.pool.cache.hits`
- `smartiq.pool.cache.misses`
- `smartiq.pool.fallback.db.hits`
- `smartiq.pool.refills`

## Deck Event Logs

`NextRandomCardService` logs one INFO line per served deck card:

- message prefix: `nextRandom`
- fields:
  - `gameId`
  - `draw` (draw index for that game history)
  - `newGame` (`true` on first draw for gameId)
  - `cardId`
  - `category`
  - `topic`
  - `language`
  - `pool`
  - `historyBefore`
  - `historyAfter`
  - `historyTrimmed` (`true` when last-K window already full)
  - `relaxed` (applied relaxation steps)

Use this log for low-noise deck progression tracing without enabling debug logging.
