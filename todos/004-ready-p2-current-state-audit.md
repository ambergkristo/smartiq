---
status: ready
priority: p2
issue_id: "004"
tags: [review, ui-ux, gameplay, product, architecture]
dependencies: []
---

# Current State Audit

Critical audit of the current SmartIQ / CherryPick product state with emphasis on UI/UX quality, gameplay flow integrity, and product identity coherence.

## Problem Statement

The current project state likely has major UX, gameplay-flow, and product-positioning issues. The repo itself already signals mixed direction: CherryPick on the surface, SmartIQ/white-label SaaS internals underneath. Without a rigorous audit, the team risks polishing implementation details while the core player experience, navigation logic, and product identity remain structurally weak.

## Findings

- Initial repo scan shows a split product identity across docs and code: `README.md` describes a CherryPick pivot layered on top of older SmartIQ foundations.
- Existing repo guidance prioritizes correctness, security, performance, and architecture, but there is no equivalent hard gate for game feel, player motivation, or interaction clarity.
- The repo uses a file-based todo workflow in `todos/`, so this audit should document concrete findings there rather than keep them implicit in chat.

## Proposed Solutions

### Option 1: Lightweight Opinion Review

**Approach:** Review only top-level docs and a few core frontend files, then provide qualitative feedback.

**Pros:**
- Fast
- Low effort

**Cons:**
- Too shallow for current request
- Misses runtime and interaction failures
- Risks false confidence

**Effort:** 1-2 hours

**Risk:** High

---

### Option 2: Structured Product + Runtime Audit

**Approach:** Review architecture and frontend implementation, run the application locally, test core player/host/join flows, then synthesize findings into prioritized todos.

**Pros:**
- Matches the user request
- Surfaces both conceptual and implementation-level issues
- Produces actionable backlog artifacts

**Cons:**
- Takes longer
- Requires runtime verification and evidence gathering

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 3: Full Redesign Discovery

**Approach:** Ignore current state details and jump straight into a full product redesign brief.

**Pros:**
- Could produce a strong future vision

**Cons:**
- Risks solving the wrong problem
- Does not establish what is actually broken today
- Weak basis for implementation sequencing

**Effort:** 1-2 days

**Risk:** High

## Recommended Action

Execute Option 2. Audit the project in two passes: first system/product analysis from repo artifacts and source, then runtime validation of the actual player experience. Convert all substantial findings into prioritized todo files so the review becomes an execution backlog rather than a loose critique.

## Technical Details

**Primary areas to inspect:**
- `README.md`
- `docs/cherrypick/`
- `frontend/src/App.jsx`
- `frontend/src/components/home/`
- `frontend/src/components/player/`
- `frontend/src/components/room/`
- `frontend/src/state/useServerGameEngine.ts`
- Backend gameplay/session endpoints backing the core flow

**Review dimensions:**
- Product identity and value proposition coherence
- First-run clarity and navigation
- Gameplay loop quality and pacing
- Join/host friction and dead ends
- Visual hierarchy and interaction affordances
- Architectural mismatches leaking into player experience

## Resources

- Repo root: `C:\Users\Kasutaja\smartiq`
- Product pivot context: `docs/cherrypick/`
- Review context: `compound-engineering.local.md`

## Review Plan

- [x] Map current product promise from docs, navigation, and information architecture
- [x] Inspect frontend gameplay and room-flow implementation for structural UX risks
- [x] Run the app locally and exercise `PLAY`, `JOIN`, and `HOST` flows
- [x] Compare observed runtime against intended product identity
- [x] Synthesize findings by severity and create concrete todo files
- [ ] Deliver a critical summary with recommendations on product direction and execution order

## Acceptance Criteria

- [ ] Core docs and repo conventions reviewed
- [ ] Core UI flows inspected in source and runtime
- [ ] Findings captured as prioritized todos
- [ ] Final review clearly separates product, UX, gameplay, and technical risks

## Work Log

### 2026-04-20 - Audit Setup

**By:** Codex

**Actions:**
- Reviewed repo-level `AGENTS.md`
- Reviewed `README.md`, `package.json`, and review configuration
- Confirmed the repository uses `todos/` as its task tracking system
- Created this audit todo to track the current review

**Learnings:**
- The repo already acknowledges a SmartIQ/CherryPick identity split
- Existing backlog is minimal and does not reflect product-quality risk
- A runtime audit is necessary; docs alone are insufficient

---

### 2026-04-20 - Audit Results

**By:** Codex

**Actions:**
- Reviewed public home, join, host, player-route, gameplay, and room components
- Ran local smoke runtime and browser-based flow inspection
- Captured runtime screenshots for home, join, deep-link join, and solo gameplay
- Verified by API that room lifecycle remains open after standalone game creation and still accepts late joins
- Ran `npm run gate:local` and confirmed the repository currently fails its backend test gate

**Learnings:**
- The dominant failure is structural, not cosmetic: the project still behaves like separate solo, room, and host products
- Multiplayer promise is not backed by a unified room-to-game lifecycle
- The repo currently has technical verification debt on top of the UX/product debt

## Notes

- This todo tracks the audit itself. Separate todo files should be created for substantive findings.
