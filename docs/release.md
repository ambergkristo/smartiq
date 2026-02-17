# Release Checklist

Use this checklist before marking SmartIQ MVP public release as stable.

## Build and CI

- [ ] Backend CI green (`mvn -q test` + build).
- [ ] Frontend CI green (`npm ci`, `npm run lint`, `npm run build`).
- [ ] Smoke workflow green against deployed backend URL.

## Runtime and Gameplay

- [ ] `make dev` starts backend + frontend locally.
- [ ] Start screen loads topics and allows topic/difficulty/language selection.
- [ ] Full round is playable to summary view (Reveal, Pass, Next card).
- [ ] Session requests use `/api/cards/next` and avoid duplicates per session.

## Content Ops

- [ ] `npm run pipeline:cards` succeeds with guardrails.
- [ ] `npm run test:golden` passes.
- [ ] Monthly refresh workflow creates PR with review artifact summary and duplicates report.

## Security and Access

- [ ] Public endpoints verified: `/health`, `/api/topics`, `/api/cards/next`.
- [ ] `/internal/*` returns `401` without API key in prod.
- [ ] `/api/admin/*` is not available in prod profile.
- [ ] Actuator is limited in prod to `health`, `info`, `prometheus`.
- [ ] `SMARTIQ_INTERNAL_API_KEY` rotation runbook tested.

## Deployment

- [ ] Frontend live on Vercel with `VITE_API_BASE_URL` set.
- [ ] Backend live on Render with Postgres and `SPRING_PROFILES_ACTIVE=prod`.
- [ ] CORS allows only deployed frontend domain in prod.
- [ ] `/version` returns commit SHA and build time.
