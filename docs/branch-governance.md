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

## Automated Audit Report

Generate the latest consolidation report from current git/gh metadata:

```bash
npm run report:branches:consolidation
```

- Default output: `docs/branch-consolidation-audit-latest.md`
- Scope default: top 30 most recently updated remote branches (excluding `main`/`HEAD`)
- Routing heuristic includes commit subject references like `(#281)`:
  if unique commits on a no-PR branch only reference merged PR numbers, route is `Skip` (superseded lineage).
- Full scan variant:

```bash
npm run report:branches:consolidation:full
```

## Cleanup Policy

- Default behavior: keep historical branches untouched.
- Optional cleanup (only by explicit instruction): remove stale remote branches after confirming they are `MERGED` or `superseded`.
- If cleanup is requested, perform in a separate operation and log deleted refs in a PR note or ops note.

## Current Baseline

- Latest branch consolidation snapshot: `docs/branch-consolidation-audit-2026-02-24.md`.
- Auto-generated current snapshot target: `docs/branch-consolidation-audit-latest.md`.
- At that snapshot, no safe additional consolidation PR was required.

## Legacy Dual-AI Parallel Execution (Optional)

This section is optional compatibility guidance only.
Canonical execution for current white-label work is defined in:
- `docs/plans/2026-03-05-white-label-masterplan-v2-multi-agent-lean.md`

If legacy dual-AI workflow is explicitly chosen, use:

1. Protocol: `docs/plans/2026-03-03-dual-ai-delivery-protocol.md`
2. Ownership policy: `docs/policies/dual-ai-file-ownership.json`
3. Worktree bootstrap: `npm run ops:worktrees:init`
4. Ownership checks:
   - `npm run validate:dual-ai:ownership -- --team=team-a --base=origin/main`
   - `npm run validate:dual-ai:ownership -- --team=team-b --base=origin/main`
   - For explicitly coordinated shared-file edits, add `--allow-shared-locked`.
