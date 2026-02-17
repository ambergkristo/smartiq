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
