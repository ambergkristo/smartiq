# CherryPick Recovery: Phase 0 -> Phase 3

## Scope

- [x] Freeze the product decision for CherryPick as a game-first product.
- [x] Freeze the joined-player promise for the current recovery phase.
- [x] Add authoritative room lifecycle state to the backend room contract.
- [x] Bind host launch to a room-backed game creation path.
- [x] Block late joins after room launch and surface the correct error state.
- [x] Update frontend host launch to pass `roomCode` and respect room lifecycle state.
- [x] Update player waiting-room UI copy/state to reflect waiting vs live vs closed.
- [x] Add or update focused backend/frontend tests for the touched lifecycle behavior.
- [x] Implement the chosen joined-player model as an explicit host-led live-room experience.
- [x] Consolidate canonical public flows so `PLAY`, `JOIN`, and `HOST` each have one honest entry path.
- [x] Remove duplicate public join UI from the host/setup shell and strip internal identifiers from public rosters.
- [x] Split normal navigation from destructive room-leave actions in player and host surfaces.
- [x] Run targeted verification and capture results below.

## Review

- Phase 0 decision written in `docs/decisions/2026-04-20-cherrypick-game-first-recovery.md`.
- Backend targeted tests passed: `RoomServiceTest`, `RoomControllerTest`, `GameSessionControllerTest`.
- Frontend targeted tests passed: `src/api.test.js`, `src/App.server-mode.test.jsx`.
- Local API smoke confirmed a room moves to `LIVE`, `joinable=false`, and links `activeGame.gameId` after room-backed launch.
- Browser smoke on April 20, 2026 confirmed:
  - `/` shows the new game-first CherryPick home copy
  - `#/join` renders the canonical join flow
  - `#/host` renders the canonical host flow
  - `#/start` no longer exposes a duplicate public join form
- Public join/player/host surfaces no longer show backend `playerId` values.
- Saved player room state is now resumable state, not route-owning state; `#/join/:roomCode` owns the player waiting view and home can render again without clearing storage.
- Low-cost fake-affordance cleanup completed in the same pass: removed the QR demo block from host support and removed the solo placeholder screen.
- Phase 4 honesty cleanup completed for active product surfaces:
  - public setup no longer shows cosmetic difficulty controls
  - public summary UI no longer shows pass counts
  - active runtime docs/checklists no longer advertise PASS-based gameplay
- Startup regression coverage is now aligned with the canonical flows:
  - `src/App.startup.test.jsx` passes with `JOIN` on the public join flow, `#/join/:roomCode` owning the player lobby, and `#/start` owning saved host lobby restore
- Residual follow-up is now narrower:
  - internal/legacy docs such as observability and compound governance still contain older pass-era references and should be handled in a separate documentation pass if they remain in active use
- Frontend lint gate is now restored in Sprint 1, so the earlier ESLint 9 invocation-path blocker is no longer active.

## Sprint 1: Release Gate

### Scope

- [x] Audit the current release gate, CI workflows, and local verification commands against the recovered CherryPick product shape.
- [x] Restore frontend lint as a real gate by fixing ESLint 9 + TypeScript parsing and current rule failures.
- [x] Tighten or simplify the canonical release-gate path so local and CI verification use the same command surface.
- [x] Verify the current CI-critical product path for `Play`, `Join`, and `Host` remains covered by automated tests.
- [x] Record Sprint 1 verification results and residual follow-ups below.

### Review

- Sprint 1 started on April 21, 2026 as the release-gate sprint.
- Initial audit result: CI workflows already exist (`backend-ci`, `frontend-ci`, `release-readiness`), so the first real blocker is broken frontend lint, not missing CI.
- Initial lint failure root cause:
  - ESLint was not parsing local `.ts` files in `frontend/src/state/*`
  - one real `react-hooks/exhaustive-deps` warning remained in `src/App.jsx`
- Sprint 1 gate shaping started:
  - `test:contracts:frontend` now includes `App.startup`, `App.server-mode`, and `api` so `Play/Join/Host` regressions are part of the named fast gate
  - `gate:coreflows` is now the explicit fast command for the current CherryPick product path
