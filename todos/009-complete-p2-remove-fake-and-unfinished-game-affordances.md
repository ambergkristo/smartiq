---
status: complete
priority: p2
issue_id: "009"
tags: [code-review, gameplay, ui, ux, polish]
dependencies: ["007"]
---

# Remove Fake And Unfinished Game Affordances

Several visible controls and rules suggest capabilities the runtime does not actually support.

## Problem Statement

The game presents controls and rule cues that are not wired end-to-end: difficulty looks selectable but is ignored, pass semantics still appear in UI/docs although the runtime does not support pass, and the host lobby still ships with a QR placeholder. These are credibility-killers because users experience them as broken promises, not missing enhancements.

## Findings

- Difficulty options are shown in setup but not forwarded into game creation; `buildServerGamePayload` ignores difficulty in [frontend/src/api.js](C:/Users/Kasutaja/smartiq/frontend/src/api.js:516).
- `PASS` is absent from the live action model, yet pass copy/stats still appear in [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:84) and [frontend/src/components/RoundSummary.tsx](C:/Users/Kasutaja/smartiq/frontend/src/components/RoundSummary.tsx:110).
- `QrPlaceholder` still renders demo copy in the live invite/share path in [frontend/src/components/room/QrPlaceholder.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/room/QrPlaceholder.jsx:3).
- Solo entry still routes through a placeholder screen with brittle fallback copy before the real game appears in [frontend/src/components/home/PracticePlaceholder.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/home/PracticePlaceholder.jsx:3).

## Proposed Solutions

### Option 1: Remove any affordance not backed by runtime behavior

**Approach:** Hide or delete fake controls until the implementation exists.

**Pros:**
- Immediate honesty
- Cleaner product feel
- Reduces QA noise

**Cons:**
- Temporarily shrinks perceived feature set

**Effort:** 1-2 days

**Risk:** Low

---

### Option 2: Finish the features properly

**Approach:** Wire difficulty, pass semantics, QR join, and solo entry transitions end-to-end.

**Pros:**
- Richer game
- Fewer placeholders

**Cons:**
- Significantly more scope
- Risks compounding existing architectural confusion

**Effort:** 3-6 days

**Risk:** Medium

## Recommended Action

Remove obvious fake affordances immediately, then defer deeper rules cleanup to a narrow Phase 4 pass.

## Technical Details

**Affected files:**
- [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:84)
- [frontend/src/api.js](C:/Users/Kasutaja/smartiq/frontend/src/api.js:516)
- [frontend/src/components/home/PracticePlaceholder.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/home/PracticePlaceholder.jsx:1)
- [frontend/src/components/room/QrPlaceholder.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/room/QrPlaceholder.jsx:1)

## Resources

- Runtime screenshot: [review-playflow.png](C:/Users/Kasutaja/smartiq/.tmp/review-playflow.png:1)

## Acceptance Criteria

- [x] Every visible gameplay control maps to a real runtime effect
- [x] Unsupported rules or stats are removed from UI and docs
- [x] Core invite/share surfaces contain no demo placeholders
- [x] Solo entry feels deliberate rather than fragile

## Work Log

### 2026-04-20 - Audit Finding

**By:** Codex

**Actions:**
- Compared visible setup/gameplay controls with API and engine contracts
- Verified solo route behavior and reviewed placeholder surfaces

**Learnings:**
- Product polish is currently undermined less by styling and more by visible dishonesty in the interface

### 2026-04-20 - Partial Cleanup Landed

**By:** Codex

**Actions:**
- Removed the QR demo placeholder from the host support stack
- Removed the solo placeholder screen so PLAY starts directly into solo launch
- Left difficulty and stale pass/doc cleanup for a dedicated follow-up

**Learnings:**
- The highest-leverage polish fixes were not decorative; they were the places where the interface was still obviously pretending

### 2026-04-20 - Phase 4 Honesty Cleanup Completed

**By:** Codex

**Actions:**
- Removed the cosmetic difficulty control from the public setup shell while keeping the underlying config backward-compatible
- Removed pass-oriented summary presentation and aligned runtime docs/checklists away from PASS semantics
- Updated directly affected startup expectations for the removed QR block and explicit host-leave action

**Learnings:**
- The cleanest Phase 4 move was subtraction: stop rendering unsupported choices instead of inventing transitional caveats around them
