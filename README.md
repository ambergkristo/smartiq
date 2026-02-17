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
- Docker (optional, if local dependencies are containerized)

## Local Setup

1. Clone the repository.
2. Copy environment template:
   - `cp .env.example .env` (macOS/Linux)
   - `Copy-Item .env.example .env` (PowerShell)
3. Install dependencies:
   - Backend: `cd backend && mvn -q -DskipTests compile`
   - Frontend: `cd frontend && npm ci`

## One-Command Dev Run

- Preferred: `npm run dev:all`
- Alternative (if Make is available): `make dev`

The `dev:all` command currently validates that both workspaces are present and is intended as the monorepo entrypoint.

## CI

- Backend workflow runs Maven tests and build.
- Frontend workflow runs npm install, lint, and build.

## Contributing

See `CONTRIBUTING.md` for branch, validation, and PR expectations.
