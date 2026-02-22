# Release Checklist

Use this checklist before calling the current build "playable now".

## 1. Local Gate (must pass first)

Run from repo root:

```bash
npm --prefix frontend run lint
npm --prefix frontend run test -- --run
npm --prefix frontend run build
mvn -q -f backend/pom.xml test
```

Expected:

- all commands exit `0`
- no failing tests

## 2. Local Runtime Gate

```bash
docker compose up -d
make dev
```

Verify manually:

1. Setup screen renders and topic list loads.
2. Start a game with at least 2 players.
3. Card loads with 10 answer tiles.
4. `ANSWER -> LOCK IN` works.
5. `PASS` works and turn advances.
6. Round summary appears and `NEXT ROUND` loads another card.

## 3. Backend Smoke Gate (public or local)

```bash
BACKEND_URL=https://<backend-domain> npm run smoke:test
# local example
# BACKEND_URL=http://localhost:8080 npm run smoke:test
```

The smoke test must validate:

- `GET /health` -> `200`
- `GET /api/topics` -> `200` + non-empty array
- `GET /api/cards/nextRandom?language=en&gameId=smoke` -> `200` + card schema

## 4. Public Deployment Gate

- Frontend (Vercel) live and points to backend via `VITE_API_BASE_URL`.
- Backend (Render) live with `SPRING_PROFILES_ACTIVE=prod`.
- CORS allows only expected frontend origin(s).
- `/version` returns commit SHA and build time.

## 5. Security Gate

- `/health`, `/api/topics`, `/api/cards/nextRandom` are publicly accessible.
- `/internal/*` returns `401` without internal API key in `prod`.
- `/api/admin/*` is disabled or protected in `prod`.
- Prod actuator exposure is limited as documented in `docs/deploy.md`.

## 6. Content/Refresh Gate

- `npm run test:golden` passes.
- Monthly content refresh workflow remains green and PR-capable.

## Go / No-Go

- `GO`: all six gates pass.
- `NO-GO`: any gate fails; fix in follow-up PR and rerun checklist.
