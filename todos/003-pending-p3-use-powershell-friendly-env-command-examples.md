---
status: pending
priority: p3
issue_id: "003"
tags: [code-review, docs, devex, windows]
dependencies: []
---

# Use PowerShell-Friendly Env Command Examples

The report's "Exact Commands" for local runtime verification use `set VAR=... && ...` syntax, which is CMD-style and not idiomatic PowerShell used elsewhere in repository docs.

## Problem Statement

Mixed shell syntax in operational docs can increase setup failures and reduce reproducibility for contributors following Windows PowerShell workflows.

## Findings

- Report includes CMD-style examples:
  - `set SPRING_DATASOURCE_PASSWORD=smartiq && npm run dev:backend:8081`
  - `set BACKEND_URL=http://localhost:8081 && node scripts/verify_runtime_deck.js`
  - `set BACKEND_URL=http://localhost:8081 && npm run smoke:test`
- Repository quickstarts are predominantly PowerShell-centric in `README.md`.
- Evidence reference:
  - `docs/reports/smartiq-full-audit-2026-02-23.md:161`
  - `docs/reports/smartiq-full-audit-2026-02-23.md:162`
  - `docs/reports/smartiq-full-audit-2026-02-23.md:163`

## Proposed Solutions

### Option 1: Convert examples to PowerShell syntax

**Approach:** Replace with `$env:VAR='value'; command`.

**Pros:**
- Consistent with existing docs.
- Low friction for Windows contributors.

**Cons:**
- Slightly longer command examples.

**Effort:** Small (10-15 min)

**Risk:** Low

---

### Option 2: Provide dual examples (PowerShell + CMD)

**Approach:** Keep both shell variants under clear labels.

**Pros:**
- Helps mixed-shell contributors.

**Cons:**
- More verbose docs.

**Effort:** Small (20-30 min)

**Risk:** Low

---

### Option 3: Reference script wrapper only

**Approach:** Replace inline env examples with one wrapper command/script.

**Pros:**
- Reduces shell-specific confusion.

**Cons:**
- Requires script maintenance.

**Effort:** Medium (45-90 min)

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `docs/reports/smartiq-full-audit-2026-02-23.md:161`
- `docs/reports/smartiq-full-audit-2026-02-23.md:162`
- `docs/reports/smartiq-full-audit-2026-02-23.md:163`

**Related components:**
- `README.md` Windows quickstart guidance.

**Database changes (if any):**
- No.

## Resources

- Windows quickstart section: `README.md`
- Local gate docs: `docs/local-gate.md`

## Acceptance Criteria

- [ ] Runtime command examples are shell-consistent with documented Windows flow.
- [ ] At least one copy-pasteable PowerShell command path is provided.
- [ ] Smoke/runtime commands execute as documented in local validation.

## Work Log

### 2026-02-23 - Initial Discovery

**By:** Codex

**Actions:**
- Reviewed generated report runtime command block.
- Compared syntax style against repository Windows docs.
- Documented recommended doc-only fix.

**Learnings:**
- Operational docs need explicit shell context to avoid false-negative setup failures.

## Notes

- Improvement is primarily developer-experience and documentation clarity.
