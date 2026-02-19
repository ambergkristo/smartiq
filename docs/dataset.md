# SmartIQ Dataset Factory

## What This Generates

- 10 topics:
  - Culture, History, Geography, Science, Sports, Technology, Art, Music, Politics, Nature
- 6 categories per topic:
  - `TRUE_FALSE`, `NUMBER`, `ORDER`, `CENTURY_DECADE`, `COLOR`, `OPEN`
- 250 cards per topic+category
- Total: 15,000 cards

Outputs:
- `out/<topic>.json` (10 files)
- `out/index.json` (counts + checksums)
- `out/sql/V001__seed_cards.sql` (optional Flyway-style seed)

## Determinism

The generator is deterministic for a fixed seed.

Default seed:
- `20260219`

Use another seed with:
- `--seed <int>`

## Run Generator

From repo root:

```powershell
python .\smartiq_factory.py --seed 20260219 --knowledge-dir .\knowledge --out-dir .\out --max-output-mb 50
```

## Validation Model

Validation is built into generation and enforced before files are written, and can be re-run explicitly:

- Exactly 250 cards per topic+category
- Exactly 10 options per card
- Option IDs are unique `1..10`
- Category-specific schema required fields
- No duplicate option text/prompt inside a card (normalized)
- Unique card IDs globally
- Near-duplicate card signature rejection
- `ORDER`: unique positions `1..10`
- `CENTURY_DECADE`: card-level consistency (`century` or `decade`, not mixed)
- `TRUE_FALSE`: both true and false required; alternating pattern rejected
- Difficulty distribution exact per topic+category:
  - Difficulty 1: 75
  - Difficulty 2: 100
  - Difficulty 3: 75

Run explicit validator:

```powershell
python .\tools\validate_dataset.py --out-dir .\out
```

The validator exits with non-zero status on any failed gate and prints concise summaries:
- totals per topic/category
- difficulty distribution
- duplicate counts

## Ingestion

### JSON ingestion

- Read each `out/<topic>.json`
- Each file is an array of 6 blocks (`topic`, `category`, `cards`)

### SQL / Flyway ingestion

Generated file:
- `out/sql/V001__seed_cards.sql`

Assumed table:

```sql
CREATE TABLE smartiq_cards (
  card_id        VARCHAR(128) PRIMARY KEY,
  topic          VARCHAR(64)  NOT NULL,
  category       VARCHAR(64)  NOT NULL,
  difficulty     INT          NOT NULL,
  language       VARCHAR(8)   NOT NULL,
  payload_json   TEXT         NOT NULL
);
```

Then apply with Flyway or SQL client.

## Notes

- No external APIs are used.
- No web scraping is used.
- Knowledge files are created in `knowledge/` automatically on first run if missing.
- Size gate (`--max-output-mb`) behavior:
  1. Generate normal outputs
  2. If output exceeds threshold, rewrite topic JSON as minified
  3. If still above threshold, remove SQL seed and keep JSON outputs as primary artifact
