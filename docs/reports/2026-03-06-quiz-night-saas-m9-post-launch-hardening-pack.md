# Quiz Night SaaS M9 Post-Launch Hardening Package

## Objective

Stabilize operations for the first 30 days after launch readiness, without introducing scope creep or blocking future business-model decisions.

## 30-Day Operating Cadence

### Week 1 (Day 1-7)

1. Daily KPI review (sessions started/completed, drop-off, wrong-answer rate, join/rejoin/ws failures).
2. Daily incident triage with `P0/P1` same-day response SLA.
3. Freeze non-essential feature work; allow only reliability and conversion-funnel fixes.

### Week 2 (Day 8-14)

1. Keep daily KPI reviews; add trend deltas vs Week 1 baseline.
2. Execute top `P1` hardening fixes.
3. Validate rollback trigger decisions against observed incidents.

### Week 3 (Day 15-21)

1. Move KPI review to every 48 hours if no Sev-1/Sev-2 issues.
2. Run targeted regression pack on onboarding + billing + gameplay critical path.
3. Re-prioritize backlog based on actual operational pain points.

### Week 4 (Day 22-30)

1. Prepare hardening closeout summary and carry-over backlog.
2. Confirm alert thresholds still match observed usage.
3. Hand over open medium/low items into next sprint plan.

## Operational Risk Register

| Risk | Severity | Trigger Signal | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Onboarding bootstrap failure | High | spike in startup/bootstrap error rate | roll forward hotfix, verify auth context headers + endpoint allowlist | Backend |
| Billing webhook desync | High | subscription status mismatch or duplicate event anomalies | replay-safe webhook ingest, manual reconciliation by tenant ID | Backend |
| Gameplay reliability regression | High | session completion drop + action reject spike | rollback to last green release, rerun smoke + contract tests | Backend + Frontend |
| Rejoin/connect degradation | Medium | rejoin/ws failure rates above thresholds | tune infra/timeouts, patch reconnect client handling | Frontend |
| Conversion CTA friction | Medium | pricing click -> checkout start drop | adjust prompt copy/placement, re-run funnel tests | Product + Frontend |

## KPI Watchlist and Threshold Actions

| KPI | Threshold | Action if Breached |
| --- | --- | --- |
| Drop-off rate | `> 0.35` | open `P1` investigation ticket within 24h |
| Wrong-answer rate | `> 0.45` | review card quality + UX clarity; assign content/runtime owner |
| Reconnect success rate | `< 0.90` | prioritize reconnect path patch as `P1` |
| Join failure rate | `> 0.15` | investigate room capacity/rate limiting and API errors |
| WS failure rate | `> 0.10` | validate infra route stability and websocket session lifecycle |

## Prioritized Hardening Backlog

### P0 (Immediate, Sprint S10)

1. Add persistent audit log export for onboarding + billing critical events.
2. Add automatic anomaly detector for duplicate/stale billing-event ratio.

### P1 (Near-term, Sprint S10-S11)

1. Add runtime fallback UX when onboarding bootstrap fails mid-flow.
2. Add dashboard panel for onboarding completion funnel by tenant cohort.
3. Add synthetic canary for checkout initiation endpoint.

### P2 (Planned, Sprint S11+)

1. Expand retention report to cohort slices (new vs returning hosts).
2. Add guided "next best action" prompts for replay and return loops.
3. Add operational playbook automation for incident timeline capture.

## Deferred Business Decision Backlog (Intentionally Not Blocking)

1. Final free-tier numeric limits.
2. Final Pro pricing and billing cycle packaging.
3. Branding unlock policy matrix.
4. Expansion tier strategy.

## Ownership and Escalation

1. Ops owner: Agent 0 (temporary single-owner mode)
2. Escalation window: same-day for Critical/High, next business day for Medium.
3. Rollback authority: Ops owner with backend owner concurrence.

## M9 Exit Statement

M9 is complete when:
1. this hardening package is published,
2. risk register + KPI actions are explicit,
3. prioritized backlog is assigned to follow-up sprint targets.
