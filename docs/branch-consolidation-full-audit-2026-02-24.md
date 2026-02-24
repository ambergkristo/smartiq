# Branch Consolidation Full Audit - 2026-02-24

Generated from `main` after PR `#312` merge.

## Scope

- Repo: `ambergkristo/smartiq`
- Base branch: `origin/main`
- Remote branches scanned: `208` (excluding `main` and `HEAD`)
- Open PRs during scan: `0`

## High-Level Result

- Masterplan delivery stream is complete and merged through `#312`.
- No open PR backlog exists.
- Remaining non-merged remote branches are historical/superseded and do not require consolidation PRs.

## Branch Metrics

- Branches with `ahead > 0` vs `origin/main`: `206`
- Branches tied to merged PRs: `193`
- Branches tied to closed (not merged) PRs: `12`
- Branches with no PR record: `3`

Note: in this repository, many merged branches still show `ahead > 0` because of squash/rebase merge lineage. These are treated as already merged when PR state is `MERGED`.

## Non-Merged Ahead Branches (Actioned Assessment)

| Branch | Ahead/Behind | PR | Routing | Evidence |
| --- | --- | --- | --- | --- |
| `feat/frontend-server-state-render-20260224` | `1 / 1` | none | Skip (superseded) | `git cherry-pick` test shows duplicate CSS keyframes only; merged equivalent exists in [`#281`](https://github.com/ambergkristo/smartiq/pull/281). |
| `feat/et-localization-pass-31` | `33 / 33` | closed [`#196`](https://github.com/ambergkristo/smartiq/pull/196) | Skip (superseded) | ET localization stream merged via pass chain and gates, e.g. [`#159`](https://github.com/ambergkristo/smartiq/pull/159), [`#169`](https://github.com/ambergkristo/smartiq/pull/169), [`#190`](https://github.com/ambergkristo/smartiq/pull/190), [`#197`](https://github.com/ambergkristo/smartiq/pull/197). |
| `feat/et-localization-pass-27` | `29 / 29` | closed [`#192`](https://github.com/ambergkristo/smartiq/pull/192) | Skip (superseded) | Superseded by same merged ET chain as above. |
| `feat/et-localization-pass-18` | `19 / 19` | closed [`#187`](https://github.com/ambergkristo/smartiq/pull/187) | Skip (superseded) | Superseded by same merged ET chain as above. |
| `refactor/frontend-canonical-nextcard` | `1 / 1` | closed [`#142`](https://github.com/ambergkristo/smartiq/pull/142) | No action | `git cherry` plus-count is `0` (no unique patch left to route). Canonical path merged in [`#132`](https://github.com/ambergkristo/smartiq/pull/132). |
| `fix/ci-main-green` | `1 / 1` | none | Skip (superseded) | Cherry-pick conflicts with current frontend API/tests; later merged frontend/server-state PRs supersede this path (e.g. [`#285`](https://github.com/ambergkristo/smartiq/pull/285) to [`#288`](https://github.com/ambergkristo/smartiq/pull/288)). |
| `feat/smart10-gameplay-interactions` | `2 / 2` | closed [`#126`](https://github.com/ambergkristo/smartiq/pull/126) | Skip (superseded) | Smart10 gameplay and UI parity merged later via [`#130`](https://github.com/ambergkristo/smartiq/pull/130), [`#277`](https://github.com/ambergkristo/smartiq/pull/277). |
| `feat/card-contract-generator-v2` | `2 / 2` | closed [`#127`](https://github.com/ambergkristo/smartiq/pull/127) | Skip (superseded) | Card contract/data milestones merged via [`#121`](https://github.com/ambergkristo/smartiq/pull/121), [`#124`](https://github.com/ambergkristo/smartiq/pull/124), [`#129`](https://github.com/ambergkristo/smartiq/pull/129). |
| `feat/ui-smart10-board` | `1 / 1` | closed [`#123`](https://github.com/ambergkristo/smartiq/pull/123) | Skip (superseded) | Board/UI parity merged later via [`#277`](https://github.com/ambergkristo/smartiq/pull/277), [`#253`](https://github.com/ambergkristo/smartiq/pull/253). |
| `feat/logging-correlation` | `1 / 1` | closed [`#81`](https://github.com/ambergkristo/smartiq/pull/81) | Skip (already consolidated) | Explicitly consolidated and merged via [`#266`](https://github.com/ambergkristo/smartiq/pull/266). |
| `feat/error-contract` | `1 / 1` | closed [`#79`](https://github.com/ambergkristo/smartiq/pull/79) | Skip (already consolidated) | Consolidated and hardened via [`#267`](https://github.com/ambergkristo/smartiq/pull/267), [`#268`](https://github.com/ambergkristo/smartiq/pull/268). |
| `feat/data-qa-pipeline` | `1 / 1` | closed [`#12`](https://github.com/ambergkristo/smartiq/pull/12) | Skip (superseded) | Data pipeline/quality closure merged through later pipeline and quality-gate PRs (e.g. [`#28`](https://github.com/ambergkristo/smartiq/pull/28), [`#147`](https://github.com/ambergkristo/smartiq/pull/147)). |
| `chore/initial-plan` | `2 / 2` | closed [`#7`](https://github.com/ambergkristo/smartiq/pull/7) | Skip (already consolidated) | Consolidated into merged docs track via [`#264`](https://github.com/ambergkristo/smartiq/pull/264). |
| `post-init-setup` | `1 / 1` | closed [`#5`](https://github.com/ambergkristo/smartiq/pull/5) | Skip (already consolidated) | Consolidated into merged branch via [`#265`](https://github.com/ambergkristo/smartiq/pull/265). |

## Consolidation PRs in This Pass

- None required.

## Branch Retirement Candidates (Optional, Explicit Approval Required)

Candidates are all non-merged historical branches listed above, because they are superseded, already consolidated elsewhere, or have no unique patch left.

- No branch deletions were performed in this audit.
- If retirement is approved, execute deletion in a separate operation and log exact refs.

## Commands Used

```bash
git fetch --all --prune
git checkout main
git pull origin main
gh pr list --repo ambergkristo/smartiq --state all --limit 1200 --json number,title,headRefName,state,mergedAt,closedAt,url
git for-each-ref refs/remotes/origin --format="%(refname:short)|%(committerdate:iso8601)"
git rev-list --count origin/main..origin/<branch>
git rev-list --count origin/<branch>..origin/main
git merge-base --is-ancestor origin/<branch> origin/main
git cherry origin/main origin/<branch>
```

## Conclusion

- `main` is fully covered for production-relevant work in current repository state.
- Remaining diverged historical branches are documented and safe to keep unless explicit cleanup is requested.
