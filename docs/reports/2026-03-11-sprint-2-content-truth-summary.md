# Sprint 2 Content Truth Summary

Date: 2026-03-11

Scope: SmartIQ Stabilization Sprint 2 - Content Truth

## Completed In This Batch

- Strengthened `tools/semantic_content_validator.js` to flag generic `OPEN` scaffold prompts such as `Topic clue:` and `Teemavihe:`.
- Added regression coverage in `tools/semantic_content_validator.test.js` for generic `OPEN` scaffold prompts with otherwise unique options.
- Replaced the full `Sports/OPEN` batch in:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- Regenerated the canonical audit report in `docs/reports/2026-03-11-content-truth-audit.md`.

## Audit Delta

- EN total issues moved from `225` under the strengthened validator baseline to `200` after the `Sports/OPEN` repair batch.
- ET total issues moved from `275` to `260` after the `Sports/OPEN` repair batch.
- `Sports/OPEN` dropped out of the EN and ET top-risk backlog.

## Current Readiness

- EN: `CONDITIONAL`
- ET: `BLOCKED`

Current audit baseline:

- EN score: `0.974`
- ET score: `0.966`

## Remaining Highest-Risk Areas

1. `Geography/OPEN`
2. `Culture/OPEN`
3. `Science/OPEN`
4. `Varia/OPEN`

## Notes

- ET remains explicitly blocked because broken grammar and template/recycled `OPEN` content still exists in the remaining unrepaired zones.
- The repaired `Sports/OPEN` batch still triggers non-blocking structural length warnings in `validate_cards_v2.js`; those warnings should be tightened in a follow-up cleanup pass if strict option-length conformance is required before pilot usage.
