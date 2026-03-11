# Sprint 2 Content Truth Summary

Date: 2026-03-11

Scope: SmartIQ Stabilization Sprint 2 - Content Truth

## Completed In This Batch

- Strengthened `tools/semantic_content_validator.js` to flag generic `OPEN` scaffold prompts such as `Topic clue:` and `Teemavihe:`.
- Added regression coverage in `tools/semantic_content_validator.test.js` for generic `OPEN` scaffold prompts with otherwise unique options.
- Replaced the full `Sports/OPEN` batch in:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Replaced the full `Geography/OPEN` batch in:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Replaced the full `Culture/OPEN` batch in:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Replaced the full `Science/OPEN` batch in:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Replaced the full `Varia/OPEN` batch in:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Tightened overlength `OPEN` options in `Sports/OPEN` and `Geography/OPEN` for both EN and ET without changing semantic validator outcomes.
- Tightened remaining overlength `OPEN` options in `Culture/OPEN`, `Science/OPEN`, and `Varia/OPEN` for both EN and ET until `validate_cards_v2.js` returned `0` warnings per locale.
- Fixed `tools/generate_content_truth_report.js` readiness logic so ET is not hardcoded to `BLOCKED` after a zero-issue audit.
- Regenerated the canonical audit report in `docs/reports/2026-03-11-content-truth-audit.md`.

## Audit Delta

- EN total issues moved from `225` under the strengthened validator baseline to `0` after the `Sports/OPEN`, `Geography/OPEN`, `Culture/OPEN`, `Science/OPEN`, and `Varia/OPEN` repair batches.
- ET total issues moved from `275` to `0` after the same five repair batches.
- `Sports/OPEN` dropped out of the EN and ET top-risk backlog.
- `Geography/OPEN` dropped out of the EN and ET top-risk backlog.
- `Culture/OPEN` dropped out of the EN and ET top-risk backlog.
- `Science/OPEN` dropped out of the EN and ET top-risk backlog.
- `Varia/OPEN` dropped out of the EN and ET top-risk backlog.

## Current Readiness

- EN: `CONDITIONAL`
- ET: `CONDITIONAL`

Current audit baseline:

- EN score: `1.000`
- ET score: `1.000`

## Remaining Highest-Risk Areas

- No remaining semantic high-risk areas under `tools/semantic_content_validator.js`.
- No remaining structural warning backlog under `tools/validate_cards_v2.js`.

## Notes

- This is still not a fake green. Structural validation now also returns `0` warnings for EN and ET, so remaining caution is editorial rather than mechanical.
- EN remains `CONDITIONAL` because validator-clean content is not identical to repeated live-host proof.
- ET remains `CONDITIONAL` because a focused native-speaker spot-check is still the honest final trust check after mass repair.
