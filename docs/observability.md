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
- `smartiq.pool.cache.hit.rate`
- `smartiq.next_random.draw.total`
- `smartiq.next_random.immediate_repeat.total` (tag `kind`: `category|topic|cardId`)
- `smartiq.next_random.relax.total` (tag `level`: `none|language|cardId|topic|category`)
- `smartiq.next_random.source.total` (tag `source`)
- `smartiq.game.session.started.total` (tag `language`)
- `smartiq.game.session.completed.total` (tag `language`)
- `smartiq.game.round.completed.total` (tag `language`)
- `smartiq.game.action.total` (tags `type=answer|pass`, `language`)
- `smartiq.game.answer.total` (tags `outcome=correct|wrong`, `language`)
- `smartiq.game.duration.seconds` (timer, tag `language`)
- `smartiq.game.round.duration.seconds` (timer, tag `language`)
- `smartiq.room.create.total` (tags `result`, `reason`)
- `smartiq.room.join.total` (tags `result`, `reason`)
- `smartiq.room.rejoin.total` (tags `result`, `reason`)
- `smartiq.room.ws.connect.total` (tags `result`, `reason`)

## Party Beta KPI Queries

Use these PromQL queries to compute mandatory beta KPIs from server-authoritative gameplay:

- Average game length:
  - `sum(rate(smartiq_game_duration_seconds_sum[1d])) / clamp_min(sum(rate(smartiq_game_duration_seconds_count[1d])), 1e-9)`
- Average round length:
  - `sum(rate(smartiq_game_round_duration_seconds_sum[1d])) / clamp_min(sum(rate(smartiq_game_round_duration_seconds_count[1d])), 1e-9)`
- Pass rate:
  - `sum(rate(smartiq_game_action_total{type="pass"}[1d])) / clamp_min(sum(rate(smartiq_game_action_total[1d])), 1e-9)`
- Wrong-answer rate:
  - `sum(rate(smartiq_game_answer_total{outcome="wrong"}[1d])) / clamp_min(sum(rate(smartiq_game_answer_total[1d])), 1e-9)`
- Drop-off rate:
  - `(sum(rate(smartiq_game_session_started_total[1d])) - sum(rate(smartiq_game_session_completed_total[1d]))) / clamp_min(sum(rate(smartiq_game_session_started_total[1d])), 1e-9)`

Generate a markdown beta summary snapshot from live Prometheus export:

- `$env:BACKEND_URL="https://<backend-domain>"; npm run report:beta:summary`
- Optional thresholds:
  - `--min-started-games=<n>`
  - `--min-completed-games=<n>`
  - `--max-dropoff=<0..1>`
  - `--max-wrong-answer=<0..1>`
  - `--min-reconnect-success=<0..1>`
  - `--max-join-failure=<0..1>`
  - `--max-ws-failure=<0..1>`
  - `--fail-on-no-go` (exit code `2` when recommendation is `NO-GO`)

Optional beta ops metrics:

- Reconnect success rate:
  - `sum(rate(smartiq_room_rejoin_total{result="success"}[1d])) / clamp_min(sum(rate(smartiq_room_rejoin_total[1d])), 1e-9)`
- Room join failure rate:
  - `sum(rate(smartiq_room_join_total{result="failure"}[1d])) / clamp_min(sum(rate(smartiq_room_join_total[1d])), 1e-9)`
- WebSocket connect failure rate:
  - `sum(rate(smartiq_room_ws_connect_total{result="failure"}[1d])) / clamp_min(sum(rate(smartiq_room_ws_connect_total[1d])), 1e-9)`

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

## Deck Exhaustion Dashboard Seed

Micrometer dot metrics are exported to Prometheus with underscores. Example mappings:

- `smartiq.pool.size` -> `smartiq_pool_size`
- `smartiq.pool.cache.hit.rate` -> `smartiq_pool_cache_hit_rate`
- `smartiq.pool.cache.hits` -> `smartiq_pool_cache_hits_total`
- `smartiq.pool.cache.misses` -> `smartiq_pool_cache_misses_total`
- `smartiq.pool.fallback.db.hits` -> `smartiq_pool_fallback_db_hits_total`
- `smartiq.pool.refills` -> `smartiq_pool_refills_total`
- `smartiq.next_random.draw.total` -> `smartiq_next_random_draw_total`

Suggested Grafana panels:

- Table: lowest pool sizes by key (topic/difficulty/language).
- Time series: pool size over time for a selected key.
- Stat: fallback DB hit rate (overall).
- Stat: average cache hit rate (overall).
- Bar or time series: refill rate by key.

PromQL examples:

- Lowest pool sizes by key:
  - `sort(min by (topic,difficulty,language) (smartiq_pool_size))`
- Count of pools at or below watermark (example `20`):
  - `sum(smartiq_pool_size <= 20)`
- Fallback DB hit rate (overall):
  - `sum(rate(smartiq_pool_fallback_db_hits_total[5m])) / sum(rate(smartiq_pool_cache_hits_total[5m]) + rate(smartiq_pool_cache_misses_total[5m]) + rate(smartiq_pool_fallback_db_hits_total[5m]))`
- Average cache hit rate:
  - `avg(smartiq_pool_cache_hit_rate)`
- Refill rate by key:
  - `sum by (topic,difficulty,language) (rate(smartiq_pool_refills_total[5m]))`
- Pool size trend for a key:
  - `smartiq_pool_size{topic="History",difficulty="1",language="en"}`

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
- `POOL_LOW_WATERMARK` (default `20`)

Report includes:

- immediate repeat rates (`category`, `topic`, `cardId`)
- source distribution from served cards
- relax-level usage from Prometheus counters (if `/actuator/prometheus` is available)
- deck exhaustion summary from `/internal/pool-stats` (low-watermark count, fallback rate, lowest pools)
