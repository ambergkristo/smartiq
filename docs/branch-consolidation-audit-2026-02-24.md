# Branch Consolidation Audit - 2026-02-24

Generated: 2026-02-24 22:19:35 +02:00

## Scope

- Repo: ambergkristo/smartiq
- Base branch: origin/main
- Branches checked: top 30 most recently updated remote branches (excluding main)
- Open PRs skipped from consolidation: none (gh pr list --state open returned empty)

## Summary

- Checked branches: **30**
- Branches with ahead > 0: **30**
- ahead > 0 but not merged PR: **1**
- Consolidation PRs created in this audit pass: **none**

## Branch Table (Top 30 Recent)

| Branch | Ahead | Behind | PR State | PR | Routing |
| --- | ---: | ---: | --- | --- | --- |
| chore/semantic-parity-blocking-20260224 | 2 | 2 | MERGED | [#307](https://github.com/ambergkristo/smartiq/pull/307) | Skip |
| chore/semantic-gate-070-blocking-20260224 | 1 | 1 | MERGED | [#306](https://github.com/ambergkristo/smartiq/pull/306) | Skip |
| fix/test-smoke-order-timeout-stability-20260224 | 1 | 1 | MERGED | [#305](https://github.com/ambergkristo/smartiq/pull/305) | Skip |
| feat/data-locale-parity-gate-20260224 | 1 | 1 | MERGED | [#304](https://github.com/ambergkristo/smartiq/pull/304) | Skip |
| feat/data-semantic-number-pass-20260224 | 1 | 1 | MERGED | [#303](https://github.com/ambergkristo/smartiq/pull/303) | Skip |
| chore/data-semantic-warning-budget-20260224 | 1 | 1 | MERGED | [#302](https://github.com/ambergkristo/smartiq/pull/302) | Skip |
| fix/beta-findings-summary-threshold-gate-20260224 | 1 | 1 | MERGED | [#301](https://github.com/ambergkristo/smartiq/pull/301) | Skip |
| fix/beta-findings-summary-report-generator-20260224 | 1 | 1 | MERGED | [#300](https://github.com/ambergkristo/smartiq/pull/300) | Skip |
| fix/beta-findings-room-funnel-metrics-20260224 | 1 | 1 | MERGED | [#299](https://github.com/ambergkristo/smartiq/pull/299) | Skip |
| fix/beta-findings-gameplay-metrics-20260224 | 1 | 1 | MERGED | [#298](https://github.com/ambergkristo/smartiq/pull/298) | Skip |
| chore/frontend-remove-legacy-next-helpers-20260224 | 1 | 1 | MERGED | [#297](https://github.com/ambergkristo/smartiq/pull/297) | Skip |
| chore/legacy-endpoint-retirement-plan-20260224 | 1 | 1 | MERGED | [#296](https://github.com/ambergkristo/smartiq/pull/296) | Skip |
| docs/beta-runbook-v1-20260224 | 1 | 1 | MERGED | [#295](https://github.com/ambergkristo/smartiq/pull/295) | Skip |
| feat/reconnect-resume-20260224 | 1 | 1 | MERGED | [#294](https://github.com/ambergkristo/smartiq/pull/294) | Skip |
| feat/ui-control-gating-20260224 | 1 | 1 | MERGED | [#293](https://github.com/ambergkristo/smartiq/pull/293) | Skip |
| feat/ws-rooms-gateway-20260224 | 1 | 1 | MERGED | [#292](https://github.com/ambergkristo/smartiq/pull/292) | Skip |
| feat/rooms-create-join-20260224 | 1 | 1 | MERGED | [#291](https://github.com/ambergkristo/smartiq/pull/291) | Skip |
| feat/backend-single-player-server-session-20260224 | 1 | 1 | MERGED | [#290](https://github.com/ambergkristo/smartiq/pull/290) | Skip |
| refactor/frontend-remove-local-multiplayer-toggle-20260224 | 1 | 1 | MERGED | [#289](https://github.com/ambergkristo/smartiq/pull/289) | Skip |
| feat/frontend-server-state-flow-tests-20260224 | 1 | 1 | MERGED | [#288](https://github.com/ambergkristo/smartiq/pull/288) | Skip |
| feat/frontend-server-state-default-and-tests-20260224 | 1 | 1 | MERGED | [#287](https://github.com/ambergkristo/smartiq/pull/287) | Skip |
| feat/frontend-server-state-render-v1-20260224 | 1 | 1 | MERGED | [#286](https://github.com/ambergkristo/smartiq/pull/286) | Skip |
| feat/frontend-server-state-api-client-20260224 | 1 | 1 | MERGED | [#285](https://github.com/ambergkristo/smartiq/pull/285) | Skip |
| feat/frontend-server-state-render-20260224 | 1 | 1 | NONE | - | Skip |
| fix/docs-nextrandom-single-source-20260224-clean | 1 | 1 | MERGED | [#284](https://github.com/ambergkristo/smartiq/pull/284) | Skip |
| feat/server-game-session-api-20260224 | 2 | 2 | MERGED | [#283](https://github.com/ambergkristo/smartiq/pull/283) | Skip |
| feat/server-game-session-contract-20260224 | 1 | 1 | MERGED | [#282](https://github.com/ambergkristo/smartiq/pull/282) | Skip |
| fix/ui-mobile-tap-targets-20260224 | 1 | 1 | MERGED | [#280](https://github.com/ambergkristo/smartiq/pull/280) | Skip |
| feat/ui-peg-feedback-icons-20260224 | 1 | 1 | MERGED | [#278](https://github.com/ambergkristo/smartiq/pull/278) | Skip |
| feat/ui-visual-parity-v2-20260224 | 2 | 2 | MERGED | [#277](https://github.com/ambergkristo/smartiq/pull/277) | Skip |

## Divergence Routing Decisions

1. PR-from-branch not used in this pass.
Reason: all diverged branches in top 30 are either already merged PR branches or superseded historical branches.
2. Cherry-pick not used in this pass.
Reason: the only non-merged ahead branch (feat/frontend-server-state-render-20260224) produces duplicate CSS keyframe definitions when cherry-picked, so it is superseded/no-op and not safe to route as minimal value change.

## Missing-Work Candidates (ahead > 0 and not merged PR)

- feat/frontend-server-state-render-20260224 (ahead=1, behind=1): **Skip** - Cherry-pick adds duplicate CSS keyframes only; superseded by merged #281 lineage

## Skipped Items

- Merged PR branches with non-contained commit ancestry were skipped as already merged (squash/rebase workflow), consistent with project definition.
- Open PRs: none to skip.
- Branch deletion: not performed.

## PR Links Created In This Pass

- None.

## Commands Used

```bash
git fetch --all --prune
git checkout main
git pull origin main
gh pr list --repo ambergkristo/smartiq --state all --limit 800 --json number,title,headRefName,state,mergedAt,closedAt,url
git for-each-ref refs/remotes/origin --format="%(refname:short)|%(committerdate:iso8601)"
git rev-list --count origin/main..origin/<branch>
git rev-list --count origin/<branch>..origin/main
git merge-base --is-ancestor origin/<branch> origin/main
git cherry origin/main origin/<branch>
```

## Conclusion

- main is fully up-to-date for active merged work in the top recent branch set.
- No safe consolidation PR is required from remaining unmerged branch history in this audit window.
