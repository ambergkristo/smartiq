# SmartIQ MVP Execution Plan

Date: 2026-02-17  
Owner: Agent 0 (Orchestrator)  
Loop model: PLAN -> WORK -> ASSESS/REVIEW -> COMPOUND

## 1. Goal and Definition of Done

Deliver a working Smart10-style trivia MVP with:

- `make dev` as single local entrypoint for backend + frontend.
- Backend endpoints:
  - `GET /api/topics`
  - `GET /api/cards/random?topic=X`
  - `GET /api/cards/random`
  - Import mechanism from repository data (`/data/clean/*.json`).
- Frontend playable round:
  - Topic selection
  - Card fetch and display
  - Answer interaction + feedback state
  - Error/loading states
- Persistent question bank with language-ready schema.
- CI passing on PRs and on `main`.
- Compound docs updated after each merged PR:
  - `docs/compound/lessons.md`
  - `docs/compound/rules.md`

## 2. Architecture Baseline

- Monorepo apps:
  - `backend/` Spring Boot + Maven + DB migration + seed import.
  - `frontend/` React + Vite.
- Data pipeline:
  - Raw generated cards: `data/raw/*.json`
  - QA-cleaned cards: `data/clean/*.json`
  - Import reads only `data/clean`.
- Validation tool:
  - `tools/validate-cards` (Node script) checks schema and duplicates.
- DB:
  - Postgres preferred (Docker Compose for local).
  - H2 allowed for fallback dev profile.

## 3. Milestones and Agent Split

### Milestone M0: Planning and Repo Policy (Agent 0)

- Produce this plan and issues.
- Enforce git + PR + CI + compound rules.
- Track branch naming and commit issue linking.

Acceptance tests:

- Plan PR exists and is reviewable.
- GitHub issues exist for A1, A2, A3, A4 execution.

### Milestone M1: Backend Core (A1)

Scope:

- Card domain model and persistence.
- Migrations for cards table and indexes.
- Repository + service for random card by topic and overall random.
- REST controllers for required endpoints.
- Import path (boot-time import from `data/clean` chosen for MVP).
- Unit/integration tests for endpoints and import.

Acceptance tests:

- `cd backend && mvn -q test`
- `GET /api/topics` returns topic counts.
- `GET /api/cards/random?topic=...` returns topic-matching card.
- `GET /api/cards/random` returns any card.

### Milestone M2: Content QA + Pipeline (A2)

Scope:

- Define JSON schema contract for card files.
- Create `tools/validate-cards` to verify:
  - required fields
  - options length = 10
  - valid answer encoding
  - duplicates by normalized question/topic/language
- Produce cleaned datasets in `data/clean`.
- Ensure at least 20 cards/topic in initial set.

Acceptance tests:

- `node tools/validate-cards.js data/clean`
- Validation fails for malformed sample, passes for clean files.
- Import uses only clean files.

### Milestone M3: Frontend Playable UI (A3)

Scope:

- Vite React app with:
  - Start screen topic selection
  - Game round view
  - API integration with backend endpoints
  - Loading/error/empty states
- UI strings isolated for future locale support.

Acceptance tests:

- `cd frontend && npm ci && npm run lint && npm run build`
- Manual flow:
  - Open app
  - Load topics
  - Start round
  - Fetch and answer card

### Milestone M4: DevOps + CI + Local Runtime (A4)

Scope:

- `make dev` starts backend + frontend.
- Docker Compose for Postgres (and optional admin tool).
- GitHub Actions hardened for backend + frontend on PRs.
- README updated with exact run/test commands.

Acceptance tests:

- `make dev` boots full stack.
- `docker compose up -d` works for DB dependency.
- PR checks pass end-to-end.

## 4. Branch and PR Strategy

- Branch naming:
  - `feat/<feature-name>`
  - `fix/<bug-name>`
  - `chore/<infra-change>`
- Never commit directly to `main`.
- Commit messages include issue reference:
  - Example: `feat(backend): add random card endpoint (#1)`
- Merge only after CI passes.

## 5. Execution Sequence

1. Open this plan PR (`chore/initial-plan`).
2. Create milestone issues with acceptance criteria and ownership.
3. Execute A1-A4 in parallel via separate branches/PRs.
4. Integrate in small PRs; fix CI failures on same branch.
5. Run ASSESS checks locally before merge:
   - `cd backend && mvn -q test`
   - `cd frontend && npm ci && npm run lint && npm run build`
   - `make dev` + manual round test
6. For each merged PR, update compound docs and include in PR summary:
   - what was hard
   - what broke
   - rule to prevent recurrence

## 6. Exact Local Commands

Repository bootstrap:

```bash
git clone https://github.com/ambergkristo/smartiq.git
cd smartiq
cp .env.example .env
```

Backend check:

```bash
cd backend
mvn -q test
cd ..
```

Frontend check:

```bash
cd frontend
npm ci
npm run lint
npm run build
cd ..
```

Data validation:

```bash
node tools/validate-cards.js data/clean
```

Full local runtime:

```bash
docker compose up -d
make dev
```

## 7. Risks and Mitigations

- Risk: Data quality causes runtime failures.
  - Mitigation: Gate import with validator and reject invalid rows.
- Risk: Random selection SQL differs by DB vendor.
  - Mitigation: Abstract random query in service; integration tests.
- Risk: CI drift between local and GitHub runners.
  - Mitigation: Pin Java/Node versions and keep commands identical.

## 8. Output Tracking

Agent 0 tracks and reports after each loop:

- Issue links
- PR links
- Commands executed
- CI status
- Compound updates
