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
