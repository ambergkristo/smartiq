# Dual-AI Review Prompt Template

Use this prompt for strict PR review by another AI.

```
Review target:
- Branch: <branch_name>
- Base: <base_branch>
- Focus files: <paths>

Review priorities (in order):
1. Tenant isolation and data leakage risks
2. Auth/authz bypass risks
3. Migration and rollback safety
4. Contract/API compatibility
5. Test coverage gaps

Output:
- Findings sorted by severity (Critical, High, Medium, Low)
- File + line reference for each finding
- Concrete fix recommendations
- "Merge ready" yes/no with rationale
```
