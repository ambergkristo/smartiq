# Dataset Quality Closure (M6)

This document defines the production data-quality guardrails for SmartIQ.

For operational editing/cleanup process, see `docs/dataset-curation.md`.

## Card Contract

Each card in `data/smart10/cards.en.json` must contain:

- `id` (string)
- `topic` in `History|Sports|Geography|Culture|Science|Varia`
- `category` in `TRUE_FALSE|NUMBER|ORDER|CENTURY_DECADE|COLOR|OPEN`
- `language` (`en` for MVP)
- `question` (string)
- `options` (exactly 10 items)
- `correct` payload by category:
  - `TRUE_FALSE`: `correctIndexes[]` (ints 0..9)
  - `NUMBER`: `correctIndex` (int 0..9)
  - `ORDER`: `rankByIndex[10]` (permutation 1..10)
  - `CENTURY_DECADE`: `correctIndex` (int 0..9)
  - `COLOR`: `correctIndex` (int 0..9)
  - `OPEN`: `correctIndexes[]` (ints 0..9)
- `source` in allowed runtime set:
  - `smartiq-v2`
  - `smartiq-human`
  - `smartiq-verified`

## Validator Gate

Validator script:

- `node tools/validate_cards_v2.js data/smart10/cards.en.json --max-warnings=0`

Checks:

- Schema integrity and required fields.
- Exactly 10 options and valid correctness metadata per category.
- Option sanity:
  - non-empty,
  - no duplicates within a card,
  - soft warning when length > 42 chars.
- Distribution:
  - all 6 categories present,
  - all 6 topics present inside each category,
  - minimum 30 cards for each category-topic pair.
- TRUE_FALSE skew warnings.
- Duplicate and normalized near-duplicate question detection.

Hard violations exit non-zero and fail CI.
Warning overrun above configured limit (`--max-warnings`) also exits non-zero.

## Quality Rubric Score

Quality scoring script:

- `node tools/score_cards_quality.js data/smart10/cards.en.json`
- `node tools/score_cards_quality.js data/smart10/cards.et.json`

This script is a warning gate (non-blocking by default) that reports:

- question-stem diversity per category-topic group,
- option-set diversity per category-topic group,
- aggregate `overallScore` and weakest groups.

Use strict mode locally when needed:

- `node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.85`
- `node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.85`

CI threshold gate:

- Backend CI enforces `--fail-threshold=0.85` for both EN and ET locale packs.
- Raise this threshold gradually as dataset diversity improves.

## Semantic Quality Gate v3

Semantic scoring script:

- `node tools/score_cards_semantic.js data/smart10/cards.en.json`
- `node tools/score_cards_semantic.js data/smart10/cards.et.json`

What it checks:

- repeated stems inside `category|topic` groups,
- suspiciously short questions,
- low option uniqueness within a card,
- placeholder-like phrasing.
- category-aware terse option checks (NUMBER uses stricter compact-number tolerance).

Current banned/flagged phrase patterns:

- `sample question`
- `option <number>`
- `reference table`
- `assigned index`
- `placeholder`
- `lorem ipsum`

CI behavior:

- Backend CI + Frontend CI enforce semantic threshold gate:
  - `node tools/score_cards_semantic.js <dataset> --fail-threshold=0.70`
- release-readiness enforces the same semantic threshold for EN and ET.
- release-readiness reports semantic warning budget (`<=80` per locale) via:
  - `node tools/report_semantic_warning_budget.js --max-warnings=80`
  - currently warning-only (non-blocking).
- release-readiness also reports locale parity checks via:
  - `node tools/report_semantic_locale_parity.js --min-category-score=NUMBER:0.90,COLOR:0.95 --max-short-option-ratio=NUMBER:0.20,COLOR:0.10 --max-locale-score-gap=0.02 --max-locale-warning-gap=10 --fail-on-exceed`
  - blocking in CI/release-check.

How to improve semantic score:

1. Replace repeated question stems with varied phrasing.
2. Replace placeholder-like wording with domain-specific wording.
3. Ensure 10 options are distinct and plausible.
4. Keep question prompts specific (avoid overly short generic prompts).

## Semantic Content Truth Gate

Truth validator:

- `node tools/semantic_content_validator.js data/smart10/cards.en.json`
- `node tools/semantic_content_validator.js data/smart10/cards.et.json`

What it now hard-checks:

- opposite-language leakage inside prompts and options,
- broken Estonian wording / ASCII-damaged localization,
- over-templated prompt families,
- untranslated English prompt stems inside ET cards,
- recycled true/false option pools,
- low-trust ET option wording,
- placeholder and trivial answer patterns.

Current CI threshold gate:

- Backend CI + Frontend CI enforce:
  - `node tools/semantic_content_validator.js <dataset> --fail-threshold=0.95`
- `node --test tools/semantic_content_validator.test.js` runs in CI before the blocking truth gate.

Truth reporting:

- `node tools/generate_content_truth_report.js`

Important:

- A structural pass is not a launch-readiness pass.
- If ET localization is broken or mixed-language, ET must be treated as launch-blocked even when schema and coverage are green.
- Honest blocking is preferred over inflated readiness.

## Runtime Source Guard

`/api/cards/nextRandom` only serves cards from allowed sources:

- `smartiq-v2`
- `smartiq-human`
- `smartiq-verified`

Deprecated or unknown sources are excluded from selection pool.

At startup, backend logs:

- total card count
- per-category counts
- per-topic counts
- per-language counts
- allowed-source total count

If deprecated sources are present in DB, backend logs a boot-time warning.
If any category count is below threshold (`SMARTIQ_MIN_CATEGORY_THRESHOLD`, default `100`), backend logs an error (no crash).

## Reseed Flow

1. Ensure dataset is valid:
   - `node tools/validate_cards_v2.js data/smart10/cards.en.json`
2. Start backend with import enabled:
   - default `SMARTIQ_IMPORT_ENABLED=true`
   - default import path includes `data/smart10`
3. Check startup logs for dataset summary and threshold warnings.

## Runtime Deck Verification

Manual runtime verification script:

- `node scripts/verify_runtime_deck.js`

Optional env overrides:

- `API_BASE_URL` (default `http://localhost:8081`)
- `LANGUAGE` (default `en`)
- `TOPIC` (optional topic filter)
- `REQUESTS` (default `50`)
- `GAME_ID` (optional, otherwise generated)

Script asserts:

- no deprecated source is served,
- no immediate category repeat,
- no immediate topic repeat.

Quick manual source-guard check (mixed pool):

```powershell
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=en&gameId=qa-source-guard&topic=LegacyMixed"
```

Expected:

- response is `200`,
- returned `source` is in `smartiq-v2|smartiq-human|smartiq-verified`,
- returned `source` is never `smartiq-factory` even when mixed-topic data contains deprecated rows.
