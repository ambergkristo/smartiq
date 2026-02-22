# Dataset Curation Workflow (Governance v2)

This workflow is used when a card is reported as low quality, incorrect, or synthetic nonsense.

## 1) Flag a bad card

Capture:

- `id`
- `language`
- `category`
- `topic`
- reason (`factual_error`, `nonsense`, `too_long`, `duplicate`, `bad_options`)

Do not patch runtime DB rows directly. Fix source dataset files under `data/smart10/`.

## 2) Remove and replace in dataset files

Edit:

- `data/smart10/cards.en.json`
- `data/smart10/cards.et.json` (if localized card exists)

Rules:

- keep category-topic minimums (`>=30`)
- keep exactly 10 options
- keep deterministic `correct` metadata
- keep options short (target `<=42` chars)

## 3) Ban regressions (nonsense guard)

`tools/validate_cards_v2.js` enforces hard-fail bans for:

- banned phrases (for example `reference table`, `assigned index`, `factory output`)
- banned question stem patterns (for example `In the ... reference table ...`)

If any banned phrase/pattern is hit, validation exits non-zero.

## 4) Run verification locally

```powershell
node tools/validate_cards_v2.js data/smart10/cards.en.json
node tools/validate_cards_v2.js data/smart10/cards.et.json
node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.60
node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.60
```

Then run full release gate:

```powershell
npm run release:check
```

## 5) Reseed and runtime verify

After merge, reseed/import and verify runtime response:

```powershell
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=en&gameId=curation-check"
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=et&gameId=curation-check"
```

Expected:

- no `smartiq-factory` source
- no reference-table/index nonsense
- contract remains valid
