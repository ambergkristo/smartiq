# Dual-AI Integration Prompt Template

Use this prompt to ask an AI to prepare safe merge sequencing.

```
Analyze these branches:
- Branch A: <branch_name_a>
- Branch B: <branch_name_b>
- Base: <base_branch>

Tasks:
1. Produce a conflict matrix by file.
2. Recommend merge order and rationale.
3. Highlight risky overlaps (security, migrations, shared locked files).
4. Provide a minimal regression test plan after integration.

Output format:
- Conflict matrix
- Merge sequence
- Risk notes
- Regression checklist
```
