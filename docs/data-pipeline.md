# Data Pipeline

SmartIQ uses a two-stage card data flow:

- `data/raw/*.json`: generated or imported raw question sets
- `data/clean/*.json`: QA-approved card sets used by backend import

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

Sanity check malformed raw sample (expected to fail):

```bash
node tools/validate-cards.js data/raw
```
