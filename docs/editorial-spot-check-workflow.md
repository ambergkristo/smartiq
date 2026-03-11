# Editorial Spot-Check Workflow

This workflow closes the remaining trust gap after Sprint 2 by adding a lightweight human-review layer.

## 1. Generate the review pack

From repo root:

```powershell
node tools/generate_editorial_review_pack.js
```

Generated files:

- `docs/reports/<date>-editorial-review-set.md`
- `docs/reports/<date>-editorial-review-set.json`
- `docs/reports/<date>-editorial-spot-check.md`

## 2. Review the sampled cards

Use:

- `docs/editorial-spot-check-checklist.md`
- `docs/reports/<date>-editorial-review-set.md`

Record one outcome per sampled card in:

- `docs/reports/<date>-editorial-spot-check.md`

Allowed outcomes:

- `PASS`
- `PASS_WITH_NOTE`
- `NEEDS_REPAIR`

## 3. Update launch-trust status honestly

In `docs/reports/<date>-editorial-spot-check.md`, update:

- `EN spot-check status`
- `ET spot-check status`
- `EN launch-trust status`
- `ET launch-trust status`

Rules:

- Do not mark `READY` or equivalent unless the sampled review is actually complete.
- If ET review is still pending, ET launch-trust must remain conditional or blocked.
- If any sampled card is `NEEDS_REPAIR`, the locale should not be marked fully ready.

## 4. Small repair loop

If only a few sampled cards fail:

1. edit only the flagged card IDs in `data/smart10/cards.en.json` and/or `data/smart10/cards.et.json`
2. note the repair reason in the spot-check report
3. rerun:

```powershell
node tools/validate_cards_v2.js data/smart10/cards.en.json
node tools/validate_cards_v2.js data/smart10/cards.et.json
node tools/semantic_content_validator.js data/smart10/cards.en.json --fail-threshold=0.95
node tools/semantic_content_validator.js data/smart10/cards.et.json --fail-threshold=0.95
node tools/generate_content_truth_report.js --out=docs/reports/<date>-content-truth-audit.md
```

4. regenerate the review pack only if the repaired card was inside the sampled set

Hard rule:

- do not reopen broad deck rewrites because of one or two sampled wording fixes
- keep the repair loop scoped to the flagged IDs unless review reveals a repeated pattern

## 5. Pilot decision

Sprint 2.5 is complete when:

- validator-clean status is still green
- editorial spot-check is completed for EN and ET
- launch-trust status is written explicitly for EN and ET
- remaining risks are documented, not hand-waved