- Sprint 1 implementation landed:
  - frontend ESLint 9 now parses local TypeScript files via `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
  - `App.jsx` no longer carries the remaining hooks dependency warning on solo launch flow
  - CI `release-readiness` now runs `npm run gate:coreflows` before the full release gate
  - runtime deck gate now resolves a free local backend port instead of assuming `8081` is always available
  - backend tests that were asserting stale startup/runtime behavior were updated to match the current import and availability contract
- Sprint 1 verification passed on April 21, 2026:
  - `npm --prefix frontend run lint`
  - `npm run gate:coreflows`
  - `npm run release:check`
- Sprint 1 result:
  - the recovered CherryPick product path now has a real fast gate for `Play`, `Join`, and `Host`
  - the canonical full release gate is green locally end-to-end again
- Residual follow-up after Sprint 1:
  - Mockito inline agent warnings still appear during Maven runs on JDK 21 and should be cleaned up before a stricter Java upgrade
  - the repo still has broad legacy/internal docs outside the active CherryPick runtime surface; those are documentation debt, not Sprint 1 release blockers

## Sprint 2: Reliability

### Scope

- [x] Audit reconnect/resume and host/join failure-state behavior against the recovered CherryPick flow.
- [x] Fix the highest-impact dead-end in room resume/reconnect behavior.
- [x] Add or update focused automated coverage for the touched reliability paths.
- [x] Record Sprint 2 verification results and remaining reliability follow-ups below.

### Review

- Sprint 2 started on April 21, 2026 as the reliability sprint.
- Initial audit result:
  - backend room lifecycle and rejoin contracts are already covered reasonably well
  - the first high-impact remaining risk is frontend resume/reconnect behavior, where a transient `Refresh lobby` failure currently clears the saved room session and drops the user out of recovery state
- Sprint 2 reliability fix landed:
  - frontend room resume now keeps the saved room session intact for transient `NETWORK_ERROR`, `TIMEOUT`, and `5xx` failures instead of clearing recovery state
  - permanently invalid saved player sessions still clear correctly, but now hand the error copy to the player join route instead of silently dropping context
- Sprint 2 host-side hardening also landed:
  - host room resume now uses the same transient-vs-invalid recovery rules as player lobby refresh
  - invalid saved host rooms clear back to setup with visible error copy instead of silently dropping into a blank reset state
  - host room launch failures now keep the UI in setup, surface a real room error, and refresh stale room state so already-live rooms stop advertising a launchable lobby
  - host setup shell now exposes a working `Resume room` affordance beside `Leave host room`
- Sprint 2 verification passed on April 21, 2026:
  - `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.server-mode.test.jsx src/api.cherrypick.test.js`
  - `npm --prefix frontend run lint`
  - `npm run gate:coreflows`
  - `npm run release:check`
- Browser bug-bash completed on April 21, 2026 against a local frontend + H2-backed backend stack:
  - host flow created a live room successfully in the browser
  - saved host room restored correctly on `#/start` and the new `Resume room` action refreshed the lobby state
  - join-route preview showed an open waiting-room roster before launch and a closed/live roster with disabled entry after a backend-driven room launch
  - `agent-browser` was reliable for route/render verification but not for every SPA button transition; automated UI coverage remains the primary proof for the affected stepper interactions
- Sprint 2 result:
  - CherryPick now has a materially safer reconnect/resume story for both player and host room sessions
  - stale room state no longer traps the host in fake-launchable lobbies after failed start attempts
- Residual follow-up after Sprint 2:
  - Mockito inline agent warnings still remain in the Java toolchain output and should be cleaned up before a stricter JDK upgrade
  - broader recurring-host operational validation now belongs in the next sprint, not in the core reliability recovery pass

## Sprint 3: Production Ops + Pilot

### Scope

- [x] Narrow the production launch scope to the honest CherryPick game runtime (`PLAY`, `JOIN`, `HOST`, `EN`).
- [x] Harden production configuration for live room continuity and protected ops visibility.
- [x] Add a canonical post-deploy verification path that covers both public smoke and protected ops endpoints.
- [x] Remove misleading public exposure for internal-only admin surfaces.
- [x] Update active release/deploy/runbook docs to match the current launch scope and rollback path.
- [x] Run focused verification and record results below.

### Review

