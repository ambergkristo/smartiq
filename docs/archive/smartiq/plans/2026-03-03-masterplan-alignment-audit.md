---
title: Masterplan alignment audit
type: audit
status: completed
date: 2026-03-03
owner: Agent 0
---

> This document was archived after the project pivot from SmartIQ to CherryPick.

# SmartIQ Masterplan Alignment Audit (2026-03-03)

Scope audited against:
- `docs/plans/operational-readiness-masterplan.md`
- `docs/plans/2026-03-03-feat-operational-readiness-completion-plan.md`
- SmartIQ Roadmap v3 (Turn-based Party Mode - Authoritative Server)

Audit method:
- Repository structure and implementation review
- Workflow and config review
- Runtime command verification on local snapshot
- No code changes during audit

Verified commands executed in this audit:
- `mvn -q -f backend/pom.xml test`
- `npm --prefix frontend run test -- --run`
- `npm run release:check`
- `node tools/audit_locale_coverage.js data/smart10 --required=en,et --min-per-combo=30`
- `node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.80`
- `node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80`
- `node tools/score_cards_semantic.js data/smart10/cards.en.json --fail-threshold=0.70`
- `node tools/score_cards_semantic.js data/smart10/cards.et.json --fail-threshold=0.70`
- `node tools/report_semantic_locale_parity.js --min-category-score=NUMBER:0.90,COLOR:0.95 --max-short-option-ratio=NUMBER:0.40,COLOR:0.10 --max-locale-score-gap=0.02 --max-locale-warning-gap=10 --fail-on-exceed`

Backend test aggregate verified from surefire XML:
- tests: 178
- failures: 0
- errors: 0
- skipped: 0

---

## 1. Executive Status Snapshot (Max 12 bullets)

- Operational-readiness docs are marked complete and signed off in repo:
  - `docs/plans/operational-readiness-masterplan.md`
  - `docs/plans/2026-03-03-feat-operational-readiness-completion-plan.md`
- Backend test suite passed in this audit run: 178/0/0.
- Frontend test suite passed in this audit run: 64 tests, 0 failed.
- Full release gate passed in this audit run: `npm run release:check`.
- Migration integrity checks are implemented and active (script + tests).
- Dataset quality gates and semantic parity gates are active and passing.
- Anti-repeat deck logic is implemented and tested (including relax order).
- API canonicalization is only partial: legacy endpoints still exist outside prod.
- Frontend architecture is only partial for Sprint 2 readiness: dual-engine model remains.
- Security posture is improved but still broad at HTTP policy level (`permitAll` default route policy).
- Overall readiness score: 7.8/10.
- Confidence level: Medium-High.

---

## 2. Masterplan Alignment Matrix

| Masterplan Area | Status (DONE / PARTIAL / MISSING) | Evidence (files/tests) | Risk Level | Required Action |
| --- | --- | --- | --- | --- |
| Operational Readiness | DONE | `docs/plans/operational-readiness-masterplan.md`, `docs/plans/2026-03-03-feat-operational-readiness-completion-plan.md`, `npm run release:check` PASS | Low | Keep release gate as baseline |
| Migration Integrity | DONE | `tools/validate_flyway_migrations.js`, `backend/src/test/java/com/smartiq/backend/migration/FlywayMigrationConsistencyTest.java`, `backend/src/test/java/com/smartiq/backend/migration/FlywayEmptyDatabaseSmokeTest.java` | Low | No immediate change |
| Dataset Quality Gate | DONE | `tools/run_release_readiness_check.js`, `backend/src/main/java/com/smartiq/backend/config/CardImportRunner.java`, `backend/src/test/java/com/smartiq/backend/config/CardImportRunnerTest.java` | Medium | Raise thresholds after NUMBER cleanup |
| Anti-repeat Deck Logic | DONE | `backend/src/main/java/com/smartiq/backend/card/NextRandomCardService.java`, `backend/src/test/java/com/smartiq/backend/card/NextRandomCardServiceTest.java`, runtime deck gate in `tools/verify_runtime_deck_gate.js` | Low | Keep runtime deck gate blocking |
| API Canonicalization | PARTIAL | `frontend/src/api.js` uses `/api/cards/nextRandom`; legacy paths remain in `backend/src/main/java/com/smartiq/backend/card/CardController.java` | Medium | Retire legacy routes and stale rate-limit bucket |
| Smart10 Parity (Gameplay) | PARTIAL | Backend parity tests in `backend/src/test/java/com/smartiq/backend/game/GameSessionServiceTest.java`; single-player frontend fallback to local engine in `frontend/src/App.server-mode.test.jsx` | High | Make frontend server-authoritative for all player counts |
| Frontend Architecture | PARTIAL | Dual engines in `frontend/src/App.jsx`; overlapping state logic in `frontend/src/state/useGameEngine.ts` and `frontend/src/state/useServerGameEngine.ts` | High | Collapse to single authoritative path |
| Backend Architecture | PARTIAL | Good service-layer split; permissive security policy in `backend/src/main/java/com/smartiq/backend/config/SecurityConfig.java` | Medium | Tighten access policy and remove transitional paths |
| CI/CD Enforcement | PARTIAL | `.github/workflows/release-readiness.yml`, `.github/workflows/backend-ci.yml`, `.github/workflows/frontend-ci.yml`, plus release-readiness docs | Medium | Verify branch protection settings in GitHub |
| Deployment Reliability | PARTIAL | `tools/validate-deploy-env.js`, `tools/ensure-frontend-api-base.js`, `docs/plans/deployment-checklist.md` | Medium | Validate live env and required checks externally |

