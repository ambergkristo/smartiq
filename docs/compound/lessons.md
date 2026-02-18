# Compound Lessons

## 2026-02-17 - Loop 0 (Planning Bootstrap)

- Hard part:
  - Enforcing new branch/commit policy while a non-conforming legacy PR existed.
- What broke:
  - PR creation raced branch indexing immediately after push.
- Preventive rule:
  - Always push branch first, then create PR in a separate command.

## 2026-02-17 - Loop 1 (MVP Integration Merge)

- Hard part:
  - Branch protection required an external reviewer and blocked merge despite green CI.
- What broke:
  - Self-approval is disallowed, so standard merge flow could not complete from a single-account automation context.
- Preventive rule:
  - For protected branches, assign a reviewer at PR creation time and avoid end-of-cycle merge blocking.

## 2026-02-17 - Loop 2 (PR1 Question Pool)

- Hard part:
  - Building pool behavior that handles under-filled banks without returning server errors.
- What broke:
  - During tests, pool could be empty before fixture setup, causing false assumptions about warmup state.
- Preventive rule:
  - All pool-backed endpoints must include deterministic DB fallback and explicit warning logs.

## 2026-02-17 - Loop 3 (PR2 Session De-dup)

- Hard part:
  - Combining pool-based retrieval with per-session exclusion logic while preserving fallback reliability.
- What broke:
  - Exclusion query requires separate handling for empty and non-empty exclusion sets.
- Preventive rule:
  - For exclusion-based random fetches, always branch query path on whether exclusion set is empty.

## 2026-02-17 - Loop 4 (Compound Follow-up PR Merge)

- Hard part:
  - Keeping mandatory compound-update cadence while multiple feature PRs are in-flight.
- What broke:
  - Merge sequencing can drift if compound PR is not treated as a first-class step.
- Preventive rule:
  - Reserve a dedicated post-merge slot for compound updates before starting the next feature PR.

## 2026-02-17 - Loop 5 (PR3 Pipeline Hardening Merge)

- Hard part:
  - Applying stricter validator rules without stalling pipeline execution on legacy fixtures.
- What broke:
  - Full-directory validation failed because legacy files did not satisfy new option uniqueness checks.
- Preventive rule:
  - Validate the approved artifact generated in the same run, and track legacy fixture cleanup separately.

## 2026-02-17 - Loop 6 (PR30 Compound Gate Merge)

- Hard part:
  - Branch divergence after rapid PR merges can interrupt the strict loop cadence.
- What broke:
  - `git pull --ff-only` failed due local divergence against updated origin/main.
- Preventive rule:
  - If `--ff-only` fails during loop execution, rebase immediately on `origin/main` before any new branch work.

## 2026-02-17 - Loop 7 (PR4 Scheduler Merge)

- Hard part:
  - Verifying scheduler command path without polluting PR scope with regenerated data artifacts.
- What broke:
  - Local verification rewrote generated files and introduced noisy, non-goal diffs.
- Preventive rule:
  - For workflow-only PRs, restore generated artifacts unless artifact updates are explicitly part of scope.

## 2026-02-17 - Loop 8 (PR35 Compound Merge)

- Hard part:
  - High merge frequency increases risk of skipping mandatory loop bookkeeping.
- What broke:
  - None functionally, but compliance overhead is easy to miss without explicit tracking issues.
- Preventive rule:
  - Create a dedicated tracking issue for every post-merge compound update and close it only after merge.

## 2026-02-17 - Loop 9 (PR5 Deployment Merge)

- Hard part:
  - Keeping branch alignment stable while merging many sequential PRs with strict gating.
- What broke:
  - Repeated `--ff-only` pull failures due local divergence after merge cadence.
- Preventive rule:
  - Standardize on `git rebase origin/main` as the immediate recovery path before starting each follow-up loop.

## 2026-02-17 - Loop 10 (Production Phase Merge)

- Hard part:
  - Shipping observability, bank guarantees, concurrency safety, workflow dry-run, and deploy hardening together without breaking runtime behavior.
- What broke:
  - Prometheus endpoint test initially failed until explicit prometheus export config was enabled.
- Preventive rule:
  - When adding new actuator-backed metrics, verify endpoint exposure settings in integration tests, not only dependency declarations.

## 2026-02-17 - Loop 11 (Phase A Merge)

- Hard part:
  - Keeping deploy variable naming compatible across Vercel (`VITE_*`) and team-level `BACKEND_URL` conventions.
- What broke:
  - Local branch state drifted after squash merge and required explicit main realignment.
- Preventive rule:
  - After squash merges, reset local `main` to `origin/main` before starting next phase branch.

## 2026-02-17 - Loop 12 (Phase B Merge)

- Hard part:
  - Moving from single-question demo flow to a full multi-player round without breaking session de-dup behavior.
