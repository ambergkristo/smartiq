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
