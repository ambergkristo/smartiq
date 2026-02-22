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
- `smartiq.next_random.draw.total`
- `smartiq.next_random.immediate_repeat.total` (tag `kind`: `category|topic|cardId`)
- `smartiq.next_random.relax.total` (tag `level`: `none|language|cardId|topic|category`)
- `smartiq.next_random.source.total` (tag `source`)

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

## Runtime Health Report

Use one command to run 50-100 `nextRandom` draws and print runtime integrity metrics:

```powershell
npm run report:runtime:health
```

Optional environment overrides:

- `BACKEND_URL` or `API_BASE_URL` (default `http://localhost:8081`)
- `LANGUAGE` (default `en`)
- `TOPIC` (default `any`)
- `REQUESTS` or `DRAWS` (default `80`)
- `GAME_ID` (default generated UUID)

Report includes:

- immediate repeat rates (`category`, `topic`, `cardId`)
- source distribution from served cards
- relax-level usage from Prometheus counters (if `/actuator/prometheus` is available)
