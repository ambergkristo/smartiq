# Release Readiness Gate

This repository uses one canonical local and CI command for release readiness:

```powershell
npm run release:check
```

The command executes:

1. `mvn -q -f backend/pom.xml test`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend run test -- --run`
4. `npm --prefix frontend run build`
5. `node tools/validate_cards_v2.js data/smart10/cards.en.json`
6. `node tools/validate_cards_v2.js data/smart10/cards.et.json`
7. `node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.80`
8. `node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80`

## CI Aggregation

The workflow `.github/workflows/release-readiness.yml` runs the same command as a single gate check.

Recommended required check in GitHub branch protection:

- `release-readiness / release-readiness`

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
