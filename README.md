# smartiq

Monorepo for SmartIQ services and tooling.

## Repository Layout

- `backend/`
- `frontend/`
- `docs/`
- `data/raw/`
- `data/clean/`
- `tools/`

## Prerequisites

- JDK 21
- Node.js LTS (with npm)
- Docker (for PostgreSQL during local runtime)

## Local Setup

1. Clone repository and create environment file:
   - `cp .env.example .env` (macOS/Linux)
   - `Copy-Item .env.example .env` (PowerShell)
2. Install frontend and root dependencies:
   - `npm ci`
   - `cd frontend && npm ci && cd ..`
3. Optional backend verification:
   - `cd backend && mvn -q test && cd ..`

## One-Command Dev Run

Primary command:

```bash
make dev
```

Equivalent command chain:

```bash
docker compose up -d
npm run dev:all
```

Endpoints:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080/api`
- Backend health: `http://localhost:8080/health`
- Backend version: `http://localhost:8080/version`
- Backend metrics: `http://localhost:8080/actuator/prometheus`
- Internal pool stats: `http://localhost:8080/internal/pool-stats`

## API Endpoints

- `GET /api/topics`
- `GET /api/cards/next?topic=&difficulty=&sessionId=&lang=` (preferred)
- `GET /api/cards/random?topic=` (legacy/backward-compatible)

## Game Flow v1

- Start screen allows selecting `topic`, `difficulty` (1-3), `language`, round length, and player names.
- Game board fetches cards from `GET /api/cards/next` and renders 10 answer tiles.
- Players use `ANSWER -> LOCK IN` or `PASS`, then continue with `NEXT`.
- Round rotates turns by player and shows a summary after the configured card count.
- Full UI/state-machine reference: `docs/ui.md`.

## Validation Commands

Backend tests:

```bash
cd backend
mvn -q test
```

Frontend lint/build:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Frontend tests:

```bash
cd frontend
npm run test -- --run
```

Data validation:

```bash
node tools/validate-cards.js data/clean
```

Content refresh pipeline (generate -> review -> validate):

```bash
npm run pipeline:cards
```

Review artifact summary:

```bash
npm run review:summary
```

Golden dataset validation:

```bash
npm run test:golden
```

Scale generation target for runtime planning:

```bash
TARGET_PER_KEY=1000 npm run pipeline:cards
```

Load test (500 sessions / 10k requests default):

```bash
npm run load:test
```

Public smoke test:

```bash
BACKEND_URL=https://<backend-domain> npm run smoke:test
```

Stability gate (production readiness check):

```bash
npm run stability:gate
```

Monthly scheduler:

- GitHub Actions workflow: `.github/workflows/content-refresh.yml`
- Schedule: first day of each month at 03:00 UTC

## Public Deployment

Deployment target for MVP:

- Frontend: Vercel
- Backend: Render
- Database: Managed Postgres

Detailed steps: `docs/deploy.md`
Release gate checklist: `docs/release.md`

Observability reference: `docs/observability.md`

Question pool sizing (backend env vars):

```bash
SMARTIQ_POOL_ENABLED=true
MIN_BANK_SIZE=1000
POOL_LOW_WATERMARK=800
POOL_TARGET=1200
SMARTIQ_BLOCK_ON_LOW_BANK=false
SMARTIQ_TRIGGER_PIPELINE_ON_LOW_BANK=false
```

Session de-duplication (per sessionId):

```bash
SMARTIQ_SESSION_DEDUP_ENABLED=true
SMARTIQ_SESSION_TTL_MINUTES=120
SMARTIQ_SESSION_MAX=50000
```

Manual e2e checklist script:

```bash
bash tools/manual-e2e.sh
```

## Data Pipeline

- Raw card inputs live in `data/raw/`.
- QA-approved card inputs live in `data/clean/`.
- Import consumes only files from `data/clean/`.
- Pipeline details: `docs/data-pipeline.md`

## CI

- Backend workflow: `mvn -q test` + package build.
- Frontend workflow: `npm ci` + `npm run lint` + `npm run build`.