- What broke:
  - First card fetch could use stale `sessionId` state if fetch started before React state commit.
- Preventive rule:
  - For first request in a new session, pass freshly generated session ID directly to API call, not through async state only.

## 2026-02-17 - Loop 13 (Phase C Merge)

- Hard part:
  - Adding new import-focused integration tests without inheriting machine-specific datasource settings.
- What broke:
  - New test attempted PostgreSQL auth from environment instead of isolated H2 config and failed startup.
- Preventive rule:
  - Every new Spring integration test must explicitly pin test datasource properties (H2 URL/user/pass) in test annotation.

## 2026-02-17 - Loop 14 (Phase D Merge)

- Hard part:
  - Hardening internal/public endpoint boundaries without breaking public health and gameplay routes.
- What broke:
  - Security filter behavior can silently drift without prod-profile integration coverage.
- Preventive rule:
  - Every prod-only access control change must include MockMvc tests that assert both blocked and allowed paths.

## 2026-02-17 - Loop 15 (Frontend Final-Look PR Sequence)

- Hard part:
  - Splitting a frontend refactor into five PR-sized slices while keeping each step deployable and green.
- What broke:
  - Game-engine transitions and API fetch timing caused edge-case retries and one failing test assertion.
- Preventive rule:
  - For multi-PR frontend flows, lock phase transitions first with hook tests, then layer API retries and UI integration tests.

## 2026-02-18 - Loop 16 (PR68 Fix + CI Gate Merge)

- Hard part:
  - A blank frontend could pass lint/build while failing at runtime due to missing `React` symbol in `main.jsx`.
- What broke:
  - `React.StrictMode` rendered with `React is not defined` in browser console, causing an empty screen.
- Preventive rule:
  - Any entrypoint using `React.*` symbols must explicitly import `React`, and frontend CI must run tests in addition to lint/build before merge.

## 2026-02-18 - Loop 17 (PR70 Wheel Layout Merge)

- Hard part:
  - Delivering a large visual refactor while keeping behavior strictly unchanged required tighter scope boundaries than usual.
- What broke:
  - Initial wheel layout test used a fragile accessible-name selector and failed even though layout rendered correctly.
- Preventive rule:
  - For layout-only PRs, enforce robust structural tests (`data-testid` and container-scoped queries) and keep gameplay/state logic untouched.

## 2026-02-18 - Loop 18 (PR72 Smart10 Round Semantics Merge)

- Hard part:
  - Converting from multi-card rounds to one-card Smart10 rounds touched state transitions, turn rotation, and end-of-game flow at once.
- What broke:
  - Initial hook tests produced false negatives because multiple actions were executed in one `act`, masking phase-gated callbacks.
- Preventive rule:
  - For phase-gated hooks, execute one state transition per `act` in tests and assert round-end/win conditions explicitly (`pass`, `eliminate`, `target-score`).

## 2026-02-18 - Loop 19 (PR77 Flyway Seed Data Merge)

- Hard part:
  - Keeping repeatable seed SQL compatible across PostgreSQL production and H2 test runtime.
- What broke:
  - Initial migration CTE syntax passed on PostgreSQL style assumptions but failed under H2 parsing in CI tests.
- Preventive rule:
  - Validate new Flyway SQL with `mvn clean test` early, and use portable `INSERT ... WITH RECURSIVE ... SELECT` statements for cross-database test compatibility.

## 2026-02-18 - Loop 20 (PR85 Frontend Startup Resilience Merge)

- Hard part:
  - Converting a generic topic-load failure into deterministic startup states without touching gameplay flow.
- What broke:
  - Users saw an opaque dark screen state with only a generic message, making backend/CORS/runtime diagnosis too slow.
- Preventive rule:
  - Frontend setup boot must expose explicit `loading`, `backend-unreachable`, `topics-empty`, and `ready` states with retry + health-link actions.

## 2026-02-18 - Loop 21 (PR89 Smart10 Core-Flow Guards Merge)

- Hard part:
  - Enforcing strict one-card round semantics without rewriting the whole engine.
- What broke:
  - Without phase guards, `confirmAnswer` could execute outside `CONFIRMING`, creating invalid score/reveal transitions.
- Preventive rule:
  - For turn-based phase machines, gate every action by phase and active-player status, and test cross-round reset behavior explicitly.

## 2026-02-18 - Loop 22 (PR93 Wheel-Board Polish Merge)

- Hard part:
  - Improving gameplay readability without leaking into behavior/state refactors.
- What broke:
  - Before explicit action hints and status chips, users could misread the next legal step even though engine state was correct.
- Preventive rule:
  - For UI-polish PRs on turn-based games, add explicit “next action” copy and visual player-state markers, then verify with layout-scoped tests.
