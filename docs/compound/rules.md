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
