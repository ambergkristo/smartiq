# Deployment Guide

This project uses:

- Frontend: Vercel
- Backend: Render (Spring Boot service)
- Database: Managed PostgreSQL (Render Postgres or external managed provider)

## 1. Backend (Render)

Create a new Web Service from this repository:

- Root directory: `backend`
- Build command: `mvn -q -DskipTests package`
- Start command: `mvn -q spring-boot:run`
- Optional infra file: `render.yaml` includes `healthCheckPath: /health`

Set environment variables:

- `SPRING_PROFILES_ACTIVE=prod`
- `APP_CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SMARTIQ_IMPORT_ENABLED=true`
- `SMARTIQ_IMPORT_PATH=../data/clean`
- `SMARTIQ_POOL_ENABLED=true`
- `MIN_BANK_SIZE=1000`
- `POOL_LOW_WATERMARK=800`
- `POOL_TARGET=1200`
- `SMARTIQ_SESSION_DEDUP_ENABLED=true`
- `SMARTIQ_SESSION_TTL_MINUTES=120`
- `SMARTIQ_SESSION_MAX=50000`
- `SMARTIQ_INTERNAL_ACCESS_ENABLED=true`
- `SMARTIQ_INTERNAL_API_KEY_HEADER=X-Internal-Api-Key`
- `SMARTIQ_INTERNAL_API_KEY=<strong-random-value>`

Health check endpoint:

- `/health`
- Dev-only CORS convenience (`localhost:*`, `127.0.0.1:*`) is profile-gated and not active in `prod`
- `/internal/*` now requires `X-Internal-Api-Key` in `prod`
- `/api/admin/*` is disabled in `prod` by profile
- Actuator in `prod` exposes only `health`, `info`, and `prometheus`

## 2. Frontend (Vercel)

Create a Vercel project from this repository:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set frontend environment variable:

- `VITE_API_BASE_URL=https://<your-backend-domain>`
- Optional alias: `VITE_BACKEND_URL=https://<your-backend-domain>`
- Team-facing var naming: `BACKEND_URL=https://<your-backend-domain>` (map to `VITE_*` in Vercel env)

Validate deployment env vars locally:

```bash
npm run validate:deploy-env
```

## 3. Post-deploy checks

1. `GET https://<backend-domain>/health` returns `{\"status\":\"UP\"}`.
2. Frontend loads topics from backend.
3. `/api/cards/nextRandom?language=en&gameId=smoke-deploy` works from deployed frontend domain without CORS errors.
4. `/internal/pool-stats` returns `401` without API key and `200` with API key.

Public smoke test command:

```bash
BACKEND_URL=https://<backend-domain> npm run smoke:test
```

## Key Rotation Runbook

1. Generate a new strong key value and store it in Render as `SMARTIQ_INTERNAL_API_KEY`.
2. Redeploy backend service (or trigger manual deploy) so new env var is active.
3. Update operational clients/monitoring checks to send the new `X-Internal-Api-Key`.
4. Validate:
   - `/health` still public `200`
   - `/internal/pool-stats` old key rejected (`401`)
   - `/internal/pool-stats` new key accepted (`200`)
5. Remove any old key references from local `.env` or secret managers.
