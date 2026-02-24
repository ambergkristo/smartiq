# Closed Party Beta Runbook (v1)

This runbook defines how to execute the first closed Party Beta for SmartIQ.

## 1. Goal

- Validate real multiplayer usability with real groups.
- Confirm room create/join + reconnect flow works under normal usage.
- Collect actionable data for the next fix-only sprint.

## 2. Entry Criteria (Must All Pass)

1. `main` is green on required CI checks.
2. Local gate passes on release candidate commit:
   - `npm run release:check`
3. Production/staging smoke passes:
   - `BACKEND_URL=https://<backend-domain> npm run smoke:test`
4. Branch protection stays enforced on `main`.

## 3. Tester Cohort (Closed Beta Size)

- Total testers: `20-50`.
- Suggested split:
  - `8-15` core team + friends (high context)
  - `12-35` external casual players (low context)
- Device mix target:
  - Desktop Chrome/Edge/Firefox
  - Mobile Safari + Chrome

## 4. Environment Setup

1. Deploy current `main` to backend + frontend.
2. Confirm API and app URLs:
   - Backend: `https://<backend-domain>`
   - Frontend: `https://<frontend-domain>`
3. Run smoke:
   - `BACKEND_URL=https://<backend-domain> npm run smoke:test`
4. Run quick manual check:
   - create room
   - join room with second client
   - answer/pass once
   - refresh joined client and verify rejoin works

## 5. Tester Onboarding Script

Send testers a short script:

1. Open `https://<frontend-domain>`.
2. Host creates room and shares room code.
3. Other players join room code.
4. Play until game end (30 points).
5. During one round, one player refreshes page and rejoins.
6. Submit feedback form.

## 6. Feedback Collection

- Form link placeholder:
  - `https://<feedback-form-url>`
- Required questions:
  - session id / room code
  - number of players
  - did game finish to 30 points (`yes/no`)
  - any reconnect issue (`yes/no` + short description)
  - biggest confusion point
  - overall rating (`1-5`)

## 7. Metrics to Collect (Mandatory)

Track these for beta summary:

1. Average game length
   - definition: game start to game end
2. Average round length
   - definition: round start to round end
3. Pass rate
   - definition: `pass actions / all turn actions`
4. Wrong-answer rate
   - definition: `wrong answers / all answers`
5. Drop-off rate
   - definition: `started games without completed game end / started games`

Optional but recommended:

- reconnect success rate
- room join failure rate

Prometheus query reference for mandatory KPIs:

- `docs/observability.md` -> `Party Beta KPI Queries`

## 8. Daily Ops During Beta

1. Export previous 24h feedback.
2. Group issues by severity:
   - `P0`: game-breaking/data-loss/security
   - `P1`: major flow blocker
   - `P2`: polish/confusion
3. Open fix tickets for P0/P1 only during active beta window.
4. Keep feature work frozen (no scope expansion).

## 9. Exit Criteria for Beta Window

- No unresolved `P0`.
- Reconnect flow succeeds in sampled sessions.
- Drop-off trend is understood and actionable.
- Top 5 usability blockers are converted into concrete fix tickets.

## 10. Artifacts to Produce

At beta close, publish:

1. `docs/reports/beta-summary-<date>.md`
   - Generate baseline from metrics:
     - `BACKEND_URL=https://<backend-domain> npm run report:beta:summary`
   - Optional strict gate (non-zero exit on NO-GO):
     - `BACKEND_URL=https://<backend-domain> npm run report:beta:summary -- --min-started-games=20 --min-completed-games=15 --max-dropoff=0.35 --max-wrong-answer=0.45 --fail-on-no-go`
2. List of prioritized fixes (`fix/beta-findings-*` branches)
3. Go/No-Go recommendation for broader rollout