---

## 3. Backend Integrity Audit

### Flyway migration chain consistency
- Verified by:
  - `tools/validate_flyway_migrations.js`
  - `backend/src/test/java/com/smartiq/backend/migration/FlywayMigrationConsistencyTest.java`
  - `backend/src/test/java/com/smartiq/backend/migration/FlywayEmptyDatabaseSmokeTest.java`
- Status: consistent in current snapshot.

### Phantom migrations
- No phantom migrations detected in current chain (`V1..V4` + `R__seed_core_data.sql`).
- Status: no evidence of phantom files in current repo snapshot.

### Card import threshold enforcement
- Code path:
  - threshold logging and metric gauge in `CardImportRunner`
  - fail-fast branch when `failOnThreshold` is true
- Tests:
  - `CardImportRunnerTest.failsWhenCategoryThresholdsMissingAndFailOnEnabled`
  - `CardImportRunnerTest.recordsCountOfCategoriesBelowThresholdAsMetric`
- Status: enforced in code and tested.

### `/nextRandom` canonical endpoint and protection
- Canonical endpoint present at `GET /api/cards/nextRandom` in `CardController`.
- Request validation tested extensively in `CardControllerTest`.
- Prod deprecation behavior tested in `CardControllerDeprecationHeadersProdTest`.
- Rate limiting includes `/api/cards/nextRandom` in `RateLimitFilter`.

### Rate limit consistency
- Explicit buckets in `RateLimitFilter`:
  - `/api/cards/next` and `/api/cards/nextRandom`
  - `/api/session/answer`
  - `/api/game*`
  - `/api/rooms*`
  - `/ws/rooms/*`
- Tests in:
  - `RateLimitFilterTest`
  - `RateLimitForwardedHeaderHardeningTest`
  - `RateLimitCounterPruningTest`

### Hidden local-only config
- No hidden local-only code path detected in audited files.
- Profile behavior is explicit across:
  - `application.yml`
  - `application-local.yml`
  - `application-dev.yml`
  - `application-prod.yml`
- Postgres preflight password guard is present and tested:
  - `PostgresDatasourcePreflightEnvironmentPostProcessor`
  - `PostgresDatasourcePreflightEnvironmentPostProcessorTest`

### Findings
- Dead/stale endpoint rule: rate limiter still has `/api/session/answer` bucket, but no current controller endpoint for it.
- Duplicate/transitional surface: legacy card endpoints (`/cards/random`, `/cards/next`) still present outside prod.
- Controller leakage: limited; controllers mostly delegate. Room join includes expected orchestration broadcasting.
- Critical logic test coverage: strong on card/session/room/ws/rate-limit/migrations. Residual risk is full end-to-end multi-component integration under load.

---

## 4. Frontend Integrity Audit

### Frontend reliance on local engine
- Yes, local engine is still active in runtime fallback path:
  - imports both `useGameEngine` and `useServerGameEngine` in `App.jsx`
  - server mode requires `parsedPlayers.length >= 2`
  - single-player starts local engine fallback

