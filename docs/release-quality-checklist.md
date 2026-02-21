# Release Quality Checklist

This checklist is the final pre-merge gate for SmartIQ data/runtime quality milestones.

Milestone snapshot reference:

- `docs/stability-closure.md`

## 1) Dataset Validators (EN + ET)

Run:

```bash
npm run validate:cards
npm run validate:cards:et
npm run validate:locale-packs
```

Expected:

- all commands exit `0`
- no hard schema violations
- category/topic distributions remain complete

Quick combined command:

```bash
npm run qa:cards:quick
```

## 2) ET Localization Pipeline

Run:

```bash
npm run validate:cards:et:pipeline:json:quiet
npm run validate:cards:et:pipeline:smoke
```

Expected:

- ET pipeline passes all steps
- smoke test confirms required JSON summary shape
- `summaryWriteError` is `null` in normal local runs without `--out`

## 3) Quality Scoring Gates

Run:

```bash
npm run score:cards:quality:ci
npm run score:cards:quality:ci:et
```

Expected:

- both locale packs stay above configured quality threshold

## 4) Runtime Deck Verification

Run backend locally, then execute:

```bash
npm run verify:runtime:deck
```

Expected:

- no deprecated sources served
- no immediate category repeat
- no immediate topic repeat

## 5) Backend Test Gate

Run:

```bash
mvn -q -f backend/pom.xml test
```

Expected:

- backend test suite passes

## 6) Frontend Test Gate

Run:

```bash
npm --prefix frontend test -- --run
```

Expected:

- frontend test suite passes

## 7) Merge Readiness

Confirm:

- PR has green GitHub build checks
- only scoped files were changed
- PR description includes QA commands and outcomes
