Deployment Checklist
====================

Purpose
-------
Canonical production deployment checklist for SmartIQ operators. This file is the source of truth for deploy sequencing, config validation, and release-day verification.

1. Pre-deploy readiness
-----------------------

1. Confirm target backend and frontend URLs.
2. Confirm database backup/snapshot exists for the deployment window.
3. Confirm rollout owner and rollback owner are assigned.
4. Confirm required secrets are present in the deploy platform:
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   - `SMARTIQ_INTERNAL_API_KEY`
5. Confirm `SMARTIQ_IMPORT_PATH` points to the intended dataset bundle.

2. Config matrix (prod)
-----------------------

| Area | Property | Env var | Required | Recommended prod value / note |
| --- | --- | --- | --- | --- |
| build | `smartiq.build.commit-sha` | `SMARTIQ_BUILD_SHA` | yes | Set from CI commit SHA. |
| build | `smartiq.build.time` | `SMARTIQ_BUILD_TIME` | yes | Set from CI build timestamp (UTC). |
| import | `smartiq.import.enabled` | `SMARTIQ_IMPORT_ENABLED` | yes | `true` for startup import flow. |
| import | `smartiq.import.path` | `SMARTIQ_IMPORT_PATH` | yes | Example: `../data/smart10`. |
| import gate | `smartiq.import.fail-on-category-threshold` | `SMARTIQ_IMPORT_FAIL_ON_CATEGORY_THRESHOLD` | yes | `true` in production to fail fast on weak dataset coverage. |
| dataset gate | `smartiq.dataset.min-category-threshold` | `SMARTIQ_MIN_CATEGORY_THRESHOLD` | yes | Keep aligned with release policy (default `100`). |
| pool | `smartiq.pool.enabled` | `SMARTIQ_POOL_ENABLED` | yes | `true` unless feature is explicitly disabled. |
| pool | `smartiq.pool.minimum-per-key` | `MIN_BANK_SIZE` | yes | Baseline minimum bank size. |
| pool | `smartiq.pool.low-watermark-per-key` | `POOL_LOW_WATERMARK` | yes | Low watermark trigger for refill monitoring. |
| pool | `smartiq.pool.refill-target-per-key` | `POOL_TARGET` | yes | Target refill size. |
| session dedup | `smartiq.session.enabled` | `SMARTIQ_SESSION_DEDUP_ENABLED` | yes | Keep enabled unless incident workaround required. |
| session dedup | `smartiq.session.store` | `SMARTIQ_SESSION_STORE` | no | `memory` or deployment-specific store. |
| session dedup | `smartiq.session.ttl-minutes` | `SMARTIQ_SESSION_TTL_MINUTES` | yes | Default `120`; tune per memory budget. |
| session dedup | `smartiq.session.max-sessions` | `SMARTIQ_SESSION_MAX` | yes | Capacity guardrail. |
| session dedup | `smartiq.session.redis-prefix` | `SMARTIQ_SESSION_REDIS_PREFIX` | no | Needed only with Redis-backed store. |
| language | `smartiq.language.et-enabled` | `SMARTIQ_LANGUAGE_ET_ENABLED` | yes | `true` unless ET rollout is intentionally paused. |
| game | `smartiq.game.session-retention-minutes` | `SMARTIQ_GAME_SESSION_RETENTION_MINUTES` | yes | Session eviction retention. |
| game | `smartiq.game.session-max` | `SMARTIQ_GAME_SESSION_MAX` | yes | Capacity limit for active game sessions. |
| room | `smartiq.room.room-retention-minutes` | `SMARTIQ_ROOM_RETENTION_MINUTES` | yes | Room eviction retention. |
| room | `smartiq.room.room-max` | `SMARTIQ_ROOM_MAX` | yes | Capacity limit for active rooms. |
| bank safety | `smartiq.bank.min-size` | `MIN_BANK_SIZE` | yes | Shared with pool minimum baseline. |
| bank safety | `smartiq.bank.block-on-low-bank` | `SMARTIQ_BLOCK_ON_LOW_BANK` | no | Keep `false` unless policy requires hard block. |
| bank safety | `smartiq.bank.trigger-pipeline-on-low-bank` | `SMARTIQ_TRIGGER_PIPELINE_ON_LOW_BANK` | no | Set `true` only with validated automation. |
| bank safety | `smartiq.bank.pipeline-command` | `SMARTIQ_PIPELINE_COMMAND` | no | Command used when low-bank trigger is enabled. |
| cors | `smartiq.cors.allowed-origins` | `SMARTIQ_CORS_ALLOWED_ORIGIN_PUBLIC` | yes | Public frontend origin allowlist. |
| internal access | `smartiq.internal-access.enabled` | `SMARTIQ_INTERNAL_ACCESS_ENABLED` | yes | `true` for protected internal endpoints in prod. |
| internal access | `smartiq.internal-access.api-key-header` | `SMARTIQ_INTERNAL_API_KEY_HEADER` | yes | Default `X-Internal-Api-Key`. |
| internal access | `smartiq.internal-access.api-key` | `SMARTIQ_INTERNAL_API_KEY` | yes | Strong secret; rotate periodically. |
| rate limit | `smartiq.rate-limit.enabled` | `SMARTIQ_RATE_LIMIT_ENABLED` | yes | `true` in production. |
| rate limit | `smartiq.rate-limit.window-seconds` | `SMARTIQ_RATE_LIMIT_WINDOW_SECONDS` | yes | Default `60`. |
| rate limit | `smartiq.rate-limit.trust-forwarded-for` | `SMARTIQ_RATE_LIMIT_TRUST_FORWARDED_FOR` | yes | `true` only behind trusted proxy. |
| rate limit | `smartiq.rate-limit.counter-max` | `SMARTIQ_RATE_LIMIT_COUNTER_MAX` | yes | Memory safety cap. |
| rate limit | `smartiq.rate-limit.ws-rooms-per-minute` | `SMARTIQ_RATE_LIMIT_WS_ROOMS_PER_MINUTE` | yes | WebSocket handshake limit. |
| rate limit | `smartiq.rate-limit.cards-next-per-minute` | `SMARTIQ_RATE_LIMIT_CARDS_NEXT_PER_MINUTE` | yes | Deck draw API limit. |
| rate limit | `smartiq.rate-limit.session-answer-per-minute` | `SMARTIQ_RATE_LIMIT_SESSION_ANSWER_PER_MINUTE` | yes | Action API limit. |
| rate limit | `smartiq.rate-limit.game-per-minute` | `SMARTIQ_RATE_LIMIT_GAME_PER_MINUTE` | yes | Game endpoint limit. |
| rate limit | `smartiq.rate-limit.rooms-per-minute` | `SMARTIQ_RATE_LIMIT_ROOMS_PER_MINUTE` | yes | Room endpoint limit. |
| API errors | `smartiq.api.errors.legacy-shape-enabled` | `SMARTIQ_API_ERRORS_LEGACY_SHAPE_ENABLED` | no | Keep `false` unless compatibility rollback is required. |

