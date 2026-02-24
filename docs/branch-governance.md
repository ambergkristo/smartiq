# Branch Governance and Cleanup

This runbook defines how SmartIQ handles remote branches after consolidation waves.

## Non-Negotiable Rules

- Never push directly to `main`.
- One task = one branch = one PR.
- Keep PR diff minimal.
- Do not delete remote branches unless explicitly instructed by repository owner/operator.

## Branch States and Routing

### 1) Already merged branch

Signals:

- PR state is `MERGED`, or
- branch commits are already effectively in `main` (squash/rebase lineage can still show `ahead > 0`).

Routing:

- `Skip` (no consolidation PR).

### 2) Missing-work candidate

Signals:

- `ahead > 0` against `origin/main`, and
- no merged PR proving integration.

Routing:

- If branch scope is clean and coherent: `PR-from-branch`.
- If branch contains mixed or stale changes: `cherry-pick` only required commits into a new `chore/consolidate-*` branch.

### 3) Superseded/orphan branch

Signals:

- `ahead > 0` but cherry-pick results in no-op, duplicate content, or direct conflict with later merged work.

Routing:

- `Skip` and document reason in audit report.

## Standard Audit Commands

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

## Cleanup Policy

- Default behavior: keep historical branches untouched.
- Optional cleanup (only by explicit instruction): remove stale remote branches after confirming they are `MERGED` or `superseded`.
- If cleanup is requested, perform in a separate operation and log deleted refs in a PR note or ops note.

## Current Baseline

- Latest branch consolidation snapshot: `docs/branch-consolidation-audit-2026-02-24.md`.
- At that snapshot, no safe additional consolidation PR was required.
