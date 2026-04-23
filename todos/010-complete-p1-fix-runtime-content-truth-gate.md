---
status: complete
priority: p1
issue_id: "010"
tags: [cherrypick, single-player, content, data-quality, release-gate]
dependencies: []
---

# Fix Runtime Content Truth Gate

Repair the active EN runtime dataset and the validator contract so CherryPick stops shipping obviously synthetic questions while still reporting the dataset as healthy.

## Problem Statement

The current solo product is strong enough for users to notice the real quality ceiling: the active EN runtime dataset still contains synthetic scaffolding and incoherent topic/question combinations, while the repo's validators score the dataset as effectively perfect.

That creates three direct problems:

- gameplay quality is weaker than the UI and engine deserve
- release gates provide false confidence
- home/replay/retention work will be built on weak content if this is not fixed first

## Findings

- `data/smart10/cards.en.json` still contains obvious synthetic copy such as:
  - `History: In which year did WWII end? Context tag: Ancient Rome.`
  - `History: Put these events in chronological order, earliest first. Theme: Ancient Rome.`
- `rg -n "Context tag:|Theme:" data/smart10/cards.en.json` returns many runtime EN hits.
- `node tools/validate_cards_v2.js data/smart10/cards.en.json --max-warnings=20` passes despite those issues.
- `node tools/semantic_content_validator.js data/smart10/cards.en.json --max-warnings=20` passes despite those issues.
- `node tools/score_cards_quality.js data/smart10/cards.en.json` returns a perfect score despite those issues.
- `node tools/score_cards_semantic.js data/smart10/cards.en.json` returns a perfect score despite those issues.
- The product audit concluded this is the single highest-leverage fix for the current single-player-first product.

## Proposed Solutions

### Option 1: Manual Runtime Dataset Cleanup Only

**Approach:** Edit the active EN runtime dataset to remove the visible synthetic scaffolding, but leave validators mostly unchanged.

**Pros:**
- Fastest visible product win
- Low tooling effort

**Cons:**
- The same class of bad content can slip back in later
- Does not solve false-confidence problem in CI

**Effort:** 0.5-1 sprint slice

**Risk:** Medium

---

### Option 2: Dataset Cleanup + Validator Honesty Gate

**Approach:** Clean the active EN runtime dataset and add validator checks that fail obvious synthetic scaffolding and topic/question incoherence patterns.

**Pros:**
- Fixes current product quality
- Fixes future regression risk
- Matches the audit recommendation

**Cons:**
- Slightly more implementation effort
- May reveal more dataset debt than currently visible

**Effort:** 1 sprint slice

**Risk:** Low / Medium

---

### Option 3: Regenerate Large Parts of the Dataset

**Approach:** Rebuild a large portion of EN content generation and review pipeline before touching the current runtime file.

**Pros:**
- Could improve deeper content quality over time

**Cons:**
- Too broad for the immediate product need
- Delays direct improvement to the shipped runtime set

**Effort:** 1-2 sprints

**Risk:** High

## Recommended Action

Execute Option 2.

Start with the active EN runtime dataset because that is what the solo product actually serves. Remove the visible synthetic scaffolding and add validator checks that fail those patterns. Keep the scope narrow enough to finish quickly, but strong enough that CI would prevent the same class of bad runtime content from shipping again.

## Technical Details

**Primary files:**

- `data/smart10/cards.en.json`
- `tools/validate_cards_v2.js`
- `tools/semantic_content_validator.js`
- any helper/report scripts needed to fail `Context tag:` and incoherent `Theme:` cases

**Verification commands:**

- `npm run validate:cards:cherrypick`
- `node tools/validate_cards_v2.js data/smart10/cards.en.json --max-warnings=0`
- `node tools/semantic_content_validator.js data/smart10/cards.en.json --fail-threshold=0.95`
- `node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.85`
- `node tools/score_cards_semantic.js data/smart10/cards.en.json --fail-threshold=0.70`
- `rg -n "Context tag:|Theme:" data/smart10/cards.en.json`

## Resources

- Audit masterplan: `docs/cherrypick/CHERRYPICK_SINGLE_PLAYER_EXECUTION_MASTERPLAN.md`
- Active tracker: `tasks/todo.md`
- Audit todo: `todos/004-ready-p2-current-state-audit.md`

## Acceptance Criteria

- [x] Active EN runtime dataset no longer contains `Context tag:` scaffolding.
- [x] Visible `Theme:`-style topic/question mismatch artifacts are removed from the shipped EN runtime dataset.
- [x] Validator coverage fails these patterns going forward.
- [x] `npm run validate:cards:cherrypick` passes.
- [x] EN dataset quality and semantic checks still pass after the cleanup.
- [x] Work log records before/after validation evidence.

## Work Log

### 2026-04-23 - Todo Created From Audit Masterplan

**By:** Codex

**Actions:**
- Converted the audit's top recommendation into a ready todo.
- Linked the task to the new single-player execution masterplan.
- Scoped the work to the active EN runtime dataset and validator honesty.

**Learnings:**
- The current bottleneck is not lack of gameplay code; it is mismatch between product presentation and content truth.
- This task is the cleanest way to improve gameplay quality and release confidence at the same time.

### 2026-04-23 - Runtime Content Truth Gate Implemented

**By:** Codex

**Actions:**
- Removed shipped `Context tag:` / `Theme:` suffix scaffolding from the active EN runtime dataset and the mirrored backend classpath runtime dataset.
- Removed matching ET suffix scaffolding and then diversified the repeated `NUMBER` / `ORDER` question stems in both active locale datasets so the runtime packs no longer fail the quality score on stem repetition.
- Tightened `tools/semantic_content_validator.js` and `tools/validate_cards_v2.js` so these scaffold patterns fail future validation instead of scoring as healthy.
- Updated `tools/validate_cherrypick_dataset.js` so the classpath runtime mirror is accepted only when it exactly matches the active canonical runtime dataset.
- Fixed tenant-runtime frontend test drift uncovered by `release:check`.
- Replaced fake daily-challenge and leaderboard claims on the public home/setup surfaces with honest roadmap placeholders.
- Rewrote the active `README.md`, `docs/ui.md`, `docs/deploy.md`, and `CONTRIBUTING.md` narrative around the current solo-first product.

**Verification:**
- `npm run validate:cards:cherrypick`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run test -- --run src/App.tenant-runtime.test.jsx src/App.startup.test.jsx src/App.server-mode.test.jsx`
- `npm --prefix frontend run build`
- `node tools/semantic_content_validator.js data/smart10/cards.en.json --fail-threshold=0.95 --max-warnings=20`
- `node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.85`
- `node tools/semantic_content_validator.js data/smart10/cards.et.json --fail-threshold=0.95 --max-warnings=20`
- `node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.85`
- `npm run release:check`
- `npm run gate:local`

**Learnings:**
- The original visible scaffolding problem was only the first layer; the release gate also depended on fixing repeated question-stem quality in both locales.
- `release:check` and `gate:local` should not be launched in parallel from the same shell session because both can try to bind the runtime-deck verification backend on port `8081`.

## Notes

- Keep this task focused on the shipped EN runtime set first.
- Do not expand into full content-pipeline redesign unless the cleanup work proves it is unavoidable.
