# CherryPick Launch Runbook

This runbook is the canonical operator flow for the current CherryPick production launch.

## Scope

This runbook applies to:

- `EN` launch
- public `PLAY`, `JOIN`, and `HOST`
- host-led live room sessions

This runbook does not certify:

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
- backend smoke passes
- `/version` returns the expected build identity
- `/internal/pool-stats` is protected without key and reachable with key
- `/actuator/prometheus` is protected without key and reachable with key

## Pilot loop

Use a narrow pilot first:

- `3-5` real hosts
- desktop + mobile browser mix
- one named support owner monitoring the rollout window

Capture during pilot:

- room code
- host device/browser
- whether session launched successfully
- whether room stayed resumable after refresh/reopen
- whether any player was incorrectly allowed into a live room

## Rollback procedure

Trigger rollback when one of these persists beyond 10 minutes:

- `/health` is not `UP`
- room create/join/rejoin failure rate stays elevated
- live host launch cannot start or resume broadly
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
   - affected host/session list if known

## References

- `docs/release.md`
- `docs/deploy.md`
- `docs/observability.md`
- `docs/plans/deployment-checklist.md`
- `docs/plans/operational-runbook.md`
