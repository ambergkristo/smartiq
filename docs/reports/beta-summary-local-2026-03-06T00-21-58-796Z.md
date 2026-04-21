# Closed Beta Summary

## Metadata

- Generated at: 2026-03-06T00:21:59.069Z
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

- Min games started: 20
- Min games completed: 15
- Max drop-off rate: 35.00%
- Max wrong-answer rate: 45.00%
- Min reconnect success rate (optional): 90.00%
- Max room join failure rate (optional): 15.00%
- Max WS connect failure rate (optional): 10.00%

## Decision

- Recommendation: `GO`
- Failed checks: 0

| Check | Result | Actual | Threshold |
| --- | --- | --- | --- |
| Games started | PASS | 24 | >= 20 |
| Games completed | PASS | 19 | >= 15 |
| Drop-off rate | PASS | 20.83% | <= 35.00% |
| Wrong-answer rate | PASS | 28.47% | <= 45.00% |
| Reconnect success rate | PASS | 90.48% | >= 90.00% |
| Room join failure rate | PASS | 7.69% | <= 15.00% |
| WS connect failure rate | PASS | 5.26% | <= 10.00% |

## Findings

- Top blockers:
- Player confusion points:
- Notable incident IDs:

- Required follow-up tickets (`fix/beta-findings-*`):
