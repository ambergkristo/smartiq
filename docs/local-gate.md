# Local Verification Gate

Fast core-flow gate for the current CherryPick product path (run from repo root):

```bash
npm run gate:coreflows
```

This covers the narrow public/runtime contract:

- `Play` startup path
- `Join` public join + player-lobby path
- `Host` room launch/runtime contract path

Canonical full local verification gate commands (run from repo root):

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

One-command aliases:

```bash
npm run gate:coreflows
npm run gate:local
npm run gate:quick
```

Gate meanings:

- `gate:coreflows`: fastest product-critical contract check
- `gate:local` / `gate:quick`: full local release-readiness gate, same command set as `release:check`

Definition of done for a local gate run:

- all commands exit `0`
- no failing tests
- no validator failures