- Sprint 3 started on April 21, 2026 as the production-ops sprint.
- Launch scope is now explicit:
  - public CherryPick launch is `EN` + host-led `PLAY`/`JOIN`/`HOST`
  - public `/admin` is disabled by default unless `VITE_ENABLE_ADMIN_CONSOLE=true` is set intentionally for an internal environment
  - recurring-host SaaS/admin rollout is no longer implied by the public CherryPick release docs
- Production hardening landed:
  - prod room sessions now default to Redis instead of memory
  - prod `/actuator/prometheus` is now protected by the internal API key path, not anonymously exposed
  - API CORS now allows the browser methods actually used by runtime tenant routes (`PUT`, `PATCH`, `DELETE`)
- Canonical post-deploy verification landed:
  - workflow `.github/workflows/smoke-public.yml` now runs full post-deploy verification with both backend and frontend URLs
  - `npm run smoke:ops` now verifies `/version`, `/internal/pool-stats`, and `/actuator/prometheus` protection/availability
- Active ops docs are now aligned with the scoped launch path:
  - `docs/release.md`
  - `docs/deploy.md`
  - `docs/observability.md`
  - `docs/runbooks/cherrypick-launch-runbook.md`
  - `docs/beta-runbook-v1.md`
  - `docs/plans/deployment-checklist.md`
  - `docs/plans/operational-runbook.md`
- Sprint 3 verification passed on April 21, 2026:
  - `mvn -q -f backend/pom.xml -Dtest=ApplicationProdRoomSessionStoreConfigTest,InternalAccessFilterTest,CorsConfigDevTest test`
  - `npm --prefix frontend run test -- --run src/App.startup.test.jsx`
  - `npm --prefix frontend run lint`
  - `npm run gate:coreflows`
  - `npm run release:check`
- Sprint 3 result:
  - CherryPick now has a canonical deploy/runbook surface for the narrow public launch
  - prod room continuity and protected observability defaults are no longer at odds with the release docs
- Residual follow-up after Sprint 3:
  - live production rehearsal still needs real deployment URLs and secrets at rollout time, but the repo-side workflow and runbook path are now in place
  - Mockito inline agent warnings still remain in the Java toolchain output and should be cleaned up before a stricter JDK upgrade

## Large File Refactor

### Scope

- [x] Audit the largest active source files and separate intentional data files from real structural debt.
- [x] Reduce `frontend/src/App.jsx` by extracting stable constants, pure helpers, and presentational panels into dedicated modules.
- [x] Keep existing startup/server-mode coverage green after the extraction.
- [x] Record the first-pass refactor results and the next likely targets below.

## Sprint 4: Complete Restructuring

### Scope

- [x] Extract the remaining room-session and route-orchestration clusters out of `frontend/src/App.jsx`.
- [x] Split `backend/src/main/java/com/smartiq/backend/tenant/TenantService.java` into smaller runtime-access and billing/usage-focused services.
- [x] Re-audit the next-largest production files after those extractions and only continue splitting files that still carry real structural debt.
- [x] Run focused backend/frontend verification after each major extraction and capture final results below.

### Review

- Large-file audit on April 21, 2026 separated intentional bulk from real structural debt:
  - `backend/src/main/resources/data/cards.en.json` is intentionally large content data, not a structural problem
  - real code debt remains in `frontend/src/App.jsx`, `frontend/src/styles.css`, and `backend/src/main/java/com/smartiq/backend/tenant/TenantService.java`
- First-pass `App.jsx` extraction landed:
  - stable config/constants moved to `frontend/src/app/appConfig.js`
  - persistence and route/storage helpers moved to `frontend/src/app/appPersistence.js`
  - pure session/runtime helpers moved to `frontend/src/app/appSessionUtils.js`
  - startup and launch-presentational panels moved to `frontend/src/app/AppPanels.jsx`
- `frontend/src/App.jsx` dropped from roughly 3300+ lines to 2166 lines while keeping the runtime behavior intact.
- `frontend/src/styles.css` is no longer a monolith:
  - the old 4600+ line stylesheet is now a manifest that imports `frontend/src/styles/base.css`, `home.css`, `room.css`, `workspace.css`, `gameplay.css`, `responsive.css`, and `admin.css`
  - the split is mechanical and order-preserving, so no visual redesign was introduced during the refactor
