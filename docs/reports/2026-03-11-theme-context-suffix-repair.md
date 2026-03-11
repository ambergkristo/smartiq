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

## Verification status

- Targeted human editorial verification for the Theme/Context/Kontekst/Teema suffix cleanup is complete.
- Result: `PASS`
- Follow-up state: cleared. Do not treat suffix-repair verification as pending unless a new, separate issue is found.
- Evidence: `docs/reports/2026-03-11-suffix-repair-verification-pack.md`

## Recommendation

This repair loop is cleared. No further work on the suffix issue is required unless a new, separate blocker is found.
