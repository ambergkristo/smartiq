# SmartIQ mini repair loop - Theme/Context suffix cleanup

Date: 2026-03-11
Scope: narrow editorial repair loop for misleading question suffixes in EN and ET datasets

## Pattern audit summary

- EN cards affected: 360
- ET cards affected: 360
- Remaining direct matches after repair: 0 EN, 0 ET
- Pattern families audited:
  - `Theme:`
  - `Context:`
  - `Context tag:`
  - `Teema:`
  - `Kontekst:`

## Repair rule applied

- Removed trailing `Theme` / `Context` / `Context tag` / `Teema` / `Kontekst` suffixes when they functioned only as non-essential appended metadata.
- Preserved the question stem itself and did not reopen unrelated wording.
- Intentional keeps: none. No reviewed case required the suffix for meaning or disambiguation.

## Example repairs

### EN

- `history-number-001`
  - Before: `History: In which year did WWII end? Context tag: Ancient Rome.`
  - After: `History: In which year did WWII end?`
- `history-number-002`
  - Before: `History: In which year did Berlin Wall fall? Context tag: Viking Age.`
  - After: `History: In which year did Berlin Wall fall?`

### ET

- `history-number-001-et`
  - Before: `Ajalugu: Mis aastal lõppes Teine maailmasõda? Kontekst: Vana-Rooma.`
  - After: `Ajalugu: Mis aastal lõppes Teine maailmasõda?`
- `history-number-002-et`
  - Before: `Ajalugu: Mis aastal langes Berliini müür? Kontekst: Viikingiaeg.`
  - After: `Ajalugu: Mis aastal langes Berliini müür?`

## Validator coverage

- `tools/semantic_content_validator.js` now flags non-functional trailing `Theme` / `Context` / `Context tag` / `Teema` / `Kontekst` suffixes as `unnatural_phrasing`.
- Regression coverage added in `tools/semantic_content_validator.test.js` for both EN and ET questions.

## Verification

- `node tools/semantic_content_validator.test.js`
- `node tools/semantic_content_validator.js data/smart10/cards.en.json --fail-threshold=0.95 --max-warnings=20`
- `node tools/semantic_content_validator.js data/smart10/cards.et.json --fail-threshold=0.95 --max-warnings=20`
- `node tools/validate_cards_v2.js data/smart10/cards.en.json`
- `node tools/validate_cards_v2.js data/smart10/cards.et.json`

## Recommendation

Editorial spot-check is not fully cleared yet. This repair loop itself is complete, but the regenerated review pack should get one more quick human pass so the previously flagged suffix artifact is confirmed absent in live reading.
