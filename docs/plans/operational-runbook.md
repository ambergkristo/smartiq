Operational Runbook
===================

Purpose
-------
First-response runbook for production incidents and release-day operational checks.

1. Fast triage (first 5 minutes)
--------------------------------

1. Confirm deployment identity:
   ```bash
   curl -s https://<backend-domain>/version
   ```
2. Confirm backend liveness:
   ```bash
   curl -i https://<backend-domain>/health
   ```
3. Confirm metrics endpoint availability:
   ```bash
   curl -i https://<backend-domain>/actuator/prometheus
   ```
4. If `/health` is not `UP`, move to immediate rollback decision.

2. Core operational endpoints
-----------------------------

- `/health`: binary service health.
- `/actuator/prometheus`: runtime counters/timers and deployment diagnostics.
- `/version`: build identity (`commitSha`, `buildTime`).

3. Metric playbooks
-------------------

3.1 Spike in `smartiq.game.session.evicted.total`

What it means:
- Sessions are being removed by expiry or capacity pressure.

How to inspect:
```promql
sum by (reason) (rate(smartiq_game_session_evicted_total[5m]))
```

Common reasons and actions:
1. `reason="expired"`:
   - Verify `SMARTIQ_GAME_SESSION_RETENTION_MINUTES`.
   - Verify `SMARTIQ_GAME_SESSION_STORE` is `redis` in production.
   - If user sessions are expected to last longer, increase retention and redeploy.
2. `reason="capacity"`:
   - Verify `SMARTIQ_GAME_SESSION_MAX`.
   - Verify `SMARTIQ_GAME_SESSION_STORE` is `redis` in production.
   - Increase session capacity and redeploy.
   - Check traffic surge and rate-limit posture.

Validation after mitigation:
```promql
sum(rate(smartiq_game_session_evicted_total[15m]))
```
Trend must return to baseline.

3.2 Spike in `smartiq.game.action.rejected.total`

What it means:
- Client actions are being rejected before state mutation.

How to inspect:
```promql
sum by (reason) (rate(smartiq_game_action_rejected_total[5m]))
```

Action by dominant reason:
1. `invalid_action_token`, `unknown_action_actor`, `actor_not_active`:
   - Check client reconnect path and stale token usage.
   - Confirm websocket reconnect and `/api/rooms/{roomCode}/rejoin` behavior.
2. `duplicate_action_request`:
   - Check client idempotency/request-id behavior.
3. `invalid_request`, `invalid_payload`:
   - Check frontend request schema regressions.
4. `game_not_found`:
   - Correlate with session eviction spikes and retention/capacity settings.

Validation after mitigation:
```promql
sum(rate(smartiq_game_action_rejected_total[15m]))
```
Reject rate should normalize and active game completion should recover.

4. Dataset import and rollback
------------------------------

4.1 Validate current dataset gate state

1. Confirm startup summary includes threshold policy:
   - `failOnThreshold=<true|false>`
   - `belowThresholdCategoryCount=<n>`
2. Confirm metric:
   ```promql
   smartiq_dataset_category_below_threshold
   ```

4.2 Controlled dataset import

1. Confirm env:
   - `SMARTIQ_IMPORT_ENABLED=true`
   - `SMARTIQ_IMPORT_PATH` points to intended dataset.
   - `SMARTIQ_IMPORT_FAIL_ON_CATEGORY_THRESHOLD=true` for production.
2. Run migration checklist flow:
   - `docs/plans/migration-checklist.md`
3. Start backend and verify:
   - `/health` is `UP`
   - dataset below-threshold metric is acceptable (typically `0` for release gate).

4.3 Rollback if import or migration gate fails

1. Restore DB from latest pre-deploy snapshot (or fail over to standby).
2. Re-run Flyway migrate against restored schema (`cd backend && mvn -DskipTests=true flyway:migrate`).
3. Re-deploy last known good backend build.
4. Keep import gate enabled; do not bypass with relaxed threshold in production without explicit incident approval.

5. Outage reconnect and cleanup
-------------------------------

Goal:
- Restore room/game continuity and remove stale state after outage.

5.1 Reconnect flow

1. Ensure clients reconnect and call room rejoin endpoint.
2. `POST /api/rooms/{roomCode}/rejoin` now rotates `authToken` on success.
   - Client must replace cached token with returned token before next reconnect attempt.
3. On websocket close/error, `RoomWebSocketHandler` triggers `RoomWsGateway.unregister(session)` automatically.
4. Confirm reconnect metrics recover:
   ```promql
   sum(rate(smartiq_room_rejoin_total{result="success"}[5m]))
   sum(rate(smartiq_room_ws_connect_total{result="success"}[5m]))
   ```

5.2 Cleanup rerun steps

Cleanup is executed inside service flows. Trigger those flows intentionally after outage:
1. Trigger room cleanup loops via room APIs:
   ```bash
   curl -s -X POST "https://<backend-domain>/api/rooms" \
     -H "Content-Type: application/json" \
     -d "{\"displayName\":\"ops-cleanup\"}" > /dev/null
   ```
2. Trigger game cleanup loops via game APIs:
   ```bash
   curl -s -X POST "https://<backend-domain>/api/game" \
     -H "Content-Type: application/json" \
     -d "{\"players\":[\"ops-a\",\"ops-b\"],\"language\":\"en\"}" > /dev/null
   ```
3. Trigger card history cleanup loop:
   ```bash
   curl -s "https://<backend-domain>/api/cards/nextRandom?language=en&gameId=ops-cleanup" > /dev/null
   ```

5.3 Validate post-outage stability

1. `/health` remains `UP` for at least 15 minutes.
2. Success metrics exceed failure metrics for room join/rejoin/websocket connect.
3. `smartiq.game.action.rejected.total` and `smartiq.game.session.evicted.total` return to baseline.

6. Escalation and rollback decision
-----------------------------------

Escalate and prepare rollback when one or more conditions persist over 10 minutes:
- `/health` flaps or stays down
- websocket connect failures dominate successes
- action reject spikes block gameplay
- dataset threshold gate fails with production fail-on-threshold enabled

References
----------

- `docs/plans/deployment-checklist.md`
- `docs/plans/migration-checklist.md`
- `docs/observability.md`
- `ops/prometheus/smartiq-beta-kpi-alert-rules.yml`
- `.github/workflows/beta-go-no-go.yml`