- `backend/src/main/java/com/smartiq/backend/tenant/TenantService.java` got its first backend extraction:
  - support-case listing, creation, update, audit reconstruction, and validation moved into `backend/src/main/java/com/smartiq/backend/tenant/TenantSupportCaseService.java`
  - `TenantService` now delegates support-case endpoints to that dedicated service instead of carrying the whole workflow inline
  - `TenantService` dropped from 2523 lines to 2309 lines after the extraction
- `TenantService` got its second backend extraction:
  - tenant settings, runtime branding, session templates, review notes, and their JSON normalization/audit flow moved into `backend/src/main/java/com/smartiq/backend/tenant/TenantRuntimeSettingsService.java`
  - `TenantService` now delegates those runtime/settings responsibilities instead of carrying both orchestration and storage normalization inline
  - `TenantService` dropped further from 2309 lines to 1605 lines
- `frontend/src/App.jsx` got a second frontend extraction:
  - setup/game/game-over view composition moved into `frontend/src/app/GameAppViews.jsx`
  - the render monolith is now separated from the state/action logic, reducing `App.jsx` from 2166 lines to 2155 lines while moving the high-churn JSX branches out of the main file
- `backend/src/main/java/com/smartiq/backend/game/GameSessionService.java` is no longer carrying persistence DTOs inline:
  - stored session/player/peg state moved into `backend/src/main/java/com/smartiq/backend/game/GameSessionState.java`
  - JSON serialization, deserialization, and stored-state normalization moved into `backend/src/main/java/com/smartiq/backend/game/GameSessionStateCodec.java`
  - `GameSessionService` now focuses on session orchestration and dropped from 1173 lines to 806 lines
- `frontend/src/App.jsx` got a third frontend extraction:
  - runtime auth, billing recovery, branding, session templates, tenant workspace insights, and reviewed-session notes moved into `frontend/src/app/useRuntimeWorkspace.js`
  - hosted-session duplicate/review/resume/launch orchestration moved into `frontend/src/app/useHostedSessionHistory.js`
  - `App.jsx` dropped further from 2155 lines to 1582 lines while keeping the runtime shell behavior and tests green
- `frontend/src/api.js` is no longer a monolith:
  - low-level request/config helpers moved to `frontend/src/api/core.js`
  - runtime auth + tenant runtime endpoints moved to `frontend/src/api/runtime.js`
  - topics/cards content endpoints moved to `frontend/src/api/content.js`
  - server game-session endpoints moved to `frontend/src/api/game.js`
  - room/join/rejoin endpoints moved to `frontend/src/api/room.js`
  - `frontend/src/api.js` is now a 49-line public barrel that preserves the existing import surface
- `frontend/src/admin/AdminConsole.jsx` is no longer one large tab renderer:
  - branding, members, settings, subscription, and usage/audit tab content moved into `frontend/src/admin/AdminConsolePanels.jsx`
  - `AdminConsole.jsx` dropped from 989 lines to 640 lines while keeping its existing admin API wiring and tests intact
- Sprint 4 finish pass landed on April 22, 2026:
  - `frontend/src/App.jsx` no longer owns solo/gameplay lifecycle or startup/hash/config persistence inline
  - solo round lifecycle moved to `frontend/src/app/useGameplayFlow.js`
  - startup topic loading, hash-route synchronization, and config/theme persistence moved to `frontend/src/app/useAppShellLifecycle.js`
  - the remaining setup/runtime/gameplay shell cluster now renders through `frontend/src/app/AppShellSections.jsx`
  - `App.jsx` dropped again from 1187 lines to 973 lines and is now a real app container instead of the last frontend monolith
- `backend/src/main/java/com/smartiq/backend/tenant/TenantService.java` is no longer the last backend megaservice:
  - tenant create/list/detail/status/branding/member/audit admin flows moved into `backend/src/main/java/com/smartiq/backend/tenant/TenantAdminService.java`
  - `TenantService` now stays focused on orchestration across admin, runtime access, billing/usage, support, and runtime settings services
  - `TenantService` dropped from 978 lines to 402 lines
