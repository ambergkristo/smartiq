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
- Regenerated the canonical audit report in `docs/reports/2026-03-11-content-truth-audit.md`.

## Audit Delta

- EN total issues moved from `225` under the strengthened validator baseline to `100` after the `Sports/OPEN`, `Geography/OPEN`, and `Culture/OPEN` repair batches.
- ET total issues moved from `275` to `130` after the `Sports/OPEN`, `Geography/OPEN`, and `Culture/OPEN` repair batches.
- `Sports/OPEN` dropped out of the EN and ET top-risk backlog.
- `Geography/OPEN` dropped out of the EN and ET top-risk backlog.
- `Culture/OPEN` dropped out of the EN and ET top-risk backlog.

## Current Readiness

- EN: `CONDITIONAL`
- ET: `BLOCKED`

Current audit baseline:

- EN score: `0.987`
- ET score: `0.983`

## Remaining Highest-Risk Areas

1. `Science/OPEN`
2. `Varia/OPEN`

## Notes

- ET remains explicitly blocked because broken grammar and template/recycled `OPEN` content still exists in the remaining unrepaired zones.
- The repaired `Sports/OPEN`, `Geography/OPEN`, and `Culture/OPEN` batches still trigger non-blocking structural length warnings in `validate_cards_v2.js`; those warnings should be tightened in a follow-up cleanup pass if strict option-length conformance is required before pilot usage.
