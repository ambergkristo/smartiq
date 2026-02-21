# RC Readiness Audit

Date: 2026-02-21

## Scope

This audit summarizes release-candidate readiness for SmartIQ gameplay + dataset quality closure work.

## Done (RC-Ready)

- Smart10-style board and round engine implemented.
- Random deck endpoint active with anti-repeat constraints:
  - avoid immediate category repeat
  - avoid immediate topic repeat
  - recent card history exclusion
- EN + ET locale datasets present (`1080` cards each) and validator-clean.
- Source guardrails active for runtime-serving cards.
- ET validation pipeline includes:
  - locale pack checks
  - localization and glossary checks
  - idempotence check
  - JSON summary and smoke test
- Quick quality gate command available:
  - `npm run qa:cards:quick`
- Release checklist and stability snapshot documented.

## Known Non-Blocking Constraints

- Vercel preview checks are rate-limited in current environment.
- GitHub code checks (`build-and-test`, `lint-test-build`) are passing and used as code-merge quality gate.

## Post-RC Backlog

- ET wording polish passes (idiomatic phrasing refinements).
- Additional script-level tests for less common failure branches.
- Optional branch-protection tuning to make Vercel preview non-required.
- Optional gameplay improvements beyond parity baseline (future milestone).

## RC Decision

Status: **READY FOR RC** with documented non-blocking operational constraint (Vercel preview rate limit).

Recommended merge sequence:

1. Merge stacked docs/quality passes in order.
2. Run release checklist (`docs/release-quality-checklist.md`) once on updated main.
3. Tag RC candidate after checklist pass.
