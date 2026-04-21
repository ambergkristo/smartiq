# Dual-AI Task Prompt Template

Use this prompt with the second AI for execution tasks.

```
Repo: smartiq
Worktree: <worktree_path>
Branch: <branch_name>
Team: <team-a|team-b>

Task Scope:
- <explicit files/directories>

Definition of Done:
1. <behavior/result>
2. <tests and checks>
3. <docs update requirement>

Constraints:
- Do not edit shared locked files unless explicitly listed.
- Respect team ownership policy in docs/policies/dual-ai-file-ownership.json.
- Keep changes focused to this task only.

Required output:
1. Changed files list
2. `git diff --stat`
3. Tests/checks run and outcomes
4. Risks/open issues
5. PR title + PR description draft
```
