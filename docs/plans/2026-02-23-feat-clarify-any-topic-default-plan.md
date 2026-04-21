---
title: feat: Clarify Any Topic default in setup
type: feat
status: active
date: 2026-02-23
---

# feat: Clarify Any Topic default in setup

## Overview
Improve onboarding speed for casual players by making the default Topic choice (“Any Topic”) feel intentional and obvious on the setup screen. This is a UI-only clarity pass: keep the existing behavior and defaults, but reduce hesitation at the first decision point.

## Problem Statement / Motivation
Casual players hesitate on the setup screen because the default Topic isn’t clearly explained. The UI currently shows “Any Topic” with a small “Random deck” label, but it doesn’t signal that it’s the recommended default. This slows onboarding and creates uncertainty before the first game.

## Proposed Solution
Add a small clarity treatment to the “Any Topic” tile that communicates it as the default and explains what it means (randomized topic mix). Keep the same selection logic and storage behavior (`config.topic === ''`).

Examples of treatments (choose one during implementation):
- Add “Recommended” badge to the Any Topic tile
- Replace “Random deck” label with a clearer phrase (e.g., “Mix of all topics”)
- Add a short helper line beneath the Topic header explaining the default

## Technical Considerations
- **Primary UI location**: `frontend/src/App.jsx` StartScreen topic grid.
- **Styling**: `frontend/src/styles.css` topic tile styles.
- **State**: `config.topic` uses empty string for Any Topic; avoid logic changes.
- **Accessibility**: ensure any badge/label is readable and doesn’t reduce contrast.

## System-Wide Impact
- **Interaction graph**: Setup screen only. No API or backend changes.
- **Error propagation**: none (copy/styling changes only).
- **State lifecycle risks**: none; no changes to stored config.
- **API surface parity**: unchanged.
- **Integration test scenarios**: update UI tests if copy/labels change.

## SpecFlow Notes (Gaps Addressed)
- Clarify how “Any Topic” is communicated without altering selection logic.
- Ensure the selected default remains obvious after page reload (stored config).
- Confirm behavior for topicless setups (topics empty / loading).

## Acceptance Criteria
- [ ] “Any Topic” is visually distinguished as the default choice without changing its behavior.
- [ ] Copy explains that “Any Topic” means a randomized mix across all topics.
- [ ] Setup still defaults to `config.topic === ''` when no prior selection exists.
- [ ] Existing topic selection and “Active filter” line continue to work.
- [ ] UI tests updated if any visible copy changes.

## Success Metrics
- Shorter time-to-start in informal testing (e.g., fewer pauses before “Start game”).
- Fewer user questions about what “Any Topic” means.

## Dependencies & Risks
- **Risk**: Copy change could make tests brittle if they assert on labels.
- **Dependency**: None beyond frontend build/test.

## References & Research
- StartScreen topic grid: `frontend/src/App.jsx`
- Topic tile styles: `frontend/src/styles.css`
- UI flow reference: `docs/ui.md`
- Startup/UI tests (likely to touch): `frontend/src/App.startup.test.jsx`, `frontend/src/App.smoke.test.jsx`
