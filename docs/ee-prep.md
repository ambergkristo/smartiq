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
3. quality score gates for EN and ET.

Additional non-blocking runtime profile:

- GitHub Actions workflow: `Runtime Smoke ET (Non-blocking)`
- Trigger manually (`workflow_dispatch`) with:
  - `backend_url` (required)
  - `topic` (optional)
- The smoke step uses `continue-on-error`, so it never blocks merge gates.

## ET Quality Reporting

- Use `docs/et-quality-report-template.md` for each ET readiness pass.
- Use `docs/et-pr-checklist.md` as the standard PR description snippet for ET tickets.
- Store final filled reports in PR description (or attach as QA note) before release promotion.
- Auto-generate a report file:
  - `npm run report:et:quality`
  - Optional smoke in same report:
    - `npm run report:et:quality -- --with-smoke`
- Runtime smoke report artifact:
  - `BACKEND_URL=http://localhost:8081 npm run report:et:runtime`
- Single-command ET release gate:
  - `BACKEND_URL=http://localhost:8081 npm run gate:et:release`

## ET Quality Checklist (Next Milestone)

1. Keep ET card contract aligned with EN.
2. Run:
   - `node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0`
   - `node tools/validate_locale_packs.js data/smart10`
   - `node tools/audit_locale_coverage.js data/smart10 --required=en,et --min-per-combo=30`
3. Validate runtime manually:
   - `curl \"http://localhost:8081/api/cards/nextRandom?language=et&gameId=smoke-et\"`
   - or use smoke script: `BACKEND_URL=http://localhost:8081 npm run smoke:test:et`
   - optional smoke overrides:
     - `SMOKE_TOPIC=History` to force topic
     - `SMOKE_GAME_ID=my-fixed-game` to reuse game history
   - optional GitHub run:
     - Actions -> `Runtime Smoke ET (Non-blocking)` -> Run workflow
4. Add ET-specific quality rubric thresholds once ET wording is fully localized.

## ET Quick Release Check (Copy/Paste)

Use this block in PowerShell from repo root:

```powershell
node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0
node tools/validate_locale_packs.js data/smart10
node tools/audit_locale_coverage.js data/smart10 --required=en,et --min-per-combo=30
node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80
$env:BACKEND_URL="http://localhost:8081"
$env:SMOKE_LANGUAGE="et"
node tools/smoke-test.js
```