- `backend/src/main/java/com/smartiq/backend/game/GameSessionService.java` got a second cleanup pass:
  - action parsing, score/player normalization, and validation helpers moved into `backend/src/main/java/com/smartiq/backend/game/GameSessionSupport.java`
  - `GameSessionService` dropped further to 553 lines
- `backend/src/main/java/com/smartiq/backend/tenant/TenantRuntimeSettingsService.java` got a second cleanup pass:
  - host session-template and review-note catalog normalization moved into `backend/src/main/java/com/smartiq/backend/tenant/TenantRuntimeSessionCatalogSupport.java`
  - `TenantRuntimeSettingsService` dropped to 460 lines
- CSS area files no longer remain as 1k+ surfaces:
  - `frontend/src/styles/home.css`, `workspace.css`, `gameplay.css`, and `room.css` are now thin manifests importing `*.part1.css` and `*.part2.css`
  - the split is mechanical and order-preserving, so runtime styling did not change
- Verification passed on April 21, 2026:
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.server-mode.test.jsx`
  - `npm --prefix frontend run build`
  - `mvn -q -f backend/pom.xml -Dtest=TenantAdminControllerTest test`
  - `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest,BillingServiceTest" test`
  - `mvn -q -f backend/pom.xml "-Dtest=GameSessionControllerTest,RoomControllerTest,RoomServiceTest" test`
  - `npm --prefix frontend run test -- --run src/api.test.js src/api.cherrypick.test.js src/App.startup.test.jsx src/App.server-mode.test.jsx`
  - `npm --prefix frontend run test -- --run src/admin/AdminConsole.test.jsx`
  - `npm --prefix frontend run test -- --run src/api.test.js src/api.cherrypick.test.js src/App.startup.test.jsx src/App.server-mode.test.jsx src/App.tenant-runtime.test.jsx src/admin/AdminConsole.test.jsx`
- Verification passed on April 22, 2026:
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run build`
  - `npm --prefix frontend run test -- --run src/App.startup.test.jsx src/App.server-mode.test.jsx src/App.tenant-runtime.test.jsx`
  - `mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest,BillingServiceTest,GameSessionControllerTest,RoomControllerTest,RoomServiceTest" test`

## Sprint 5: CherryPick Single-Player UI

### Scope

- [x] Rebuild the frontend visual identity around a premium dark-cherry CherryPick design system.
- [x] Redesign home as a single-player-first product surface and demote `JOIN` / `HOST` to future-scope affordances.
- [x] Reframe `#/start` as a topic-select shell that supports fast solo play without reintroducing fake multiplayer prominence.
- [x] Rework gameplay and result surfaces to emphasize all-or-nothing tension, reward clarity, and progression.
- [x] Update focused frontend tests to assert the new CherryPick UI contract and run build/lint verification.

### Review

- Sprint 5 landed on April 22, 2026 as the CherryPick UI identity pass.
- Design-system reset landed in `frontend/src/styles/cherrypick-ui.css` and now overrides the older SmartIQ/green bias with:
  - dark cherry / magenta / violet token palette
  - premium `Space Grotesk` + `Manrope` typography pairing
  - consistent rounded glass-panel, chip, CTA, and answer-tile styling across home, setup, gameplay, and summary
- Home is now explicitly single-player first:
  - `frontend/src/components/home/HomeScreen.jsx` uses a left-rail app shell, a dominant `Play Solo` hero, daily challenge / leaderboard / profile cards, and disabled `Join soon` / `Host soon` placeholders
  - `PLAY` remains the immediate fast path, while `Choose topic` now exposes `#/start` as the intentional solo setup route
- Topic select is no longer framed like host setup:
  - `frontend/src/app/AppPanels.jsx` now renders `StartScreen` as a topic-first solo surface with reward/risk context and a compact runner/setup side panel
  - host/runtime sessions still use the same component without losing tenant/runtime status visibility
- Gameplay and result surfaces now match the all-or-nothing product identity more closely:
  - `QuestionCard`, `GameplayHeader`, `BoardStatusBar`, `ScoreBoard`, `SoloRoundResult`, and `RoundSummary` now keep reward state, multiplier context, and progression visible without flattening into admin/dashboard styling
  - copy now reinforces the round-risk rule instead of generic host-led language on solo-critical surfaces
