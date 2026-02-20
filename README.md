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

Trusted local path (from repo root):

1. Create env file:
   - `cp .env.example .env` (macOS/Linux)
   - `Copy-Item .env.example .env` (PowerShell)
2. Install dependencies:
   - `npm ci`
   - `npm --prefix frontend ci`
3. Start local database:
   - `docker compose up -d`
4. Run the stack:
   - `make dev`

## One-Command Dev Run

Primary command (single source of truth):

```bash
make dev
```

Equivalent command chain (if `make` is unavailable):

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

## Windows Quickstart (8081 + 5173)

PowerShell commands from repo root:

```powershell
npm ci
npm --prefix frontend ci
docker compose up -d
npm run dev:smoke
```

This starts:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8081`
- Health check: `http://localhost:8081/health`
- Cards API: `http://localhost:8081/api/cards/next`

If you use frontend against backend on `8081`, set:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8081"
```

## Local Dev Port and CORS Behavior

- Vite prefers port `5173` but can move to another free localhost port when `5173` is busy.
- Backend dev CORS accepts localhost origins on any port:
  - `http://localhost:*`
  - `http://127.0.0.1:*`
- Production CORS stays strict and must use explicit `APP_CORS_ALLOWED_ORIGINS` values.

Optional Windows helpers to free common dev ports:

```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

Frontend API base URL examples:

```powershell
# local backend
$env:VITE_API_BASE_URL="http://localhost:8080"
# render backend
$env:VITE_API_BASE_URL="https://<your-backend-domain>"
```

## API Endpoints

- `GET /api/topics`
- `GET /api/cards/nextRandom?language=&gameId=&topic=` (preferred)
- `GET /api/cards/next?topic=&difficulty=&sessionId=&lang=` (legacy/custom mode)
- `GET /api/cards/random?topic=` (legacy/backward-compatible)

## Game Flow v1

- Start screen allows selecting `topic`, `difficulty` (1-3), `language`, round length, and player names.
- Game board fetches cards from `GET /api/cards/next` and renders 10 answer tiles.
- Players use `ANSWER -> LOCK IN` or `PASS`, then continue with `NEXT`.
- Round rotates turns by player and shows a summary after the configured card count.
- Full UI/state-machine reference: `docs/ui.md`.

## Validation Commands

Backend tests (repo root):

```bash
mvn -q -f backend/pom.xml test
```

Frontend lint/test/build (repo root):

```bash
npm --prefix frontend run lint
npm --prefix frontend run test -- --run
npm --prefix frontend run build
```

Data validation:

```bash
node tools/validate_cards_v2.js data/smart10/cards.en.json
```

Dataset quality score (warning gate):

```bash
node tools/score_cards_quality.js data/smart10/cards.en.json
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

Public/local smoke test:

```bash
BACKEND_URL=https://<backend-domain> npm run smoke:test
# local backend example:
BACKEND_URL=http://localhost:8080 npm run smoke:test
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

Runtime deck verification:

```bash
node scripts/verify_runtime_deck.js
```

## Data Pipeline

- Raw card inputs live in `data/raw/`.
- QA-approved card inputs live in `data/clean/`.
- Backend boot import scans JSON files from `data/clean` and `out` by default.
- You can override import sources with `SMARTIQ_IMPORT_PATH` (comma-separated paths).
- Pipeline details: `docs/data-pipeline.md`
- Dataset quality guardrails: `docs/dataset-quality.md`

## CI

- Backend workflow: `mvn -q test` + package build.
- Frontend workflow: `npm ci` + `npm run lint` + `npm run build`.
