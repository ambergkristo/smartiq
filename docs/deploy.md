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

Set environment variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SMARTIQ_IMPORT_ENABLED=true`
- `SMARTIQ_IMPORT_PATH=../data/clean`
- `SMARTIQ_POOL_ENABLED=true`
- `SMARTIQ_POOL_MINIMUM_PER_KEY=1000`
- `SMARTIQ_POOL_LOW_WATERMARK_PER_KEY=800`
- `SMARTIQ_POOL_REFILL_TARGET_PER_KEY=1200`
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

## 3. Post-deploy checks

1. `GET https://<backend-domain>/health` returns `{\"status\":\"UP\"}`.
2. Frontend loads topics from backend.
3. `/api/cards/next` works from deployed frontend domain without CORS errors.
