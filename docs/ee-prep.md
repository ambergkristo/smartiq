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
- File naming contract:
  - `cards.<lang>.json` where `<lang>` is a 2-letter lowercase code.

## Validation Hooks

- Strict single-pack validator:
  - `node tools/validate_cards_v2.js data/smart10/cards.en.json --max-warnings=0`
- Locale-pack validator:
  - `node tools/validate_locale_packs.js data/smart10`

Locale-pack validator rules:

- `en` pack is required.
- `et` pack is required.
- Any discovered locale pack is validated with strict card rules (`--max-warnings=0`).

## CI Behavior

Backend CI runs:

1. strict EN validation,
2. strict ET validation (via locale pack gate),
3. quality score gate.

## ET Quality Checklist (Next Milestone)

1. Keep ET card contract aligned with EN.
2. Run:
   - `node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0`
   - `node tools/validate_locale_packs.js data/smart10`
3. Validate runtime manually:
   - `curl \"http://localhost:8081/api/cards/nextRandom?language=et&gameId=smoke-et\"`
4. Add ET-specific quality rubric thresholds once ET wording is fully localized.
