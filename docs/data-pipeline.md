# Data Pipeline

SmartIQ production card data is managed as locale packs under `data/smart10`.

Primary datasets:

- `data/smart10/cards.en.json`
- `data/smart10/cards.et.json`
- `data/smart10/et.localization.overrides.json`

## Canonical Card Contract (v2)

Each card must contain:

- `cardId` (string)
- `category` in `TRUE_FALSE|NUMBER|ORDER|CENTURY_DECADE|COLOR|OPEN`
- `topic` in `History|Sports|Geography|Culture|Science|Varia`
- `language` (`en` or `et`)
- `question` (string)
- `options` (exactly 10 strings)
- `correct` payload by category:
  - `TRUE_FALSE`: `correctIndexes[]`
  - `NUMBER`: `correctIndex`
  - `ORDER`: `rankByIndex[10]`
  - `CENTURY_DECADE`: `correctIndex`
  - `COLOR`: `correctIndex`
  - `OPEN`: `correctIndexes[]`
- `source` in allowed runtime set:
  - `smartiq-v2`
  - `smartiq-human`
  - `smartiq-verified`

## Validation Gates

EN schema and quality gate:

```bash
npm run validate:cards
```

ET schema and quality gate:

```bash
npm run validate:cards:et
```

Locale-pack consistency gate (EN+ET presence and structure):

```bash
npm run validate:locale-packs
```

ET localization pipeline gate:

```bash
npm run validate:cards:et:pipeline
```

JSON summary output mode:

```bash
npm run validate:cards:et:pipeline:json:quiet
```

Quality-score CI gates:

```bash
npm run score:cards:quality:ci
npm run score:cards:quality:ci:et
```

## Generation and Review Utilities

Generation and review scripts remain available for controlled expansion:

- `npm run generate:cards`
- `npm run review:cards`
- `npm run review:summary`
- `npm run pipeline:cards`

Any generated output must pass v2 validators before import/use.

## Runtime Verification

Random deck runtime checks:

```bash
npm run verify:runtime:deck
```

This verifies anti-repeat behavior and source filtering on `/api/cards/nextRandom`.
