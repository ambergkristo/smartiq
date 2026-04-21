# Team B Prompt: Sprint 2 Admin Operations Track

Repo: `smartiq`  
Worktree: `worktrees/ai-team-b`  
Branch: `wl/commercial/admin-operations-sprint2`  
Team: `team-b`

## Mission

Implement admin UI screens that consume the existing white-label admin APIs for tenant operations, without touching backend code.

## API Contract To Use

1. Tenant and branding:
   - `GET /internal/wl/tenants`
   - `GET /internal/wl/tenants/{tenantId}`
   - `PATCH /internal/wl/tenants/{tenantId}/branding`
2. Members:
   - `GET /internal/wl/tenants/{tenantId}/members`
   - `PATCH /internal/wl/tenants/{tenantId}/members/{membershipId}`
   - `DELETE /internal/wl/tenants/{tenantId}/members/{membershipId}`
   - Business rule: API blocks demote/suspend/delete on the last `active owner` (show backend error message clearly in UI)
3. Settings:
   - `GET /internal/wl/tenants/{tenantId}/settings`
   - `PUT /internal/wl/tenants/{tenantId}/settings`
4. Subscription:
   - `GET /internal/wl/tenants/{tenantId}/subscription`
   - `PUT /internal/wl/tenants/{tenantId}/subscription`
5. Usage and audit:
   - `GET /internal/wl/tenants/{tenantId}/usage-events?eventType=&limit=`
   - `GET /internal/wl/tenants/{tenantId}/audit-events?limit=`

## Scope

1. Build/extend admin tenant detail page with tabs:
   - `Branding`
   - `Members`
   - `Settings`
   - `Subscription`
   - `Usage & Audit`
2. Add form validation and error states from API responses.
3. Keep UX consistent with existing frontend style.

## Allowed Paths

- `frontend/**`
- `docs/prompts/**`
- `docs/plans/**` (only if UI/API note updates are required)

## Forbidden Paths

- `backend/**`
- `.github/workflows/**`
- `docs/policies/dual-ai-file-ownership.json`

## Coordination Rules

1. Respect dual-AI ownership policy and stay in Team B paths only.
2. Do not reformat unrelated frontend files.
3. Before final output, run tests only for touched frontend units.

## Definition of Done

1. UI can list tenants and open one tenant detail view.
2. Branding form updates tenant branding successfully.
3. Member row editor can update role/status.
4. Settings and subscription forms save and show persisted values.
5. Usage and audit tables load with limit/filter controls.
6. Automated tests cover:
   - at least one successful submit flow
   - one validation error flow
   - one API error rendering flow

## Required Output

1. Changed files list
2. `git diff --stat`
3. Tests run + results
4. Risks/open questions
5. PR title and PR description draft
