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
