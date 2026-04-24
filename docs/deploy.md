# Deployment Guide

This guide covers the current CherryPick production deployment shape.

## 1. Launch scope

Public production deployment is scoped to the CherryPick solo runtime:

- `PLAY`
- `EN` only by default

Keep these surfaces out of the public launch unless they are separately hardened:

- `JOIN`
- `HOST`
- `/admin`
- recurring-host billing/auth rollout
- ET public rollout

## 2. Backend

Expected backend platform:

- Render or equivalent Spring Boot host
- managed PostgreSQL
- Redis for game and room session stores

Set environment variables:

- `SPRING_PROFILES_ACTIVE=prod`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>`
- `SMARTIQ_IMPORT_ENABLED=true`
- `SMARTIQ_IMPORT_PATH=../data/smart10`
- `SMARTIQ_GAME_SESSION_STORE=redis`
- `SMARTIQ_ROOM_SESSION_STORE=redis`
- `SMARTIQ_INTERNAL_ACCESS_ENABLED=true`
- `SMARTIQ_INTERNAL_API_KEY_HEADER=X-Internal-Api-Key`
- `SMARTIQ_INTERNAL_API_KEY=<strong-random-value>`
- `SMARTIQ_BUILD_SHA=<commit-sha>`
- `SMARTIQ_BUILD_TIME=<utc-build-time>`

Production backend contract:

- `/health` is public
- `/version` is public
- `/internal/*` requires the internal API key
- `/actuator/prometheus` requires the internal API key
- prod actuator exposure remains limited to `health`, `info`, and `prometheus`

## 3. Frontend

Expected frontend platform:

- Vercel

Set environment variables:

- `VITE_API_BASE_URL=https://<your-backend-domain>`
- `VITE_ENABLE_ADMIN_CONSOLE=false`
- `VITE_ENABLE_ET=false`

Frontend deployment contract:

- public build is blocked if `VITE_API_BASE_URL` is missing, invalid, or points to localhost
- admin console stays disabled unless explicitly enabled in an internal environment

## 4. Post-deploy verification

Required commands:

```powershell
$env:BACKEND_URL="https://<backend-domain>"
$env:FRONTEND_URL="https://<frontend-domain>"
$env:SMARTIQ_INTERNAL_API_KEY="<internal-api-key>"
npm run smoke:postdeploy
npm run smoke:ops
```

The post-deploy smoke now verifies the narrow solo path directly:

- frontend shell responds with HTML
- `/api/topics` returns launchable topics
- `/api/cards/nextRandom` serves a playable EN deck
- `/api/game` creates a solo session
- `/api/game/{gameId}` fetches the created session snapshot

The ops smoke verifies:

- `/version` returns build identity
- `/internal/pool-stats` is `401` without key and `200` with key
- `/actuator/prometheus` is `401` without key and `200` with key

Canonical workflow:

- `.github/workflows/smoke-public.yml`

## 5. Rollback reference

Use the step-by-step rollback flow in:

- `docs/runbooks/cherrypick-launch-runbook.md`
