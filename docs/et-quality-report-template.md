# ET Quality Report Template

Use this template for every ET dataset readiness check.

## Metadata

- Date:
- Branch:
- Commit SHA:
- Reporter:

## Dataset Inputs

- EN file: `data/smart10/cards.en.json`
- ET file: `data/smart10/cards.et.json`

## Command Results

Run from repo root and paste short result notes.

```powershell
node tools/validate_cards_v2.js data/smart10/cards.et.json --max-warnings=0
node tools/validate_locale_packs.js data/smart10
node tools/audit_locale_coverage.js data/smart10 --required=en,et --min-per-combo=30
node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80
```

- `validate_cards_v2 (ET)`: PASS/FAIL
- `validate_locale_packs`: PASS/FAIL
- `audit_locale_coverage`: PASS/FAIL
- `score_cards_quality (ET >= 0.80)`: PASS/FAIL

## Runtime Smoke

```powershell
$env:BACKEND_URL="http://localhost:8081"
$env:SMOKE_LANGUAGE="et"
node tools/smoke-test.js
```

- Runtime ET smoke: PASS/FAIL
- Served language observed:
- Topic used:

## Release Acceptance Checklist (ET)

- [ ] ET file exists and is valid.
- [ ] Coverage check passes (`en`,`et`, minimum per combo).
- [ ] ET quality threshold gate passes (`>= 0.80`).
- [ ] Runtime smoke for ET returns valid card schema.
- [ ] No fallback surprises noted (if fallback occurred, documented).

## Notes / Issues

- Blocking issues:
- Non-blocking issues:
- Follow-up tickets:
