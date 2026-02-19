# Compound Rules

## Git and PR

- Do use only `feat/*`, `fix/*`, `chore/*` branches.
- Do include `(#issue)` in every commit message.
- Do open PRs to `main` only.
- Do merge PRs only after CI passes.
- Do request reviewer assignment immediately for protected branches.
- Do not commit directly to `main`.
- Do not force-push `main`.
- Do not rewrite history of merged PRs.

## CI and Secrets

- Do keep CI enabled on every PR.
- Do run backend and frontend checks before merge.
- Do keep real secrets and API keys out of git.
- Do maintain `.env.example` with placeholder values only.
- Do require fallback paths for any cache/pool-dependent API route.

## Compound Loop

- After every merged PR, update `docs/compound/lessons.md`.
- After every merged PR, update `docs/compound/rules.md`.
- In every PR description, include:
  - what was hard
  - what broke
  - the rule to prevent it next time
- For session-dedup APIs, include tests that make repeated requests for the same session and assert non-duplication.
- Treat compound-update PR merge as a required gate before starting the next feature branch.
- When `git pull --ff-only` fails, run `git rebase origin/main` before continuing.
- For scheduler/config PRs, avoid committing generated artifact churn unless explicitly required.
- Open one tracking issue per mandatory post-merge compound update and close via the compound PR.
- Before each new branch in high-cadence merge periods, verify branch base with `git status --branch` and rebase if needed.
- For observability rollouts, add an integration test that hits the expected actuator/internal endpoint.
- After squash merge cycles, prefer `git checkout -B main origin/main` to avoid local drift.
- For new gameplay sessions, use the freshly generated `sessionId` directly in the first backend request to avoid stale-state fetches.
- For every new `@SpringBootTest`, define explicit H2 datasource properties in test-local config to avoid environment-leak failures.
- For prod access-control filters, add tests that verify unauthenticated denial and authenticated success on protected endpoints.
- For phased frontend rewrites, require one state-hook test suite and one UI happy-path test before merging integration/error-handling PRs.
- If frontend entry code references `React.*` (for example `React.StrictMode`), explicitly import `React` in that file to avoid runtime blank-screen failures.
- For UI-only milestones, separate layout PRs from behavior PRs and verify scope by test coverage focused on structure rather than game rules.
- For turn-based game-engine changes, include tests for pass rotation, wrong-answer elimination, round-end condition, and target-score game-over before merge.
- For Flyway migrations that must run in both prod and tests, prefer SQL constructs proven in both Postgres and H2, and always verify with `mvn clean test` before opening PR.
- For frontend boot/setup flow, require explicit startup-state tests for `loading`, `backend-unreachable`, `topics-empty`, and `ready` before merge.
- For turn-based frontend engines, enforce phase guards for all player actions (`choose`, `confirm`, `pass`) and add tests proving round-state reset on next round.
- For UI-only turn-flow polish, include explicit action-hint copy and visible player status markers (`TURN`, `OUT`, `PASSED`) plus fallback/wheel layout assertions.
- For setup-screen UX changes, require tests that assert Start CTA remains disabled until both topic selection and at least one parsed player chip exist.
- For gameplay action-button label changes, update UI tests in the same PR to keep behavior verification stable.
- For summary/analytics UI additions, enforce null-safe default props and include one integration test covering summary render path.
