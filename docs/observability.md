# Observability

CherryPick runtime observability endpoints:

- public:
  - `GET /health`
  - `GET /version`
- internal-key protected in `prod`:
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
- `smartiq.next_random.immediate_repeat.total`
- `smartiq.next_random.relax.total`
- `smartiq.next_random.source.total`
- `smartiq.game.session.started.total`
- `smartiq.game.session.completed.total`
- `smartiq.game.session.evicted.total`
- `smartiq.game.round.completed.total`
- `smartiq.game.action.total` (tags `type=answer|advance`, `language`)
- `smartiq.game.action.rejected.total` (tag `reason`)
- `smartiq.game.answer.total` (tags `outcome=correct|wrong`, `language`)
- `smartiq.game.duration.seconds`
- `smartiq.game.round.duration.seconds`
- `smartiq.room.create.total`
- `smartiq.room.join.total`
- `smartiq.room.rejoin.total`
- `smartiq.room.ws.connect.total`
- `smartiq.dataset.category.below.threshold`

## Launch watchlist

For the current CherryPick launch, monitor these first:

1. solo game-session create/completion drop-off
2. game-session eviction spikes
3. action rejection spikes
4. dataset threshold failures

Suggested PromQL:

- game drop-off rate:
  - `(sum(rate(smartiq_game_session_started_total[1d])) - sum(rate(smartiq_game_session_completed_total[1d]))) / clamp_min(sum(rate(smartiq_game_session_started_total[1d])), 1e-9)`
- game-session eviction rate:
  - `sum(rate(smartiq_game_session_evicted_total[15m]))`
- wrong-answer rate:
  - `sum(rate(smartiq_game_answer_total{outcome="wrong"}[1d])) / clamp_min(sum(rate(smartiq_game_answer_total[1d])), 1e-9)`
- action rejection rate:
  - `sum(rate(smartiq_game_action_rejected_total[15m]))`
- deck fallback DB hits:
  - `sum(rate(smartiq_pool_fallback_db_hits[15m]))`

## Alerting posture

Validated alert rules in this repo still cover the older closed-beta KPI gate:

- `ops/prometheus/smartiq-beta-kpi-alert-rules.yml`
- `npm run validate:beta:alerts`

For the current CherryPick launch, treat auth/billing/admin/tenant workflows as out of scope for the public game release. Room and websocket metrics stay useful for internal hosted-runtime checks, but the watchlist above is the authoritative public solo-launch surface.

## Deck event logs

`NextRandomCardService` logs one INFO line per served deck card:

- message prefix: `nextRandom`
- fields:
  - `gameId`
  - `draw`
  - `newGame`
  - `cardId`
  - `category`
  - `topic`
  - `language`
  - `pool`
  - `historyBefore`
  - `historyAfter`
  - `historyTrimmed`
  - `relaxed`

Use this log for low-noise deck progression tracing without enabling debug logging.
