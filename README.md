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

## API Endpoints

- `GET /api/topics`
- `GET /api/cards/next?topic=&difficulty=&sessionId=&lang=` (preferred)
- `GET /api/cards/random?topic=` (legacy/backward-compatible)

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

Data validation:

```bash
node tools/validate-cards.js data/clean
```

Content refresh pipeline (generate -> review -> validate):

```bash
npm run pipeline:cards
```

Scale generation target for runtime planning:

```bash
TARGET_PER_KEY=1000 npm run pipeline:cards
```

Question pool sizing (backend env vars):

```bash
SMARTIQ_POOL_ENABLED=true
SMARTIQ_POOL_MINIMUM_PER_KEY=1000
SMARTIQ_POOL_LOW_WATERMARK_PER_KEY=800
SMARTIQ_POOL_REFILL_TARGET_PER_KEY=1200
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
