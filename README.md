# SmartIQ / CherryPick

This repository is a mixed-state quiz game monorepo. The codebase still uses `SmartIQ` names for packages, environment variables, deployment files, and much of the multi-tenant host backend, while the frontend experience and current pivot docs brand the product as `CherryPick`. Today the repo contains a working CherryPick gameplay/runtime on top of SmartIQ foundations: a Spring Boot 3.4 backend, a React 18 + Vite frontend, curated JSON card datasets, and Node-based validation, content, and release tooling.

## First 10 Minutes

1. Install Java 21, Maven, Node.js LTS, and npm. Docker is only needed for the PostgreSQL-backed local path.
2. Run the root install:

   ```bash
   npm ci
   ```

3. Start the fastest local runtime:

   ```bash
   npm run dev:smoke
   ```

4. Open:
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:8081/health`
5. Read these entrypoints first:
   - `frontend/src/App.jsx`
   - `frontend/src/state/useServerGameEngine.ts`
   - `backend/src/main/java/com/smartiq/backend/game/GameSessionService.java`
   - `backend/src/main/java/com/smartiq/backend/config/CardImportRunner.java`
6. For product context, read `docs/cherrypick/PROJECT_PIVOT_NOTE.md`. For older SmartIQ strategy tracks, read `docs/archive/smartiq/`.

## Product Overview

### What exists now

- A CherryPick-branded frontend with three visible entry paths: `PLAY`, `JOIN`, and `HOST`.
- A server-authoritative quiz game loop backed by `POST /api/game`, `GET /api/game/{gameId}`, and `POST /api/game/{gameId}/action`.
- Room-code based live session support with HTTP create/join/rejoin flows and WebSocket room-state broadcasts.
- Local solo progression stored in browser storage (`cherrypick.playerProfile.v1`) with XP, levels, games played, and rounds won.
- Multi-tenant host runtime surfaces for onboarding, sign-in, branding, session templates, session review notes, subscription state, usage tracking, and billing checkout/webhook flows.

### Gameplay concept in plain English

CherryPick currently plays as a server-authoritative quiz round on an 8-answer board. A game session loads one board at a time, tracks the active player, reveals correct and wrong picks on the backend, and advances through rounds until a player reaches the win condition. In solo mode, successful rounds award XP; every 5th round is a `Cherry` round (`x2`) and every 10th round is a `Double Cherry` round (`x3`).

### Current implementation maturity

- `PLAY`: implemented and usable as the fastest local path.
- `JOIN`: implemented with room-code entry, preview, join, rejoin, and waiting-room flows.
- `HOST`: implemented, including room creation and hosted game launch; also connected to tenant/auth/billing/runtime workspace surfaces.
- White-label/admin operations: implemented enough to have real backend routes and a frontend admin console at `/admin`, but still named around SmartIQ white-label concepts.

### Product Direction

The pivot docs in `docs/cherrypick/` move the product away from the older SmartIQ recurring-host SaaS framing and toward a broader CherryPick game platform. That direction is only partially reflected in code right now.

Implemented or partially implemented in code:

- CherryPick branding in the main frontend experience.
- Solo XP and cherry multipliers.
- Join-code live sessions and host flows.

Present in docs but not fully implemented in runtime code:

- Couch mode.
- Daily challenge.
- Golden Cherry (`x1000`) rewards.
- Registered-account identity and leaderboard systems as first-class gameplay features.

Because of that split, the safest mental model is: the repo is currently CherryPick on the surface, SmartIQ in many internals, and not yet fully renamed or fully converged.

## Repository Structure

- `backend/`
  - Spring Boot application, REST/WebSocket runtime, Flyway migrations, Dockerfile, and Java tests.
  - Main entrypoint: `backend/src/main/java/com/smartiq/backend/SmartiqBackendApplication.java`
- `frontend/`
  - React + Vite client for CherryPick gameplay, live rooms, host workspace, and admin surfaces.
  - Main entrypoints: `frontend/src/main.jsx`, `frontend/src/App.jsx`
- `data/`
  - Runtime card datasets, raw/generated inputs, and review artifacts.
  - Key runtime files: `data/smart10/cards.en.json`, `data/smart10/cards.et.json`
- `docs/`
  - Product, deployment, runtime, data-quality, and operational documentation.
  - Current pivot docs: `docs/cherrypick/`
  - Archived SmartIQ plans: `docs/archive/smartiq/`
- `tools/`
  - Node scripts for validation, content pipeline, release checks, smoke tests, and reporting.
- `scripts/`
  - Runtime verification helpers such as `scripts/verify_runtime_deck.js`.
- `ops/`
  - Operational artifacts such as Prometheus beta KPI alert rules.
- `.github/workflows/`
  - CI, release-readiness, smoke, content refresh, and pilot/ops workflows.

## Architecture

### Backend

The backend is a Spring Boot 3.4 application with:

- REST controllers under `card`, `game`, `room`, `tenant`, and `web`.
- Spring Data JPA + Flyway for persistence and schema management.
- Optional Redis-backed stores for gameplay/session state, with in-memory defaults in non-production paths.
- Micrometer Prometheus metrics, explicit rate limiting, CORS configuration, and internal-access gating.

Key backend areas:

- `card/`
  - Dataset import, topic listing, deck selection, source filtering, and anti-repeat logic.
- `game/`
  - Server-authoritative session lifecycle, scoring, round transitions, action-token enforcement, and duplicate-action protection.
- `room/`
  - Room creation/join/rejoin/remove-player flows and WebSocket room broadcasts.
- `tenant/`
  - Onboarding, runtime auth, branding, settings, templates, review notes, subscription, billing, usage, audit, and admin operations.

### Frontend

The frontend is a Vite React app with:

- `src/App.jsx` as the main application shell and route switch.
- `src/api.js` as the HTTP gateway and contract normalization layer.
- `src/state/useServerGameEngine.ts` as the current server-authoritative gameplay engine.
- `src/components/home/` for CherryPick entry surfaces.
- `src/components/player/` and `src/components/room/` for join-code and room UX.
- `src/admin/` for the internal white-label admin console.

There is no Vite proxy configured. The frontend always talks to the backend through `VITE_API_BASE_URL`.

### Data Pipeline

The content pipeline is file-based:

- `data/raw/` stores raw or generated card inputs.
- `data/review/` stores review artifacts such as approved/flagged/report JSON files.
- `data/smart10/` stores the curated runtime datasets.
- `tools/build-content-pipeline.js` drives the generate -> review -> validate pipeline exposed as `npm run pipeline:cards`.

One important runtime distinction:

- Source datasets in `data/smart10/*.json` still contain 10 options per card.
- The CherryPick runtime normalizes imported cards down to 8 playable answers per board.

## Local Development

### Prerequisites

- Java 21
- Maven (`mvn`)
- Node.js LTS + npm
- Docker Desktop or another Docker engine if you want the PostgreSQL-backed local path
- `make` only if you want to use `make dev`

### Fastest local path: smoke runtime

This path does not need Docker or PostgreSQL.

```bash
npm ci
npm run dev:smoke
```

What it starts:

- Backend on `http://localhost:8081`
- Frontend on `http://localhost:5173`

Smoke runtime details:

- Backend uses the Spring `dev` profile.
- Database is in-memory H2.
- Frontend reads `frontend/.env.local`, which currently points `VITE_API_BASE_URL` at `http://localhost:8081`.

### PostgreSQL-backed local runtime

Use this when you want the `local` Spring profile instead of the in-memory smoke path.

```bash
docker compose up -d
npm run dev:all
```

Equivalent shortcut where `make` is available:

```bash
make dev
```

What it starts:

- PostgreSQL 16 on `localhost:5432`
- Backend on `http://localhost:8081`
- Frontend on `http://localhost:5173`

### Useful local endpoints

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8081/health`
- Backend version: `http://localhost:8081/version`
- Prometheus metrics: `http://localhost:8081/actuator/prometheus`
- Topics API: `http://localhost:8081/api/topics`

## Environment and Configuration

### Required to understand

- `frontend/.env.local`
  - Auto-read by Vite.
  - Currently sets `VITE_API_BASE_URL=http://localhost:8081`.
- `VITE_API_BASE_URL`
  - Required for the frontend and admin console.
  - Frontend builds are intentionally blocked when this value is missing, invalid, or points at localhost for deployment builds.
- Root `.env.example`
  - Exists as a reference file.
  - Current npm/Maven dev commands do not automatically load `.env`.

### Backend profile behavior

- `dev` profile (`npm run dev:backend:smoke`)
  - H2 in-memory database
  - backend on `:8081`
- `local` profile (`npm run dev:backend`)
  - PostgreSQL at `localhost:5432`
  - backend on `:8081`
- `prod` profile
  - explicit datasource required
  - stricter CORS and internal-access behavior
  - game session store defaults to Redis (`SMARTIQ_GAME_SESSION_STORE=redis`)

### Dataset import behavior

- Default backend import path in `application.yml` is `classpath:data/cards.en.json`.
- If you want the backend to import from the repo dataset directory instead, export:

  ```bash
  SMARTIQ_IMPORT_PATH=../data/smart10
  ```

- Import can be disabled with `SMARTIQ_IMPORT_ENABLED=false`.

### Deployment-critical variables

- Backend:
  - `SPRING_PROFILES_ACTIVE=prod`
  - `SPRING_DATASOURCE_URL`
  - `SPRING_DATASOURCE_USERNAME`
  - `SPRING_DATASOURCE_PASSWORD`
  - `APP_CORS_ALLOWED_ORIGINS` or `SMARTIQ_CORS_ALLOWED_ORIGIN_PUBLIC`
  - `SMARTIQ_INTERNAL_ACCESS_ENABLED=true`
  - `SMARTIQ_INTERNAL_API_KEY`
- Frontend:
  - `VITE_API_BASE_URL=https://<backend-domain>`

### Optional but important operational knobs

These are defined in `.env.example` and/or `application.yml`:

- Pool sizing and low-bank behavior
- Session retention and store selection
- Room retention and store selection
- Rate-limit thresholds
- Billing provider and webhook settings
- Build metadata (`SMARTIQ_BUILD_SHA`, `SMARTIQ_BUILD_TIME`)

### ET locale note

The repo contains a full ET dataset and ET-related validation workflows, but the current import runner only activates `en` cards at runtime. Treat ET as validated content work, not as a fully active runtime locale.

## Testing and Quality Gates

### Core local checks

Backend:

```bash
mvn -q -f backend/pom.xml test
```

Frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run test -- --run
npm --prefix frontend run build
```

Repository gate:

```bash
npm run gate:local
```

Release-readiness gate:

```bash
npm run release:check
```

### Data/content checks

Checks aligned with current CI/release workflows:

```bash
npm run validate:cards:et
npm run validate:locale-packs
npm run score:cards:quality
npm run score:cards:quality:et
npm run test:golden
```

Stricter CherryPick dataset/import-path audit:

```bash
npm run validate:cards:cherrypick
```

Important note:

- In the current repo snapshot this command fails, because `tools/validate_cherrypick_dataset.js` expects `application.yml` to import from `../data/smart10/cards.en.json`, while the committed backend config still defaults to `classpath:data/cards.en.json`.

Content pipeline:

```bash
npm run pipeline:cards
```

Runtime deck verification:

```bash
npm run verify:runtime:deck
```

### CI workflows in the repo

Primary CI and release workflows:

- `.github/workflows/backend-ci.yml`
- `.github/workflows/frontend-ci.yml`
- `.github/workflows/release-readiness.yml`

Operational and content workflows:

- `.github/workflows/content-refresh.yml`
- `.github/workflows/smoke-public.yml`
- `.github/workflows/runtime-smoke-et.yml`
- `.github/workflows/beta-go-no-go.yml`
- `.github/workflows/phase7-beta-dry-run.yml`
- `.github/workflows/recurring-host-pilot-seed.yml`
- `.github/workflows/recurring-host-pilot-capture.yml`

What should pass before merge:

- At minimum, the checks covered by `npm run gate:local`.
- Prefer running `npm run release:check` before opening or merging a substantial PR.

## Gameplay and Runtime Notes

### Current gameplay loop

- The current gameplay engine is server-authoritative.
- Games are created through `POST /api/game`.
- Actions are limited to `ANSWER` and `ADVANCE`.
- `PASS` is not part of the current CherryPick server-action contract.
- Default win condition is `30`.
- A round ends in success when all correct answers on the current 8-answer board are revealed.
- A round ends in failure when the active player picks a wrong answer.

### Card selection behavior

`GET /api/cards/nextRandom` is the current deck-selection API.

Verified behavior from code:

- Tracks recent history per `gameId`
- Avoids immediate category repeats when alternatives exist
- Avoids immediate topic repeats when alternatives exist
- Avoids repeating recent card IDs from the last 20 draws when alternatives exist
- Relaxes constraints in this order when the pool is tight:
  1. card ID
  2. topic
  3. category
- Falls back from the requested language to `en` if the requested language pool is empty and the request language is not already `en`

### Room/runtime behavior

- Room codes are six characters long.
- Rejoin is HTTP-first: `POST /api/rooms/{roomCode}/rejoin` returns the latest snapshot and rotates the auth token.
- WebSocket is broadcast-only and used for room-state updates.
- Client gameplay actions are submitted over HTTP, not WebSocket.

### Legacy APIs

The older `/api/cards/random` and `/api/cards/next` endpoints still exist for compatibility, but `nextRandom` is the current public draw path and legacy endpoints are retired in `prod`.

## Data and Content Quality

### Where the card data lives

- Canonical curated datasets:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Golden fixture:
  - `data/smart10/golden/golden.dataset.json`
- Raw inputs:
  - `data/raw/`
- Review outputs:
  - `data/review/`

### What is currently in the committed datasets

- `cards.en.json`: 1080 cards
- `cards.et.json`: 1080 cards
- Distribution in both locales: `6 topics x 6 categories x 30 cards`
- Current committed source tag: `smartiq-v2`

### What the runtime actually imports

The current import runner does not expose the entire dataset as-is.

Runtime-active today:

- Language: `en`
- Categories:
  - `TRUE_FALSE`
  - `NUMBER`
  - `CENTURY_DECADE`
  - `COLOR`
  - `OPEN`

Present in dataset and validators but not activated by the current import runner:

- `ORDER`
- `et`

### Source restrictions

Only these card sources are considered runtime-allowed:

- `smartiq-v2`
- `smartiq-human`
- `smartiq-verified`

Deprecated sources such as `smartiq-factory` and earlier generator tags are excluded from live selection.

## Deployment

The committed deployment story is documented, not fully automated end-to-end.

Verified repo assets:

- `backend/Dockerfile`
- `render.yaml`
- `docs/deploy.md`

Documented deployment target:

- Frontend on Vercel
- Backend on Render
- Managed PostgreSQL

Important honesty notes:

- The repo includes Render configuration, but no committed Vercel config file.
- The frontend is deployed separately from the backend and must be pointed at a public backend URL through `VITE_API_BASE_URL`.
- Production health endpoint is `/health`.

Useful deployment commands and checks:

```bash
npm run validate:deploy-env
npm run smoke:test
npm run smoke:postdeploy
```

## Current Status

### Stable now

- Spring Boot backend + React frontend monorepo is wired and runnable through the documented local scripts.
- CherryPick-branded home/play/join/host frontend exists.
- Server-authoritative game sessions and room-code flows are implemented.
- Dataset validation, release-readiness, and deployment-check tooling exist and are wired into CI.

### In progress

- Product naming consolidation from SmartIQ to CherryPick.
- Alignment between CherryPick gameplay direction and older SmartIQ host/white-label infrastructure.
- Documentation cleanup across active docs, plans, and archived material.

### Known gaps

- The repo still has conflicting naming and roadmap sources.
- `docs/plans/README.md`, `CONTRIBUTING.md`, and the PR template still reference SmartIQ plans that are now archived or missing from `docs/plans/`.
- ET content is heavily validated in CI, but current runtime import remains EN-only.
- Older SmartIQ/Smart10-era documentation still describes 10-answer behavior in places, while the current CherryPick runtime plays on 8-answer boards.
- The current repository snapshot does not pass `npm run gate:local` cleanly; backend tests are failing.
- `npm run validate:cards:cherrypick` is currently red because the validator and committed import-path configuration disagree.

## Troubleshooting

### Frontend starts but cannot reach the backend

- Check `frontend/.env.local` or your exported `VITE_API_BASE_URL`.
- The frontend does not use a Vite proxy.
- The admin console at `/admin` also requires `VITE_API_BASE_URL`.

### Backend health stays `DOWN`

- `GET /health` runs a database query.
- On the PostgreSQL-backed local path, make sure `docker compose up -d` is running.
- If you want to avoid PostgreSQL entirely, use `npm run dev:smoke`.

### You expected cards from `data/smart10`, but the backend is serving something else

- Default import source is `classpath:data/cards.en.json`.
- Export `SMARTIQ_IMPORT_PATH=../data/smart10` before starting the backend if you want the repo dataset directory to drive imports.

### Ports do not match older docs or `.env.example`

- Current npm dev scripts run the backend on `8081`.
- The frontend prefers `5173` but can move if the port is busy (`strictPort: false` in `vite.config.js`).

### Dataset or CI failures appear to be about ET even when you are working on EN runtime behavior

- That is expected in this repo.
- ET locale packs are part of the validation surface in CI even though the runtime importer is currently EN-only.

## Contribution Workflow

- Create a feature branch from `main`.
- Make focused changes and run the relevant local checks.
- Use `npm run gate:local` for the standard local gate.
- Use `npm run release:check` before merging more substantial work.
- Open a PR with the existing template in `.github/pull_request_template.md`.

Important contributor note:

- `CONTRIBUTING.md` and some plan indexes still point at SmartIQ milestone docs that are now archived or missing from their original paths.
- For current product direction, start with `docs/cherrypick/`.
- For historical SmartIQ context, use `docs/archive/smartiq/`.

## License and Notes

- No `LICENSE` file is committed at the repository root.
- Until the repository owner adds one, treat licensing as undefined from the repo itself.