### Single API abstraction layer
- Yes, API calls are centralized in `frontend/src/api.js`.
- Raw `fetch` is inside API layer helper (`fetchJson`).

### `/nextRandom` default
- Yes, `fetchNextCard` uses `/api/cards/nextRandom`.

### Stale endpoint references
- No runtime frontend references found to `/api/cards/random` or `/api/cards/next`.

### Duplicated state logic
- Yes:
  - `useGameEngine.ts` (local rules/state)
  - `useServerGameEngine.ts` (snapshot mapping + transition handling)
- Risk: client-side transition logic can drift from authoritative server contract.

### Smart10 parity gaps visible in structure
- Server path exists and is tested, but not exclusive.
- Single-player still bypasses authoritative path in normal runtime.

### Frontend architecture quality rating
- 6.7/10.

---

## 5. Data Quality & Safety Audit

### Dataset distribution confirmation
- EN: 1080 cards
- ET: 1080 cards
- Categories: 6 x 180 per locale
- Topics: 6 x 180 per locale
- Source: `smartiq-v2`
- Validation commands passed:
  - `validate_cards_v2` (EN/ET)
  - locale coverage audit

### Quality threshold logic
- Current CI quality threshold: 0.80.
- Current CI semantic threshold: 0.70.
- Semantic parity gate enabled with `--fail-on-exceed`.
- All checks passed in this audit run.

### Fail-on-threshold enforcement in CI
- Quality/semantic/parity are blocking in release gate.
- Import-time category threshold fail-fast exists in backend code; activation depends on runtime property configuration (`smartiq.import.fail-on-category-threshold` / env).

### Placeholder / low-value content
- `validate_cards_v2` warnings: 0 for both locales.
- Semantic warnings concentrated in NUMBER category terse options:
  - semantic score per locale: 0.984
  - NUMBER semantic score: 0.904
  - NUMBER short-option ratio: 38.9% (under 40% cap, close to boundary)

### Anti-repeat relax order determinism
- Implemented in `NextRandomCardService.pickWithRelaxation`:
  - `cardId -> topic -> category`
- Covered by `NextRandomCardServiceTest`.

### Current and recommended thresholds
- Current quality threshold: 0.80.
- Recommended next threshold: 0.85 after NUMBER-option cleanup.

### Dataset diversity risk
- Primary risk is linguistic richness in NUMBER options, not schema validity.

---

## 6. CI/CD & DevEx Audit

### GitHub workflows present
- `.github/workflows/release-readiness.yml`
- `.github/workflows/backend-ci.yml`
- `.github/workflows/frontend-ci.yml`
- `.github/workflows/smoke-public.yml`
- `.github/workflows/runtime-smoke-et.yml`
- `.github/workflows/content-refresh.yml`

### Required checks
- Docs recommend making `release-readiness / release-readiness` the required status check.
- Not verifiable from current repo snapshot whether branch protection is actually configured in GitHub settings.

### Vercel preview build blocking
- Docs recommend keeping preview deployments non-required.
- Not verifiable from current repo snapshot whether that GitHub setting is currently enforced.

### Deployment gating correctness
- Frontend deploy guard exists:
  - `tools/ensure-frontend-api-base.js`
- Deploy env validation exists:
  - `tools/validate-deploy-env.js`

### Backend boot reliability
- Postgres password preflight guard exists and tested.
- Runtime deck gate can boot local backend and verify health/data readiness.

### Frontend boot reliability
- Startup failure and retry behavior covered in `App.startup.test.jsx`.

### Local dev command consistency
- Strong script coverage in root `package.json`.
- Minor mismatch:
  - `.env.example` has `FRONTEND_PORT=3000`
  - Vite config defaults to `5173`.

### Port and proxy consistency
- No Vite proxy used; explicit `VITE_API_BASE_URL` contract is clear.

### Overall CI/CD & DevEx risk rating
- Medium.

---

## 7. Roadmap v3 Readiness Check

Decision:
- YES - safe to begin

Rationale:
- Operational hardening checks are active and passing now.
- Server-authoritative backend core (`/api/game`, action tokens, replay protection, metrics) is implemented and tested.
- Main blocker is architectural debt in frontend dual-engine path, but this is manageable as Sprint 2 Task #1.

