# Team B Prompt: Sprint 1 Admin Track

Repo: `smartiq`  
Worktree: `worktrees/ai-team-b`  
Branch: `wl/commercial/admin-branding-sprint1`  
Team: `team-b`

## Scope

1. Build admin-facing tenant branding UI skeleton.
2. Integrate read/update against:
   - `GET /internal/wl/tenants/{tenantId}`
   - `PATCH /internal/wl/tenants/{tenantId}/branding`
3. Keep work in frontend/admin surface only.

## Allowed Paths

- `frontend/**`
- `docs/prompts/**`
- `docs/plans/**` (only if UI contract notes are needed)

## Forbidden Paths

- `backend/**`
- `.github/workflows/**`

## Definition of Done

1. Admin branding form supports:
   - app name
   - logo URL
   - primary/secondary colors
2. Client-side validation for color format `#RRGGBB`.
3. Test coverage added for:
   - form render
   - submit success
   - submit validation error
4. No gameplay behavior changes.

## Required Output

1. Changed files list
2. `git diff --stat`
3. Tests run + results
4. Risks/open questions
5. PR title and PR description draft
