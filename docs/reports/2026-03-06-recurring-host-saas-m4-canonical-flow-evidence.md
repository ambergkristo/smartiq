---
title: Recurring host SaaS M4 canonical flow evidence
type: report
status: completed
date: 2026-03-06
track: recurring-host-saas
milestone: M4
---

# Recurring Host SaaS M4 Canonical Flow Evidence

## Metadata

- Date: 2026-03-06
- Branch: `fix/white-label-continuation`
- Track: `recurring-host-saas`
- Milestone: `M4 Full Host/Join/Replay Canonical Flow`
- Promotion status: `DONE`

## Gate Commands

The following milestone-grade checks executed successfully in the current workspace:

1. `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.tenant-runtime.test.jsx src/App.server-mode.test.jsx src/App.test.jsx src/App.smoke.test.jsx src/api.test.js`
2. `mvn -q -f backend/pom.xml "-Dtest=RoomControllerTest,GameSessionControllerTest,GameSessionServiceTest,RoomServiceTest,RoomWebSocketHandlerTest,RoomWsGatewayTest" test`
3. `npm --prefix frontend run build`
4. `npm run validate:masterplan:refs`
5. `npm run validate:no-bom:docs`

## Definition Of Done Mapping

### 1. Every room and live session is tenant-scoped

Observed result:

1. room preview, join, rejoin, create, and host-created live-session paths all resolve against tenant runtime context when present,
2. host-created rooms record tenant-scoped audit activity,
3. host history review, resume-live, and duplicate launch operate through tenant-bound game-session reads and writes,
4. cross-tenant room/game access tests remain green while the canonical host workspace features are active.

### 2. Hosts can create, launch, replay, and review session history from product UI

Observed result:

1. hosts can create a live room and reuse the saved roster directly in session setup,
2. recent hosted sessions are visible in a dedicated host workspace card instead of only a flat audit feed,
3. host history supports review, resume-live, duplicate setup, and duplicate launch actions,
4. recent-session detail now behaves like a master-detail session-management workspace with the selected session as the control surface.

### 3. Branding is visible and consistent on both host and player surfaces

Observed result:

1. runtime tenant branding continues to theme the host workspace,
2. room join/rejoin snapshots include tenant branding,
3. player lobby renders branded app identity after join or resume,
4. dedicated public player join route preview also renders tenant branding before join.

### 4. Cross-tenant leakage tests and policy tests are green

Observed result:

1. room controller, room service, room websocket, game-session controller, and game-session service suites all passed,
2. recent-history review, duplicate, and resume-live flows remain covered by tenant-runtime frontend tests,
3. room preview and branded join surface are covered by startup tests for the canonical player-entry route.

### 5. Full host/join/replay canonical flow works without operator intervention

Observed result:

1. host flow now covers create room, invite players, import roster, launch session, review history, resume live sessions, and duplicate past sessions from product UI,
2. player flow now covers direct room-code join and a dedicated public `#/join/<ROOMCODE>` entry surface,
3. saved player sessions reopen into a dedicated branded lobby instead of falling back into host setup surfaces,
4. the full host/join/replay/history flow no longer depends on manual headers or operator-only runtime steps.

## Scope Delivered

1. tenant-scoped room preview endpoint and frontend room-preview API,
2. dedicated public player join route with preview, join, resume, and back-to-shell behavior,
3. branded player lobby and branded public player-entry surface,
4. host workspace recent-session master-detail controls for review, resume-live, duplicate setup, and duplicate launch,
5. live/completed host-history filtering and completed-session audit synthesis,
6. route and workspace regression coverage across startup, tenant-runtime, room, and game-session suites.

## Promotion Decision

`M4 Full Host/Join/Replay Canonical Flow` is promotable and marked `DONE` because:

1. milestone gate checks are green,
2. host create/join/live/replay/history flows are product-visible and end-to-end test-backed,
3. player entry is now a first-class branded public route instead of only an embedded room form,
4. tenant-scope and policy checks remain green for room, session, and history actions.

The next active milestone is `M5 Paid Value and Entitlement Enforcement`.
