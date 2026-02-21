# EE Prep Readiness

This document defines the technical baseline for Estonian (`et`) locale support without changing gameplay logic.

## Scope

- No gameplay/UI refactors.
- ET locale pack is included as MVP parity pack.
- Keep gameplay/UI behavior unchanged.

## Current Locale Contract

- Locale packs are stored as:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json`
- ET localization override file:
  - `data/smart10/et.localization.overrides.json`
- File naming contract:
  - `cards.<lang>.json` where `<lang>` is a 2-letter lowercase code.

## Validation Hooks

- Strict single-pack validator:
  - `node tools/validate_cards_v2.js data/smart10/cards.en.json --max-warnings=0`
- Locale-pack validator:
  - `node tools/validate_locale_packs.js data/smart10`
- ET localization residue validator:
  - `node tools/validate_et_localization.js data/smart10/cards.et.json`
- ET glossary consistency validator:
  - `node tools/validate_et_glossary.js data/smart10/cards.et.json`
- ET overrides contract validator:
  - `node tools/validate_et_overrides.js data/smart10/et.localization.overrides.json`
- ET localization idempotence validator:
  - `python tools/localize_et_dataset.py --check`
- ET full validation pipeline:
  - `node tools/validate_et_pipeline.js data/smart10`
  - verbose diagnostics: `node tools/validate_et_pipeline.js data/smart10 --verbose`
  - JSON summary: `node tools/validate_et_pipeline.js data/smart10 --json`
  - reduced pipeline chatter + JSON summary: `node tools/validate_et_pipeline.js data/smart10 --json --quiet`
  - write JSON summary file: `node tools/validate_et_pipeline.js data/smart10 --json --quiet --out=artifacts/et-pipeline-summary.json`
  - JSON includes `hashes.etCardsSha256` and `hashes.overridesSha256` for artifact traceability
  - JSON includes `meta.pipelineVersion`, `meta.gitSha`, and `meta.gitBranch` for run provenance

Locale-pack validator rules:

- `en` pack is required.
- `et` pack is required.
- Any discovered locale pack is validated with strict card rules (`--max-warnings=0`).

## CI Behavior

Backend CI runs:

1. strict EN validation,
2. ET validation pipeline (locale pack + localization residue + glossary + overrides + idempotence),
3. quality score gates for EN and ET.
4. uploads ET pipeline JSON summary artifact (`et-pipeline-summary`).

## ET Quality Checklist (Next Milestone)

1. Keep ET card contract aligned with EN.
2. Run:
   - `python tools/localize_et_dataset.py`
   - `node tools/validate_et_pipeline.js data/smart10`
   - `python tools/localize_et_dataset.py --check`
   - `node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0`
   - `node tools/validate_et_localization.js data/smart10/cards.et.json`
   - `node tools/validate_et_glossary.js data/smart10/cards.et.json`
   - `node tools/validate_et_overrides.js data/smart10/et.localization.overrides.json`
   - `node tools/validate_locale_packs.js data/smart10`
3. Validate runtime manually:
   - `curl \"http://localhost:8081/api/cards/nextRandom?language=et&gameId=smoke-et\"`
4. Add ET-specific quality rubric thresholds once ET wording is fully localized.
