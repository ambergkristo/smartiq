# Stability Closure Snapshot

Date: 2026-02-21

## Current State

- Smart10-like gameplay loop is implemented (board, turns, scoring, round flow).
- Random deck endpoint with anti-repeat policy is active (`/api/cards/nextRandom`).
- EN and ET locale packs exist with 1080 cards each and pass schema gates.
- ET pipeline has JSON summary output, smoke validation, and quality checklist coverage.
- Deprecated runtime sources are guarded out of card serving paths.

## Release-Candidate Readiness Gates

Required before RC cut:

1. `npm run qa:cards:quick`
2. `npm run validate:locale-packs`
3. `npm run score:cards:quality:ci`
4. `npm run score:cards:quality:ci:et`
5. `npm run verify:runtime:deck`
6. `mvn -q -f backend/pom.xml test`
7. `npm --prefix frontend test -- --run`

## Known Non-Blocking Operational Issue

- Vercel preview deployments are currently rate-limited in this repo environment.
- GitHub code checks (`build-and-test`, `lint-test-build`) remain the merge quality source of truth.

## Post-RC Backlog (Not Blocking)

- Expand ET linguistic polish pass-by-pass (wording consistency and idiomatic phrasing).
- Add broader script-level test coverage for pipeline edge branches.
- Optional: make Vercel preview non-required in branch protection for faster stacked PR throughput.
