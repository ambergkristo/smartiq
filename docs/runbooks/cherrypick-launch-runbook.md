# CherryPick Launch Runbook

This runbook is the canonical operator flow for the current CherryPick production launch.

## Scope

This runbook applies to:

- `EN` launch
- public `PLAY`
- solo-first single-player runtime

This runbook does not certify:

- public `JOIN`
- public `HOST`
- host-led live room sessions
- public `/admin`
- tenant-runtime SaaS rollout
- ET public launch

## Owners

Before deploy, assign:

- rollout owner
- rollback owner
- pilot support owner

## Deploy sequence

1. Deploy backend with `SPRING_PROFILES_ACTIVE=prod`.
2. Confirm Redis-backed game and room session stores are active.
3. Deploy frontend with `VITE_API_BASE_URL` pointing to the backend.
4. Keep `VITE_ENABLE_ADMIN_CONSOLE=false`.

## Post-deploy verification

Required commands:

```powershell
$env:BACKEND_URL="https://<backend-domain>"
$env:FRONTEND_URL="https://<frontend-domain>"
$env:SMARTIQ_INTERNAL_API_KEY="<internal-api-key>"
npm run smoke:postdeploy
npm run smoke:ops
```

Canonical workflow:

- `.github/workflows/smoke-public.yml`

Do not call the deployment good until all of these are true:

- frontend loads
- backend solo smoke passes
- `/version` returns the expected build identity
- `/internal/pool-stats` is protected without key and reachable with key
- `/actuator/prometheus` is protected without key and reachable with key

The public smoke must prove the real solo path:

- `/api/topics` returns launchable topics
- `/api/cards/nextRandom` serves a playable deck
- `/api/game` creates a solo session
- `/api/game/{gameId}` returns the created session snapshot

## Pilot loop

Use a narrow pilot first:

- `5-10` real solo players
- desktop + mobile browser mix
- one named support owner monitoring the rollout window

Capture during pilot:

- runner alias
- player device/browser
- topic path used (`PLAY` direct or topic-select)
- whether the solo session created and the board rendered cleanly
- whether result -> back-home reflected updated daily/profile state
- whether replay from result/home stayed stable after refresh/reopen

## Rollback procedure

Trigger rollback when one of these persists beyond 10 minutes:

- `/health` is not `UP`
- solo session create/fetch failure rate stays elevated
- solo result or back-home progression sync is broadly broken
- post-deploy smoke fails and cannot be corrected quickly

Rollback steps:

1. Pause new launch traffic and stop active outreach.
2. Roll backend to the previous known-good Render deployment or previous known-good release SHA.
3. Roll frontend to the previous known-good Vercel deployment if the current frontend is part of the failure.
4. Re-run:
   - `npm run smoke:postdeploy`
   - `npm run smoke:ops`
5. Capture rollback evidence:
   - failed SHA
   - restored SHA
   - rollback timestamp
   - smoke command outputs
   - affected player/session list if known

## References

- `docs/release.md`
- `docs/deploy.md`
- `docs/observability.md`
- `docs/plans/deployment-checklist.md`
- `docs/plans/operational-runbook.md`
