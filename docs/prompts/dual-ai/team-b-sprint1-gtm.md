# Team B Prompt: Sprint 1 GTM Track

Repo: `smartiq`  
Worktree: `worktrees/ai-team-b`  
Branch: `wl/commercial/gtm-pricing-sprint1`  
Team: `team-b`

## Scope

1. Produce white-label packaging doc for corporate training ICP.
2. Add pilot onboarding checklist and discovery-call script.
3. Add waitlist funnel tracking event schema (docs only).

## Allowed Paths

- `docs/**` (excluding protected policy files unless required)

## Forbidden Paths

- `backend/**`
- `frontend/src/**` gameplay runtime
- `.github/workflows/**`

## Definition of Done

1. Pricing packages documented:
   - Starter
   - Growth
   - Enterprise
2. Pilot onboarding checklist includes:
   - tenant provisioning
   - branding intake
   - success criteria and owner
3. Event schema defines at least:
   - `landing_view`
   - `pricing_cta_click`
   - `waitlist_submit`
   - `demo_request_submit`
4. Documents cross-link from white-label program plan.

## Required Output

1. Changed files list
2. `git diff --stat`
3. Validation steps performed
4. Risks/open questions
5. PR title and PR description draft
