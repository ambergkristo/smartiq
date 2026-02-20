# EE Prep Readiness

This document defines the technical readiness baseline for adding Estonian (`et`) language cards without changing gameplay logic.

## Scope (Prep Only)

- No gameplay/UI refactors.
- No ET card content in this phase.
- Add guardrails so ET can be plugged in safely later.

## Current Locale Contract

- Locale packs are stored as:
  - `data/smart10/cards.en.json`
  - `data/smart10/cards.et.json` (future)
- File naming contract:
  - `cards.<lang>.json` where `<lang>` is a 2-letter lowercase code.

## Validation Hooks

- Strict single-pack validator:
  - `node tools/validate_cards_v2.js data/smart10/cards.en.json --max-warnings=0`
- Locale-pack validator:
  - `node tools/validate_locale_packs.js data/smart10`

Locale-pack validator rules:

- `en` pack is required.
- Any discovered locale pack is validated with strict card rules (`--max-warnings=0`).
- `et` is optional in prep phase.

## CI Behavior

Backend CI runs:

1. strict EN validation,
2. locale-pack validation (EN required, ET optional),
3. quality score gate.

## ET Onboarding Checklist (Next Milestone)

1. Create `data/smart10/cards.et.json`.
2. Keep the same card contract as EN.
3. Run:
   - `node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0`
   - `node tools/validate_locale_packs.js data/smart10`
4. Validate runtime manually:
   - `curl \"http://localhost:8081/api/cards/nextRandom?language=et&gameId=smoke-et\"`
5. Add ET-specific quality rubric thresholds once dataset volume is stable.
