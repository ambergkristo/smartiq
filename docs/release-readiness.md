# Release Readiness Gate

This repository uses one canonical local and CI command for release readiness:

```powershell
npm run release:check
```

The command executes:

1. `node tools/validate_flyway_migrations.js`
2. `mvn -q -f backend/pom.xml test`
3. `npm --prefix frontend run lint`
4. `npm --prefix frontend run test -- --run`
5. `npm --prefix frontend run build`
6. `node tools/validate_cards_v2.js data/smart10/cards.en.json`
7. `node tools/validate_cards_v2.js data/smart10/cards.et.json`
8. `node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.80`
9. `node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80`
10. `node tools/score_cards_semantic.js data/smart10/cards.en.json --fail-threshold=0.70`
11. `node tools/score_cards_semantic.js data/smart10/cards.et.json --fail-threshold=0.70`
12. `node tools/report_semantic_warning_budget.js --max-warnings=80` (warning-only metric)
13. `node tools/report_semantic_locale_parity.js --min-category-score=NUMBER:0.90,COLOR:0.95 --max-short-option-ratio=NUMBER:0.40,COLOR:0.10 --max-locale-score-gap=0.02 --max-locale-warning-gap=10` (warning-only metric)

## CI Aggregation

The workflow `.github/workflows/release-readiness.yml` runs the same command as a single gate check.

Recommended required check in GitHub branch protection:

- `release-readiness / release-readiness`

Current `main` enforcement target:

- Require exactly `release-readiness / release-readiness` as the mandatory status check.
- Keep `1` required approving review.
- Keep required linear history enabled.
- Keep preview deployments non-required (to avoid blocking merges on external preview noise).

Legacy checks that can remain required during transition:

- `Backend CI / build-and-test`
- `Frontend CI / lint-test-build`

## Branch Protection Setup (GitHub UI)

1. Open repository `Settings -> Branches`.
2. Edit the protection rule for `main`.
3. Under "Require status checks to pass before merging", add:
   - `release-readiness / release-readiness`
4. Optionally keep `Backend CI / build-and-test` and `Frontend CI / lint-test-build` as additional required checks.
5. Save changes.

## Usage

Run locally before opening PR:

```powershell
npm run release:check
```

If any sub-step fails, treat PR as not ready for merge.
