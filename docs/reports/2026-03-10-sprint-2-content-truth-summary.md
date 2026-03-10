# Sprint 2 Content Truth Summary

Date: 2026-03-10

Scope: SmartIQ Stabilization Sprint 2 - Content Truth

## Task 1 - ET localization audit

Done:

- ET locale pack was audited with categorized findings in [2026-03-07-content-truth-audit.md](./2026-03-07-content-truth-audit.md).
- The audit explicitly tracks:
  - language leakage
  - broken grammar
  - unnatural phrasing
  - templated/scaffold wording
  - trivial/low-value content
  - recycled option pools
  - low-trust option wording
- Highest-risk ET areas were identified deck-by-deck.

Todo:

- ET remains blocked for launch.
- Largest remaining ET repair zones:
  - `OPEN`

## Task 2 - EN semantic quality audit

Done:

- EN semantic audit is included in [2026-03-07-content-truth-audit.md](./2026-03-07-content-truth-audit.md).
- The audit now identifies:
  - over-templated prompts
  - repetitive answer structures
  - recycled option pools
  - weak host-facing wording that still passes structural validation
- Highest-risk EN areas were identified deck-by-deck.

Todo:

- EN is now conditionally usable, but not clean enough for launch trust.
- Largest remaining EN repair zones:
  - `OPEN`

## Task 3 - Content repair workflow

Done:

- Controlled repair workflow was documented in [dataset-curation.md](../dataset-curation.md).
- Review, triage, correction, verification, and rejection rules were defined for EN and ET separately.
- Repair batches completed so far:
  - `History/TRUE_FALSE 001..030`
  - `Sports/TRUE_FALSE 001..030`
  - `Geography/TRUE_FALSE 001..030`
  - `Varia/TRUE_FALSE 001..030`
  - `Culture/TRUE_FALSE 001..030`
  - `Science/TRUE_FALSE 001..030`
  - `History/ORDER 001..030`
  - `Sports/ORDER 001..030`
  - `Geography/ORDER 001..030`
  - `Varia/ORDER 001..030`
  - `Culture/ORDER 001..030`
  - `Science/ORDER 001..030`
  - `History/COLOR 001..030`
  - `Sports/COLOR 001..030`
  - `Geography/COLOR 001..030`
  - `Varia/COLOR 001..030`
  - `Culture/COLOR 001..030`
  - `Science/COLOR 001..030`

Todo:

- Continue remaining high-risk batches using the same workflow.
- Keep report regeneration and validator runs mandatory after each batch.

## Task 4 - Validator strengthening

Done:

- Semantic truth gate was strengthened in [semantic_content_validator.js](../../tools/semantic_content_validator.js).
- Validator now catches:
  - opposite-language leakage
  - broken pseudo-Estonian
  - ET encoding damage and mojibake
  - scaffold prompts
  - recycled option pools
  - low-trust ET options
  - trivial answer sets
- Validator behavior is covered by [semantic_content_validator.test.js](../../tools/semantic_content_validator.test.js).
- Semantic gate is wired as a blocking CI step in backend and frontend workflows.

Todo:

- Continue tuning heuristics where obviously weak content still passes.
- Keep validator explainable and deterministic; do not replace editorial review with opaque scoring.

## Task 5 - Content truth reporting

Done:

- Reporting generator exists in [generate_content_truth_report.js](../../tools/generate_content_truth_report.js).
- Report includes:
  - total issues found
  - issue categories
  - highest-risk decks/areas
  - EN and ET launch-readiness assessments separately
- Current canonical report is [2026-03-07-content-truth-audit.md](./2026-03-07-content-truth-audit.md).

Todo:

- Regenerate the report after every repair batch.
- Do not mark ET ready until language leakage, grammar damage, and encoding damage are materially reduced.

## Current Readiness

- EN: `CONDITIONAL`
- ET: `BLOCKED`

Current observed report baseline:

- EN score: `0.975`
- ET score: `0.951`

Closed repair zone:

- `Culture/TRUE_FALSE` is now fully repaired across `001..030`
- `Culture/TRUE_FALSE` dropped out of the ET top-risk `TRUE_FALSE` backlog
- `Varia/TRUE_FALSE` is now fully repaired across `001..030`
- `Varia/TRUE_FALSE` dropped out of the ET top-risk `TRUE_FALSE` backlog
- `Geography/TRUE_FALSE` is now fully repaired across `001..030`
- `Geography/TRUE_FALSE` dropped out of the ET top-risk `TRUE_FALSE` backlog
- `Sports/TRUE_FALSE` is now fully repaired across `001..030`
- `Sports/TRUE_FALSE` dropped out of the EN and ET `TRUE_FALSE` backlog
- `Science/TRUE_FALSE` is now fully repaired across `001..030`
- `Science/TRUE_FALSE` dropped out of the EN and ET `TRUE_FALSE` backlog
- `ORDER` is now fully repaired across all six topic lanes (`History`, `Sports`, `Geography`, `Culture`, `Science`, `Varia`)
- `ORDER` dropped out of the EN and ET top-risk backlog
- `COLOR` is now fully repaired across all six topic lanes (`History`, `Sports`, `Geography`, `Culture`, `Science`, `Varia`)
- `COLOR` dropped out of the EN and ET top-risk backlog
- ET `History/NUMBER` mojibake prompts were corrected and `NUMBER` dropped out of the top-risk backlog

## Next Repair Priority

1. remaining `OPEN` recycled pools
