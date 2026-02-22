# Local Verification Gate

Canonical local verification gate commands (run from repo root, Windows PowerShell):

```powershell
mvn -q -f backend/pom.xml test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run test -- --run
node tools/validate_cards_v2.js
node tools/score_cards_quality.js --fail-threshold=0.60
```

One-command aliases (same checks):

```powershell
npm run gate:local
npm run gate:quick
```

Definition of done for a local gate run:

- all commands exit `0`
- no failing tests
- no validator failures
