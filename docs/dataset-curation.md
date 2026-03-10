# Dataset Curation Workflow (Governance v3)

This workflow is used when a card is reported as low quality, incorrect, synthetic, poorly localized, or editorially weak.

## 1) Flag a bad card

Capture:

- `id`
- `language`
- `category`
- `topic`
- reason (`factual_error`, `language_leakage`, `broken_grammar`, `unnatural_phrasing`, `templated_prompt`, `duplicate`, `bad_options`, `trivial_content`)
- source evidence:
  - validator warning,
  - content-truth report finding,
  - live host feedback,
  - manual editorial review note.

Do not patch runtime DB rows directly. Fix source dataset files under `data/smart10/`.

## 2) Triage before editing

Decide which repair path applies:

- `rewrite`: meaning is sound, wording/localization is bad.
- `replace`: card is structurally valid but too synthetic, too templated, or too weak for live hosting.
- `drop and backfill`: card is unsafe to salvage quickly; remove it and replace with a fresh editorial card in the same locale/topic/category bucket.

Hard rule:

- If ET card contains untranslated English question scaffolding or broken Estonian (`vaited`, `oiged`, `toesed`, etc.), default to `rewrite` or `replace`.
- If ET card shows encoding damage or mojibake (`v?ited`, `L??nemeri`, `m??rid`, etc.), treat it as broken localization and default to `rewrite` or `replace`.
- If EN/ET card depends on recycled true/false option pools unrelated to the stated focus area, default to `replace`.

## 3) Edit and repair source dataset files

Edit:

- `data/smart10/cards.en.json`
- `data/smart10/cards.et.json` (if localized card exists)

Rules:

- keep category-topic minimums (`>=30`)
- keep exactly 10 options
- keep deterministic `correct` metadata
- keep options short (target `<=42` chars)
- keep questions host-readable out loud without needing cleanup
- localize ET cards into natural Estonian, not ASCII-fallback pseudo-Estonian
- avoid question stems that sound like generated worksheet prompts
- avoid answer pools that are obviously recycled from unrelated cards

## 4) Editorial acceptance rules

### EN acceptance

Card is acceptable only if all are true:

- question is natural enough to read aloud in a live hosted session,
- prompt is specific to the stated topic/focus, not generic worksheet scaffolding,
- answer options are plausible distractors, not repeated stock lines from many other cards,
- wording does not sound like template filler,
- correct set is worth discussing in a live room.

### ET acceptance

Card is acceptable only if all are true:

- question is natural, idiomatic Estonian,
- no untranslated English instructions remain in the prompt,
- no broken ASCII-only pseudo-Estonian remains where correct Estonian orthography is expected,
- answer options are localized or intentionally language-neutral,
- wording does not make the host mentally rewrite the card before reading it out.

### Mandatory rejection examples

Reject immediately if any of these are true:

- ET prompt contains English stems like `Order oldest era to newest`,
- ET prompt contains broken forms like `Millised vaited on oiged`,
- ET prompt or options contain encoding-damaged forms like `Millised v?ited` or `L??nemeri`,
- card uses placeholder or scaffold wording,
- card reuses a stock true/false pool that is clearly detached from the named focus area,
- option set is trivial, repetitive, or low-information.

## 5) Ban regressions (truth guard)

`tools/validate_cards_v2.js` enforces hard-fail bans for:

- banned phrases (for example `reference table`, `assigned index`, `factory output`)
- banned question stem patterns (for example `In the ... reference table ...`)

If any banned phrase/pattern is hit, validation exits non-zero.

`tools/semantic_content_validator.js` enforces additional truth checks for:

- opposite-language leakage,
- broken Estonian wording,
- over-templated/scaffold prompts,
- recycled true/false option pools,
- low-trust ET option wording,
- trivial answer sets.

## 6) Run verification locally

```powershell
node tools/validate_cards_v2.js data/smart10/cards.en.json
node tools/validate_cards_v2.js data/smart10/cards.et.json
node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.60
node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.60
node tools/semantic_content_validator.js data/smart10/cards.en.json --fail-threshold=0.95
node tools/semantic_content_validator.js data/smart10/cards.et.json --fail-threshold=0.95
node tools/generate_content_truth_report.js
```

Then run full release gate:

```powershell
npm run release:check
```

## 7) Review and sign-off

Each repaired batch should have:

- one editor/reviewer who did not write the original repair,
- validator output attached,
- explicit note whether EN and ET are independently launch-readable.

Do not mark ET as ready because EN is clean.

## 8) Reseed and runtime verify

After merge, reseed/import and verify runtime response:

```powershell
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=en&gameId=curation-check"
curl.exe -s "http://localhost:8081/api/cards/nextRandom?language=et&gameId=curation-check"
```

Expected:

- no `smartiq-factory` source
- no reference-table/index nonsense
- contract remains valid
