# Data Pipeline

SmartIQ uses a two-stage card data flow:

- `data/raw/*.json`: generated or imported raw question sets
- `data/clean/*.json`: QA-approved card sets used by backend import
- `data/review/*.json`: agent-review artifacts (`approved`, `flagged`, `report`)

Only files under `data/clean` are allowed as import source for the game database.

## Card Schema (MVP)

Each card must provide:

- `id`
- `topic`
- `subtopic` (nullable)
- `language`
- `question`
- `options` (array length must be 10)
- `correctIndex` OR `correctFlags` (length 10 boolean array)
- `difficulty`
- `source`
- `createdAt`

## Validation Command

Run schema + duplicate checks:

```bash
node tools/validate-cards.js data/clean
```

## Monthly Refresh Pipeline (Local Simulation)

Generate -> Review -> Merge approved -> Validate:

```bash
npm run pipeline:cards
```

Target size can be scaled up to 1000 per `(topic,difficulty,language)` key:

```bash
TARGET_PER_KEY=1000 npm run pipeline:cards
```

`tools/review-cards.js` outputs:

- `data/review/approved.<date>.json`
- `data/review/flagged.<date>.json`
- `data/review/report.<date>.json`

Sanity check malformed raw sample (expected to fail):

```bash
node tools/validate-cards.js data/raw
```