- Browser polish pass landed on April 22, 2026 after live checks against the local app and the visual prototype:
  - `#/start` no longer hides the topic grid below the fold on the tested laptop-height viewport; the public solo setup now uses a denser 4-column topic grid and a smaller setup chrome footprint
  - gameplay now keeps the full 8-answer board visible in the tested viewport by compressing low-value chrome on shorter heights instead of shrinking the board into unusability
  - a second browser pass exposed an accessibility/UX gap where the gameplay action bar could still sit below the fold on very short viewports; low-height game shells now pin the action bar to the bottom so `ANSWER`, `LOCK IN`, and `NEXT ROUND` stay reachable during live play
  - runtime fail-state result flow was manually verified in-browser after that footer fix; the lock/reveal panels stay visually coherent and the fail state keeps clear consequence messaging instead of dropping into a dead-looking screen
  - solo setup regained small compatibility hooks (`host-setup-summary`, setup error/message visibility) so the runtime shell still exposes the expected recovery state without reintroducing the old bulky layout
  - the host-route startup tests were updated to reflect the actual public host flow (`#/host` / `HostGameScreen`) instead of the older `#/start` room-panel contract
- Focused verification passed on April 22, 2026:
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run build`
  - `npm --prefix frontend run test -- --run src/components/RoundSummary.test.jsx src/components/GameBoard.test.jsx src/App.startup.test.jsx src/App.server-mode.test.jsx`
  - `npm run gate:coreflows`
  - `npm run release:check`
- Final re-audit result on April 22, 2026:
  - there are no remaining 1k+ production runtime files in the active app/backend surface
  - the only 1k+ files left are large test suites such as `frontend/src/App.startup.test.jsx`, `frontend/src/App.tenant-runtime.test.jsx`, and `backend/src/test/java/com/smartiq/backend/tenant/TenantMeControllerTest.java`
  - those remaining large files are test coverage suites rather than the same production-structure debt that triggered this refactor sprint

## Sprint 6: Neon Single-Player Correction

### Scope

- [x] Remove more of the boxed dashboard feel from the solo home, topic-select, gameplay, and result surfaces.
- [x] Re-center gameplay around the 8-tile board and keep the single-player progression context inline instead of in a heavy right rail.
- [x] Keep the round flow explicit with visible `SUBMIT PICK`, `LOCK IN`, and `NEXT ROUND` actions.
- [x] Re-check the main solo screens against a browser viewport pass and focused frontend verification.

### Review

- Sprint 6 landed on April 22, 2026 as the single-player correction pass after the earlier UI identity rework still felt too card-heavy and fragmented.
- Home now uses one unified premium shell instead of a left-rail dashboard:
  - `frontend/src/components/home/HomeScreen.jsx`
  - `frontend/src/styles/cherrypick-ui.css`
  - solo play is the only dominant CTA
  - `JOIN` / `HOST` remain visibly demoted as disabled future-mode chips/buttons
- Topic select now behaves like a full-width solo setup surface instead of a constrained leftover panel:
  - `frontend/src/app/AppPanels.jsx`
  - `frontend/src/styles/cherrypick-ui.css`
  - the runner alias, topic grid, and daily-challenge context all fit in one viewport-oriented shell
- Solo gameplay now uses a wider single-column stage:
  - `frontend/src/App.jsx`
  - `frontend/src/components/GameBoard.tsx`
  - `frontend/src/components/gameplay/GameplayActionBar.jsx`
  - `frontend/src/components/gameplay/gameplayState.js`
  - the solo side scoreboard is removed from the live game shell
  - XP / reward / runner context is surfaced inline above the board
  - the board stays visible through confirm and resolution states instead of disappearing into a separate reveal screen
  - the game footer is now pinned so the next action stays reachable
- Result/XP summary now reads more like a reward screen than a report table:
  - `frontend/src/components/RoundSummary.tsx`
  - clearer success/fail badge, stronger next-round CTA, and visible level-progress meter
- Focused verification passed on April 22, 2026:
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run test -- --run src/components/GameBoard.test.jsx src/components/RoundSummary.test.jsx src/App.startup.test.jsx src/App.server-mode.test.jsx`
  - `npm --prefix frontend run build`
  - browser pass on `http://localhost:5173/`, `#/start`, and `#/play` using `agent-browser`
