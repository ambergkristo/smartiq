---
status: pending
priority: p2
issue_id: "001"
tags: [code-review, quality, docs, tooling]
dependencies: []
---

# Remove UTF-8 BOM from Audit Docs

Audit plan/report markdown files were written with UTF-8 BOM bytes (`EF BB BF`) at file start. Some frontmatter parsers and automation scripts fail or behave inconsistently when BOM is present before the first `---`.

## Problem Statement

Two workflow-critical documents include UTF-8 BOM:
- `docs/plans/2026-02-23-feat-smartiq-full-repo-audit-plan.md`
- `docs/reports/smartiq-full-audit-2026-02-23.md`

These docs are pipeline artifacts that may be parsed by tooling expecting frontmatter at byte 0. BOM can introduce fragile behavior in CI/local scripts.

## Findings

- BOM detected at file start for plan doc (`EF BB BF`).
- BOM detected at file start for report doc (`EF BB BF`).
- Frontmatter-based automation is used in this repository workflow (`docs/plans/*.md` lifecycle and status tracking).
- Evidence references:
  - `docs/plans/2026-02-23-feat-smartiq-full-repo-audit-plan.md:1`
  - `docs/reports/smartiq-full-audit-2026-02-23.md:1`

## Proposed Solutions

### Option 1: Rewrite files as UTF-8 without BOM

**Approach:** Re-save the two files with UTF-8 no-BOM encoding.

**Pros:**
- Immediate fix.
- Minimal risk and scope.

**Cons:**
- Can regress later if writers default to BOM again.

**Effort:** Small (10-15 min)

**Risk:** Low

---

### Option 2: Add guard script and CI check

**Approach:** Add a check script that fails if BOM is found in docs/plans or docs/reports markdown files.

**Pros:**
- Prevents recurrence.
- Self-documenting policy.

**Cons:**
- Slight CI maintenance overhead.

**Effort:** Small-Medium (30-60 min)

**Risk:** Low

---

### Option 3: Standardize editor settings

**Approach:** Add `.editorconfig` or contributor note enforcing no-BOM UTF-8 for markdown.

**Pros:**
- Reduces recurrence at source.

**Cons:**
- Not fully enforceable without CI check.

**Effort:** Small (15-20 min)

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-23-feat-smartiq-full-repo-audit-plan.md:1`
- `docs/reports/smartiq-full-audit-2026-02-23.md:1`

**Related components:**
- Plan/status parsing in workflow docs pipeline.

**Database changes (if any):**
- No.

## Resources

- Review target diff: `origin/main...HEAD`
- Related workflow artifact policy: `docs/plans/*.md` protected artifacts

## Acceptance Criteria

- [ ] Both files are UTF-8 without BOM.
- [ ] Hex check shows first bytes are not `EF BB BF`.
- [ ] Frontmatter parsing works in local workflow commands.
- [ ] Changes are committed with no content regression.

## Work Log

### 2026-02-23 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed docs-only diff on `main`.
- Verified BOM via byte inspection for both markdown files.
- Documented risk and remediation options.

**Learnings:**
- PowerShell `Set-Content -Encoding UTF8` can introduce BOM depending on shell/runtime defaults.

## Notes

- Keep this scoped to file encoding only.
