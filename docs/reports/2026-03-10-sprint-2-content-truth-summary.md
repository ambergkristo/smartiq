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
  - `Sports/TRUE_FALSE 021..030`
  - `Science/TRUE_FALSE 011..030`
  - `Geography/TRUE_FALSE 001..010`
  - `ORDER`
  - `COLOR`
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

- EN is still not launch-ready.
- Largest remaining EN repair zones:
  - `Sports/TRUE_FALSE 021..030`
  - `Science/TRUE_FALSE`
  - `ORDER`
  - `COLOR`
  - `OPEN`

## Task 3 - Content repair workflow

Done:

- Controlled repair workflow was documented in [dataset-curation.md](../dataset-curation.md).
- Review, triage, correction, verification, and rejection rules were defined for EN and ET separately.
- Repair batches completed so far:
  - `History/TRUE_FALSE 001..030`
  - `Sports/TRUE_FALSE 001..020`
  - `Geography/TRUE_FALSE repair work landed; ET 001..010 remains`
  - `Varia/TRUE_FALSE 001..030`
  - `Culture/TRUE_FALSE 001..030`
  - `Science/TRUE_FALSE 001..010`

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

- EN: `NOT READY`
- ET: `BLOCKED`

Current observed report baseline:

- EN score: `0.945`
- ET score: `0.838`

Closed repair zone:

- `Culture/TRUE_FALSE` is now fully repaired across `001..030`
- `Culture/TRUE_FALSE` dropped out of the ET top-risk `TRUE_FALSE` backlog
- `Varia/TRUE_FALSE` is now fully repaired across `001..030`
- `Varia/TRUE_FALSE` dropped out of the ET top-risk `TRUE_FALSE` backlog

## Next Repair Priority

1. `Sports/TRUE_FALSE 021..030`
2. `Science/TRUE_FALSE 011..030`
3. `Geography/TRUE_FALSE 001..010`
4. `ORDER`
5. `COLOR`
6. remaining `OPEN` recycled pools
