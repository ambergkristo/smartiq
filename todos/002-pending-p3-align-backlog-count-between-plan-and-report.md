---
status: pending
priority: p3
issue_id: "002"
tags: [code-review, docs, consistency]
dependencies: []
---

# Align Backlog Count Between Plan and Report

The deepened plan says `Top 15`, while the generated report says `Top 12`. The report also includes one highlighted "Next 1" plus queue items 1-12, which can be interpreted as 13 total actions.

## Problem Statement

Inconsistent backlog cardinality across linked artifacts reduces stakeholder confidence and can cause triage confusion.

## Findings

- Plan heading: `## Next Steps Backlog (Top 15)`.
- Report heading: `## Next Steps Backlog (Top 12)`.
- Report queue includes items `1..12` in addition to "Next 1 Task To Do Now".
- Evidence references:
  - `docs/plans/2026-02-23-feat-smartiq-full-repo-audit-plan.md:330`
  - `docs/reports/smartiq-full-audit-2026-02-23.md:148`
  - `docs/reports/smartiq-full-audit-2026-02-23.md:165`

## Proposed Solutions

### Option 1: Standardize on Top 12 total

**Approach:** Keep "Next 1" + 11 queue items; update both docs accordingly.

**Pros:**
- Matches original audit prompt language.
- Simpler prioritization list.

**Cons:**
- Drops some queued ideas.

**Effort:** Small (15-20 min)

**Risk:** Low

---

### Option 2: Standardize on Top 15 total

**Approach:** Keep expanded list and update report heading/wording to reflect 15 total items.

**Pros:**
- Preserves full backlog depth.
- Aligns with deepened plan.

**Cons:**
- Deviates from "Top 12" expectation in some command variants.

**Effort:** Small (10-15 min)

**Risk:** Low

---

### Option 3: Remove numeric total from headings

**Approach:** Use neutral heading `## Next Steps Backlog` and keep itemized list.

**Pros:**
- Avoids repeated drift in future edits.

**Cons:**
- Loses explicit prioritization count target.

**Effort:** Small (10 min)

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `docs/plans/2026-02-23-feat-smartiq-full-repo-audit-plan.md`
- `docs/reports/smartiq-full-audit-2026-02-23.md`

**Related components:**
- Workflows output conventions (`workflows-plan`, `workflows-work`).

**Database changes (if any):**
- No.

## Resources

- Review diff: `git diff origin/main...HEAD`

## Acceptance Criteria

- [ ] Plan and report use the same backlog-count convention.
- [ ] "Next 1 + Queue" total is unambiguous.
- [ ] Summary metrics in docs match actual item count.

## Work Log

### 2026-02-23 - Initial Discovery

**By:** Codex

**Actions:**
- Cross-checked backlog sections in both generated artifacts.
- Confirmed mismatched count labels and queue length semantics.

**Learnings:**
- Numeric headings drift quickly across multi-step doc generation workflows.

## Notes

- This is a clarity/consistency finding, not a merge-blocking correctness issue.
