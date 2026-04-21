---
status: complete
priority: p2
issue_id: "007"
tags: [code-review, product, ux, branding, strategy]
dependencies: []
---

# Define A Single Product Identity

The project still reads like three competing products: solo quiz game, join-code party game, and recurring host SaaS.

## Problem Statement

Users do not encounter one clear product promise. The home page sells fast solo play, the host side carries recurring-host SaaS language, and internal SmartIQ/white-label concepts still leak into code and navigation. This creates strategic blur before users even assess gameplay quality.

## Findings

- `README.md` explicitly describes the repo as CherryPick on the surface and SmartIQ underneath.
- The public home only exposes `Play`, `Join Game`, and `Host Game`, while host trial/sign-in routes exist separately and the `PublicLaunchPanel` that would explain them is never mounted in [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:699).
- The signed-out experience and signed-in host workspace do not form one canonical host journey; they look like different products.
- Runtime screenshots confirm strong solo-game styling on the home surface, but host/runtime language quickly shifts into operator-console framing.

## Proposed Solutions

### Option 1: Choose CherryPick as a game-first identity

**Approach:** Make solo + live play the primary promise and push host workspace features into a clearly secondary operator layer.

**Pros:**
- Stronger consumer-facing story
- Easier onboarding
- Better fit with the current visible brand

**Cons:**
- Host SaaS scope must be deprioritized or reframed

**Effort:** 2-3 days discovery + follow-up implementation

**Risk:** Medium

---

### Option 2: Choose recurring-host SaaS as the primary identity

**Approach:** Reframe the whole app around hosts and event operations, with player and solo paths explicitly secondary.

**Pros:**
- Aligns with some existing infrastructure

**Cons:**
- Conflicts with current CherryPick brand expression
- Weakens the “come here to play” product goal

**Effort:** 2-3 days discovery + follow-up implementation

**Risk:** High

## Recommended Action

Adopt CherryPick as the primary game-first identity.

Current recovery scope:

- public story centers on `PLAY`, `JOIN`, and `HOST`
- host workspace remains secondary operator tooling
- joined-player copy must stay honest about host-led live play until true multi-device participation exists

## Technical Details

**Affected files:**
- [README.md](C:/Users/Kasutaja/smartiq/README.md:1)
- [frontend/src/App.jsx](C:/Users/Kasutaja/smartiq/frontend/src/App.jsx:699)
- [frontend/src/components/home/HomeScreen.jsx](C:/Users/Kasutaja/smartiq/frontend/src/components/home/HomeScreen.jsx:40)

## Resources

- Product pivot note: [docs/cherrypick/PROJECT_PIVOT_NOTE.md](C:/Users/Kasutaja/smartiq/docs/cherrypick/PROJECT_PIVOT_NOTE.md:1)

## Acceptance Criteria

- [x] One canonical product promise is documented and visible in the first-run UI
- [x] Home, join, host, and workspace routes follow the same product hierarchy at the product-decision level used for this recovery work
- [x] Legacy SmartIQ/white-label framing is explicitly secondary in the recovery decision record

## Work Log

### 2026-04-20 - Audit Finding

**By:** Codex

**Actions:**
- Compared repo docs, home UI, and host surfaces
- Identified product-story drift between CherryPick and SmartIQ layers

**Learnings:**
- The largest UX issue is upstream of component polish: the product still lacks one chosen identity

### 2026-04-20 - Product Decision Frozen

**By:** Codex

**Actions:**
- Wrote [docs/decisions/2026-04-20-cherrypick-game-first-recovery.md](C:/Users/Kasutaja/smartiq/docs/decisions/2026-04-20-cherrypick-game-first-recovery.md:1)
- Chose CherryPick as a game-first product hierarchy for the recovery work
- Chose host-led live play as the honest current `JOIN` promise until real multi-device participation is built

**Learnings:**
- The fastest durable fix is to narrow the promise to the runtime that actually exists, then rebuild multiplayer on top of that truth
