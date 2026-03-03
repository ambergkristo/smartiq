# Local Verification Gate

Canonical local verification gate commands (run from repo root):

```bash
mvn -q -f backend/pom.xml test
npm --prefix frontend run lint
npm --prefix frontend run test -- --run
npm --prefix frontend run build
node tools/validate_cards_v2.js data/smart10/cards.en.json
node tools/validate_cards_v2.js data/smart10/cards.et.json
node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.85
node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.85
```

One-command aliases (same checks as `release:check`):

```bash
npm run gate:local
npm run gate:quick
```

Definition of done for a local gate run:

- all commands exit `0`
- no failing tests
- no validator failures
