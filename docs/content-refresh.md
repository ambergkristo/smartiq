# Content Refresh Flow

Monthly content refresh follows:

1. Generate raw cards (`tools/generate-cards.js`).
2. Validate schema and normalization (`tools/validate-cards.js`).
3. Agent review/prune simulation (`tools/review-cards.js`).
4. Merge approved set into `data/clean/generated.latest.clean.json`.
5. Backend import consumes only `data/clean`.

Local run:

```bash
npm run pipeline:cards
```

For production-scale rehearsal:

```bash
TARGET_PER_KEY=1000 npm run pipeline:cards
```