Important verification caveat:
- SmartIQ Roadmap v3 file is not present in current repo snapshot (search returned no matching roadmap/authoritative roadmap file).
- Therefore direct line-by-line roadmap alignment is not fully verifiable from current snapshot.

---

## 8. Critical Risks (Ranked Top 7)

1) Dual frontend engines can drift from server rules
- What could break: gameplay parity defects.
- Why: local and server state machines coexist.
- Mitigation: force single authoritative runtime path; keep local engine test-only.
- Owner: frontend.

2) Roadmap baseline ambiguity
- What could break: sprint scope drift and mismatched "done".
- Why: roadmap v3 artifact missing from repo.
- Mitigation: commit canonical roadmap document and acceptance gates.
- Owner: product/architecture.

3) Broad security allow policy
- What could break: accidental endpoint exposure as system grows.
- Why: `SecurityConfig` currently permits all requests by default.
- Mitigation: explicit allowlist and deny-by-default for non-public routes.
- Owner: backend.

4) Runtime dataset threshold may not fail fast by default
- What could break: weak datasets can boot with warnings.
- Why: fail-fast depends on property/env value.
- Mitigation: enforce prod defaults and validate at deploy time.
- Owner: data/backend/infra.

5) Transitional API surface
- What could break: client confusion and mixed-limit behavior.
- Why: legacy card endpoints still exist outside prod and stale limiter bucket remains.
- Mitigation: retire legacy endpoints and remove dead limiter branch.
- Owner: backend.

6) In-memory game/room state
- What could break: restart continuity and horizontal scaling.
- Why: server state is process-local in-memory.
- Mitigation: Redis-backed stores with fallback strategy.
- Owner: backend/infra.

7) External CI settings not enforceable from repo alone
- What could break: reduced gate strength if branch protection drifts.
- Why: required checks and preview blocking are GitHub settings, not code-only.
- Mitigation: policy audit checklist and periodic verification.
- Owner: infra.

---

## 9. Next Action Plan

### Do This Now (Single Task)

Task:
- Frontend authoritative-only runtime path (remove local-engine fallback in normal runtime).

Branch name suggestion:
- `feat/s2-authoritative-ui-single-path`

Acceptance criteria:
- App starts server session for 1+ players in normal runtime.
- Local `useGameEngine` path is disabled outside explicit test/dev override.
- `App.server-mode.test.jsx` expectations updated for authoritative single-player path.
- Full release gate passes.

Exact commands to run:
```powershell
git checkout -b feat/s2-authoritative-ui-single-path
npm --prefix frontend run test -- --run
mvn -q -f backend/pom.xml test
npm run release:check
```

### Next 5 Tasks (Ordered)

1) Task
- Branch: `feat/s2-authoritative-ui-single-path`
- Owner: frontend
- Why it matters: removes parity drift risk and unblocks Sprint 2 architecture.
- Acceptance criteria: no local fallback in normal runtime; tests and gate pass.
- Blocking dependencies: none.

2) Task
- Branch: `test/s2-server-engine-contracts`
- Owner: frontend + backend
- Why it matters: protects snapshot/action contract from drift.
- Acceptance criteria: dedicated `useServerGameEngine` tests with contract fixtures; CI green.
- Blocking dependencies: task 1.

3) Task
- Branch: `refactor/api-retire-legacy-cards`
- Owner: backend
- Why it matters: finalizes canonical API and reduces transition complexity.
- Acceptance criteria: legacy card endpoints retired; stale `/api/session/answer` limiter rule removed; docs updated.
- Blocking dependencies: task 1 recommended.

4) Task
- Branch: `chore/prod-dataset-failfast`
- Owner: data + backend + infra
- Why it matters: prevents weak dataset startup in production.
- Acceptance criteria: production config enforces threshold fail-fast; deploy checklist confirms setting.
- Blocking dependencies: none.

5) Task
- Branch: `feat/s2-session-store-redis`
- Owner: backend + infra
- Why it matters: needed for resilient authoritative multiplayer continuity.
- Acceptance criteria: Redis-backed session/room state behind abstraction; restart continuity tests pass.
- Blocking dependencies: task 1 recommended.