3. Start and stop order
-----------------------

Start order:
1. Start database and verify connectivity.
2. Run migrations:
   ```bash
   cd backend
   mvn -DskipTests=true flyway:migrate
   ```
3. Start backend.
4. Optional: run/verify dataset import (if external or staged process is used).
5. Start/switch frontend to target backend.

Stop order (for controlled maintenance):
1. Put frontend in maintenance mode or disable public traffic.
2. Stop backend.
3. Stop optional dataset import jobs/workers.
4. Stop database only if required by maintenance scope.

4. Release-day verification
---------------------------

4.1 Health and version

```bash
curl -i https://<backend-domain>/health
curl -i https://<backend-domain>/version
```

Expected:
- `/health` returns HTTP `200` with `{"status":"UP"}`
- `/version` returns non-empty `commitSha` and `buildTime`

4.2 DMZ/public CORS headers

```bash
curl -i -X OPTIONS "https://<backend-domain>/api/topics" \
  -H "Origin: https://<frontend-domain>" \
  -H "Access-Control-Request-Method: GET"
```

Expected:
- HTTP `200` or `204`
- `Access-Control-Allow-Origin` matches deployed frontend origin

4.3 WebSocket handshake success

1. Create room:
   ```bash
   curl -s -X POST "https://<backend-domain>/api/rooms" \
     -H "Content-Type: application/json" \
     -d "{\"displayName\":\"Host\"}"
   ```
2. Use returned `roomCode`, `playerId`, and `authToken` to open websocket:
   ```bash
   npx wscat -c "wss://<backend-domain>/ws/rooms/<ROOM_CODE>?playerId=<PLAYER_ID>&authToken=<AUTH_TOKEN>"
   ```
3. Expect first server message with `type` = `ROOM_STATE`.
4. Confirm metric increment:
   - `smartiq.room.ws.connect.total{result="success"}`

4.4 Dataset threshold gate

1. Confirm startup log contains:
   - `Dataset summary ... failOnThreshold=true ... belowThresholdCategoryCount=...`
2. Confirm Prometheus exposes:
   - `smartiq_dataset_category_below_threshold`
3. Go/No-Go rule:
   - If `belowThresholdCategoryCount > 0` and fail-on-threshold is enabled, deployment is a NO-GO.

4.5 Full post-deploy smoke

```powershell
$env:BACKEND_URL="https://<backend-domain>"; $env:FRONTEND_URL="https://<frontend-domain>"; npm run smoke:postdeploy
```

5. Rollback trigger conditions
------------------------------

Rollback immediately when any of these persist beyond 10 minutes:
- `/health` not `UP`
- websocket handshake failures exceed successes
- `smartiq.game.action.rejected.total` spikes from baseline and blocks play
- dataset threshold gate fails on startup

6. References
-------------

- `docs/plans/migration-checklist.md`
- `docs/deploy.md`
- `docs/observability.md`
