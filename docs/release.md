# Release Checklist

Use this checklist before calling the current CherryPick build production-ready.

## Current launch scope

This checklist is for the narrow CherryPick launch path only:

- language: `EN`
- public flow: `PLAY`
- runtime: solo-first single-player launch
- out of scope for this launch:
  - public `JOIN`
  - public `HOST`
  - host-led live room launch
  - public `/admin`
  - tenant onboarding/auth/billing rollout
  - ET public rollout

## 1. Local gate

Run from repo root:

```powershell
npm run gate:local
```

Canonical local gate commands and aliases:

- `docs/local-gate.md`

Expected:

- all commands exit `0`
- no failing tests

## 2. Local runtime gate

```powershell
docker compose up -d
make dev
```

Verify manually:

1. Home renders and topics load.
2. `PLAY` starts a solo round directly from home.
3. Topic select launches a filtered solo round.
4. Solo board renders with `8` answer tiles.
5. Result screen shows XP/profile progression and replay controls.
6. Daily challenge returns home with updated daily/profile state.
7. No `PASS` action is shown anywhere in the CherryPick runtime.

## 3. Backend smoke gate

```powershell
$env:BACKEND_URL="https://<backend-domain>"; npm run smoke:test
# local example
# $env:BACKEND_URL="http://localhost:8080"; npm run smoke:test
```

The smoke test must validate:

- `GET /health` -> `200`
- `GET /api/topics` -> `200` + non-empty array
- `GET /api/cards/nextRandom?language=en&gameId=smoke` -> `200` + card schema
- `POST /api/game` -> `200` + solo session snapshot + action tokens
- `GET /api/game/{gameId}` -> `200` + matching session snapshot

## 4. Optional ET rollout gate

Run this only when ET launch is intentionally in scope.

```powershell
$env:BACKEND_URL="http://localhost:8081"; npm run gate:et:release
```

ET rollout requirements:

- ET dataset coverage and quality gates pass.
- ET runtime smoke passes.
- feature flags are enabled explicitly:
  - frontend: `VITE_ENABLE_ET=true`
  - backend: `SMARTIQ_LANGUAGE_ET_ENABLED=true`

Default narrow launch posture:

- frontend: `VITE_ENABLE_ET=false`
- backend: `SMARTIQ_LANGUAGE_ET_ENABLED=false`

## 5. Public deployment gate

- Frontend (Vercel) is live and points to backend via `VITE_API_BASE_URL`.
- Backend (Render or equivalent) is live with `SPRING_PROFILES_ACTIVE=prod`.
- `SMARTIQ_ROOM_SESSION_STORE=redis` is active in production.
- CORS allows only expected frontend origin(s).
- `/version` returns commit SHA and build time.
- `/internal/pool-stats` returns `401` without internal API key.
- `/actuator/prometheus` returns `401` without internal API key.

Required verification:

```powershell
$env:BACKEND_URL="https://<backend-domain>"
$env:FRONTEND_URL="https://<frontend-domain>"
$env:SMARTIQ_INTERNAL_API_KEY="<internal-api-key>"
npm run smoke:postdeploy
npm run smoke:ops
```

Canonical workflow:

- `.github/workflows/smoke-public.yml`

The public smoke is only good when it proves the actual solo launch path, not just static frontend reachability.

## 6. Security gate

- `/health`, `/version`, `/api/topics`, and `/api/cards/nextRandom` remain public.
- `/api/game` and `/api/game/*` remain public for the solo runtime.
- `/internal/*` requires the internal API key in `prod`.
- `/actuator/prometheus` requires the internal API key in `prod`.
- `/api/admin/*` is not part of the public CherryPick launch path.
- public frontend keeps `VITE_ENABLE_ADMIN_CONSOLE=false`.

## 7. Content gate

- `npm run test:golden` passes.
- content refresh workflow remains green and PR-capable.

## Go / No-Go

- `GO`: all seven gates pass for the scoped launch above.
- `NO-GO`: any gate fails; fix in follow-up PR and rerun the checklist.
