# Closed Beta Summary

## Metadata

- Generated at: 2026-03-05T23:52:52.965Z
- Source: prometheus file (C:\Users\Kasutaja\smartiq\docs\reports\fixtures\prometheus-beta-sample.txt)
- Branch: fix/white-label-continuation
- Commit SHA: ecbebd7

## KPI Summary

| KPI | Value |
| --- | --- |
| Average game length | 341.43 s |
| Average round length | 80.37 s |
| Pass rate | 14.37% |
| Wrong-answer rate | 28.47% |
| Drop-off rate | 20.83% |
| Reconnect success rate (optional) | 90.48% |
| Room join failure rate (optional) | 7.69% |
| WebSocket connect failure rate (optional) | 5.26% |

## Raw Totals

| Metric | Total |
| --- | ---: |
| Games started | 24 |
| Games completed | 19 |
| Rounds completed | 41 |
| Turn actions (pass) | 23 |
| Turn actions (answer) | 137 |
| Answers (wrong) | 39 |
| Answers (correct) | 98 |
| Rejoin (success) | 19 |
| Rejoin (failure) | 2 |
| Join (success) | 36 |
| Join (failure) | 3 |
| WS connect (success) | 72 |
| WS connect (failure) | 4 |

## Decision Inputs

- Min games started: 1
- Min games completed: 1
- Max drop-off rate: 40.00%
- Max wrong-answer rate: 50.00%
- Min reconnect success rate (optional): disabled
- Max room join failure rate (optional): disabled
- Max WS connect failure rate (optional): disabled

## Decision

- Recommendation: `GO`
- Failed checks: 0

| Check | Result | Actual | Threshold |
| --- | --- | --- | --- |
| Games started | PASS | 24 | >= 1 |
| Games completed | PASS | 19 | >= 1 |
| Drop-off rate | PASS | 20.83% | <= 40.00% |
| Wrong-answer rate | PASS | 28.47% | <= 50.00% |

## Findings

- Top blockers:
- Player confusion points:
- Notable incident IDs:

- Required follow-up tickets (`fix/beta-findings-*`):
