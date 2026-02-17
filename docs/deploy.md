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
- `SMARTIQ_CORS_ALLOWED_ORIGIN_PUBLIC=https://<your-vercel-domain>`
- `SMARTIQ_CORS_ALLOWED_ORIGIN_LOCAL=http://localhost:5173`

Health check endpoint:

- `/health`

## 2. Frontend (Vercel)

Create a Vercel project from this repository:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set frontend environment variable:

- `VITE_API_BASE_URL=https://<your-backend-domain>`

Validate deployment env vars locally:

```bash
npm run validate:deploy-env
```

## 3. Post-deploy checks

1. `GET https://<backend-domain>/health` returns `{\"status\":\"UP\"}`.
2. Frontend loads topics from backend.
3. `/api/cards/next` works from deployed frontend domain without CORS errors.
