# Release Checklist

Use this checklist before calling the current build "playable now".

## 1. Local Gate (must pass first)

Run from repo root:

```powershell
npm run gate:local
```

Canonical local gate commands and aliases:

- `docs/local-gate.md`

Expected:

- all commands exit `0`
- no failing tests

## 2. Local Runtime Gate

```powershell
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

```powershell
$env:BACKEND_URL="https://<backend-domain>"; npm run smoke:test
# local example
# $env:BACKEND_URL="http://localhost:8080"; npm run smoke:test
```

The smoke test must validate:

- `GET /health` -> `200`
- `GET /api/topics` -> `200` + non-empty array
- `GET /api/cards/nextRandom?language=en&gameId=smoke` -> `200` + card schema

## 4. ET Release Gate

Run from repo root:

```powershell
## single-command gate
$env:BACKEND_URL="http://localhost:8081"; npm run gate:et:release

## equivalent explicit steps
node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0
node tools/validate_locale_packs.js data/smart10
node tools/audit_locale_coverage.js data/smart10 --required=en,et --min-per-combo=30
node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80
$env:BACKEND_URL="http://localhost:8081"; npm run report:et:runtime
```

Expected:

- all ET commands exit `0`
- generated runtime report exists under `docs/reports/et-runtime-smoke-*.md`
- report summary status is `PASS`

## 5. Public Deployment Gate

- Frontend (Vercel) live and points to backend via `VITE_API_BASE_URL`.
- Backend (Render) live with `SPRING_PROFILES_ACTIVE=prod`.
- CORS allows only expected frontend origin(s).
- `/version` returns commit SHA and build time.

## 6. Security Gate

- `/health`, `/api/topics`, `/api/cards/nextRandom` are publicly accessible.
- `/internal/*` returns `401` without internal API key in `prod`.
- `/api/admin/*` is disabled or protected in `prod`.
- Prod actuator exposure is limited as documented in `docs/deploy.md`.

## 7. Content/Refresh Gate

- `npm run test:golden` passes.
- Monthly content refresh workflow remains green and PR-capable.

## Go / No-Go

- `GO`: all seven gates pass.
- `NO-GO`: any gate fails; fix in follow-up PR and rerun checklist.
